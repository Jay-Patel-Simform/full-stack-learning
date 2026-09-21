import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router";
import { MotionConfig } from "motion/react";
import { LoginForm } from "@/features/auth/login-form";
import { RegisterForm } from "@/features/auth/register-form";
import { useSession } from "@/features/auth/session";
import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/skeleton";
import { EmptyState } from "@/components/empty-state";
import { useTeams } from "@/features/teams/teams";
import { TasksPage } from "@/features/tasks/tasks-page";
import { ProjectsPage } from "@/features/projects/projects-page";
import { ActivityPage } from "@/features/audit/activity-page";
import { NewTeamForm } from "./features/teams/new-team-form";

// Every component lives at module level, never nested inside another.
// Rule: rerender-no-inline-components.

/**
 * The first paint, while the server is still being asked who you are. It is
 * the shape of the app, not the word "loading": the shell that is coming does
 * not move when the answer lands.
 */
function Booting() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Signing you in"
      className="grid min-h-dvh lg:grid-cols-[17.5rem_1fr]"
    >
      <div className="bg-sidebar hidden h-dvh gap-3 border-r px-6 py-5 lg:grid lg:content-start">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="mt-6 h-3 w-24" />
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3.5 w-32" />
      </div>
      <div className="grid content-start gap-4 px-4 py-10 lg:px-8">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-3.5 w-72" />
        <Skeleton className="mt-4 h-11 w-full max-w-xl" />
        <Skeleton className="h-11 w-full max-w-xl" />
        <p className="cold-start-notice text-muted-foreground mt-2 text-sm">
          Waking the server up — the first load after a quiet spell takes up to
          a minute.
        </p>
      </div>
    </div>
  );
}

/**
 * The shell asks the session question once, here, and the answer decides
 * whether the URL is allowed — so no route has to ask it again.
 */
function SessionGate() {
  const { isPending } = useSession();
  return isPending ? <Booting /> : <Outlet />;
}

// ! Guards render `Navigate`, they do not call navigate() in an effect: an
// ! effect runs *after* the wrong screen has already painted.
// Rule: rerender-move-effect-to-event.
function RequireAuth() {
  const { user } = useSession();
  const location = useLocation();

  // `replace`, so Back does not walk into the page we just bounced out of.
  // The attempted URL rides along so login can send them back to it.
  return user != null ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace state={{ from: location }} />
  );
}

function RequireAnon() {
  const { user } = useSession();
  const location = useLocation();
  const from = (location.state as { from?: Location } | null)?.from?.pathname;

  return user == null ? <Outlet /> : <Navigate to={from ?? "/"} replace />;
}

/**
 * "/" is not a screen. The first team you are in is, so send the browser
 * there and let the URL say which team is open.
 */
function TeamIndex() {
  const { data: teams, isPending, error } = useTeams();

  if (isPending) {
    return (
      <div
        className="grid gap-3"
        role="status"
        aria-busy="true"
        aria-label="Loading your teams"
      >
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-3.5 w-80" />
      </div>
    );
  }

  if (error !== null) {
    return (
      <EmptyState
        title="The server did not answer"
        body="Your teams could not be loaded. The app asks again when this tab comes back into focus."
      />
    );
  }

  if (teams.length === 0) {
    return (
      <EmptyState
        title="No teams yet"
        body="You are not in a team. An admin adds you by your user id, and this page fills in the moment they do."
        action={<NewTeamForm />}
      />
    );
  }

  return <Navigate to={`/teams/${teams[0].id}/tasks`} replace />;
}

function NotFound() {
  const { teamId } = useParams();
  return (
    <EmptyState
      title="No such page"
      body={
        teamId === undefined
          ? "That address does not point at anything here."
          : "That section does not exist for this team."
      }
    />
  );
}

export default function App() {
  return (
    // Reduced motion is honoured app-wide rather than component by component:
    // transforms drop out, opacity and colour stay, comprehension survives.
    <MotionConfig reducedMotion="user">
      <Routes>
        <Route element={<SessionGate />}>
          <Route element={<RequireAnon />}>
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route index element={<TeamIndex />} />
              <Route path="/teams/:teamId/tasks" element={<TasksPage />} />
              <Route
                path="/teams/:teamId/projects"
                element={<ProjectsPage />}
              />
              <Route
                path="/teams/:teamId/activity"
                element={<ActivityPage />}
              />
              <Route
                path="/teams/:teamId"
                element={<Navigate to="tasks" replace />}
              />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </MotionConfig>
  );
}
