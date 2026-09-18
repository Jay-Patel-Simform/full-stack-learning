import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { FolderClosed, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorLine, PageHeader } from "@/components/empty-state";
import { SkeletonList } from "@/components/skeleton";
import { TeamGate } from "@/components/team-gate";
import { errorMessage } from "@/lib/api";
import type { Team } from "@/features/teams/teams";
import { useCreateProject, useProjects } from "@/features/projects/project";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export function ProjectsPage() {
  return (
    <TeamGate needs="project:read">{(team) => <Projects team={team} />}</TeamGate>
  );
}

function Projects({ team }: { team: Team }) {
  const { data, isPending, error } = useProjects(team.id);

  return (
    <div className="grid gap-5">
      <PageHeader
        team={team}
        title="Projects"
        subtitle="The work this team is organised into. Projects are named, nothing more — tasks belong to the team, not to a project."
      />

      {team.can.includes("project:create") ? (
        <NewProjectForm teamId={team.id} />
      ) : null}

      {isPending ? (
        <SkeletonList rows={3} label="Loading projects" />
      ) : error !== null ? (
        <ErrorLine>{errorMessage(error, "Could not load projects.")}</ErrorLine>
      ) : data.length === 0 ? (
        <EmptyState
          title="No projects yet"
          body={
            team.can.includes("project:create")
              ? "Name the first one above. Only an admin or the owner can add projects, and you are one."
              : "Nobody has created a project in this team yet."
          }
        />
      ) : (
        <ul className="bg-card divide-border/70 grid divide-y overflow-hidden rounded-xl shadow-(--shadow-raised) ring-1 ring-foreground/8">
          <AnimatePresence initial={false} mode="popLayout">
            {data.map((project) => (
              <motion.li
                key={project.id}
                layout
                initial={{ opacity: 0, transform: "translateY(-6px)" }}
                animate={{ opacity: 1, transform: "translateY(0px)" }}
                exit={{ opacity: 0, transform: "translateX(-12px)" }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className="hover:bg-accent/45 flex items-center gap-3 px-3 py-2.5 text-sm transition-colors duration-150 ease-[var(--ease-out)]"
              >
                <FolderClosed className="text-muted-foreground size-4 shrink-0" />
                <span className="min-w-0 truncate">{project.name}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}

function NewProjectForm({ teamId }: { teamId: number }) {
  // The words live in state; the request happens on submit. The form IS the
  // debounce — and there is still no useEffect anywhere in this app.
  const [name, setName] = useState("");
  const createProject = useCreateProject(teamId);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim() === "") return;
    createProject.mutate(name, { onSuccess: () => setName("") });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2">
      <div className="bg-card focus-within:border-ring focus-within:ring-ring/25 flex items-center gap-2 rounded-xl border border-input py-1.5 pr-1.5 pl-3 shadow-(--shadow-raised) transition-[box-shadow,border-color] duration-150 ease-[var(--ease-out)] focus-within:ring-3">
        <Plus className="text-muted-foreground size-4 shrink-0" />
        <Input
          aria-label="New project"
          placeholder="Name a project…"
          maxLength={120}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:border-0 focus-visible:ring-0"
        />
        <Button type="submit" size="sm" disabled={createProject.isPending}>
          {createProject.isPending ? "Saving…" : "Add"}
        </Button>
      </div>

      {createProject.error !== null ? (
        <ErrorLine>
          {errorMessage(createProject.error, "Could not add that project.")}
        </ErrorLine>
      ) : null}
    </form>
  );
}
