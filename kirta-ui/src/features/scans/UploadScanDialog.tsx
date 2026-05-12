import { useCallback, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  FileArchive,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SCANS_QUERY_KEY } from "@/hooks";
import { scansRepository } from "@/repositories";
import { cn } from "@/utils/cn";

interface UploadScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Phase = "idle" | "submitting" | "success";

const ZIP_EXTENSIONS = [".zip"];
const MAX_SIZE_BYTES = 200 * 1024 * 1024;

export function UploadScanDialog({ open, onOpenChange }: UploadScanDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");

  const reset = useCallback(() => {
    setFile(null);
    setError(null);
    setDragOver(false);
    setPhase("idle");
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const acceptFile = useCallback((candidate: File | null | undefined) => {
    if (!candidate) return;
    const lower = candidate.name.toLowerCase();
    const isZip = ZIP_EXTENSIONS.some((ext) => lower.endsWith(ext));
    if (!isZip) {
      setError("Поддерживаются только .zip архивы");
      setFile(null);
      return;
    }
    if (candidate.size > MAX_SIZE_BYTES) {
      setError("Файл слишком большой (максимум 200 МБ)");
      setFile(null);
      return;
    }
    setError(null);
    setFile(candidate);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    acceptFile(e.target.files?.[0]);
  };

  const handleDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDragOver(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };

  const handleSubmit = async () => {
    if (!file || phase !== "idle") return;
    setPhase("submitting");
    setError(null);
    try {
      await scansRepository.createScan(file);
      await queryClient.invalidateQueries({ queryKey: SCANS_QUERY_KEY });
      setPhase("success");
      window.setTimeout(() => {
        onOpenChange(false);
        reset();
      }, 700);
    } catch (e) {
      setPhase("idle");
      setError(e instanceof Error ? e.message : "Не удалось запустить сканирование");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && phase === "submitting") return;
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Запуск нового сканирования</DialogTitle>
          <DialogDescription>
            Загрузите .zip архив с исходным кодом проекта. KIRTA построит SBOM, проверит
            зависимости и составит SCA-отчет.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-6">
          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip,application/x-zip-compressed"
            className="hidden"
            onChange={handleFileChange}
          />

          {!file ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={cn(
                "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed bg-muted/30 px-4 py-10 text-center transition-colors",
                "hover:border-primary/50 hover:bg-primary/5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                dragOver ? "border-primary bg-primary/10" : "border-border",
              )}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Upload className="h-6 w-6" />
              </span>
              <span className="text-sm font-medium">
                Перетащите .zip или выберите файл
              </span>
              <span className="text-xs text-muted-foreground">
                Поддерживается один архив до 200 МБ
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileArchive className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{file.name}</div>
                <div className="text-xs text-muted-foreground">
                  {formatBytes(file.size)}
                </div>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={reset}
                disabled={phase === "submitting"}
                aria-label="Сбросить выбор"
                className="h-8 w-8 shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {error ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {phase === "success" ? (
            <div className="flex items-center gap-2 rounded-md border border-[hsl(var(--status-ok)/0.4)] bg-[hsl(var(--status-ok)/0.1)] p-3 text-xs text-[hsl(var(--status-ok))]">
              <CheckCircle2 className="h-4 w-4" />
              Сканирование завершено и добавлено в историю.
            </div>
          ) : null}
        </div>

        <DialogFooter className="px-6 pb-6">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={phase === "submitting"}
          >
            Отмена
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!file || phase !== "idle"}
          >
            {phase === "submitting" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Запустить сканирование
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
