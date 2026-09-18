import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { Task, TaskPage } from "./tasks.ts";

// * The cache entry is no longer an array. It is { pages, pageParams }, and
// * every write has to walk the pages. One helper, so the three mutations
// * cannot each get the shape wrong in its own way.
// * It lives in its own file because `tasks.ts` imports `@/lib/api`, and the
// * `@/` alias is a Vite feature. Node's test runner is not Vite.
// * setQueriesData, plural. `key` is now a PREFIX: ["teams", 7, "tasks"]
// * matches ["teams", 7, "tasks", { done: false }] and every other filter the
// * user has looked at. A delete removes the row from every one of those
// * questions, so one call is the honest scope. setQueryData would edit the
// * unfiltered list only and leave the deleted row sitting in the others.
export function editPages(
  client: QueryClient,
  key: readonly unknown[],
  edit: (items: Task[]) => Task[],
) {
  client.setQueriesData<InfiniteData<TaskPage>>({ queryKey: key }, (data) =>
    data === undefined
      ? data
      : {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: edit(page.items),
          })),
        },
  );
}
