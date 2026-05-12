#!/usr/bin/env python3
"""
KIRTA static analyzer MVP.

Builds:
- AST summary / optional full AST;
- import resolution;
- call graph for one selected library;
- package trace report from a Tiny-SCA JSON file.

Usage:
    python tools/kirta_analyzer.py \
        --project ./test-repo/Vulnerable-Flask-App \
        --lib requests \
        --output requests-callgraph.json

    python tools/kirta_analyzer.py \
        --project ./test-repo/Vulnerable-Flask-App \
        --source ./test-result/Vulnerable-Flask-App/Vulnerable-Flask-App-tiny-sca.json \
        --output ./test-result/Vulnerable-Flask-App/Vulnerable-Flask-App-package-trace.json
"""

from __future__ import annotations

import argparse
import ast
import json
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional


SKIP_DIRS = {
    ".git",
    ".hg",
    ".svn",
    ".venv",
    "venv",
    "env",
    "__pycache__",
    ".mypy_cache",
    ".pytest_cache",
    ".tox",
    "node_modules",
    "dist",
    "build",
    "site-packages",
}

# SCA reports usually contain package names from PyPI. In Python code the import
# name can be different, so these aliases make package trace reports useful for
# real repositories, not only for packages where package name == import name.
PACKAGE_IMPORT_ALIASES = {
    "beautifulsoup4": ["bs4"],
    "django-allauth": ["allauth"],
    "flask-cors": ["flask_cors"],
    "opencv-python": ["cv2"],
    "pillow": ["PIL"],
    "psycopg2-binary": ["psycopg2"],
    "pycrypto": ["Crypto"],
    "pycryptodome": ["Crypto"],
    "pyjwt": ["jwt"],
    "pymongo": ["pymongo"],
    "pyopenssl": ["OpenSSL"],
    "pyyaml": ["yaml"],
    "python-dateutil": ["dateutil"],
    "python-docx": ["docx"],
    "python-multipart": ["multipart"],
    "scikit-learn": ["sklearn"],
}
TINY_SCA_FILE_SUFFIX = "-tiny-sca.json"


@dataclass
class ImportItem:
    type: str
    alias: str
    resolved: str
    module: Optional[str]
    name: Optional[str]
    lineno: int
    col_offset: int
    is_target_library: bool


@dataclass
class CallItem:
    file: str
    caller: str
    lineno: int
    col_offset: int
    call: str
    resolved: str
    target_library: str
    args_count: int
    keywords: list[str]
    source: str


def is_python_file(path: Path) -> bool:
    return path.suffix == ".py" and all(
        part not in SKIP_DIRS for part in path.parts
    )


def iter_python_files(project_root: Path) -> list[Path]:
    return sorted(
        path
        for path in project_root.rglob("*.py")
        if is_python_file(path.relative_to(project_root))
    )


def read_text_safely(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return path.read_text(encoding="utf-8", errors="replace")


def matches_library(resolved: str, lib: str) -> bool:
    return resolved == lib or resolved.startswith(lib + ".")


def dotted_name(node: ast.AST) -> Optional[str]:
    """
    Convert a call target AST node to a dotted string without import resolution.

    Examples:
        requests.get      -> "requests.get"
        yaml.load         -> "yaml.load"
        session.get       -> "session.get"
        ClientSession()   -> "ClientSession"
    """
    if isinstance(node, ast.Name):
        return node.id

    if isinstance(node, ast.Attribute):
        base = dotted_name(node.value)
        if base:
            return f"{base}.{node.attr}"
        return node.attr

    if isinstance(node, ast.Call):
        return dotted_name(node.func)

    if isinstance(node, ast.Subscript):
        return dotted_name(node.value)

    return None


def resolve_dotted(raw: Optional[str], aliases: dict[str, str]) -> Optional[str]:
    """
    Resolve dotted name by replacing its first segment using import aliases
    or variable aliases.

    Example:
        raw="req.get", aliases={"req": "requests"} -> "requests.get"
        raw="request", aliases={"request": "requests.api.request"}
            -> "requests.api.request"
        raw="session.get", aliases={"session": "requests.Session"}
            -> "requests.Session.get"
    """
    if not raw:
        return None

    parts = raw.split(".")
    root = parts[0]

    if root in aliases:
        resolved_root = aliases[root]
        if len(parts) == 1:
            return resolved_root
        return ".".join([resolved_root, *parts[1:]])

    return raw


def node_source(source: str, node: ast.AST) -> str:
    try:
        return ast.get_source_segment(source, node) or ""
    except Exception:
        return ""


def literal_node(node: ast.AST) -> Any:
    """
    Compact JSON-friendly representation for common AST expression nodes.
    Used only in AST summary.
    """
    if isinstance(node, ast.Constant):
        return node.value
    if isinstance(node, ast.Name):
        return {"name": node.id}
    if isinstance(node, ast.Attribute):
        return {"attr": dotted_name(node)}
    if isinstance(node, ast.Call):
        return {"call": dotted_name(node.func)}
    if isinstance(node, ast.List):
        return [literal_node(item) for item in node.elts]
    if isinstance(node, ast.Tuple):
        return tuple(literal_node(item) for item in node.elts)
    if isinstance(node, ast.Dict):
        return {
            "keys": [
                literal_node(key) if key else None
                for key in node.keys
            ],
            "values": [literal_node(value) for value in node.values],
        }
    return {"node_type": type(node).__name__}


def ast_to_dict(node: ast.AST) -> Any:
    """
    Full JSON-serializable AST.
    Can be large on real projects.
    """
    if isinstance(node, ast.AST):
        result: dict[str, Any] = {"_type": type(node).__name__}
        if hasattr(node, "lineno"):
            result["lineno"] = getattr(node, "lineno")
        if hasattr(node, "col_offset"):
            result["col_offset"] = getattr(node, "col_offset")

        for field, value in ast.iter_fields(node):
            result[field] = ast_to_dict(value)
        return result

    if isinstance(node, list):
        return [ast_to_dict(item) for item in node]

    return node


class ImportCollector(ast.NodeVisitor):
    def __init__(self, target_library: str) -> None:
        self.target_library = target_library
        self.aliases: dict[str, str] = {}
        self.items: list[ImportItem] = []

    def visit_Import(self, node: ast.Import) -> None:
        for alias_node in node.names:
            imported_name = alias_node.name
            if alias_node.asname:
                alias_name = alias_node.asname
                resolved = imported_name
            else:
                alias_name = imported_name.split(".")[0]
                resolved = imported_name.split(".")[0]

            self.aliases[alias_name] = resolved
            self.items.append(
                ImportItem(
                    type="import",
                    alias=alias_name,
                    resolved=resolved,
                    module=imported_name,
                    name=None,
                    lineno=node.lineno,
                    col_offset=node.col_offset,
                    is_target_library=(
                        matches_library(resolved, self.target_library)
                        or matches_library(imported_name, self.target_library)
                    ),
                )
            )

        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        # Relative imports do not point to third-party libs directly.
        if not node.module:
            self.generic_visit(node)
            return

        module = "." * node.level + node.module if node.level else node.module

        for alias_node in node.names:
            if alias_node.name == "*":
                alias_name = "*"
                resolved = module + ".*"
            else:
                alias_name = alias_node.asname or alias_node.name
                resolved = f"{module}.{alias_node.name}"

            self.aliases[alias_name] = resolved
            self.items.append(
                ImportItem(
                    type="from_import",
                    alias=alias_name,
                    resolved=resolved,
                    module=module,
                    name=alias_node.name,
                    lineno=node.lineno,
                    col_offset=node.col_offset,
                    is_target_library=(
                        matches_library(resolved, self.target_library)
                        or matches_library(module, self.target_library)
                    ),
                )
            )

        self.generic_visit(node)


class AnalyzerVisitor(ast.NodeVisitor):
    def __init__(
        self,
        source: str,
        relative_file: str,
        target_library: str,
        import_aliases: dict[str, str],
    ) -> None:
        self.source = source
        self.relative_file = relative_file
        self.target_library = target_library
        self.aliases: dict[str, str] = dict(import_aliases)
        self.calls: list[CallItem] = []
        self.scope_stack: list[str] = []

    @property
    def current_scope(self) -> str:
        return ".".join(self.scope_stack) if self.scope_stack else "<module>"

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        self.scope_stack.append(node.name)
        self.generic_visit(node)
        self.scope_stack.pop()

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self.scope_stack.append(node.name)
        self.generic_visit(node)
        self.scope_stack.pop()

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        self.scope_stack.append(node.name)
        self.generic_visit(node)
        self.scope_stack.pop()

    def visit_Assign(self, node: ast.Assign) -> None:
        self._register_assignment_aliases(node.targets, node.value)
        self.generic_visit(node)

    def visit_AnnAssign(self, node: ast.AnnAssign) -> None:
        if node.value is not None:
            self._register_assignment_aliases([node.target], node.value)
        self.generic_visit(node)

    def visit_With(self, node: ast.With) -> None:
        self._register_with_aliases(node)
        self.generic_visit(node)

    def visit_AsyncWith(self, node: ast.AsyncWith) -> None:
        self._register_with_aliases(node)
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call) -> None:
        raw = dotted_name(node.func)
        resolved = resolve_dotted(raw, self.aliases)

        if resolved and matches_library(resolved, self.target_library):
            self.calls.append(
                CallItem(
                    file=self.relative_file,
                    caller=self.current_scope,
                    lineno=node.lineno,
                    col_offset=node.col_offset,
                    call=raw or "",
                    resolved=resolved,
                    target_library=self.target_library,
                    args_count=len(node.args),
                    keywords=[
                        keyword.arg if keyword.arg is not None else "**"
                        for keyword in node.keywords
                    ],
                    source=node_source(self.source, node).strip(),
                )
            )

        self.generic_visit(node)

    def _register_assignment_aliases(
        self,
        targets: list[ast.AST],
        value: ast.AST,
    ) -> None:
        resolved_value: Optional[str] = None

        if isinstance(value, ast.Call):
            resolved_value = resolve_dotted(dotted_name(value.func), self.aliases)
        else:
            resolved_value = resolve_dotted(dotted_name(value), self.aliases)

        if not resolved_value or not matches_library(
            resolved_value,
            self.target_library,
        ):
            return

        for target in targets:
            if isinstance(target, ast.Name):
                self.aliases[target.id] = resolved_value

    def _register_with_aliases(self, node: ast.With | ast.AsyncWith) -> None:
        for item in node.items:
            if item.optional_vars is None:
                continue

            if isinstance(item.context_expr, ast.Call):
                raw_context = dotted_name(item.context_expr.func)
            else:
                raw_context = dotted_name(item.context_expr)

            resolved_context = resolve_dotted(raw_context, self.aliases)

            if not resolved_context or not matches_library(
                resolved_context,
                self.target_library,
            ):
                continue

            if isinstance(item.optional_vars, ast.Name):
                self.aliases[item.optional_vars.id] = resolved_context


class AstSummaryVisitor(ast.NodeVisitor):
    def __init__(self) -> None:
        self.functions: list[dict[str, Any]] = []
        self.classes: list[dict[str, Any]] = []
        self.assignments: list[dict[str, Any]] = []
        self.imports_count = 0
        self.calls_count = 0

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self.functions.append(
            {
                "type": "function",
                "name": node.name,
                "lineno": node.lineno,
                "args": [arg.arg for arg in node.args.args],
                "decorators": [dotted_name(dec) for dec in node.decorator_list],
            }
        )
        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        self.functions.append(
            {
                "type": "async_function",
                "name": node.name,
                "lineno": node.lineno,
                "args": [arg.arg for arg in node.args.args],
                "decorators": [dotted_name(dec) for dec in node.decorator_list],
            }
        )
        self.generic_visit(node)

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        self.classes.append(
            {
                "name": node.name,
                "lineno": node.lineno,
                "bases": [dotted_name(base) for base in node.bases],
                "decorators": [dotted_name(dec) for dec in node.decorator_list],
            }
        )
        self.generic_visit(node)

    def visit_Assign(self, node: ast.Assign) -> None:
        targets = [dotted_name(target) for target in node.targets]
        self.assignments.append(
            {
                "lineno": node.lineno,
                "targets": targets,
                "value": literal_node(node.value),
            }
        )
        self.generic_visit(node)

    def visit_Import(self, node: ast.Import) -> None:
        self.imports_count += len(node.names)
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        self.imports_count += len(node.names)
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call) -> None:
        self.calls_count += 1
        self.generic_visit(node)


def ast_summary(tree: ast.AST) -> dict[str, Any]:
    visitor = AstSummaryVisitor()
    visitor.visit(tree)
    return {
        "node_type": type(tree).__name__,
        "functions": visitor.functions,
        "classes": visitor.classes,
        "assignments": visitor.assignments,
        "imports_count": visitor.imports_count,
        "calls_count": visitor.calls_count,
    }


def analyze_file(
    path: Path,
    project_root: Path,
    target_library: str,
    ast_mode: str,
) -> dict[str, Any]:
    relative_file = str(path.relative_to(project_root)).replace("\\", "/")
    source = read_text_safely(path)

    try:
        tree = ast.parse(source, filename=relative_file)
    except SyntaxError as exc:
        return {
            "path": relative_file,
            "syntax_error": {
                "message": exc.msg,
                "lineno": exc.lineno,
                "offset": exc.offset,
                "text": exc.text,
            },
            "imports": [],
            "target_imports": [],
            "import_resolution": {},
            "ast": None,
            "call_graph": [],
        }

    import_collector = ImportCollector(target_library)
    import_collector.visit(tree)

    analyzer = AnalyzerVisitor(
        source=source,
        relative_file=relative_file,
        target_library=target_library,
        import_aliases=import_collector.aliases,
    )
    analyzer.visit(tree)

    if ast_mode == "full":
        ast_payload: Any = ast_to_dict(tree)
    elif ast_mode == "none":
        ast_payload = None
    else:
        ast_payload = ast_summary(tree)

    return {
        "path": relative_file,
        "syntax_error": None,
        "imports": [asdict(item) for item in import_collector.items],
        "target_imports": [
            asdict(item)
            for item in import_collector.items
            if item.is_target_library
        ],
        "import_resolution": import_collector.aliases,
        "ast": ast_payload,
        "call_graph": [asdict(call) for call in analyzer.calls],
    }


def analyze_project(
    project_root: Path,
    target_library: str,
    ast_mode: str,
) -> dict[str, Any]:
    files = []
    all_calls = []
    all_target_imports = []
    syntax_errors = []

    python_files = iter_python_files(project_root)

    for path in python_files:
        file_result = analyze_file(path, project_root, target_library, ast_mode)
        files.append(file_result)

        all_calls.extend(file_result["call_graph"])
        all_target_imports.extend(file_result.get("target_imports", []))

        if file_result.get("syntax_error"):
            syntax_errors.append(
                {
                    "path": file_result["path"],
                    **file_result["syntax_error"],
                }
            )

    return {
        "schema_version": "0.1.0",
        "tool": "kirta_analyzer.py",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "project_root": str(project_root.resolve()),
        "target_library": target_library,
        "files_analyzed": len(python_files),
        "files_with_syntax_errors": len(syntax_errors),
        "syntax_errors": syntax_errors,
        "summary": {
            "target_imports_count": len(all_target_imports),
            "target_calls_count": len(all_calls),
            "files_with_target_calls": sorted(
                {call["file"] for call in all_calls}
            ),
        },
        "target_imports": all_target_imports,
        "call_graph": all_calls,
        "files": files,
    }


def load_tiny_sca_package_names(source_path: Path) -> list[str]:
    try:
        data = json.loads(source_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON in Tiny-SCA file: {source_path}: {exc}")

    if not isinstance(data, list):
        raise SystemExit(
            "Tiny-SCA file must contain a JSON array of vulnerability items. "
            'Expected format: [{"package": {"name": "package-name"}, ...}, ...].'
        )
    if not data:
        raise SystemExit(
            f"Tiny-SCA file is empty: {source_path}. "
            "Expected at least one vulnerability item."
        )

    package_names: list[str] = []
    seen: set[str] = set()
    missing_name_count = 0

    for item in data:
        if not isinstance(item, dict):
            continue

        package = item.get("package")
        if not isinstance(package, dict):
            missing_name_count += 1
            continue

        name = package.get("name")
        if not isinstance(name, str) or not name.strip():
            missing_name_count += 1
            continue

        clean_name = name.strip()
        dedupe_key = clean_name.casefold()
        if dedupe_key in seen:
            continue

        seen.add(dedupe_key)
        package_names.append(clean_name)

    if not package_names:
        raise SystemExit(
            f"No package.name values found in Tiny-SCA file: {source_path}. "
            "Every vulnerability item must include package.name. "
            f"Items missing package.name: {missing_name_count}."
        )

    return package_names


def package_import_candidates(package_name: str) -> list[str]:
    """
    Build possible import names for a package from Tiny-SCA.

    The first candidate is always the package name itself. Extra candidates cover
    common PyPI package names that are imported under a different module name.
    """
    candidates: list[str] = []

    def add(value: str) -> None:
        value = value.strip()
        if value and value not in candidates:
            candidates.append(value)

    normalized_key = package_name.casefold()
    add(package_name)
    add(package_name.replace("-", "_"))

    for alias in PACKAGE_IMPORT_ALIASES.get(normalized_key, []):
        add(alias)

    return candidates


def call_identity(call: dict[str, Any]) -> tuple[Any, ...]:
    return (
        call.get("file"),
        call.get("caller"),
        call.get("lineno"),
        call.get("col_offset"),
        call.get("call"),
        call.get("resolved"),
        call.get("source"),
    )


def build_package_trace_report(
    project_root: Path,
    source_path: Path,
) -> list[dict[str, Any]]:
    """
    Build package trace report in the shape [{package, call_graph}, ...].

    For each unique package from Tiny-SCA, analyzer runs the existing
    single-library scan for possible import aliases and deduplicates calls.
    """
    package_names = load_tiny_sca_package_names(source_path)
    report: list[dict[str, Any]] = []

    for package_name in package_names:
        call_graph: list[dict[str, Any]] = []
        seen_calls: set[tuple[Any, ...]] = set()

        for import_name in package_import_candidates(package_name):
            result = analyze_project(
                project_root=project_root,
                target_library=import_name,
                ast_mode="none",
            )

            for call in result["call_graph"]:
                identity = call_identity(call)
                if identity in seen_calls:
                    continue

                seen_calls.add(identity)
                call_graph.append(call)

        report.append(
            {
                "package": package_name,
                "call_graph": call_graph,
            }
        )

    return report


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Generate AST, import resolution and target library call graph "
            "for a Python project. Can also build package trace report from "
            "a Tiny-SCA JSON file."
        )
    )
    parser.add_argument(
        "--project",
        default=".",
        help="Path to Python project root. Default: current directory.",
    )
    parser.add_argument(
        "--source",
        help=(
            "Path to *-tiny-sca.json. Expected JSON format is an array of "
            "vulnerability items with package.name. If provided, analyzer "
            "builds an array of objects: {package, call_graph}."
        ),
    )
    parser.add_argument(
        "--lib",
        help=(
            "Target library/module name for old single-library mode, "
            "for example: requests, yaml, django, flask, aiohttp."
        ),
    )
    parser.add_argument(
        "--output",
        required=True,
        help="Output JSON file path.",
    )
    parser.add_argument(
        "--ast-mode",
        choices=("summary", "full", "none"),
        default="summary",
        help=(
            "AST output mode for --lib mode. Package trace mode always uses "
            "'none' internally because it outputs only call_graph."
        ),
    )
    return parser.parse_args()


def validate_project_root(project_root: Path) -> None:
    if not project_root.exists():
        raise SystemExit(f"Project path does not exist: {project_root}")

    if not project_root.is_dir():
        raise SystemExit(f"Project path is not a directory: {project_root}")


def validate_tiny_sca_source_path(source_path: Path) -> None:
    if not source_path.exists():
        raise SystemExit(f"Tiny-SCA file does not exist: {source_path}")
    if not source_path.is_file():
        raise SystemExit(f"Tiny-SCA path is not a file: {source_path}")
    if not source_path.name.endswith(TINY_SCA_FILE_SUFFIX):
        raise SystemExit(
            "Tiny-SCA source must match '*-tiny-sca.json'. "
            f"Got: {source_path.name}"
        )


def write_json(output_path: Path, payload: Any) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def main() -> None:
    args = parse_args()

    project_root = Path(args.project).resolve()
    validate_project_root(project_root)

    output_path = Path(args.output).resolve()

    if args.source:
        source_path = Path(args.source).resolve()
        validate_tiny_sca_source_path(source_path)

        result = build_package_trace_report(
            project_root=project_root,
            source_path=source_path,
        )
        write_json(output_path, result)

        packages_count = len(result)
        calls_count = sum(len(item["call_graph"]) for item in result)
        print(f"OK: analyzed package trace for {packages_count} packages")
        print(f"Python files: {len(iter_python_files(project_root))}")
        print(f"Target calls: {calls_count}")
        print(f"Source: {source_path}")
        print(f"Output: {output_path}")
        return

    if not args.lib:
        raise SystemExit("Either --source or --lib is required.")

    result = analyze_project(
        project_root=project_root,
        target_library=args.lib,
        ast_mode=args.ast_mode,
    )
    write_json(output_path, result)

    print(f"OK: analyzed {result['files_analyzed']} Python files")
    print(f"Target library: {args.lib}")
    print(f"Target imports: {result['summary']['target_imports_count']}")
    print(f"Target calls: {result['summary']['target_calls_count']}")
    print(f"Output: {output_path}")


if __name__ == "__main__":
    main()
