export type SeverityLevel = "critical" | "high" | "medium" | "low" | "unknown";

export function normalizeSeverity(value: string | null | undefined): SeverityLevel {
  const v = (value ?? "").toLowerCase();
  if (v.startsWith("crit")) return "critical";
  if (v.startsWith("hi")) return "high";
  if (v.startsWith("med")) return "medium";
  if (v.startsWith("lo")) return "low";
  return "unknown";
}

export function severityRank(value: string | null | undefined): number {
  switch (normalizeSeverity(value)) {
    case "critical":
      return 0;
    case "high":
      return 1;
    case "medium":
      return 2;
    case "low":
      return 3;
    default:
      return 4;
  }
}
