import { apiGetText, HttpError } from "@/api/http";

export interface SourceCodeRepository {
  getSourceCode(params: { scanId: number; fileName: string }): Promise<string>;
}

export class SourceCodeNotFoundError extends Error {
  constructor(
    public scanId: number,
    public fileName: string,
  ) {
    super(`Не удалось получить ${fileName} для сканирования #${scanId}`);
    this.name = "SourceCodeNotFoundError";
  }
}

function filesPath(scanId: number, fileName: string): string {
  const encoded = fileName.split("/").map(encodeURIComponent).join("/");
  return `/v1/scans/${scanId}/files/${encoded}`;
}

class HttpSourceCodeRepository implements SourceCodeRepository {
  async getSourceCode(params: { scanId: number; fileName: string }): Promise<string> {
    try {
      return await apiGetText(filesPath(params.scanId, params.fileName));
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) {
        throw new SourceCodeNotFoundError(params.scanId, params.fileName);
      }
      throw e;
    }
  }
}

export const sourceCodeRepository: SourceCodeRepository = new HttpSourceCodeRepository();
