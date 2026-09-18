import { QueryClient } from "@tanstack/react-query";
import { editPages } from "./edit-pages.ts";
import type { InfiniteData } from "@tanstack/react-query";
import type { TaskPage } from "./tasks.ts";

// Vitest, not node:test, since lesson 68. These are still pure-function
// tests with no DOM in them -- what changed is the runner, because one
// runner beats two. `test` and `expect` are globals (vite.config.ts).
// Thin wrappers keep the original assertion style readable.
const expectSame = (a: unknown, b: unknown) => expect(a).toBe(b);
const expectNotSame = (a: unknown, b: unknown) => expect(a).not.toBe(b);
const expectEqual = (a: unknown, b: unknown) => expect(a).toEqual(b);

const KEY = ["teams", 1, "tasks"] as const;

// Two pages, so a per-page edit can be told apart from an all-pages edit.
const fixture = (): InfiniteData<TaskPage> => ({
  pages: [
    {
      items: [
        { id: 1, title: "one", done: false },
        { id: 2, title: "two", done: false },
      ],
      nextCursor: 2,
    },
    { items: [{ id: 3, title: "three", done: false }], nextCursor: null },
  ],
  pageParams: [undefined, 2],
});

const seed = () => {
  const client = new QueryClient();
  client.setQueryData(KEY, fixture());
  return client;
};

const read = (client: QueryClient) =>
  client.getQueryData<InfiniteData<TaskPage>>(KEY);

test("an empty cache is left alone", () => {
  const client = new QueryClient();

  editPages(client, KEY, (items) => items);

  // The updater returning undefined must not create the entry. A mutation
  // firing before the list ever loaded should write nothing at all.
  expectSame(read(client), undefined);
});

test("the edit runs on every page", () => {
  const client = seed();

  editPages(client, KEY, (items) =>
    items.map((task) => ({ ...task, done: true })),
  );

  const flat = read(client)!.pages.flatMap((page) => page.items);
  expectEqual(
    flat.map((task) => task.done),
    [true, true, true],
  );
});

test("a delete only removes from the page the row is on", () => {
  const client = seed();

  editPages(client, KEY, (items) => items.filter((task) => task.id !== 2));

  const after = read(client)!;
  expectEqual(
    after.pages[0].items.map((task) => task.id),
    [1],
  );
  expectEqual(
    after.pages[1].items.map((task) => task.id),
    [3],
  );
  // The cursor belongs to the server's answer, not to what we removed.
  expectSame(after.pages[0].nextCursor, 2);
});

test("removing a row replaces that page and keeps the other one", () => {
  const client = seed();
  const before = read(client)!;

  editPages(client, KEY, (items) => items.filter((task) => task.id !== 2));

  const after = read(client)!;
  // Structural sharing: React Query deep-compares what the updater returned
  // and hands the old object back wherever nothing changed. Page 0 lost a row
  // so it is new; page 1 is untouched, so it is the SAME object — which is why
  // a component reading page 1 does not re-render.
  expectNotSame(after.pages[0], before.pages[0]);
  expectSame(after.pages[1], before.pages[1]);
});

test("a delete reaches every filtered list under the prefix", () => {
  const client = new QueryClient();
  // Two questions the user has asked about the same team: the unfiltered list
  // and the "not done" one. Both hold row 2.
  client.setQueryData(["teams", 1, "tasks", {}], fixture());
  client.setQueryData(["teams", 1, "tasks", { done: false }], fixture());

  editPages(client, KEY, (items) => items.filter((task) => task.id !== 2));

  for (const key of [
    ["teams", 1, "tasks", {}],
    ["teams", 1, "tasks", { done: false }],
  ]) {
    const flat = client
      .getQueryData<InfiniteData<TaskPage>>(key)!
      .pages.flatMap((page) => page.items);
    expectEqual(
      flat.map((task) => task.id),
      [1, 3],
    );
  }
});
