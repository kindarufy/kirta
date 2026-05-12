#!/usr/bin/env python3
"""
Build one JSON file for KIRTA Agent.

The script joins:
- Tiny-SCA vulnerabilities;
- package trace report built by tools/kirta_analyzer.py from Tiny-SCA.

"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


JsonObject = dict[str, Any]
JsonArray = list[Any]


def read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON in {path}: {exc}") from exc


def write_json(path: Path, payload: Any, compact: bool) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    indent = None if compact else 2
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=indent),
        encoding="utf-8",
    )


def load_tiny_sca(path: Path) -> list[JsonObject]:
    """
    Loads Tiny-SCA in both supported formats:
    - array: [{...}, {...}]
    - wrapped: {"vulnerabilities": [{...}, {...}]}
    """
    data = read_json(path)

    if isinstance(data, list):
        vulnerabilities = data
    elif isinstance(data, dict) and isinstance(data.get("vulnerabilities"), list):
        vulnerabilities = data["vulnerabilities"]
    else:
        raise SystemExit(
            "Tiny-SCA must be a JSON array or an object with 'vulnerabilities' list."
        )

    return [item for item in vulnerabilities if isinstance(item, dict)]


def load_package_trace(path: Path) -> list[JsonObject]:
    data = read_json(path)

    if not isinstance(data, list):
        raise SystemExit("Package trace must be a JSON array.")

    result: list[JsonObject] = []
    for item in data:
        if not isinstance(item, dict):
            continue

        package = item.get("package")
        call_graph = item.get("call_graph")

        if not isinstance(package, str) or not package.strip():
            continue

        if not isinstance(call_graph, list):
            call_graph = []

        result.append(
            {
                "package": package.strip(),
                "call_graph": [call for call in call_graph if isinstance(call, dict)],
            }
        )

    return result


def package_name_from_vulnerability(vulnerability: JsonObject) -> str:
    package = vulnerability.get("package")
    if not isinstance(package, dict):
        return ""

    name = package.get("name")
    return name.strip() if isinstance(name, str) else ""


def unique_sorted(values: list[str]) -> list[str]:
    return sorted({value for value in values if value})


def build_trace_index(package_trace: list[JsonObject]) -> dict[str, JsonObject]:
    index: dict[str, JsonObject] = {}

    for item in package_trace:
        package = item.get("package")
        if not isinstance(package, str) or not package.strip():
            continue

        key = package.strip().casefold()
        if key not in index:
            index[key] = item
            continue

        # If the same package appears twice, merge call_graph safely.
        existing_calls = index[key].setdefault("call_graph", [])
        existing_ids = {call_identity(call) for call in existing_calls}

        for call in item.get("call_graph") or []:
            identity = call_identity(call)
            if identity in existing_ids:
                continue
            existing_ids.add(identity)
            existing_calls.append(call)

    return index


def call_identity(call: JsonObject) -> tuple[Any, ...]:
    return (
        call.get("file"),
        call.get("caller"),
        call.get("lineno"),
        call.get("col_offset"),
        call.get("call"),
        call.get("resolved"),
        call.get("source"),
    )


def usage_summary(package_name: str, trace_index: dict[str, JsonObject]) -> JsonObject:
    trace = trace_index.get(package_name.casefold()) if package_name else None
    calls = trace.get("call_graph", []) if isinstance(trace, dict) else []

    files = unique_sorted(
        [str(call.get("file") or "") for call in calls if isinstance(call, dict)]
    )

    return {
        "package": package_name,
        "is_used_in_project": bool(calls),
        "calls_count": len(calls),
        "files": files,
        "trace_ref": package_name,
    }


def enrich_vulnerabilities(
    vulnerabilities: list[JsonObject],
    trace_index: dict[str, JsonObject],
) -> list[JsonObject]:
    enriched: list[JsonObject] = []

    for vulnerability in vulnerabilities:
        package_name = package_name_from_vulnerability(vulnerability)
        item = dict(vulnerability)
        item["code_usage"] = usage_summary(package_name, trace_index)
        enriched.append(item)

    return enriched


def build_summary(
    vulnerabilities: list[JsonObject],
    package_trace: list[JsonObject],
    trace_index: dict[str, JsonObject],
) -> JsonObject:
    severity_counter: Counter[str] = Counter()
    package_counter: Counter[str] = Counter()
    vulnerabilities_with_code_usage = 0

    for vulnerability in vulnerabilities:
        severity_counter[str(vulnerability.get("severity") or "Unknown")] += 1

        package_name = package_name_from_vulnerability(vulnerability)
        if package_name:
            package_counter[package_name] += 1

        calls = trace_index.get(package_name.casefold(), {}).get("call_graph", [])
        if calls:
            vulnerabilities_with_code_usage += 1

    package_usage = []
    total_package_calls = 0

    for item in package_trace:
        package = str(item.get("package") or "")
        calls = item.get("call_graph") or []
        calls_count = len(calls)
        total_package_calls += calls_count
        package_usage.append(
            {
                "package": package,
                "calls_count": calls_count,
                "files_count": len(
                    unique_sorted(
                        [
                            str(call.get("file") or "")
                            for call in calls
                            if isinstance(call, dict)
                        ]
                    )
                ),
            }
        )

    package_usage.sort(key=lambda item: (-item["calls_count"], item["package"]))

    return {
        "vulnerabilities_total": len(vulnerabilities),
        "vulnerabilities_by_severity": dict(severity_counter),
        "vulnerable_packages_total": len(package_counter),
        "vulnerabilities_by_package": dict(package_counter),
        "packages_in_trace_total": len(package_trace),
        "packages_used_in_code_total": sum(
            1 for item in package_usage if item["calls_count"] > 0
        ),
        "vulnerabilities_with_code_usage_total": vulnerabilities_with_code_usage,
        "total_package_calls": total_package_calls,
        "top_used_packages": package_usage[:10],
    }


def build_agent_input(
    repo_name: str,
    tiny_sca_path: Path,
    package_trace_path: Path,
    project_path: str | None,
    sbom_path: str | None,
    sca_path: str | None,
    tiny_sca_display_path: str,
    package_trace_display_path: str,
) -> JsonObject:
    vulnerabilities = load_tiny_sca(tiny_sca_path)
    package_trace = load_package_trace(package_trace_path)
    trace_index = build_trace_index(package_trace)
    enriched_vulnerabilities = enrich_vulnerabilities(vulnerabilities, trace_index)

    return {
        "schema_version": "kirta.agent-input.v1",
        "tool": "kirta_agent_input_builder.py",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "repository": {
            "name": repo_name,
            "project_path": project_path or "",
        },
        "source_files": {
            "tiny_sca": tiny_sca_display_path,
            "package_trace": package_trace_display_path,
            "sbom": sbom_path or "",
            "sca": sca_path or "",
        },
        "summary": build_summary(vulnerabilities, package_trace, trace_index),
        "vulnerabilities": enriched_vulnerabilities,
        "package_traces": package_trace,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Join Tiny-SCA and package trace into one KIRTA Agent input JSON."
    )
    parser.add_argument(
        "--repo-name",
        required=True,
        help="Repository name shown in the output JSON.",
    )
    parser.add_argument(
        "--project",
        help="Optional path to analyzed project root. Saved as metadata only.",
    )
    parser.add_argument(
        "--tiny-sca",
        required=True,
        help="Path to *-tiny-sca.json.",
    )
    parser.add_argument(
        "--package-trace",
        required=True,
        help="Path to *-package-trace.json.",
    )
    parser.add_argument(
        "--sbom",
        help="Optional path to CycloneDX SBOM. Saved as metadata only.",
    )
    parser.add_argument(
        "--sca",
        help="Optional path to original Grype SCA report. Saved as metadata only.",
    )
    parser.add_argument(
        "--output",
        required=True,
        help="Path to output *-agent-input.json.",
    )
    parser.add_argument(
        "--compact",
        action="store_true",
        help="Write JSON without indentation.",
    )
    return parser.parse_args()


def validate_file(path: Path, label: str) -> None:
    if not path.exists():
        raise SystemExit(f"{label} does not exist: {path}")
    if not path.is_file():
        raise SystemExit(f"{label} is not a file: {path}")


def main() -> None:
    args = parse_args()

    tiny_sca_path = Path(args.tiny_sca).resolve()
    package_trace_path = Path(args.package_trace).resolve()
    output_path = Path(args.output).resolve()

    validate_file(tiny_sca_path, "Tiny-SCA file")
    validate_file(package_trace_path, "Package trace file")

    payload = build_agent_input(
        repo_name=args.repo_name,
        tiny_sca_path=tiny_sca_path,
        package_trace_path=package_trace_path,
        project_path=args.project,
        sbom_path=args.sbom,
        sca_path=args.sca,
        tiny_sca_display_path=args.tiny_sca,
        package_trace_display_path=args.package_trace,
    )
    write_json(output_path, payload, compact=args.compact)

    summary = payload["summary"]
    print("OK: built KIRTA Agent input")
    print(f"Repository: {args.repo_name}")
    print(f"Vulnerabilities: {summary['vulnerabilities_total']}")
    print(f"Packages in trace: {summary['packages_in_trace_total']}")
    print(f"Package calls: {summary['total_package_calls']}")
    print(f"Output: {output_path}")


if __name__ == "__main__":
    main()
