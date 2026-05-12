import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { ReportHeader, ReportTabs } from "@/features/reports";
import { useScaReport } from "@/hooks";

export function ScanReportPage() {
  const { scanId: scanIdParam } = useParams<{ scanId: string }>();
  const scanId = scanIdParam ? Number(scanIdParam) : NaN;

  const { data, isLoading, isError, error, refetch } = useScaReport(
    Number.isFinite(scanId) ? scanId : undefined,
  );

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/scans">
            <ArrowLeft className="h-4 w-4" />К сканированиям
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-10 w-72" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <ErrorState
          title="Не удалось загрузить отчет"
          description={error instanceof Error ? error.message : undefined}
          onRetry={() => refetch()}
        />
      ) : data ? (
        <>
          <ReportHeader report={data} />
          <ReportTabs scanId={data.scan_id} findings={data.findings} />
        </>
      ) : null}
    </div>
  );
}
