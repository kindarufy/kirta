import { useEffect, useMemo, useRef } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneLight,
  vscDarkPlus,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { FileCode2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useSourceCode } from "@/hooks";
import { useThemeStore } from "@/features/theme";

interface SourceCodeModalProps {
  scanId: number;
  fileName: string | null;
  highlightLines: number[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SourceCodeModal({
  scanId,
  fileName,
  highlightLines,
  open,
  onOpenChange,
}: SourceCodeModalProps) {
  const theme = useThemeStore((s) => s.theme);

  const { data, isLoading, isError, error, refetch } = useSourceCode({
    scanId,
    fileName,
    enabled: open && !!fileName,
  });

  const highlightSet = useMemo(() => new Set(highlightLines), [highlightLines]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const highlightKey = useMemo(
    () =>
      highlightLines
        .slice()
        .sort((a, b) => a - b)
        .join(","),
    [highlightLines],
  );

  useEffect(() => {
    if (!open || !data || !highlightKey) return;
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        const el = scrollRef.current?.querySelector(".hl-line");
        el?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [open, data, fileName, highlightKey]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <FileCode2 className="h-4 w-4 text-primary" />
            <span className="break-all font-mono text-base">{fileName ?? "—"}</span>
          </DialogTitle>
          <DialogDescription>
            Подсвечены строки с найденными вызовами.
            {highlightLines.length ? (
              <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                {highlightLines.map((l) => (
                  <Badge key={l} variant="outline" className="font-mono text-[10px]">
                    L{l}
                  </Badge>
                ))}
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div ref={scrollRef} className="max-h-[70vh] overflow-auto p-0 scrollbar-thin">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-4"
                  style={{ width: `${60 + Math.random() * 40}%` }}
                />
              ))}
            </div>
          ) : isError ? (
            <ErrorState
              className="m-6"
              title="Не удалось загрузить файл"
              description={error instanceof Error ? error.message : undefined}
              onRetry={() => refetch()}
            />
          ) : data ? (
            <SyntaxHighlighter
              language="python"
              style={theme === "dark" ? vscDarkPlus : oneLight}
              showLineNumbers
              wrapLines
              lineProps={(lineNumber: number) => ({
                className: highlightSet.has(lineNumber) ? "hl-line" : undefined,
                style: { display: "block" },
              })}
              customStyle={{
                margin: 0,
                padding: "1rem 1.25rem",
                background: "transparent",
                fontSize: "13px",
                lineHeight: "1.55",
              }}
              codeTagProps={{
                style: { fontFamily: "JetBrains Mono, ui-monospace, monospace" },
              }}
            >
              {data}
            </SyntaxHighlighter>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">Нет данных</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
