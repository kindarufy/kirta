import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { truncateSha } from "@/utils/sha256";
import { cn } from "@/utils/cn";

interface Sha256CellProps {
  value: string;
  className?: string;
}

export function Sha256Cell({ value, className }: Sha256CellProps) {
  const [expanded, setExpanded] = useState(false);

  if (!value) return <span className="text-muted-foreground">—</span>;

  const display = expanded ? value : truncateSha(value, 8);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            "rounded-md px-1.5 py-0.5 font-mono text-xs transition-colors hover:bg-muted",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            expanded && "break-all text-foreground",
            className,
          )}
        >
          {display}
          {!expanded ? <span className="text-muted-foreground">…</span> : null}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        {expanded ? "Кликните, чтобы свернуть" : "Кликните, чтобы показать полный SHA256"}
      </TooltipContent>
    </Tooltip>
  );
}
