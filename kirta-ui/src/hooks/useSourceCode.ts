import { useQuery } from "@tanstack/react-query";
import { sourceCodeRepository } from "@/repositories";

export function sourceCodeQueryKey(scanId: number, fileName: string) {
  return ["source-code", scanId, fileName] as const;
}

interface UseSourceCodeArgs {
  scanId: number | null;
  fileName: string | null;
  enabled?: boolean;
}

export function useSourceCode({ scanId, fileName, enabled = true }: UseSourceCodeArgs) {
  return useQuery({
    queryKey: sourceCodeQueryKey(scanId ?? -1, fileName ?? ""),
    queryFn: () =>
      sourceCodeRepository.getSourceCode({
        scanId: scanId as number,
        fileName: fileName as string,
      }),
    enabled: enabled && scanId !== null && !!fileName,
    staleTime: 5 * 60_000,
    retry: false,
  });
}
