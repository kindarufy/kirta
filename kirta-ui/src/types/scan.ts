export const ScanStatus = {
  Ready: 0,
  Error: 1,
} as const;

export type ScanStatus = (typeof ScanStatus)[keyof typeof ScanStatus];

export const SCAN_STATUS_LABEL: Record<ScanStatus, string> = {
  [ScanStatus.Ready]: "Готово",
  [ScanStatus.Error]: "Ошибка",
};

export interface Scan {
  id: number;
  repository_archive: string;
  sloc: number;
  sha256: string;
  status: ScanStatus;
  started_at: string;
  finished_at: string | null;
}
