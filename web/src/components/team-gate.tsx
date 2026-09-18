import { useParams } from "react-router";
import { EmptyState } from "@/components/empty-state";
import { SkeletonList } from "@/components/skeleton";
import { useTeam, type Action, type Team } from "@/features/teams/teams";

/**
 * Every team page begins the same way: which team is the URL pointing at, and
 * does the server's `can` list include the thing this page does?
 *
 * This is still not the check. The API refuses on its own, every time. This
 * only decides whether drawing the page is honest — offering a section that
 * will only ever answer 403 is a worse lie than saying so here.
 */
export function TeamGate({
  needs,
  children,
}: {
  needs: Action;
  children: (team: Team) => React.ReactNode;
}) {
  const { teamId } = useParams();
  const { team, isPending, error } = useTeam(teamId);

  if (isPending) return <SkeletonList rows={5} label="Loading" />;

  if (error !== null) {
    return (
      <EmptyState
        title="The server did not answer"
        body="Your teams could not be loaded, so this page does not know which team it is showing. The app asks again when this tab comes back into focus."
      />
    );
  }

  if (team === undefined) {
    return (
      <EmptyState
        title="No such team"
        body="This team is not one of yours, or it no longer exists. Pick a team from the sidebar."
      />
    );
  }

  if (!team.can.includes(needs)) {
    return (
      <EmptyState
        title="Not yours to see"
        body={`Your role in ${team.name} is ${team.role.toLowerCase()}, and the server does not grant it this section.`}
      />
    );
  }

  return <>{children(team)}</>;
}
