import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ExploitabilityPillSmall } from "./ExploitabilityPill";
import { SafeVersionsDisclosure } from "./SafeVersionsDisclosure";
import { SeverityBadge } from "./SeverityBadge";
import type { CveIssue } from "@/types";

export function CveIssueBlock({ issue, packageName }: { issue: CveIssue; packageName: string }) {
  const desc = issue.description.trim();
  const expl = issue.explanation.trim();
  const showExplanation = expl.length > 0 && expl !== desc;

  return (
    <div className="space-y-3 rounded-lg border bg-background/80 p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {issue.cve.length > 0 ? (
          issue.cve.map((cve) => (
            <a
              key={cve}
              href={`https://nvd.nist.gov/vuln/detail/${cve}`}
              target="_blank"
              rel="noreferrer"
            >
              <Badge variant="outline" className="gap-1 bg-card/80 font-mono hover:bg-muted">
                {cve}
                <ExternalLink className="h-3 w-3" />
              </Badge>
            </a>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">Нет идентификатора CVE</span>
        )}
        <SeverityBadge value={issue.severity} />
        <ExploitabilityPillSmall exploitable={issue.exploitable} />
      </div>

      {desc ? (
        <p className="text-sm text-foreground/90">{issue.description}</p>
      ) : null}

      <SafeVersionsDisclosure packageName={packageName} versions={issue.fixed_version} />

      {showExplanation ? (
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
            Объяснение KIRTA Agent
          </div>
          <p className="text-foreground/90">{issue.explanation}</p>
        </div>
      ) : null}
    </div>
  );
}
