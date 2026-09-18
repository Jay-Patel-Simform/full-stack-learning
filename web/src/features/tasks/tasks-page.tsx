import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorLine, PageHeader } from "@/components/empty-state";
import { SkeletonList } from "@/components/skeleton";
import { TeamGate } from "@/components/team-gate";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Action, Team } from "@/features/teams/teams";
import {
  useCreateTask,
  useDeleteTask,
  useSetTaskDone,
  useTasks,
  type Task,
  type TaskFilter,
} from "@/features/tasks/tasks";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export function TasksPage() {
  return <TeamGate needs="task:read">{(team) => <Tasks team={team} />}</TeamGate>;
}

function Tasks({ team }: { team: Team }) {
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
    isPlaceholderData,
  } = useTasks(team.id, filter);

  const filtering = filter.done !== undefined || filter.q !== undefined;

  return (
    <div className="grid gap-5">
      <PageHeader
        team={team}
        title="Tasks"
        subtitle="Everything this team is carrying. Tick a task to close it; the server keeps the answer."
      />

      {team.can.includes("task:create") ? <Composer teamId={team.id} /> : null}

      <FilterBar filter={filter} onChange={setFilter} />

      {isPending ? (
        <SkeletonList rows={5} label="Loading tasks" />
      ) : error !== null ? (
        // Say what the server said, and no more. A friendlier line here —
        // "that task belongs to another team" — hands back precisely what the
        // 404 blurs.
        <ErrorLine>{errorMessage(error, "Could not load tasks.")}</ErrorLine>
      ) : (
        <TaskList
          teamId={team.id}
          can={team.can}
          // Every page, flattened into the one list the UI wanted all along.
          tasks={data.pages.flatMap((page) => page.items)}
          filtering={filtering}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          // keepPreviousData means the rows on screen answer the PREVIOUS
          // question. Say so while the new one is in flight, instead of
          // letting a stale list look like a settled one.
          stale={isPlaceholderData}
          onLoadMore={() => fetchNextPage()}
          onClearFilter={() => setFilter({})}
        />
      )}
    </div>
  );
}

function TaskList({
  teamId,
  can,
  tasks,
  filtering,
  hasNextPage,
  isFetchingNextPage,
  stale,
  onLoadMore,
  onClearFilter,
}: {
  teamId: number;
  can: Action[];
  tasks: Task[];
  filtering: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  stale: boolean;
  onLoadMore: () => void;
  onClearFilter: () => void;
}) {
  const setDone = useSetTaskDone(teamId);
  const remove = useDeleteTask(teamId);
  const reduced = useReducedMotion();

  // How many rows were already on screen the last time this rendered. The
  // rows past that mark are the page that just arrived, and only they get the
  // staggered entrance — the ones already read stay still.
  const shown = useRef(0);
  const appendedFrom = shown.current;
  shown.current = tasks.length;

  if (tasks.length === 0) {
    // "No tasks yet" is a lie once a filter is on: there may be plenty of
    // tasks and none of them done. Say which of the two happened, and keep
    // the way back in reach.
    return filtering ? (
      <EmptyState
        title="Nothing matches that"
        body="This team has tasks, but none of them answer the question you are asking."
        action={
          <Button size="sm" variant="outline" onClick={onClearFilter}>
            Show every task
          </Button>
        }
      />
    ) : (
      <EmptyState
        title="No tasks yet"
        body={
          can.includes("task:create")
            ? "Write the first one in the box above. It appears here the moment the server accepts it."
            : "Nobody has added a task to this team yet."
        }
      />
    );
  }

  return (
    <div className="grid gap-3">
      {/* The answer to the old question, visibly held at arm's length while
          the new one travels. Not a spinner: the rows stay readable and the
          layout never moves. */}
      <motion.ul
        animate={{ opacity: stale ? 0.45 : 1 }}
        transition={{ duration: 0.18, ease: EASE_OUT }}
        aria-busy={stale}
        className="bg-card divide-border/70 grid divide-y overflow-hidden rounded-xl ring-1 ring-foreground/8 shadow-(--shadow-raised)">
        {/* popLayout, so the rows below a deleted one slide up into the gap
            instead of jumping. */}
        <AnimatePresence initial={false} mode="popLayout">
          {tasks.map((task, index) => (
            <TaskRow
              key={task.id}
              task={task}
              deletable={can.includes("task:delete")}
              savingDone={setDone.isPending && setDone.variables.id === task.id}
              deleting={remove.isPending && remove.variables === task.id}
              onToggle={(done) => setDone.mutate({ id: task.id, done })}
              onDelete={() => remove.mutate(task.id)}
              // Rows that just landed come in one after the other, so a
              // "Load more" reads as a page arriving rather than a block
              // appearing. Capped, so page ten is not a slow wave.
              delay={
                reduced === true
                  ? 0
                  : Math.min(Math.max(index - appendedFrom, 0), 8) * 0.035
              }
            />
          ))}
        </AnimatePresence>
      </motion.ul>

      {/* Same rule as the read: say what the server said, and no more. */}
      {setDone.error !== null ? (
        <ErrorLine>{errorMessage(setDone.error, "Could not save that.")}</ErrorLine>
      ) : null}

      {/* A 404 here means somebody else deleted it first. The row is already
          gone from the cache on success, so this is the only way you hear. */}
      {remove.error !== null ? (
        <ErrorLine>{errorMessage(remove.error, "Could not delete that.")}</ErrorLine>
      ) : null}

      {/* No button when the server said there is nothing after this row.
          hasNextPage is that answer, not a guess about the count. */}
      {hasNextPage ? (
        <Button
          variant="outline"
          size="sm"
          className="justify-self-start"
          disabled={isFetchingNextPage}
          onClick={onLoadMore}
        >
          {/* The label does not change width or leave: the spinner takes the
              space it already had, so the button stays where the thumb is. */}
          <Loader2
            aria-hidden
            className={cn(
              "size-3.5 transition-[opacity,width] duration-200 ease-[var(--ease-out)] motion-safe:animate-spin",
              isFetchingNextPage ? "w-3.5 opacity-100" : "w-0 opacity-0",
            )}
          />
          Load more
          <span className="sr-only" role="status">
            {isFetchingNextPage ? "Loading more tasks" : ""}
          </span>
        </Button>
      ) : null}
    </div>
  );
}

function TaskRow({
  task,
  deletable,
  savingDone,
  deleting,
  delay,
  onToggle,
  onDelete,
}: {
  task: Task;
  deletable: boolean;
  savingDone: boolean;
  deleting: boolean;
  delay: number;
  onToggle: (done: boolean) => void;
  onDelete: () => void;
}) {
  return (
    <motion.li
      layout
      // A new task arrives from just above its place, the way a line of
      // writing lands. A deleted one leaves the same way it would fall out.
      initial={{ opacity: 0, transform: "translateY(-6px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      exit={{ opacity: 0, transform: "translateX(-12px)" }}
      transition={{ duration: 0.2, ease: EASE_OUT, delay }}
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 transition-colors duration-150 ease-[var(--ease-out)]",
        "hover:bg-accent/45",
        deleting && "opacity-50",
      )}
    >
      <Checkbox
        id={`task-${task.id}`}
        checked={task.done}
        // Only this row waits. variables is the payload in flight.
        disabled={savingDone}
        // The checked state IS the state the user ASKED for. Send that.
        onCheckedChange={(checked) => onToggle(checked === true)}
      />
      <label
        htmlFor={`task-${task.id}`}
        className={cn(
          "min-w-0 flex-1 cursor-pointer text-sm leading-snug transition-colors duration-200 ease-[var(--ease-out)]",
          task.done ? "text-muted-foreground line-through" : "text-foreground",
        )}
      >
        {task.title}
      </label>

      {deletable ? (
        <Button
          size="icon-sm"
          variant="ghost"
          // Quiet until you go near the row, never hidden: a control that
          // only exists on hover does not exist for a keyboard or a finger.
          className="text-muted-foreground hover:text-destructive shrink-0 opacity-60 transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100"
          // The row is the label. "Delete" alone tells a screen reader
          // nothing about WHICH task is about to disappear.
          aria-label={`Delete ${task.title}`}
          // Only this row waits. variables is the id in flight.
          disabled={deleting}
          onClick={onDelete}
        >
          <Trash2 />
        </Button>
      ) : null}
    </motion.li>
  );
}

function Composer({ teamId }: { teamId: number }) {
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
    <form onSubmit={onSubmit} className="grid gap-2">
      <div className="bg-card focus-within:border-ring focus-within:ring-ring/25 flex items-center gap-2 rounded-xl border border-input py-1.5 pr-1.5 pl-3 shadow-(--shadow-raised) transition-[box-shadow,border-color] duration-150 ease-[var(--ease-out)] focus-within:ring-3">
        <Plus className="text-muted-foreground size-4 shrink-0" />
        <Input
          aria-label="New task"
          placeholder="Add a task…"
          maxLength={200}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:border-0 focus-visible:ring-0"
        />
        {/* This is the duplicate guard, not a spinner. A create cannot be
            repeated safely, so the second click must not happen. */}
        <Button type="submit" size="sm" disabled={create.isPending}>
          {create.isPending ? "Adding…" : "Add"}
        </Button>
      </div>

      {/* Same shape as the read and the toggle: the server's sentence, styled
          the same, below the row — and the typing above it stays put. */}
      {create.error !== null ? (
        <ErrorLine>{errorMessage(create.error, "Could not add that.")}</ErrorLine>
      ) : null}
    </form>
  );
}

// Module level, like every other component here. Nested inside the page it
// would be a brand new type on every render, and its whole subtree — the
// search box included — would remount and lose what was being typed.
function FilterBar({
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

  function clearSearch() {
    setText("");
    onChange({ ...filter, q: undefined });
  }

  // Three states, not two. `done` is true / false / absent, and "absent" is
  // the one a checkbox cannot express.
  const options: { label: string; value: boolean | undefined }[] = [
    { label: "All", value: undefined },
    { label: "Open", value: false },
    { label: "Done", value: true },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
      <div
        role="group"
        aria-label="Filter by state"
        className="bg-muted/70 flex gap-0.5 rounded-lg p-0.5"
      >
        {options.map((option) => {
          const active = filter.done === option.value;
          return (
            <button
              key={option.label}
              type="button"
              aria-pressed={active}
              onClick={() => onChange({ ...filter, done: option.value })}
              className={cn(
                "focus-visible:ring-ring/50 relative rounded-[calc(var(--radius-md)-1px)] px-3 py-1 text-[0.8rem] font-medium transition-colors duration-150 ease-[var(--ease-out)] outline-none focus-visible:ring-3",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active ? (
                // One pill that slides between the three words, so the change
                // reads as the same control moving, not three controls
                // repainting.
                <motion.span
                  layoutId="task-filter-pill"
                  aria-hidden
                  className="bg-card absolute inset-0 -z-10 rounded-[calc(var(--radius-md)-1px)] shadow-(--shadow-raised)"
                  transition={{ duration: 0.2, ease: EASE_OUT }}
                />
              ) : null}
              {option.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={onSubmit} className="flex min-w-[12rem] flex-1 gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            aria-label="Search tasks"
            placeholder="Search…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="h-8 pr-8 pl-8"
          />
          {/* The clear affordance appears and leaves with the text it clears,
              instead of blinking into existence on the first keystroke. */}
          <AnimatePresence initial={false}>
            {text !== "" ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15, ease: EASE_OUT }}
                className="absolute top-1/2 right-1 -translate-y-1/2"
              >
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Clear search"
                  onClick={clearSearch}
                >
                  <X />
                </Button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        <Button type="submit" variant="outline" size="sm">
          Search
        </Button>
      </form>
    </div>
  );
}
