import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { auditKey, assertAuditPage, type AuditFilter } from "./audit-row";
import { api } from "@/lib/api";

export function useAudit(teamId: number, filter: AuditFilter) {
  return useInfiniteQuery({
    queryKey: auditKey(teamId, filter),
    queryFn: async ({ pageParam }) =>
      assertAuditPage(
        (
          await api.get<unknown>(`/teams/${teamId}/audit`, {
            params: { cursor: pageParam, ...filter },
          })
        ).data,
      ),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => last?.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  });
}
