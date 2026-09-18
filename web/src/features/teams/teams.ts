import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { api } from "@/lib/api";

// The action names the server uses, as a type only. Which actions a role gets
// is a decision, and that decision stays in the server's src/auth/can.ts —
// the reply carries the answer so this app has no second copy to let drift.
export type Action =
  | "task:read"
  | "project:read"
  | "task:create"
  | "task:update"
  | "task:delete"
  | "project:create"
  | "project:delete"
  | "member:invite"
  | "member:remove"
  | "member:leave"
  | "team:delete"
  | "audit:read";

export type Role = "VIEWER" | "MEMBER" | "ADMIN" | "OWNER";

export type Team = { id: number; name: string; role: Role; can: Action[] };

export const TEAMS_KEY = ["teams"] as const;

/**
 * Every team you are in, with the role you hold in each. No teamId goes up in
 * the URL — the server answers from your own membership rows, so a team you
 * are not in is a team you never hear about.
 *
 * This one keeps the 30s default, unlike the session query's `staleTime: 0`,
 * and that is the point of the whole lesson: `can` is a hint for drawing
 * buttons, not the check. A role that changed twenty seconds ago leaves this
 * UI briefly wrong and never leaves the API briefly open.
 */
export function useTeams() {
  return useQuery({
    queryKey: TEAMS_KEY,
    queryFn: async () => (await api.get<Team[]>("/teams")).data,
  });
}

/**
 * Ask the server for something the UI may not be offering you.
 *
 * Deliberately harmless: it invites *you*, to a team you are already in. If
 * the gate refuses, that is a 403. If the gate agrees, the store finds you are
 * already a member and answers 409. There is no third answer, so this button
 * can never change anything — it only reports who decided.
 */
export function useInviteProbe(teamId: number, userId: number) {
  return useMutation({
    mutationFn: async (): Promise<number> => {
      try {
        const r = await api.post(`/teams/${teamId}/members`, {
          userId,
          role: "VIEWER",
        });
        return r.status;
      } catch (error) {
        // A status is the answer here, whichever side of 400 it is on.
        if (error instanceof AxiosError && error.response !== undefined) {
          return error.response.status;
        }
        throw error;
      }
    },
  });
}

/**
 * The team the URL is pointing at, found in the list you already have. There
 * is no `GET /teams/:id` request here on purpose: `useTeams` answers from your
 * own membership rows, so a team missing from that list is a team you are not
 * in — which is the same answer the API would give.
 */
export function useTeam(teamId: string | undefined) {
  const { data: teams, isPending, error } = useTeams();
  return {
    team: teams?.find((t) => String(t.id) === teamId),
    isPending,
    error,
  };
}

/**
 * Start a team. The reply is {id, name} -- NOT a row of useTeams, which also
 * carries role and can. So nothing is written into the cache by hand here:
 * only the server knows what OWNER may do.
 */
export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) =>
      (await api.post<{ id: number; name: string }>("/teams", { name })).data,
    // ! Returning the promise keeps isPending true until the list is back,
    // ! so the caller can navigate into a team the cache already holds.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEAMS_KEY }),
  });
}

/**
 * Show yourself the door. Not the same call as removing somebody — the server
 * has a separate `member:leave` action, because nobody outranks themselves and
 * the rank rule would refuse you forever.
 *
 * Two answers worth knowing about:
 *   204 — gone. The team drops out of the list on the next fetch.
 *   409 — you are the last OWNER, so leaving would strand the team. Not a 403:
 *         your permission is fine, the state of the world is not, and
 *         promoting somebody makes the identical request succeed. Show the
 *         server's sentence; it says what to do about it.
 */
export function useLeaveTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    // ! No type parameter on delete(). A 204 has no body, so `api.delete<Team>`
    // ! would compile clean and be "" at runtime -- lesson 28's trap.
    mutationFn: async (teamId: number) => {
      await api.delete(`/teams/${teamId}/members/me`);
    },
    // ! Nothing is edited by hand here. The reply is empty, and the row that
    // ! has to disappear carries `role` and `can` that only the server knows.
    // ! Returning the promise holds isPending until the list is back, so a
    // ! caller can navigate away knowing the cache no longer holds the team.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TEAMS_KEY }),
  });
}
