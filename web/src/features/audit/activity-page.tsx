import { useState } from "react";
import { motion } from "motion/react";
import { EmptyState, ErrorLine, PageHeader } from "@/components/empty-state";
import { SkeletonList } from "@/components/skeleton";
import { TeamGate } from "@/components/team-gate";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Team } from "@/features/teams/teams";
import { useAudit } from "@/features/audit/audit";
import { formatAt, type AuditFilter, type AuditRow } from "@/features/audit/audit-row";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export function ActivityPage() {
  return <TeamGate needs="audit:read">{(team) => <Activity team={team} />}</TeamGate>;
}

// Read-only: no form, no mutation. This screen only shows what already
// happened.
function Activity({ team }: { team: Team }) {
  const [filter, setFilter] = useState<AuditFilter>({});
  const {
    data,
    isPending,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useAudit(team.id, filter);

  const options: { label: string; value: number | undefined }[] = [
    { label: "Everything", value: undefined },
    { label: "Refused", value: 403 },
  ];

  return (
    <div className="grid gap-5">
      <PageHeader
        team={team}
        title="Activity"
        subtitle="Every request the server answered for this team, in its own words. A refusal is recorded here whether or not the page ever drew the button."
      />

      <div
        role="group"
        aria-label="Filter by status"
        className="bg-muted/70 flex w-fit gap-0.5 rounded-lg p-0.5"
      >
        {options.map((option) => {
          const active = filter.status === option.value;
          return (
            <button
              key={option.label}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(option.value === undefined ? {} : { status: option.value })}
              className={cn(
                "focus-visible:ring-ring/50 relative rounded-[calc(var(--radius-md)-1px)] px-3 py-1 text-[0.8rem] font-medium transition-colors duration-150 ease-[var(--ease-out)] outline-none focus-visible:ring-3",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="audit-filter-pill"
                  aria-hidden
                  className="bg-card absolute inset-0 -z-10 rounded-[calc(var(--radius-md)-1px)] shadow-(--shadow-raised)"
                  transition={{ duration: 0.2, ease: EASE_OUT }}
                />
              ) : null}
              {option.label}
            </button>
          );
        })}
      </div>

      {isPending ? (
        <SkeletonList rows={6} label="Loading the activity log" />
      ) : error !== null ? (
        <ErrorLine>{errorMessage(error, "Could not load the log.")}</ErrorLine>
      ) : (
        <Log
          rows={data.pages.flatMap((page) => page.items)}
          filtering={filter.status !== undefined}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
        />
      )}
    </div>
  );
}

function Log({
  rows,
  filtering,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: {
  rows: AuditRow[];
  filtering: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}) {
  if (rows.length === 0) {
    return filtering ? (
      <EmptyState
        title="Nothing was refused"
        body="No request in this log came back with a 403. That is the good answer."
      />
    ) : (
      <EmptyState
        title="Nothing recorded yet"
        body="The log fills as people use the team. Every answer the server gives lands here."
      />
    );
  }

  return (
    <div className="grid gap-3">
      <ul className="bg-card divide-border/70 grid divide-y overflow-hidden rounded-xl shadow-(--shadow-raised) ring-1 ring-foreground/8">
        {rows.map((row) => (
          <li
            key={row.id}
            className="hover:bg-accent/45 grid gap-1 px-3 py-2.5 transition-colors duration-150 ease-[var(--ease-out)] sm:grid-cols-[auto_1fr_auto] sm:items-baseline sm:gap-3"
          >
            <StatusChip status={row.status} />
            <p className="min-w-0 text-sm">
              <span className="text-muted-foreground font-mono text-xs">
                {row.method}
              </span>{" "}
              <span className="font-mono text-xs break-all">{row.route}</span>
            </p>
            <p className="text-muted-foreground text-xs">
              {row.actorEmail ?? "anonymous"}
              <span aria-hidden> · </span>
              <time dateTime={row.at}>{formatAt(row.at)}</time>
            </p>
          </li>
        ))}
      </ul>

      {isFetchingNextPage ? (
        <SkeletonList rows={2} label="Loading more of the log" />
      ) : null}

      {hasNextPage ? (
        <Button
          variant="outline"
          size="sm"
          className="justify-self-start"
          disabled={isFetchingNextPage}
          onClick={onLoadMore}
        >
          {isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}

/** Colour is spent on state and nothing else, so a red number here always
 *  means the same thing: the gate said no. */
function StatusChip({ status }: { status: number }) {
  const refused = status === 401 || status === 403;
  const failed = status >= 500 || (status >= 400 && !refused);

  return (
    <span
      className={cn(
        "w-fit rounded-md px-1.5 py-0.5 font-mono text-xs font-medium",
        refused
          ? "bg-destructive/10 text-destructive"
          : failed
            ? "bg-muted text-foreground"
            : "bg-success/10 text-success",
      )}
    >
      {status}
    </span>
  );
}
