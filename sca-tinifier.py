#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any


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


def normalize_text(value: Any, max_chars: int) -> str:
    """Сжимает пробелы и при необходимости обрезает длинное описание."""
    if not isinstance(value, str):
        return ""

    text = " ".join(value.split())

    if max_chars > 0 and len(text) > max_chars:
        text = text[: max_chars - 1].rstrip() + "…"

    return text


def unique_keep_order(items: list[Any]) -> list[Any]:
    """Удаляет дубликаты, сохраняя исходный порядок."""
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
    """
    Возвращает CVE для compact-отчёта.

    Если основная уязвимость в Grype хранится как GHSA,
    скрипт пытается найти CVE в relatedVulnerabilities и urls.
    Если CVE нет, возвращается исходный id уязвимости.
    """
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
    """Оставляет только минимально полезную информацию о пакете."""
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
    """Собирает CWE из vulnerability и relatedVulnerabilities."""
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


def compact_match(
    match: dict[str, Any],
    max_description_chars: int,
    max_locations: int,
    max_cwes: int,
) -> dict[str, Any]:
    """Преобразует один Grype match в tiny-SCA объект."""
    vulnerability = match.get("vulnerability") or {}
    artifact = match.get("artifact") or {}

    return {
        "cve": find_cve(match),
        "description": normalize_text(
            vulnerability.get("description") or "",
            max_description_chars,
        ),
        "package": build_package(artifact, max_locations),
        "severity": vulnerability.get("severity") or "",
        "cwes": build_cwes(match, max_cwes),
    }


def dedupe_findings(findings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Убирает полные дубли по CVE + package name + package version.

    Если у дублей отличаются CWE, они объединяются.
    """
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
    """Сортирует отчёт: Critical -> High -> Medium -> Low."""
    package = finding.get("package") or {}

    return (
        SEVERITY_ORDER.get(str(finding.get("severity") or ""), 99),
        str(package.get("name") or ""),
        str(finding.get("cve") or ""),
    )


def build_summary(findings: list[dict[str, Any]]) -> dict[str, Any]:
    """Строит короткую статистику для wrapped-формата."""
    severity_counter = Counter(str(finding.get("severity") or "") for finding in findings)
    package_counter = Counter(
        str((finding.get("package") or {}).get("name") or "") for finding in findings
    )

    return {
        "total": len(findings),
        "by_severity": dict(severity_counter),
        "packages": dict(package_counter),
    }


def tinify_sca(
    source_path: Path,
    max_description_chars: int,
    max_locations: int,
    max_cwes: int,
    dedupe: bool,
) -> list[dict[str, Any]]:
    """Читает Grype JSON и возвращает список tiny-SCA объектов."""
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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert a large Grype SCA JSON report into a small KIRTA tiny-SCA JSON."
    )

    parser.add_argument(
        "--source",
        required=True,
        help="Path to source Grype SCA JSON file.",
    )
    parser.add_argument(
        "--output",
        required=True,
        help="Path to output tiny-SCA JSON file.",
    )
    parser.add_argument(
        "--format",
        choices=("array", "wrapped"),
        default="array",
        help="array = only tiny findings; wrapped = metadata + summary + vulnerabilities.",
    )
    parser.add_argument(
        "--max-description-chars",
        type=int,
        default=500,
        help="Maximum description length. Use 0 to disable trimming.",
    )
    parser.add_argument(
        "--max-locations",
        type=int,
        default=5,
        help="Maximum package locations to keep.",
    )
    parser.add_argument(
        "--max-cwes",
        type=int,
        default=10,
        help="Maximum CWE objects to keep per vulnerability.",
    )
    parser.add_argument(
        "--no-dedupe",
        action="store_true",
        help="Do not deduplicate findings by CVE + package + version.",
    )
    parser.add_argument(
        "--compact",
        action="store_true",
        help="Write JSON without indentation.",
    )

    return parser.parse_args()


def main() -> None:
    args = parse_args()

    source_path = Path(args.source)
    output_path = Path(args.output)

    if not source_path.exists():
        raise FileNotFoundError(f"Source SCA report not found: {source_path}")

    findings = tinify_sca(
        source_path=source_path,
        max_description_chars=args.max_description_chars,
        max_locations=args.max_locations,
        max_cwes=args.max_cwes,
        dedupe=not args.no_dedupe,
    )

    if args.format == "wrapped":
        result: Any = {
            "schema_version": "kirta.tiny-sca.v1",
            "source": source_path.name,
            "summary": build_summary(findings),
            "vulnerabilities": findings,
        }
    else:
        result = findings

    output_path.parent.mkdir(parents=True, exist_ok=True)

    indent = None if args.compact else 2

    output_path.write_text(
        json.dumps(result, ensure_ascii=False, indent=indent),
        encoding="utf-8",
    )

    print(f"Saved {len(findings)} tiny SCA findings to {output_path}")


if __name__ == "__main__":
    main()
