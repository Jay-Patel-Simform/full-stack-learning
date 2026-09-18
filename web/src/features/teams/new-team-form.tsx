import { useState } from "react";
import { useCreateTeam } from "./teams";
import { useNavigate } from "react-router";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ErrorLine } from "@/components/empty-state";
import { errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";

export function NewTeamForm() {
  const [name, setName] = useState("");
  const createTeam = useCreateTeam();
  const navigate = useNavigate();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createTeam.mutate(name.trim(), {
      onSuccess: (team) => navigate(`/teams/${team.id}/tasks`),
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid w-full max-w-sm gap-2">
      <Label htmlFor="team-name">Team name</Label>
      <Input
        id="team-name"
        value={name}
        required
        maxLength={100}
        onChange={(e) => setName(e.target.value)}
      />
      {createTeam.error !== null ? (
        <ErrorLine>
          {errorMessage(createTeam.error, "Could not create team")}
        </ErrorLine>
      ) : null}
      <Button
        type="submit"
        disabled={createTeam.isPending || name.trim() === ""}
      >
        {createTeam.isPending ? "Creating…" : "Create team"}
      </Button>
    </form>
  );
}
