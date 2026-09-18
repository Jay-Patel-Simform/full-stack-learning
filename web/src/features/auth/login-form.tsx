import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/wordmark";
import { useLogin } from "@/features/auth/session";
import { errorMessage } from "@/lib/api";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();

  // The work hangs off the submit event, not off an effect watching state.
  // Rule: rerender-move-effect-to-event.
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    login.mutate({ email, password });
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="grid w-full max-w-sm gap-6">
        <Wordmark size="lg" className="justify-self-center" />

        <div className="bg-card grid gap-5 rounded-2xl p-6 shadow-(--shadow-page) ring-1 ring-foreground/8">
          <div className="grid gap-1">
            <h1 className="text-lg font-semibold tracking-[-0.02em]">Sign in</h1>
            <p className="text-muted-foreground text-sm">
              Your session lives on the server, not in this page.
            </p>
          </div>

          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* The refusal arrives where the eye already is — between the
                fields and the button — and it moves in, so a second failed
                attempt is visibly a second answer and not the first one
                still sitting there. */}
            <AnimatePresence initial={false}>
              {login.error !== null ? (
                <motion.p
                  key={errorMessage(login.error, "Sign in failed")}
                  role="alert"
                  initial={{ opacity: 0, height: 0, transform: "translateY(-4px)" }}
                  animate={{ opacity: 1, height: "auto", transform: "translateY(0px)" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: EASE_OUT }}
                  className="bg-destructive/8 text-destructive rounded-lg px-3 py-2 text-sm"
                >
                  {errorMessage(login.error, "Sign in failed")}
                </motion.p>
              ) : null}
            </AnimatePresence>

            <Button type="submit" size="lg" disabled={login.isPending}>
              {login.isPending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="text-muted-foreground text-center text-xs text-balance">
          No account here is self-serve. An admin creates it, then adds you to a
          team.
        </p>
      </div>
    </main>
  );
}
