import { errorMessage } from "@/lib/api";
import {
  useCreateTask,
  useSetTaskDone,
  useTasks,
  useDeleteTask,
  type TaskFilter,
} from "@/features/tasks/tasks";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Action } from "@/features/teams/teams";
import { Trash2 } from "lucide-react";

export function TasksPanel({ teamId, can }: { teamId: number; can: Action[] }) {
  // The question being asked. It is local UI state — nothing on the server
  // knows which filter this tab is looking at — and it is an input to the
  // query key, which is what makes changing it fetch a fresh first page.
  const [filter, setFilter] = useState<TaskFilter>({});
  const {
    data,
    isPending,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useTasks(teamId, filter);
  const setDone = useSetTaskDone(teamId);
  const remove = useDeleteTask(teamId);

  if (isPending)
    return <p className="text-muted-foreground text-sm">Asking…</p>;

  // Say what the server said, and no more. A friendlier line here — "that task
  // belongs to another team" — hands back precisely what the 404 blurs.
  if (error !== null)
    return (
      <p className="text-destructive text-sm">
        {errorMessage(error, "Could not load tasks.")}
      </p>
    );

  // Every page, flattened into the one list the UI wanted all along.
  const tasks = data.pages.flatMap((page) => page.items);

  return (
    <div className="grid gap-2">
      <TaskFilterBar filter={filter} onChange={setFilter} />

      {/* "No tasks yet" is a lie once a filter is on: there may be plenty of
          tasks and none of them done. Say which of the two happened. And the
          filter bar stays above this, or there is no way back. */}
      {tasks.length === 0 && (
        <p className="text-muted-foreground text-sm">
          {filter.done === undefined && filter.q === undefined
            ? "No tasks yet."
            : "No tasks match that."}
        </p>
      )}

      <ul className="grid gap-1">
        {tasks.map((task) => (
          <li key={task.id} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={task.done}
              // Only this row waits. variables is the payload in flight.
              disabled={setDone.isPending && setDone.variables.id === task.id}
              // The checked state IS the state the user ASKED for. Send that.
              onCheckedChange={(checked) =>
                setDone.mutate({ id: task.id, done: checked === true })
              }
            />
            <span
              className={task.done ? "text-muted-foreground line-through" : ""}
            >
              {task.title}
            </span>

            {can.includes("task:delete") && (
              <Button
                size="icon-sm"
                variant="destructive"
                className="ml-auto"
                // The row is the label. "Delete" alone tells a screen reader
                // nothing about WHICH task is about to disappear.
                aria-label={`Delete ${task.title}`}
                // Only this row waits. variables is the id in flight.
                disabled={remove.isPending && remove.variables === task.id}
                onClick={() => remove.mutate(task.id)}
              >
                <Trash2 />
              </Button>
            )}
          </li>
        ))}
      </ul>

      {/* Same rule as the read: say what the server said, and no more. */}
      {setDone.error !== null && (
        <p className="text-destructive text-sm">
          {errorMessage(setDone.error, "Could not save that.")}
        </p>
      )}

      {/* A 404 here means somebody else deleted it first. The row is already
    gone from the cache on success, so this is the only way you hear. */}
      {remove.error !== null && (
        <p className="text-destructive text-sm">
          {errorMessage(remove.error, "Could not delete that.")}
        </p>
      )}

      {/* No button when the server said there is nothing after this row.
     hasNextPage is that answer, not a guess about the count. */}
      {hasNextPage && (
        <Button
          variant="outline"
          size="sm"
          className="justify-self-start"
          disabled={isFetchingNextPage}
          onClick={() => fetchNextPage()}
        >
          {isFetchingNextPage ? "Loading…" : "Load more"}
        </Button>
      )}

      <NewTaskForm teamId={teamId} />
    </div>
  );
}

// Module level, like every other component here. Nested inside TasksPanel it
// would be a brand new type on every render, and its whole subtree — the
// search box included — would remount and lose what was being typed.
function TaskFilterBar({
  filter,
  onChange,
}: {
  filter: TaskFilter;
  onChange: (next: TaskFilter) => void;
}) {
  // The words being typed are local. They become part of the query key only on
  // submit — which is also the debounce: one request per Enter, not per letter.
  const [text, setText] = useState("");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = text.trim();
    // Keep `q` off the object entirely when it is empty. An empty string is a
    // different key from an absent one, so it would be a second cache entry
    // holding the identical answer.
    onChange({ ...filter, ...(q === "" ? { q: undefined } : { q }) });
  }

  // Three buttons, not two. `done` is true / false / absent, and "absent" is
  // the one a checkbox cannot express.
  const options: { label: string; value: boolean | undefined }[] = [
    { label: "All", value: undefined },
    { label: "Open", value: false },
    { label: "Done", value: true },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1" role="group" aria-label="Filter by state">
        {options.map((option) => (
          <Button
            key={option.label}
            size="sm"
            variant={filter.done === option.value ? "default" : "outline"}
            aria-pressed={filter.done === option.value}
            onClick={() => onChange({ ...filter, done: option.value })}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex flex-1 gap-2">
        <Input
          aria-label="Search tasks"
          placeholder="Search…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit" variant="secondary" size="sm">
          Search
        </Button>
      </form>
    </div>
  );
}

function NewTaskForm({ teamId }: { teamId: number }) {
  const [title, setTitle] = useState("");
  const create = useCreateTask(teamId);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate(title, {
      // Clear ONLY on success. A 403 or a 400 leaves the sentence on screen,
      // because the words are still yours until the server accepts them.
      onSuccess: () => setTitle(""),
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <div className="flex gap-2">
        <Input
          aria-label="New task"
          placeholder="Add a task…"
          maxLength={200}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        {/* This is the duplicate guard, not a spinner. A create cannot be
            repeated safely, so the second click must not happen. */}
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Adding…" : "Add"}
        </Button>
      </div>

      {/* Same shape as the read and the toggle: the server's sentence, styled
          the same, below the row — and the typing above it stays put. */}
      {create.error !== null && (
        <p className="text-destructive text-sm">
          {errorMessage(create.error, "Could not add that.")}
        </p>
      )}
    </form>
  );
}
