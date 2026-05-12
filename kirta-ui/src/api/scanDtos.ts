import type { Finding } from "@/types/sca";
import type { Langs, Libraries, ScaReport } from "@/types/report";
import { ScanStatus, type Scan } from "@/types/scan";

export interface ScanBaseInfoDto {
  id: number;
  repository: string;
  status: string;
  sloc: number;
  sha256: string;
  created_at: string;
  finished_at: string;
}

export interface ScanInfoDto extends ScanBaseInfoDto {
  manifest: string;
  langs: Langs[];
  libraries: Libraries[];
  sca_report: Finding[];
}

function normalizeFinishedAt(raw: string): string | null {
  if (!raw || raw.startsWith("0001-01-01")) return null;
  return raw;
}

function decodeBase64Manifest(raw: string): string {
  if (!raw) return "";
  try {
    const binary = atob(raw);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return raw;
  }
}

export function scanBaseDtoToScan(dto: ScanBaseInfoDto): Scan {
  return {
    id: Number(dto.id),
    repository_archive: dto.repository,
    sloc: dto.sloc,
    sha256: dto.sha256,
    status: dto.status === "completed" ? ScanStatus.Ready : ScanStatus.Error,
    started_at: dto.created_at,
    finished_at: normalizeFinishedAt(dto.finished_at),
  };
}

export function scanInfoDtoToScaReport(dto: ScanInfoDto): ScaReport {
  return {
    scan_id: dto.id,
    repository_name: dto.repository,
    total_sloc: dto.sloc,
    manifest: decodeBase64Manifest(dto.manifest),
    langs: dto.langs,
    libraries: dto.libraries,
    findings: dto.sca_report,
  };
}
