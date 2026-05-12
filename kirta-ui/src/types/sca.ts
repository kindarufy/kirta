export interface CallItem {
  line: number;
  caller: string;
  call_method: string;
  resolved: string;
  source: string;
  args_count: number;
}

export interface CallMap {
  file: string;
  lines: number[];
  calls: CallItem[];
}

export type ExploitabilityStatus =
  | "exploitable"
  | "not_exploitable"
  | "unknown";

/** Поля одной уязвимости для карточки на странице дефекта. */
export interface CveIssue {
  cve: string[];
  severity: string;
  state: string;
  fixed_version: string[];
  description: string;
  exploitable: ExploitabilityStatus;
  explanation: string;
}

export interface Finding {
  id: number;
  package: string;
  version: string;
  severity: string;
  state: string;
  fixed_version: string[];
  cve: string[];
  description: string;
  exploitable: ExploitabilityStatus;
  explanation: string;
}

export interface Graph {
  id?: number;
  scan_id?: number;
  package: string;
  version: string;
  call_map: CallMap[];
}
