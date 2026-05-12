import type { Finding } from "./sca";

export interface Langs {
  lang: string;
  sloc: number;
}

export interface Libraries {
  package: string;
  version: string;
}

export interface ScaReport {
  scan_id: number;
  repository_name: string;
  total_sloc: number;
  manifest: string;
  langs: Langs[];
  libraries: Libraries[];
  findings: Finding[];
}
