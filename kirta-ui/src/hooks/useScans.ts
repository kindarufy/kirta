import { useQuery } from "@tanstack/react-query";
import { scansRepository } from "@/repositories";

export const SCANS_QUERY_KEY = ["scans"] as const;

export function useScans() {
  return useQuery({
    queryKey: SCANS_QUERY_KEY,
    queryFn: () => scansRepository.getScans(),
    staleTime: 30_000,
  });
}
