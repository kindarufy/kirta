import { useQuery } from "@tanstack/react-query";
import { reportsRepository } from "@/repositories";

export function scaReportQueryKey(scanId: number) {
  return ["sca-report", scanId] as const;
}

export function useScaReport(scanId: number | undefined) {
  return useQuery({
    queryKey: scaReportQueryKey(scanId ?? -1),
    queryFn: () => reportsRepository.getScaReport(scanId as number),
    enabled: typeof scanId === "number" && Number.isFinite(scanId),
    staleTime: 60_000,
  });
}
