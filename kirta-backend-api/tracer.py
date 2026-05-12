#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ast
import json
import re
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

CVE_RE = re.compile(r"CVE-\d{4}-\d{4,}", re.IGNORECASE)

SEVERITY_ORDER = {
    "Critical": 0,
    "High": 1,
    "Medium": 2,
    "Low": 3,
    "Negligible": 4,
    "Unknown": 5,
    "": 6,
}


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


def normalize_text(value: Any, max_chars: int) -> str:
    if not isinstance(value, str):
        return ""

    text = " ".join(value.split())

    if max_chars > 0 and len(text) > max_chars:
        text = text[: max_chars - 1].rstrip() + "…"

    return text


def unique_keep_order(items: list[Any]) -> list[Any]:
    result: list[Any] = []
    seen: set[str] = set()

    for item in items:
        key = json.dumps(item, sort_keys=True, ensure_ascii=False)
        if key in seen:
            continue
        seen.add(key)
        result.append(item)

    return result


def find_cve(match: dict[str, Any]) -> str:
    vulnerability = match.get("vulnerability") or {}
    related_vulnerabilities = match.get("relatedVulnerabilities") or []

    candidates: list[str] = []

    for cwe in vulnerability.get("cwes") or []:
        if isinstance(cwe, dict):
            cwe_cve = cwe.get("cve")
            if cwe_cve:
                candidates.append(str(cwe_cve))

    for related in related_vulnerabilities:
        if not isinstance(related, dict):
            continue

        related_id = related.get("id")
        if related_id:
            candidates.append(str(related_id))

        for cwe in related.get("cwes") or []:
            if isinstance(cwe, dict):
                cwe_cve = cwe.get("cve")
                if cwe_cve:
                    candidates.append(str(cwe_cve))

    candidates.append(str(vulnerability.get("id") or ""))

    for url in vulnerability.get("urls") or []:
        candidates.extend(CVE_RE.findall(str(url)))

    for candidate in candidates:
        candidate = candidate.upper()
        if CVE_RE.fullmatch(candidate):
            return candidate

    return str(vulnerability.get("id") or "")


def build_package(artifact: dict[str, Any], max_locations: int) -> dict[str, Any]:
    locations = []
    for location in artifact.get("locations") or []:
        if not isinstance(location, dict):
            continue
        path = location.get("path")
        if path:
            locations.append(path)

    package: dict[str, Any] = {
        "name": artifact.get("name") or "",
        "version": artifact.get("version") or "",
        "type": artifact.get("type") or "",
        "language": artifact.get("language") or "",
        "purl": artifact.get("purl") or "",
    }
    if locations:
        package["locations"] = unique_keep_order(locations)[:max_locations]

    return package


def build_cwes(match: dict[str, Any], max_cwes: int) -> list[dict[str, str]]:
    vulnerability = match.get("vulnerability") or {}
    related_vulnerabilities = match.get("relatedVulnerabilities") or []

    raw_cwes = list(vulnerability.get("cwes") or [])
    for related in related_vulnerabilities:
        if isinstance(related, dict):
            raw_cwes.extend(related.get("cwes") or [])

    cwes: list[dict[str, str]] = []
    for cwe in raw_cwes:
        if isinstance(cwe, dict):
            cwes.append(
                {
                    "cve": str(cwe.get("cve") or ""),
                    "cwe": str(cwe.get("cwe") or ""),
                    "source": str(cwe.get("source") or ""),
                    "type": str(cwe.get("type") or ""),
                }
            )
        else:
            cwes.append(
                {
                    "cve": "",
                    "cwe": str(cwe),
                    "source": "",
                    "type": "",
                }
            )

    return unique_keep_order(cwes)[:max_cwes]


def normalize_fix_state(fix: Any) -> str:
    if not isinstance(fix, dict):
        return ""
    state = fix.get("state")
    if isinstance(state, str):
        return state
    return ""


def normalize_fixed_versions(fix: Any) -> list[str]:
    if not isinstance(fix, dict):
        return [""]
    versions = fix.get("versions")
    if not isinstance(versions, list):
        return [""]

    result: list[str] = []
    for value in versions:
        if isinstance(value, str):
            result.append(value)
        elif value is not None:
            result.append(str(value))

    return result if result else [""]


def compact_match(
    match: dict[str, Any],
    max_description_chars: int,
    max_locations: int,
    max_cwes: int,
) -> dict[str, Any]:
    vulnerability = match.get("vulnerability") or {}
    artifact = match.get("artifact") or {}
    fix = vulnerability.get("fix") or {}

    return {
        "cve": find_cve(match),
        "description": normalize_text(
            vulnerability.get("description") or "",
            max_description_chars,
        ),
        "package": build_package(artifact, max_locations),
        "severity": vulnerability.get("severity") or "",
        "state": normalize_fix_state(fix),
        "fixed_version": normalize_fixed_versions(fix),
        "cwes": build_cwes(match, max_cwes),
    }


def dedupe_findings(findings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result_by_key: dict[tuple[str, str, str], dict[str, Any]] = {}

    for finding in findings:
        package = finding.get("package") or {}
        key = (
            str(finding.get("cve") or ""),
            str(package.get("name") or ""),
            str(package.get("version") or ""),
        )

        if key not in result_by_key:
            result_by_key[key] = finding
            continue

        existing = result_by_key[key]
        existing["cwes"] = unique_keep_order(
            list(existing.get("cwes") or []) + list(finding.get("cwes") or [])
        )

    return list(result_by_key.values())


def severity_sort_key(finding: dict[str, Any]) -> tuple[int, str, str]:
    package = finding.get("package") or {}
    return (
        SEVERITY_ORDER.get(str(finding.get("severity") or ""), 99),
        str(package.get("name") or ""),
        str(finding.get("cve") or ""),
    )


def tinify_sca(
    source_path: Path,
    max_description_chars: int,
    max_locations: int,
    max_cwes: int,
    dedupe: bool,
) -> list[dict[str, Any]]:
    data = json.loads(source_path.read_text(encoding="utf-8"))

    if isinstance(data, dict):
        matches = data.get("matches") or []
    elif isinstance(data, list):
        matches = data
    else:
        raise ValueError("Source JSON must be an object or a list.")

    findings = [
        compact_match(
            match=match,
            max_description_chars=max_description_chars,
            max_locations=max_locations,
            max_cwes=max_cwes,
        )
        for match in matches
        if isinstance(match, dict)
    ]

    if dedupe:
        findings = dedupe_findings(findings)

    return sorted(findings, key=severity_sort_key)


def is_python_file(path: Path) -> bool:
    return path.suffix == ".py" and all(part not in SKIP_DIRS for part in path.parts)


def iter_python_files(project_root: Path) -> list[Path]:
    return sorted(
        path
        for path in project_root.rglob("*.py")
        if is_python_file(path.relative_to(project_root))
    )


def read_text_safely(path: Path) -> str:
    try:
        source = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        source = path.read_text(encoding="utf-8", errors="replace")
    return source.replace("\x00", "")


def matches_library(resolved: str, lib: str) -> bool:
    return resolved == lib or resolved.startswith(lib + ".")


def dotted_name(node: ast.AST) -> Optional[str]:
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


def analyze_file(
    path: Path,
    project_root: Path,
    target_library: str,
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
    except ValueError as exc:
        return {
            "path": relative_file,
            "syntax_error": {
                "message": str(exc),
                "lineno": None,
                "offset": None,
                "text": None,
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
        "ast": None,
        "call_graph": [asdict(call) for call in analyzer.calls],
    }


def analyze_project(
    project_root: Path,
    target_library: str,
) -> dict[str, Any]:
    files = []
    all_calls = []
    all_target_imports = []
    syntax_errors = []

    python_files = iter_python_files(project_root)
    for path in python_files:
        file_result = analyze_file(path, project_root, target_library)
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


def package_import_candidates(package_name: str) -> list[str]:
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


def build_tiny_findings(sca_path: Path) -> list[dict[str, Any]]:
    return tinify_sca(
        source_path=sca_path,
        max_description_chars=500,
        max_locations=5,
        max_cwes=10,
        dedupe=True,
    )


def extract_package_names(findings: list[dict[str, Any]]) -> list[str]:
    names: list[str] = []
    seen: set[str] = set()

    for finding in findings:
        package = finding.get("package") or {}
        name = package.get("name")
        if not isinstance(name, str):
            continue

        clean = name.strip()
        if not clean:
            continue

        key = clean.casefold()
        if key in seen:
            continue

        seen.add(key)
        names.append(clean)

    return names


def build_package_trace_map(
    project_root: Path,
    package_names: list[str],
) -> dict[str, list[dict[str, Any]]]:
    trace_map: dict[str, list[dict[str, Any]]] = {}

    for package_name in package_names:
        calls: list[dict[str, Any]] = []
        seen_calls: set[tuple[Any, ...]] = set()

        for import_name in package_import_candidates(package_name):
            result = analyze_project(
                project_root=project_root,
                target_library=import_name,
            )

            for call in result.get("call_graph", []):
                identity = call_identity(call)
                if identity in seen_calls:
                    continue

                seen_calls.add(identity)
                calls.append(call)

        trace_map[package_name.casefold()] = calls

    return trace_map


def group_call_map_by_file(calls: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, dict[str, Any]] = {}

    for call in calls:
        file_path = str(call.get("file") or "")
        line = call.get("lineno")
        if not isinstance(line, int):
            continue

        if file_path not in grouped:
            grouped[file_path] = {
                "file": file_path,
                "lines_set": set(),
                "calls": [],
            }

        grouped[file_path]["lines_set"].add(line)
        args_count_value = call.get("args_count")
        if isinstance(args_count_value, int):
            args_count = args_count_value
        else:
            try:
                args_count = int(args_count_value or 0)
            except (TypeError, ValueError):
                args_count = 0

        grouped[file_path]["calls"].append(
            {
                "line": line,
                "caller": str(call.get("caller") or ""),
                "call_method": str(call.get("call") or ""),
                "resolved": str(call.get("resolved") or ""),
                "source": str(call.get("source") or ""),
                "args_count": args_count,
            }
        )

    result: list[dict[str, Any]] = []
    for file_path in sorted(grouped):
        entry = grouped[file_path]
        lines = sorted(entry["lines_set"])
        calls_in_file = sorted(
            entry["calls"],
            key=lambda item: (item["line"], item["call_method"], item["resolved"]),
        )
        result.append(
            {
                "file": file_path,
                "lines": lines,
                "calls": calls_in_file,
            }
        )

    return result


def build_findings(
    tiny_findings: list[dict[str, Any]],
    trace_map: dict[str, list[dict[str, Any]]],
) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []

    for idx, finding in enumerate(tiny_findings, start=1):
        package = finding.get("package") or {}
        package_name = str(package.get("name") or "")
        package_version = str(package.get("version") or "")
        cve_value = str(finding.get("cve") or "")
        cve_list = [cve_value] if cve_value else [""]

        package_calls = trace_map.get(package_name.casefold(), [])
        call_map = group_call_map_by_file(package_calls)

        fixed_version_value = finding.get("fixed_version")
        if isinstance(fixed_version_value, list):
            fixed_version = [
                value if isinstance(value, str) else str(value)
                for value in fixed_version_value
            ] or [""]
        elif fixed_version_value in (None, ""):
            fixed_version = [""]
        else:
            fixed_version = [str(fixed_version_value)]

        findings.append(
            {
                "id": idx,
                "package": package_name,
                "version": package_version,
                "severity": str(finding.get("severity") or ""),
                "state": str(finding.get("state") or ""),
                "fixed_version": fixed_version,
                "cve": cve_list,
                "description": str(finding.get("description") or ""),
                "exploitable": False,
                "explanation": "",
                "call_map": call_map,
            }
        )

    return findings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Build findings by combining Grype SCA data and static package call maps."
        )
    )
    parser.add_argument(
        "--dir",
        required=True,
        help="Path to Python project directory.",
    )
    parser.add_argument(
        "--sca",
        required=True,
        help="Path to Grype SCA JSON report.",
    )
    return parser.parse_args()


def validate_inputs(project_root: Path, sca_path: Path) -> None:
    if not project_root.exists():
        raise SystemExit(f"Project path does not exist: {project_root}")
    if not project_root.is_dir():
        raise SystemExit(f"Project path is not a directory: {project_root}")

    if not sca_path.exists():
        raise SystemExit(f"SCA file does not exist: {sca_path}")
    if not sca_path.is_file():
        raise SystemExit(f"SCA path is not a file: {sca_path}")


def main() -> None:
    args = parse_args()
    project_root = Path(args.dir).resolve()
    sca_path = Path(args.sca).resolve()
    validate_inputs(project_root, sca_path)

    tiny_findings = build_tiny_findings(sca_path)
    package_names = extract_package_names(tiny_findings)
    trace_map = build_package_trace_map(project_root, package_names)
    findings = build_findings(tiny_findings, trace_map)

    print(json.dumps(findings, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
