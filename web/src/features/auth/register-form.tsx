import { useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/wordmark";
import { useRegister } from "@/features/auth/register";
import { errorMessage } from "@/lib/api";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const register = useRegister();

  // The work hangs off the submit event, not off an effect watching state.
  // Rule: rerender-move-effect-to-event.
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    register.mutate({ email, password });
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="grid w-full max-w-sm gap-6">
        <Wordmark size="lg" className="justify-self-center" />

        <div className="bg-card grid gap-5 rounded-2xl p-6 shadow-(--shadow-page) ring-1 ring-foreground/8">
          <div className="grid gap-1">
            <h1 className="text-lg font-semibold tracking-[-0.02em]">Create account</h1>
            <p className="text-muted-foreground text-sm">
              Registering signs you in — two calls behind one button.
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
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Same placement as sign in: the refusal lands between the
                fields and the button, and it animates in so a second failed
                attempt reads as a second answer. The failure may come from
                either call — a taken email from register, anything else from
                the login that follows — and both surface here. */}
            <AnimatePresence initial={false}>
              {register.error !== null ? (
                <motion.p
                  key={errorMessage(register.error, "Could not create account")}
                  role="alert"
                  initial={{ opacity: 0, height: 0, transform: "translateY(-4px)" }}
                  animate={{ opacity: 1, height: "auto", transform: "translateY(0px)" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: EASE_OUT }}
                  className="bg-destructive/8 text-destructive rounded-lg px-3 py-2 text-sm"
                >
                  {errorMessage(register.error, "Could not create account")}
                </motion.p>
              ) : null}
            </AnimatePresence>

            <Button type="submit" size="lg" disabled={register.isPending}>
              {register.isPending ? "Creating account…" : "Create account"}
            </Button>
          </form>
        </div>

        <p className="text-muted-foreground text-center text-xs text-balance">
          Already have an account?{" "}
          <Link to="/login" className="text-foreground underline underline-offset-4">
            Sign in
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
