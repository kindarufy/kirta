import { Link } from "react-router-dom";
import { CalendarClock, Code2, FileArchive, Hash } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { ScanStatus, type Scan } from "@/types";
import { formatDateTime } from "@/utils/formatDate";
import { Sha256Cell } from "./Sha256Cell";
import { StatusBadge } from "./StatusBadge";

interface ScansTableProps {
  data: Scan[] | undefined;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry?: () => void;
}

const COLUMNS = [
  { key: "id", label: "ID" },
  { key: "repository", label: "Репозиторий" },
  { key: "sloc", label: "SLOC" },
  { key: "sha", label: "SHA256" },
  { key: "status", label: "Статус" },
  { key: "started", label: "Начало" },
  { key: "finished", label: "Окончание" },
];

export function ScansTable({ data, isLoading, isError, errorMessage, onRetry }: ScansTableProps) {
  if (isError) {
    return (
      <ErrorState
        title="Не удалось загрузить список сканирований"
        description={errorMessage}
        onRetry={onRetry}
      />
    );
  }

  if (!isLoading && data && data.length === 0) {
    return (
      <EmptyState
        title="Нет сканирований"
        description="Запустите первое сканирование, нажав кнопку «Просканировать»."
      />
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((c) => (
                <TableHead key={c.key} className="whitespace-nowrap">
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`s-${i}`}>
                    {COLUMNS.map((c) => (
                      <TableCell key={c.key}>
                        <Skeleton className="h-4 w-full max-w-[140px]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : data?.map((scan) => (
                  <TableRow key={scan.id}>
                    <TableCell className="font-mono">
                      {scan.status === ScanStatus.Ready ? (
                        <Link
                          to={`/${scan.id}`}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          #{scan.id}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">#{scan.id}</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{scan.repository_archive}</TableCell>
                    <TableCell className="tabular-nums">
                      {scan.sloc.toLocaleString("ru-RU")}
                    </TableCell>
                    <TableCell>
                      <Sha256Cell value={scan.sha256} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={scan.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(scan.started_at)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(scan.finished_at)}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={`m-${i}`} className="space-y-2 p-4">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </Card>
            ))
          : data?.map((scan) => (
              <Card key={scan.id} className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-mono">
                    {scan.status === ScanStatus.Ready ? (
                      <Link
                        to={`/${scan.id}`}
                        className="text-base font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        #{scan.id}
                      </Link>
                    ) : (
                      <span className="text-base font-semibold text-muted-foreground">
                        #{scan.id}
                      </span>
                    )}
                  </div>
                  <StatusBadge status={scan.status} />
                </div>

                <div className="flex items-center gap-2">
                  <FileArchive className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{scan.repository_archive}</span>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground">
                    <Code2 className="h-3.5 w-3.5" />
                    SLOC
                    <span className="ml-1 font-mono font-medium tabular-nums text-foreground">
                      {scan.sloc.toLocaleString("ru-RU")}
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center gap-1.5 text-muted-foreground">
                    <Hash className="h-3.5 w-3.5 shrink-0" />
                    <Sha256Cell value={scan.sha256} className="text-[11px]" />
                  </div>

                  <div className="col-span-2 flex flex-col gap-0.5 border-t pt-2 text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                      Начало:
                      <span className="text-foreground">
                        {formatDateTime(scan.started_at)}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5 shrink-0 opacity-50" />
                      Окончание:
                      <span className="text-foreground">
                        {formatDateTime(scan.finished_at)}
                      </span>
                    </span>
                  </div>
                </div>
              </Card>
            ))}
      </div>
    </>
  );
}
