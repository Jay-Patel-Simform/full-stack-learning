import { useState } from "react";
import { useParams } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "@/features/auth/session";
import { useInviteProbe, useTeams } from "@/features/teams/teams";

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/**
 * Everything that explains the app rather than doing the work. It used to sit
 * in the middle of the product; a teammate tracking tasks does not need it, and
 * the person learning the codebase still does. So: one drawer, closed by
 * default, out of the way of both.
 */
export function UnderTheHood() {
  const [open, setOpen] = useState(false);
  const { user, isPending } = useSession();
  const { teamId } = useParams();
  const { data: teams } = useTeams();
  const team = teams?.find((t) => String(t.id) === teamId);
  const state = isPending ? "unknown" : user != null ? "in" : "out";

  return (
    <div className="grid gap-1">
      <Button
        size="sm"
        variant="ghost"
        aria-expanded={open}
        className="text-muted-foreground -mx-2 justify-start"
        onClick={() => setOpen((o) => !o)}
      >
        <ChevronRight
          className={`transition-transform duration-200 ease-[var(--ease-out)] ${open ? "rotate-90" : ""}`}
        />
        Under the hood
      </Button>

      {/* Height is the one property worth animating here: an accordion has no
          transform that means the same thing. */}
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="grid gap-3 pt-1 pb-2">
              <p className="text-muted-foreground font-mono text-xs">
                session:{" "}
                <span className="text-foreground font-medium">{state}</span>
              </p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                The server vouched for you. Nothing on this page read a token to
                decide that — <code className="font-mono">document.cookie</code>{" "}
                is empty right now. Check it in the console.
              </p>
              {team !== undefined && user != null ? (
                <InviteProbe teamId={team.id} userId={user.id} />
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * Ask the server for something the UI may not be offering you. Deliberately
 * harmless: it invites *you*, to a team you are already in. A refusal is 403,
 * an agreement is 409 because you are already a member. There is no third
 * answer, so this button can never change anything — it only reports who
 * decided.
 */
function InviteProbe({ teamId, userId }: { teamId: number; userId: number }) {
  const probe = useInviteProbe(teamId, userId);

  return (
    <div className="grid gap-1.5">
      <Button
        size="sm"
        variant="outline"
        className="justify-self-start"
        onClick={() => probe.mutate()}
        disabled={probe.isPending}
      >
        {probe.isPending ? "Asking…" : "Ask the server anyway"}
      </Button>
      <AnimatePresence mode="wait">
        {probe.data !== undefined ? (
          <motion.p
            key={probe.data}
            initial={{ opacity: 0, transform: "translateY(-2px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            className="font-mono text-xs"
          >
            <span
              className={
                probe.data === 403 ? "text-destructive" : "text-success"
              }
            >
              {probe.data}
            </span>{" "}
            <span className="text-muted-foreground">
              {probe.data === 403
                ? "forbidden, whatever the page was drawing"
                : "allowed; already a member"}
            </span>
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
