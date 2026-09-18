import { useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router";
import { useIsFetching } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  DoorOpen,
  FolderClosed,
  ListTodo,
  LogOut,
  Menu,
  ScrollText,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/skeleton";
import { Wordmark } from "@/components/wordmark";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/api";
import { useLogout, useSession } from "@/features/auth/session";
import { useLeaveTeam, useTeams, type Team } from "@/features/teams/teams";
import { UnderTheHood } from "@/features/dev/under-the-hood";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** The sections of one team. Which of them a person sees is the server's
 *  answer, read off the `can` list the team arrived with. */
const SECTIONS = [
  { to: "tasks", label: "Tasks", icon: ListTodo, needs: "task:read" },
  {
    to: "projects",
    label: "Projects",
    icon: FolderClosed,
    needs: "project:read",
  },
  { to: "activity", label: "Activity", icon: ScrollText, needs: "audit:read" },
] as const;

/**
 * The way out of a team, in the row that names it.
 *
 * Two clicks, not one. Lesson 28 argued against a confirm step on deleting a
 * task, and that still holds — a task you delete by mistake you can type again.
 * This is different: you cannot re-add yourself, an admin has to, and the
 * button sits a few pixels from the links you use all day. Irreversible plus
 * mis-clickable is where a second click earns its place. No dialog for it:
 * the button becomes the confirmation, so there is nothing to mount, trap
 * focus in, or dismiss.
 */
export function TeamRow({ team, onNavigate }: { team: Team; onNavigate: () => void }) {
  const [armed, setArmed] = useState(false);
  const leaveTeam = useLeaveTeam();
  const navigate = useNavigate();
  const { teamId } = useParams();

  // The server's own list. `can` is a hint for drawing buttons, never the
  // check — and here it is a deliberately approximate one: a sole OWNER holds
  // member:leave and is still refused, because the refusal is about the team
  // rather than about them. That 409 is what the error line below renders.
  const mayLeave = team.can.includes("member:leave");

  function leave() {
    leaveTeam.mutate(team.id, {
      onSuccess: () => {
        // Only move if you are standing in the team you just left. Leaving one
        // you are not looking at should not throw you off the page.
        // "/" is not a screen: it picks your first remaining team, or shows
        // the empty state. Either way that decision already exists.
        if (teamId === String(team.id)) void navigate("/", { replace: true });
      },
    });
  }

  return (
    <div className="grid gap-1">
      <div className="flex items-baseline gap-2 px-3">
        <h2 className="mr-auto truncate text-xs font-semibold tracking-[0.04em] uppercase">
          {team.name}
        </h2>
        <span className="text-muted-foreground shrink-0 text-[0.6875rem] tracking-wide">
          {team.role.toLowerCase()}
        </span>
        {mayLeave ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            // An icon-only destructive control names its row. "Leave" alone
            // does not say which team disappears — lesson 28, third use.
            aria-label={
              armed ? `Confirm leaving ${team.name}` : `Leave ${team.name}`
            }
            disabled={leaveTeam.isPending}
            onClick={() => (armed ? leave() : setArmed(true))}
            // Losing focus un-arms it, so a button left mid-confirm does not
            // sit there waiting for the next click that lands nearby.
            onBlur={() => setArmed(false)}
            className={cn(
              "-my-1 h-6 shrink-0 gap-1 self-center px-1.5 text-[0.6875rem]",
              armed
                ? "text-destructive hover:text-destructive"
                : "text-muted-foreground",
            )}
          >
            <DoorOpen className="size-3.5" aria-hidden />
            {armed ? "Sure?" : null}
          </Button>
        ) : null}
      </div>

      {leaveTeam.error !== null ? (
        <p role="alert" className="text-destructive px-3 text-xs text-balance">
          {errorMessage(leaveTeam.error, "Could not leave this team")}
        </p>
      ) : null}

      <ul className="grid gap-0.5">
        {SECTIONS.filter((section) => team.can.includes(section.needs)).map(
          (section) => (
            <li key={section.to}>
              <NavLink
                to={`/teams/${team.id}/${section.to}`}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "group relative flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors duration-150 ease-[var(--ease-out)]",
                    isActive
                      ? "text-sidebar-accent-foreground font-medium"
                      : "text-muted-foreground hover:text-sidebar-accent-foreground",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {/* The highlight is one element that slides between
                          rows, so the eye follows it instead of finding a
                          new box somewhere else. */}
                    {isActive ? (
                      <motion.span
                        layoutId="nav-active"
                        aria-hidden
                        className="bg-sidebar-accent absolute inset-0 -z-10 rounded-lg shadow-(--shadow-raised)"
                        transition={{ duration: 0.22, ease: EASE_OUT }}
                      />
                    ) : null}
                    <section.icon
                      className={cn(
                        "size-4 shrink-0 transition-colors duration-150",
                        isActive ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    {section.label}
                  </>
                )}
              </NavLink>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function TeamNav({
  teams,
  onNavigate,
}: {
  teams: Team[];
  onNavigate: () => void;
}) {
  if (teams.length === 0) {
    return (
      <p className="text-muted-foreground px-3 py-2 text-sm text-balance">
        You are in no team yet. Once someone adds you, your teams appear here.
      </p>
    );
  }

  return (
    <div className="grid gap-5">
      {teams.map((team) => (
        <TeamRow key={team.id} team={team} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

function SidebarBody({ onNavigate }: { onNavigate: () => void }) {
  const { user } = useSession();
  const logout = useLogout();
  const { data: teams, isPending, error } = useTeams();

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-5">
      <div className="px-3">
        <Wordmark />
      </div>

      <nav aria-label="Teams" className="flex-1">
        {isPending ? (
          <div
            role="status"
            aria-busy="true"
            aria-label="Loading your teams"
            className="grid gap-2 px-3"
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>
        ) : error !== null ? (
          <p className="text-muted-foreground px-3 text-sm text-balance">
            Could not reach the server for your teams. It will retry when this
            tab comes back into focus.
          </p>
        ) : (
          <TeamNav teams={teams} onNavigate={onNavigate} />
        )}
      </nav>

      <div className="border-sidebar-border grid gap-3 border-t px-3 pt-4">
        <UnderTheHood />
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground min-w-0 truncate text-xs">
            {user?.email}
          </span>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Sign out"
            title="Sign out"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <LogOut />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** A background refetch is not a loading screen. This says the app is talking
 *  to the server while the content it already has stays on the page. */
function ActivityBar() {
  const fetching = useIsFetching();

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 h-px overflow-hidden"
    >
      <AnimatePresence>
        {fetching > 0 ? (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            className="bg-primary absolute inset-y-0 left-0 w-1/3 [animation:route-progress_1.1s_var(--ease-in-out)_infinite]"
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function AppShell() {
  // Whether the drawer is open is a fact about this browser tab, so it is the
  // one kind of thing useState is for here.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { teamId } = useParams();

  return (
    <div className="grid min-h-dvh lg:grid-cols-[17.5rem_1fr]">
      {/* Desktop rail. Sticky, its own scroll, never competing with the page. */}
      <aside className="bg-sidebar border-sidebar-border hidden h-dvh lg:sticky lg:top-0 lg:block lg:border-r">
        <SidebarBody onNavigate={() => undefined} />
      </aside>

      {/* Mobile: the same sidebar, as a drawer over the page. */}
      <AnimatePresence>
        {drawerOpen ? (
          <>
            <motion.div
              key="scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-40 bg-foreground/25 backdrop-blur-[2px] lg:hidden"
            />
            <motion.aside
              key="drawer"
              // It leaves the way it came in, so the gesture reads as one move.
              initial={{ transform: "translateX(-100%)" }}
              animate={{ transform: "translateX(0%)" }}
              exit={{ transform: "translateX(-100%)" }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="bg-sidebar fixed inset-y-0 left-0 z-50 w-[17.5rem] shadow-(--shadow-page) lg:hidden"
            >
              <div className="absolute top-4 right-3 z-10">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Close menu"
                  onClick={() => setDrawerOpen(false)}
                >
                  <X />
                </Button>
              </div>
              <SidebarBody onNavigate={() => setDrawerOpen(false)} />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <div className="flex min-w-0 flex-col">
        <header className="bg-background/80 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur-md lg:px-12">
          <Button
            size="icon-sm"
            variant="ghost"
            className="lg:hidden"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <Menu />
          </Button>
          <div className="lg:hidden">
            <Wordmark />
          </div>
          <CurrentTeamName teamId={teamId} />
          <ActivityBar />
        </header>

        {/* The column is anchored to the rail, not floated in the middle of
            whatever monitor this is: the header name and the page title sit on
            the same left edge. */}
        <main className="w-full max-w-3xl flex-1 px-4 py-8 lg:px-12 lg:py-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function CurrentTeamName({ teamId }: { teamId: string | undefined }) {
  const { data: teams } = useTeams();
  const team = teams?.find((t) => String(t.id) === teamId);
  if (team === undefined) return null;

  return (
    <p className="hidden min-w-0 truncate text-sm font-medium lg:block">
      {team.name}
    </p>
  );
}
