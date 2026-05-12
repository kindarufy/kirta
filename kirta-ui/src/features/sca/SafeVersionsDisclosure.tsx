import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";

export function SafeVersionsDisclosure({
  packageName,
  versions,
}: {
  packageName: string;
  versions: string[];
}) {
  const [open, setOpen] = useState(false);
  const safeVersions = versions.map((v) => v.trim()).filter((v) => v.length > 0);
  const hasFix = safeVersions.length > 0;

  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Исправление
      </div>
      {hasFix ? (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--status-ok))] px-3 py-1 text-xs font-semibold text-white shadow-sm transition-shadow",
              "hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            )}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Есть версии с исправлением
            <span className="ml-0.5 rounded-full bg-white/20 px-1.5 text-[10px] font-bold">
              {safeVersions.length}
            </span>
            {open ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          <div
            className={cn(
              "grid transition-all duration-200",
              open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="overflow-hidden">
              <div className="rounded-md border bg-card p-2.5">
                <ul className="flex flex-wrap gap-1.5">
                  {safeVersions.map((v) => (
                    <li key={v}>
                      <Badge variant="outline" className="bg-card/80 font-mono text-[11px]">
                        <span className="font-medium">{packageName}</span>
                        <span className="text-muted-foreground">@{v}</span>
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--severity-critical))/0.5] bg-[hsl(var(--severity-critical))/0.15] px-3 py-1 text-xs font-semibold text-[hsl(var(--severity-critical))]">
          <XCircle className="h-3.5 w-3.5" />
          Не найдены безопасные версии
        </span>
      )}
    </div>
  );
}
