#!/usr/bin/env python3
"""
Run the KIRTA artifact generation pipeline for one repository.

Pipeline:
1. Generate SBOM with Syft in CycloneDX JSON format: <repo>.cdx.json
2. Generate SCA report with Grype in JSON format: <repo>-sca.json
3. Generate compact Tiny-SCA report: <repo>-tiny-sca.json
4. Generate package trace / call graph: <repo>-package-trace.json

Example:
    python3 kirta.py ./test-repo/dvpwa -o ./test-result/dvpwa
"""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ArtifactPaths:
    """All output paths produced by the pipeline."""

    output_dir: Path
    sbom: Path
    sca: Path
    tiny_sca: Path
    package_trace: Path


class PipelineError(RuntimeError):
    """Raised when an external command fails."""


INVALID_FILENAME_CHARS_RE = re.compile(r'[<>:"/\\|?*\x00-\x1f]')


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Generate KIRTA artifacts for a repository: SBOM, SCA, "
            "Tiny-SCA and package trace."
        )
    )
    parser.add_argument(
        "repository",
        help="Path to the repository with source code.",
    )
    parser.add_argument(
        "-o",
        "--output-dir",
        required=True,
        help="Directory where generated artifacts will be saved.",
    )
    parser.add_argument(
        "--syft-bin",
        default="syft",
        help="Syft executable name/path. Default: syft.",
    )
    parser.add_argument(
        "--grype-bin",
        default="grype",
        help="Grype executable name/path. Default: grype.",
    )
    parser.add_argument(
        "--compact-tiny-sca",
        action="store_true",
        help="Write Tiny-SCA JSON without indentation.",
    )
    return parser.parse_args()


def validate_repository(repository: Path) -> Path:
    repository = repository.expanduser().resolve()

    if not repository.exists():
        raise SystemExit(f"Repository path does not exist: {repository}")
    if not repository.is_dir():
        raise SystemExit(f"Repository path is not a directory: {repository}")

    return repository


def safe_repo_name(repository: Path) -> str:
    name = repository.name.strip() or "repository"
    name = INVALID_FILENAME_CHARS_RE.sub("_", name)
    name = re.sub(r"\s+", "_", name)
    return name or "repository"


def build_artifact_paths(output_dir: Path, repo_name: str) -> ArtifactPaths:
    output_dir = output_dir.expanduser().resolve()
    return ArtifactPaths(
        output_dir=output_dir,
        sbom=output_dir / f"{repo_name}.cdx.json",
        sca=output_dir / f"{repo_name}-sca.json",
        tiny_sca=output_dir / f"{repo_name}-tiny-sca.json",
        package_trace=output_dir / f"{repo_name}-package-trace.json",
    )


def ensure_external_tools(args: argparse.Namespace) -> None:
    missing = [
        tool
        for tool in (args.syft_bin, args.grype_bin)
        if shutil.which(tool) is None and not Path(tool).exists()
    ]

    if missing:
        missing_tools = ", ".join(missing)
        raise SystemExit(
            f"Required external tool(s) not found: {missing_tools}. "
            "Install Syft and Grype or pass --syft-bin/--grype-bin."
        )


def run_command(command: list[str], *, stdout_path: Path | None = None) -> None:
    printable = " ".join(command)
    print(f"$ {printable}", flush=True)

    try:
        if stdout_path is None:
            subprocess.run(command, check=True)
        else:
            stdout_path.parent.mkdir(parents=True, exist_ok=True)
            with stdout_path.open("w", encoding="utf-8") as output_file:
                subprocess.run(command, check=True, stdout=output_file)
    except FileNotFoundError as exc:
        raise PipelineError(
            f"Command was not found: {command[0]}. "
            "Install the required tool or pass its path via CLI flag."
        ) from exc
    except subprocess.CalledProcessError as exc:
        raise PipelineError(
            f"Command failed with exit code {exc.returncode}: {printable}"
        ) from exc


def generate_sbom(syft_bin: str, repository: Path, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    run_command(
        [
            syft_bin,
            "scan",
            f"dir:{repository}",
            "--output",
            f"cyclonedx-json={output_path}",
        ]
    )


def generate_sca(grype_bin: str, sbom_path: Path, output_path: Path) -> None:
    run_command(
        [
            grype_bin,
            f"sbom:{sbom_path}",
            "--output",
            "json",
        ],
        stdout_path=output_path,
    )


def generate_tiny_sca(sca_path: Path, output_path: Path, compact: bool) -> None:
    script_path = Path(__file__).resolve().parent / "sca-tinifier.py"
    command = [
        sys.executable,
        str(script_path),
        "--source",
        str(sca_path),
        "--output",
        str(output_path),
    ]

    if compact:
        command.append("--compact")

    run_command(command)


def generate_package_trace(
    repository: Path,
    tiny_sca_path: Path,
    output_path: Path,
) -> None:
    script_path = Path(__file__).resolve().parent / "tools" / "kirta_analyzer.py"
    run_command(
        [
            sys.executable,
            str(script_path),
            "--project",
            str(repository),
            "--source",
            str(tiny_sca_path),
            "--output",
            str(output_path),
        ]
    )


def run_pipeline(args: argparse.Namespace) -> ArtifactPaths:
    repository = validate_repository(Path(args.repository))
    repo_name = safe_repo_name(repository)
    artifacts = build_artifact_paths(Path(args.output_dir), repo_name)
    artifacts.output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Repository: {repository}", flush=True)
    print(f"Repository name: {repo_name}", flush=True)
    print(f"Output directory: {artifacts.output_dir}", flush=True)

    print("\n[1/4] Generating SBOM with Syft...", flush=True)
    generate_sbom(args.syft_bin, repository, artifacts.sbom)

    print("\n[2/4] Generating SCA report with Grype...", flush=True)
    generate_sca(args.grype_bin, artifacts.sbom, artifacts.sca)

    print("\n[3/4] Generating Tiny-SCA report...", flush=True)
    generate_tiny_sca(
        sca_path=artifacts.sca,
        output_path=artifacts.tiny_sca,
        compact=args.compact_tiny_sca,
    )

    print("\n[4/4] Generating package trace / call graph...", flush=True)
    generate_package_trace(
        repository=repository,
        tiny_sca_path=artifacts.tiny_sca,
        output_path=artifacts.package_trace,
    )

    return artifacts


def print_summary(artifacts: ArtifactPaths) -> None:
    print("\nDone. Generated artifacts:", flush=True)
    print(f"SBOM:          {artifacts.sbom}", flush=True)
    print(f"SCA:           {artifacts.sca}", flush=True)
    print(f"Tiny-SCA:      {artifacts.tiny_sca}", flush=True)
    print(f"Package trace: {artifacts.package_trace}", flush=True)

    print("\nFinal artifacts for KIRTA Agent:", flush=True)
    print(f"- {artifacts.tiny_sca.name}", flush=True)
    print(f"- {artifacts.package_trace.name}", flush=True)


def main() -> None:
    args = parse_args()
    ensure_external_tools(args)

    try:
        artifacts = run_pipeline(args)
    except PipelineError as exc:
        raise SystemExit(f"ERROR: {exc}") from exc

    print_summary(artifacts)


if __name__ == "__main__":
    main()
