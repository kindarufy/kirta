import { useState } from "react";
import { FileCode2, Hash } from "lucide-react";
import type { CallMap } from "@/types";
import { SourceCodeModal } from "./SourceCodeModal";
import { cn } from "@/utils/cn";

interface CallMapPanelProps {
  packageName: string;
  version: string;
  callMap: CallMap[];
  scanId: number;
  embedded?: boolean;
}

interface OpenFile {
  fileName: string;
  lines: number[];
}

function fileBasename(path: string): string {
  const seg = path.split(/[/\\]/).pop();
  return seg && seg.length > 0 ? seg : path;
}

export function CallMapPanel({
  packageName,
  version,
  callMap,
  scanId,
  embedded = false,
}: CallMapPanelProps) {
  const [openFile, setOpenFile] = useState<OpenFile | null>(null);

  if (!callMap.length) {
    return (
      <div
        className={cn(
          !embedded && "mt-4",
          "rounded-md border border-dashed p-4 text-sm text-muted-foreground",
        )}
      >
        Вызовов для данной библиотеки не найдено.
      </div>
    );
  }

  return (
    <div className={cn(!embedded && "mt-4", "space-y-3 rounded-lg border bg-muted/30 p-4")}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Hash className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Библиотека:</span>
        <span className="font-mono font-semibold">
          {packageName}
          <span className="text-muted-foreground"> @{version}</span>
        </span>
      </div>

      <div
        className={cn(
          "relative min-h-[240px] overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-950",
          "bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]",
          "bg-[length:24px_24px]",
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-zinc-900/20 to-transparent" />
        <div className="relative flex flex-wrap content-start gap-2 p-4">
          {callMap.map((file) => {
            const base = fileBasename(file.file);
            const lineHint = `Вызовов: ${file.calls.length}`;

            return (
              <button
                key={file.file}
                type="button"
                title={file.file}
                onClick={() => setOpenFile({ fileName: file.file, lines: file.lines })}
                className={cn(
                  "group flex max-w-[min(100%,280px)] flex-col gap-1 rounded-lg border border-zinc-600/90 bg-zinc-900/90 px-3 py-2.5 text-left shadow-sm",
                  "transition-colors hover:border-emerald-500/60 hover:bg-zinc-800/95",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
                )}
              >
                <span className="flex items-center gap-2">
                  <FileCode2 className="h-4 w-4 shrink-0 text-emerald-400/90" />
                  <span className="truncate font-mono text-sm font-semibold text-zinc-100">
                    {base}
                  </span>
                </span>
                {file.file !== base ? (
                  <span className="truncate pl-6 font-mono text-[11px] leading-tight text-zinc-500">
                    {file.file}
                  </span>
                ) : null}
                <span className="pl-6 text-[11px] text-zinc-500">{lineHint}</span>
              </button>
            );
          })}
        </div>
      </div>

      <SourceCodeModal
        scanId={scanId}
        fileName={openFile?.fileName ?? null}
        highlightLines={openFile?.lines ?? []}
        open={openFile !== null}
        onOpenChange={(o) => {
          if (!o) setOpenFile(null);
        }}
      />
    </div>
  );
}
