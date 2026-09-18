import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAudit } from "@/features/audit/audit";
import { formatAt, type AuditFilter } from "@/features/audit/audit-row";
import { errorMessage } from "@/lib/api";

// Read-only: no form, no mutation. This screen only shows what already
// happened.
export function AuditPanel({ teamId }: { teamId: number }) {
  const [filter, setFilter] = useState<AuditFilter>({});
  const {
    data,
    isPending,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useAudit(teamId, filter);

  if (isPending)
    return <p className="text-muted-foreground text-sm">Asking…</p>;

  if (error !== null)
    return (
      <p className="text-destructive text-sm">
        {errorMessage(error, "Could not load the log.")}
      </p>
    );

  const rows = data.pages.flatMap((page) => page.items);

  return (
    <div className="grid gap-2">
      <div className="flex gap-1" role="group" aria-label="Filter by status">
        <Button
          size="sm"
          variant={filter.status === undefined ? "default" : "outline"}
          aria-pressed={filter.status === undefined}
          onClick={() => setFilter({})}
        >
          All
        </Button>
        <Button
          size="sm"
          variant={filter.status === 403 ? "default" : "outline"}
          aria-pressed={filter.status === 403}
          onClick={() => setFilter({ status: 403 })}
        >
          Refused
        </Button>
      </div>

      {rows.length === 0 && (
        <p className="text-muted-foreground text-sm">
          {filter.status === undefined
            ? "No entries yet."
            : "No entries match that."}
        </p>
      )}

      <ul className="grid gap-1">
        {rows.map((row) => (
          <li key={row.id} className="font-mono text-xs">
            {formatAt(row.at)} — {row.status} — {row.method} {row.route} —{" "}
            {row.actorEmail ?? "anonymous"}
          </li>
        ))}
      </ul>

      {hasNextPage && (
        <Button
          variant="outline"
          size="sm"
          className="justify-self-start"
          disabled={isFetchingNextPage}
          onClick={() => fetchNextPage()}
        >
          {isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}