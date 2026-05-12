#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from tracer import build_tiny_findings


def to_cve_list(raw_cve: Any) -> list[str]:
    if isinstance(raw_cve, list):
        values = [str(v) for v in raw_cve if str(v).strip()]
        return values if values else [""]
    cve = str(raw_cve or "")
    return [cve] if cve else [""]


def normalize_fixed_version(raw: Any) -> list[str]:
    if isinstance(raw, list):
        result = [str(v) for v in raw if str(v).strip()]
        return result if result else [""]
    if raw in (None, ""):
        return [""]
    return [str(raw)]


def build_sca_findings(sca_path: Path) -> list[dict[str, Any]]:
    tiny_findings = build_tiny_findings(sca_path)
    findings: list[dict[str, Any]] = []

    for idx, finding in enumerate(tiny_findings, start=1):
        package = finding.get("package") or {}
        findings.append(
            {
                "id": idx,
                "package": str(package.get("name") or ""),
                "version": str(package.get("version") or ""),
                "severity": str(finding.get("severity") or ""),
                "state": str(finding.get("state") or ""),
                "fixed_version": normalize_fixed_version(finding.get("fixed_version")),
                "cve": to_cve_list(finding.get("cve")),
                "description": str(finding.get("description") or ""),
                "exploitable": "unknown",
                "explanation": "",
            }
        )

    return findings


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build ScaFinding JSON array from Grype report (without call_map)."
    )
    parser.add_argument("--sca", required=True, help="Path to Grype SCA JSON report.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    sca_path = Path(args.sca).resolve()
    if not sca_path.exists() or not sca_path.is_file():
        raise SystemExit(f"SCA file does not exist: {sca_path}")

    findings = build_sca_findings(sca_path)
    print(json.dumps(findings, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
