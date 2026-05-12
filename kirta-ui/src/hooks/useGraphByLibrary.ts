import { useQuery } from "@tanstack/react-query";
import { reportsRepository } from "@/repositories";

export function graphByLibraryQueryKey(params: {
  scanId: number;
  packageName: string;
  version: string;
}) {
  return ["scan-graph", params.scanId, params.packageName, params.version] as const;
}

export function useGraphByLibrary(
  params:
    | {
        scanId: number;
        packageName: string;
        version: string;
      }
    | undefined,
) {
  const scanId = params?.scanId ?? -1;
  const packageName = params?.packageName ?? "";
  const version = params?.version ?? "";

  return useQuery({
    queryKey: graphByLibraryQueryKey({ scanId, packageName, version }),
    queryFn: () => reportsRepository.getGraphByLibrary({ scanId, packageName, version }),
    enabled:
      typeof scanId === "number" &&
      Number.isFinite(scanId) &&
      Boolean(packageName),
    staleTime: 60_000,
  });
}
