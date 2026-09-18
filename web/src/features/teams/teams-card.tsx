import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { User } from "@/features/auth/session";
import { TasksPanel } from "@/features/tasks/tasks-panel";
import { AuditPanel } from "@/features/audit/audit-panel";
import { ProjectsPanel } from "@/features/projects/projects-panel";

import {
  useInviteProbe,
  useTeams,
  type Action,
  type Team,
} from "@/features/teams/teams";

// The buttons this screen could show, in the order a person reads them. The
// label is ours; whether it appears is the server's answer.
const BUTTONS: readonly [Action, string][] = [
  ["task:create", "New task"],

  ["member:invite", "Invite member"],
  ["team:delete", "Delete team"],
];

function ProbeResult({ status }: { status: number }) {
  // 403 = the gate refused. 409 = the gate agreed and you were already in.
  const refused = status === 403;
  return (
    <p className="font-mono text-xs">
      server said <span className="font-semibold">{status}</span>{" "}
      <span className="text-muted-foreground">
        {refused
          ? "— forbidden, whatever the page was drawing"
          : "— allowed; already a member"}
      </span>
    </p>
  );
}

function TeamRow({ team, user }: { team: Team; user: User }) {
  const probe = useInviteProbe(team.id, user.id);
  // Local UI only, not server state: whether this row is expanded is a fact
  // about this browser tab. Closed means unmounted, and an unmounted
  // component asks nothing — so no `enabled` flag and no effect.
  const [open, setOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [projOpen, setProjOpen] = useState(false);

  return (
    <div className="grid gap-2 border-t pt-4 first:border-t-0 first:pt-0">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{team.name}</span>
        <span className="text-muted-foreground font-mono text-xs">
          {team.role}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Hidden, not disabled. A disabled button still tells a Viewer that
            deleting the team is a thing that exists here. */}
        {BUTTONS.filter(([action]) => team.can.includes(action)).map(
          ([action, label]) => (
            <Button key={action} size="sm" variant="secondary" disabled>
              {label}
            </Button>
          ),
        )}
      </div>

      <div className="grid gap-1">
        <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>
          {open ? "Hide tasks" : "Show tasks"}
        </Button>
        {open ? <TasksPanel teamId={team.id} can={team.can} /> : null}
      </div>

      {team.can.includes("audit:read") && (
        <div className="grid gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setLogOpen((o) => !o)}
          >
            {logOpen ? "Hide log" : "Show log"}
          </Button>
          {logOpen ? <AuditPanel teamId={team.id} /> : null}
        </div>
      )}

      {team.can.includes("project:read") && (
        <div className="grid gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setProjOpen((o) => !o)}
          >
            {projOpen ? "Hide projects" : "Show projects"}
          </Button>
          {projOpen ? <ProjectsPanel teamId={team.id} can={team.can} /> : null}
        </div>
      )}

      <div className="grid gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => probe.mutate()}
          disabled={probe.isPending}
        >
          {probe.isPending ? "Asking…" : "Ask the server anyway"}
        </Button>
        {probe.data !== undefined ? <ProbeResult status={probe.data} /> : null}
      </div>
    </div>
  );
}

export function TeamsCard({ user }: { user: User }) {
  const { data: teams, isPending, error } = useTeams();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your teams</CardTitle>
        <CardDescription>
          Buttons are drawn from the server's{" "}
          <code className="font-mono">can</code> list. They are a hint, not the
          check.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {isPending ? (
          <p className="text-muted-foreground text-sm">Asking…</p>
        ) : error !== null ? (
          <p className="text-muted-foreground text-sm">Could not load teams.</p>
        ) : teams.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You are in no team yet. Create one and this list fills in.
          </p>
        ) : (
          teams.map((team) => <TeamRow key={team.id} team={team} user={user} />)
        )}
      </CardContent>
    </Card>
  );
}
