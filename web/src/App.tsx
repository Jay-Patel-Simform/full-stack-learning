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

export default function App() {
  const { user, isPending } = useSession();

  // Three states, derived straight from the query. No useState mirroring it,
  // no useEffect syncing it.
  const state = isPending ? "unknown" : user != null ? "in" : "out";

  return (
    <main className="mx-auto grid max-w-md gap-4 p-8">
      <header className="grid gap-1">
        <h1 className="text-xl font-semibold">Team Task Tracker</h1>
        <StateLine state={state} />
      </header>

      {isPending ? (
        <Asking />
      ) : user != null ? (
        <>
          <SignedInCard user={user} />
          <TeamsCard user={user} />
        </>
      ) : (
        <LoginForm />
      )}
    </main>
  );
}
