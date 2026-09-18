import { Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { LoginForm } from "@/features/auth/login-form";
import { SignedInCard } from "@/features/auth/signed-in-card";
import { useSession } from "@/features/auth/session";
import { TeamsCard } from "@/features/teams/teams-card";

// Every component lives at module level, never nested inside another.
// Rule: rerender-no-inline-components.
function Asking() {
  return (
    <p className="text-muted-foreground text-sm">Asking the server who you are…</p>
  );
}

function StateLine({ state }: { state: string }) {
  return (
    <p className="text-muted-foreground font-mono text-xs">
      state: <span className="text-foreground">{state}</span>
    </p>
  );
}

// The shell every route renders inside. The session question is asked once,
// here, and the answer decides whether the URL is allowed — so a route never
// has to ask it again.
function Shell() {
  const { user, isPending } = useSession();
  const state = isPending ? "unknown" : user != null ? "in" : "out";

  return (
    <main className="mx-auto grid max-w-md gap-4 p-8">
      <header className="grid gap-1">
        <h1 className="text-xl font-semibold">Team Task Tracker</h1>
        <StateLine state={state} />
      </header>
      {isPending ? <Asking /> : <Outlet />}
    </main>
  );
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

function Home() {
  const { user } = useSession();
  if (user == null) return null; // RequireAuth already guaranteed this.

  return (
    <>
      <SignedInCard user={user} />
      <TeamsCard user={user} />
    </>
  );
}

function NotFound() {
  return <p className="text-muted-foreground text-sm">No such page.</p>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route element={<RequireAnon />}>
          <Route path="/login" element={<LoginForm />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Home />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
