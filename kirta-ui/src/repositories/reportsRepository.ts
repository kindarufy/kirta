import { apiGetJson, apiPostJson, HttpError } from "@/api/http";
import type { ScanInfoDto } from "@/api/scanDtos";
import { scanInfoDtoToScaReport } from "@/api/scanDtos";
import type { Finding, Graph, ScaReport } from "@/types";

export interface ReportsRepository {
  getScaReport(scanId: number): Promise<ScaReport>;
  getGraphByLibrary(params: {
    scanId: number;
    packageName: string;
    version: string;
  }): Promise<Graph>;
  getFindingExplanation(scanId: number, findingId: number): Promise<Finding>;
}

export class ReportNotFoundError extends Error {
  constructor(public scanId: number) {
    super(`Отчет для сканирования #${scanId} не найден`);
    this.name = "ReportNotFoundError";
  }
}

export class GraphNotFoundError extends Error {
  constructor(
    public scanId: number,
    public packageName: string,
    public version: string,
  ) {
    super(
      `Call map не найден для ${packageName}@${version} в сканировании #${scanId}`,
    );
    this.name = "GraphNotFoundError";
  }
}

function graphPath(scanId: number, packageName: string, version: string): string {
  const qs = new URLSearchParams({
    package: packageName,
    version,
  });
  return `/v1/scans/${scanId}/graphs?${qs.toString()}`;
}

class HttpReportsRepository implements ReportsRepository {
  async getScaReport(scanId: number): Promise<ScaReport> {
    try {
      const dto = await apiGetJson<ScanInfoDto>(`/v1/scans/${scanId}`);
      return scanInfoDtoToScaReport(dto);
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) {
        throw new ReportNotFoundError(scanId);
      }
      throw e;
    }
  }

  async getGraphByLibrary(params: {
    scanId: number;
    packageName: string;
    version: string;
  }): Promise<Graph> {
    try {
      return await apiGetJson<Graph>(
        graphPath(params.scanId, params.packageName, params.version),
      );
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) {
        throw new GraphNotFoundError(params.scanId, params.packageName, params.version);
      }
      throw e;
    }
  }

  async getFindingExplanation(scanId: number, findingId: number): Promise<Finding> {
    return apiPostJson<Finding>(
      `/v1/scans/${scanId}/findings/${findingId}/explanation`,
    );
  }
}

export const reportsRepository: ReportsRepository = new HttpReportsRepository();
