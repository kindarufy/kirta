import { Badge } from "@/components/ui/badge";
import { normalizeSeverity, type SeverityLevel } from "@/utils/severity";

const VARIANT_BY_LEVEL: Record<SeverityLevel, "critical" | "high" | "medium" | "low" | "unknown"> = {
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
  unknown: "unknown",
};

const LABEL_BY_LEVEL: Record<SeverityLevel, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  unknown: "Unknown",
};

export function SeverityBadge({ value }: { value: string }) {
  const level = normalizeSeverity(value);
  return (
    <Badge variant={VARIANT_BY_LEVEL[level]} className="uppercase tracking-wide">
      {value || LABEL_BY_LEVEL[level]}
    </Badge>
  );
}
