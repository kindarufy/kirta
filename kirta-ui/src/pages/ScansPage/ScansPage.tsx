import { ScansTable } from "@/features/scans";
import { useScans } from "@/hooks";
import { ScanStatus } from "@/types";

export function ScansPage() {
  const { data, isLoading, isError, error, refetch } = useScans();

  const total = data?.length ?? 0;
  const ready = data?.filter((s) => s.status === ScanStatus.Ready).length ?? 0;
  const errored = data?.filter((s) => s.status === ScanStatus.Error).length ?? 0;

  return (
    <div className="space-y-6">
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
