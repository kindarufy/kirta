import { apiGetJson, apiPostFormData, HttpError } from "@/api/http";
import type { ScanBaseInfoDto, ScanInfoDto } from "@/api/scanDtos";
import { scanBaseDtoToScan } from "@/api/scanDtos";
import type { Scan } from "@/types";

export interface ScansRepository {
  getScans(): Promise<Scan[]>;
  createScan(file: File): Promise<Scan>;
}

const SCAN_LANG_REJECTED =
  "Поддерживается только проект на Python (в архиве не найден код Python).";

class HttpScansRepository implements ScansRepository {
  async getScans(): Promise<Scan[]> {
    const rows = await apiGetJson<ScanBaseInfoDto[]>("/v1/scans");
    return rows.map(scanBaseDtoToScan).sort((a, b) => b.id - a.id);
  }

  async createScan(file: File): Promise<Scan> {
    const form = new FormData();
    form.append("file", file);
    try {
      const dto = await apiPostFormData<ScanInfoDto>("/v1/scan", form);
      return scanBaseDtoToScan(dto);
    } catch (e) {
      if (e instanceof HttpError && e.status === 401) {
        throw new Error(SCAN_LANG_REJECTED);
      }
      throw e;
    }
  }
}

export const scansRepository: ScansRepository = new HttpScansRepository();
