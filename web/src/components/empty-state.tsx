import { cn } from "@/lib/utils";
import type { Team } from "@/features/teams/teams";

/**
 * An empty list is a sentence, not a blank area. It says which of the two
 * emptinesses happened — nothing exists yet, or nothing matches the question
 * being asked — and, when there is one, what to do next.
 */
export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border/70 grid justify-items-start gap-2 rounded-xl border border-dashed px-5 py-7",
        className,
      )}
    >
      <h2 className="text-[0.9375rem] font-medium tracking-[-0.01em]">{title}</h2>
      <p className="text-muted-foreground max-w-[62ch] text-sm leading-relaxed text-pretty">
        {body}
      </p>
      {action}
    </div>
  );
}

/** What the server said, styled the same everywhere: the problem, then the
 *  way out of it. */
export function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="text-destructive text-sm">
      {children}
    </p>
  );
}

export function PageHeader({
  team,
  title,
  subtitle,
  action,
}: {
  /** Which team this page is showing. Named above the title, because "Tasks"
   *  alone is the same word on every team, and the sidebar's highlight is
   *  behind a drawer on a phone. */
  team?: Team;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="grid gap-1">
        {team !== undefined ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="text-muted-foreground text-xs font-medium tracking-[0.06em] uppercase">
              Team
            </span>
            <span className="text-primary min-w-0 truncate font-semibold">
              {team.name}
            </span>
            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium">
              Your role: {team.role.charAt(0) + team.role.slice(1).toLowerCase()}
            </span>
          </p>
        ) : null}
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-balance">
          {title}
        </h1>
        <p className="text-muted-foreground max-w-[65ch] text-sm text-pretty">
          {subtitle}
        </p>
      </div>
      {action}
    </header>
  );
}
