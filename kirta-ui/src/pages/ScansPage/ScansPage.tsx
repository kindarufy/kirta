import { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { ScansTable } from "@/features/scans";
import { Button } from "@/components/ui/button";
import { useScans } from "@/hooks";
import { ScanStatus } from "@/types";

export function ScansPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useScans();
  const [showLandingNotice, setShowLandingNotice] = useState(false);

  useEffect(() => {
    const state = location.state as { fromLanding?: boolean; fromLogin?: boolean } | null;
    if (!state?.fromLanding && !state?.fromLogin) return;
    setShowLandingNotice(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const total = data?.length ?? 0;
  const ready = data?.filter((s) => s.status === ScanStatus.Ready).length ?? 0;
  const errored = data?.filter((s) => s.status === ScanStatus.Error).length ?? 0;

  return (
    <div className="space-y-6">
      {showLandingNotice ? (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-300/80 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-100">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
            <p>
              Сейчас платформа поддерживает сканирование только Python-проектов
              (архив .zip с исходным кодом Python)
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-amber-700 hover:bg-amber-100 hover:text-amber-900 dark:text-amber-200 dark:hover:bg-amber-500/15 dark:hover:text-amber-100"
            onClick={() => setShowLandingNotice(false)}
            aria-label="Закрыть предупреждение"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Сканирования
          </h1>
          <p className="text-sm text-muted-foreground">
            История запущенных сканирований.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>
            Всего: <span className="font-medium text-foreground">{total}</span>
          </span>
          <span className="hidden sm:inline">•</span>
          <span>
            Готово: <span className="font-medium text-foreground">{ready}</span>
          </span>
          <span className="hidden sm:inline">•</span>
          <span>
            Ошибки: <span className="font-medium text-foreground">{errored}</span>
          </span>
        </div>
      </div>

      <ScansTable
        data={data}
        isLoading={isLoading}
        isError={isError}
        errorMessage={error instanceof Error ? error.message : undefined}
        onRetry={() => refetch()}
      />
    </div>
  );
}
