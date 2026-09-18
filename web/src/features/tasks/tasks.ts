import {
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  keepPreviousData,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { editPages } from "./edit-pages.ts";

export type Task = { id: number; title: string; done: boolean };

// The two filters the server understands. Absent means "do not filter on it" —
// so `done` has three answers, not two, exactly like the session has three.
export type TaskFilter = { done?: boolean; q?: string };

// The key mirrors the URL. Every guarded route since lesson 8 carries the team
// in the path, so the cache entry carries it too: one entry per team, never a
// single shared "tasks" bucket that a second team could read out of.
// The PREFIX, without the filter. This is what a mutation talks to, because a
// write does not care which question you were asking when you made it.
export const tasksScope = (teamId: number) => ["teams", teamId, "tasks"] as const;

// The whole key: the prefix plus the filter. The filter is an input to the
// answer, so it belongs in the key. Leave it out and ?done=true is a request
// the app never sends — the entry is already fresh, so nothing refetches, and
// the old answer stays on screen. Measured: 0 requests.
export const tasksKey = (teamId: number, filter: TaskFilter) =>
  [...tasksScope(teamId), filter] as const;

export type TaskPage = { items: Task[]; nextCursor: number | null };

export function useTasks(teamId: number, filter: TaskFilter) {
  return useInfiniteQuery({
    queryKey: tasksKey(teamId, filter),
    // sort names a COLUMN, so the server only accepts three strings.
    // `filter` is spread in: axios drops a param whose value is undefined, so
    // an absent filter sends no query string at all.
    queryFn: async ({ pageParam }) =>
      (
        await api.get<TaskPage>(`/teams/${teamId}/tasks`, {
          // Newest first. Ascending put a just-created task on the LAST page
          // of hundreds, so adding one looked like nothing happened.
          params: { sort: "id", dir: "desc", cursor: pageParam, ...filter },
        })
      ).data,
    // ? No cursor on the first request. Absent means "start at the beginning",
    // ? which is exactly what the server's optional cursor already meant.
    initialPageParam: undefined as number | undefined,
    // * The server decides whether there is more. nextCursor null -> undefined,
    // * and undefined is how React Query says "no next page".
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    // ! A new key is an empty entry, so isPending is true and the panel — the
    // ! filter bar included — is replaced by "Asking…". Then there is no way
    // ! back. This keeps the previous answer on screen while the new one
    // ! loads. Measured: isPending false, isPlaceholderData true, old rows.
    placeholderData: keepPreviousData,
  });
}

export function useSetTaskDone(teamId: number) {
  const client = useQueryClient();

  return useMutation({
    // The VALUE we want, never a verb. Send it twice and the answer is the
    // same both times, so a double-click and a retry are the same event.
    mutationFn: async ({ id, done }: { id: number; done: boolean }) =>
      (await api.patch<Task>(`/teams/${teamId}/tasks/${id}`, { done })).data,

    // ! Lesson 25 wrote the row straight into the cache, and that was right
    // ! while the list was "every task". Now the list is a QUESTION, and
    // ! ticking `done` can change whether the row still answers it — a task
    // ! that just became done does not belong in a `?done=false` list at all.
    // ! We know the row's new contents; we no longer know its membership. So:
    // ! ask again. Lesson 26's rule, second use — put the reply in the cache
    // ! when you know where it goes, ask when you do not.
    onSuccess: () => client.invalidateQueries({ queryKey: tasksScope(teamId) }),
  });
}

export function useCreateTask(teamId: number) {
  const client = useQueryClient();

  return useMutation({
    // No `done`. The server defaults it to false, and a field you do not send
    // is a field you cannot get wrong.
    mutationFn: async (title: string) =>
      (await api.post<Task>(`/teams/${teamId}/tasks`, { title })).data,

    // ! Appending is now a guess. A new id is the biggest id, so the row
    // ! belongs after the last row of the LAST page - and we may not be
    // ! holding the last page. Ask again instead of placing it wrongly.
    onSuccess: () => client.invalidateQueries({ queryKey: tasksScope(teamId) }),
  });
}

export function useDeleteTask(teamId: number) {
  const client = useQueryClient();

  return useMutation({
    // 204 means "done, nothing to send back". There is no row to type and
    // nothing to return - `.data` on a 204 is "", an empty string, and
    // api.delete<Task>() would have type-checked that lie without complaint.
    mutationFn: async (id: number) => {
      await api.delete(`/teams/${teamId}/tasks/${id}`);
    },

    // The id comes from what we SENT, not from what came back. That is the
    // only difference between this mutation and the other two - and it is
    // safe precisely because the server answered 204 rather than 404.
    // ! The one write that keeps its surgical edit. A deleted row leaves every
    // ! question at once — no filter can still want it — so there is no
    // ! membership left to ask about. editPages takes the PREFIX now, and
    // ! setQueriesData drops the row from every filter the user has looked at.
    onSuccess: (_nothing, id) =>
      editPages(client, tasksScope(teamId), (items) =>
        items.filter((t) => t.id !== id),
      ),
  });
}
