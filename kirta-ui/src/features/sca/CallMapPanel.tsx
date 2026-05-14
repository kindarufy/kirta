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

function fileDirname(path: string): string {
  const parts = path.split(/[/\\]/).filter(Boolean);
  if (parts.length <= 1) return "root";
  return parts.slice(0, -1).join("/");
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
    <div className={cn(!embedded && "mt-4", "space-y-4 rounded-2xl border border-slate-700/70 bg-slate-900/45 p-4 sm:p-5")}>
      <div className="flex flex-wrap items-center gap-2 text-base text-slate-200 sm:text-lg">
        <Hash className="h-5 w-5 text-slate-400" />
        <span className="text-slate-400">Библиотека:</span>
        <span className="font-mono font-semibold text-slate-100">
          {packageName}
          <span className="text-slate-400"> @{version}</span>
        </span>
      </div>

      <div
        className={cn(
          "relative min-h-[240px] overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/90 p-4 sm:p-6",
          "bg-[linear-gradient(to_right,rgba(148,163,184,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.10)_1px,transparent_1px)]",
          "bg-[length:24px_24px]",
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-900/25 via-transparent to-slate-950/30" />
        <div className="relative grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {callMap.map((file) => {
            const base = fileBasename(file.file);
            const dir = fileDirname(file.file);

            return (
              <button
                key={file.file}
                type="button"
                title={file.file}
                onClick={() => setOpenFile({ fileName: file.file, lines: file.lines })}
                className={cn(
                  "group flex min-h-[120px] w-full flex-col rounded-2xl border border-slate-600/80 bg-slate-900/90 p-4 text-left shadow-lg shadow-black/20",
                  "transition-colors hover:border-cyan-400/60 hover:bg-slate-800/95",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
                )}
              >
                <span className="flex items-center gap-2">
                  <FileCode2 className="h-5 w-5 shrink-0 text-emerald-400/90" />
                  <span className="truncate font-mono text-2xl font-semibold text-slate-100 sm:text-3xl">
                    {base}
                  </span>
                </span>
                <span className="mt-2 truncate pl-7 font-mono text-xs leading-tight text-slate-500">
                  {dir}
                </span>
                <span className="mt-3 pl-7 text-sm text-slate-400">
                  Вызовов: <span className="font-semibold text-slate-100">{file.calls.length}</span>
                </span>
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
