import { useMutation, useQueryClient } from "@tanstack/react-query";
import { scaReportQueryKey } from "./useScaReport";
import { reportsRepository } from "@/repositories";
import type { Finding, ScaReport } from "@/types";

interface GetFindingExplanationParams {
  scanId: number;
  findingId: number;
}

export function useFindingExplanation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ scanId, findingId }: GetFindingExplanationParams) =>
      reportsRepository.getFindingExplanation(scanId, findingId),
    onSuccess: (updatedFinding: Finding, vars: GetFindingExplanationParams) => {
      queryClient.setQueryData<ScaReport | undefined>(
        scaReportQueryKey(vars.scanId),
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            findings: prev.findings.map((f) =>
              f.id === updatedFinding.id ? updatedFinding : f,
            ),
          };
        },
      );
    },
  });
}
