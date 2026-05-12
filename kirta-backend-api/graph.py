#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from tracer import (
    analyze_project,
    call_identity,
    group_call_map_by_file,
    package_import_candidates,
)


def read_libraries(libs_path: Path) -> list[dict[str, str]]:
    raw = json.loads(libs_path.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise ValueError("Libraries JSON must be an array.")

    result: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()

    for item in raw:
        if isinstance(item, dict):
            package = str(item.get("package") or "").strip()
            version = str(item.get("version") or "").strip()
        else:
            package = str(item or "").strip()
            version = ""

        if not package:
            continue

        key = (package.casefold(), version)
        if key in seen:
            continue
        seen.add(key)
        result.append(
            {
                "package": package,
                "version": version,
            }
        )

    return result


def build_graphs(project_root: Path, libraries: list[dict[str, str]]) -> list[dict[str, Any]]:
    graphs: list[dict[str, Any]] = []

    for library in libraries:
        package_name = library["package"]
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

        graphs.append(
            {
                "package": package_name,
                "version": library["version"],
                "call_map": group_call_map_by_file(calls),
            }
        )

    return graphs


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build call_map graph JSON array for a list of libraries."
    )
    parser.add_argument("--dir", required=True, help="Path to Python project directory.")
    parser.add_argument("--libs", required=True, help="Path to libraries JSON file.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    project_root = Path(args.dir).resolve()
    libs_path = Path(args.libs).resolve()

    if not project_root.exists() or not project_root.is_dir():
        raise SystemExit(f"Project path is not a directory: {project_root}")
    if not libs_path.exists() or not libs_path.is_file():
        raise SystemExit(f"Libraries file does not exist: {libs_path}")

    libraries = read_libraries(libs_path)
    graphs = build_graphs(project_root, libraries)
    print(json.dumps(graphs, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
