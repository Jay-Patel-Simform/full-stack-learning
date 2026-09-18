// The leave button in the team row. Three behaviours worth locking down, and
// all three are invisible to a function test: whether a control is rendered at
// all, how many clicks it takes, and what a refusal puts on screen.
import { render, screen, waitFor } from "@testing-library/react";
import { AxiosError } from "axios";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { api } from "@/lib/api";
import { TooltipProvider } from "./ui/tooltip";
import { TeamRow } from "./app-shell";
import type { Action, Team } from "@/features/teams/teams";

const team = (can: Action[]): Team => ({
  id: 3,
  name: "Design",
  role: "MEMBER",
  can,
});

function renderRow(can: Action[]) {
  const client = new QueryClient({
    // ! retry: false, or the 409 test waits through backoff and is reported
    // ! as a timeout -- an error naming the wrong problem.
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        {/* Radix throws without it: `Tooltip` must be used within
            `TooltipProvider`. The app mounts one in main.tsx. */}
        <TooltipProvider>
          <TeamRow team={team(can)} onNavigate={() => {}} />
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const leaveButton = () =>
  screen.queryByRole("button", { name: /leave Design/i });

afterEach(() => vi.restoreAllMocks());

test("no button when the server did not offer the action", () => {
  renderRow(["task:read"]);

  // ? The server sends the answer, never the policy. This app holds no
  // ? permission table of its own to consult.
  expect(leaveButton()).toBe(null);
});

test("the first click arms, it does not leave", async () => {
  const spy = vi.spyOn(api, "delete").mockResolvedValue({ data: "" });
  renderRow(["task:read", "member:leave"]);
  const user = userEvent.setup();

  await user.click(leaveButton()!);

  // ! The whole point of the two-step. One click on a control that sits
  // ! beside the nav links must not remove you from a team.
  expect(spy).not.toHaveBeenCalled();
  // The label changes, so a screen reader is told the button now means
  // something else rather than silently doing something else.
  expect(
    screen.getByRole("button", { name: /confirm leaving Design/i }),
  ).toBeTruthy();
});

test("the second click sends the delete", async () => {
  const spy = vi.spyOn(api, "delete").mockResolvedValue({ data: "" });
  renderRow(["task:read", "member:leave"]);
  const user = userEvent.setup();

  await user.click(leaveButton()!);
  await user.click(screen.getByRole("button", { name: /confirm leaving/i }));

  await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
  expect(spy.mock.calls[0]?.[0]).toBe("/teams/3/members/me");
});

test("a sole owner sees the server's 409 sentence", async () => {
  // ! A REAL AxiosError, not a plain object shaped like one. errorMessage()
  // ! narrows with `instanceof AxiosError`, so a look-alike silently takes the
  // ! fallback branch -- the error line still appears and the test still
  // ! passes, while proving nothing about the server's own sentence.
  const refusal = new AxiosError("Request failed with status code 409");
  refusal.response = {
    status: 409,
    statusText: "Conflict",
    data: {
      error: "the last owner cannot leave; make somebody else an owner first",
    },
    headers: {},
    config: { headers: {} } as never,
  };
  vi.spyOn(api, "delete").mockRejectedValue(refusal);
  renderRow(["task:read", "member:leave"]);
  const user = userEvent.setup();

  await user.click(leaveButton()!);
  await user.click(screen.getByRole("button", { name: /confirm leaving/i }));

  // * `can` said yes and the server said no, and that is not a bug: the hint
  // * is about the role, the refusal is about the team. Show the server's own
  // * words, because they say what to do about it.
  await screen.findByText(/last owner cannot leave/i);
});

test("the button says what it is, on focus as well as hover", async () => {
  renderRow(["task:read", "member:leave"]);
  const user = userEvent.setup();

  // An icon alone is a guess. Radix opens the tooltip on focus with no delay,
  // which is also how a keyboard user reaches it at all.
  await user.tab();
  expect(await screen.findAllByText(/leave Design/i)).not.toHaveLength(0);
});

// NOT tested: the armed tooltip copy ("nobody can add you back but an
// admin"). Activating a trigger closes its tooltip, by design, so asserting
// the armed text means re-opening it — and Radix's pointer state machine does
// not replay faithfully in jsdom. The state it depends on IS covered: the
// aria-label flip above proves `armed` reached the render. Chasing the rest
// would produce a test of the test environment.
