import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Action } from "@/features/teams/teams";
import { useCreateProject, useProjects } from "./project";

function ProjectRow({ name }: { name: string }) {
  return <li className="font-mono text-sm">{name}</li>;
}

export function ProjectsPanel({
  teamId,
  can,
}: {
  teamId: number;
  can: Action[];
}) {
  const { data, isPending, error } = useProjects(teamId);
  const createProject = useCreateProject(teamId);
  // The words live in state; the request happens on submit. The form IS
  // the debounce -- lesson 33, and still zero useEffect in the app.
  const [name, setName] = useState("");

  if (isPending)
    return <p className="text-muted-foreground text-sm">Asking…</p>;
  if (error !== null)
    return (
      <p className="text-muted-foreground text-sm">Could not load projects.</p>
    );

  return (
    <div className="grid gap-2">
      {data.length === 0 ? (
        <p className="text-muted-foreground text-sm">No projects yet.</p>
      ) : (
        <ul className="grid gap-1">
          {data.map((p) => (
            <ProjectRow key={p.id} name={p.name} />
          ))}
        </ul>
      )}

      {can.includes("project:create") ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim() === "") return;
            createProject.mutate(name, { onSuccess: () => setName("") });
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New project"
          />
          <Button size="sm" type="submit" disabled={createProject.isPending}>
            {createProject.isPending ? "Saving…" : "Add"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
