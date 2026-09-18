// Lesson 68. The first test in this project that needs a DOM.
//
// Everything before this tested exported functions: inputs in, outputs out,
// no browser. The three decisions inside `disabled={isPending || name.trim()
// === ""}` are not reachable that way -- they only exist once something has
// rendered a button and somebody has typed into a box.
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError } from "axios";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { api } from "@/lib/api";
import { NewTeamForm } from "./new-team-form";

// * The component needs two providers to exist at all: React Query for the
// * mutation, a router for useNavigate. This helper is the whole reason a
// * component test feels heavier than a function test -- a component is a
// * thing in a tree, not a thing with arguments.
function renderForm() {
  const client = new QueryClient({
    // ! retry: false, or the 403 test waits through backed-off retries and is
    // ! then reported as a TIMEOUT -- an error naming the wrong problem.
    // ! A default that is right for an app is often wrong for a test.
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <NewTeamForm />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ! Typed as the concrete elements, because the assertions below read
// ! .disabled and .value. toBeDisabled()/toHaveValue() would be prettier and
// ! come from @testing-library/jest-dom -- a fifth package for nicer wording.
// ! Three tests is not enough annoyance to buy it.
const nameBox = () => screen.getByLabelText(/team name/i) as HTMLInputElement;
const submit = () =>
  screen.getByRole("button", { name: /create team/i }) as HTMLButtonElement;

// ? Spy on the axios instance, not on fetch and not on the module. One line,
// ? no module mocking, and errorMessage() stays the real one.
afterEach(() => vi.restoreAllMocks());

test("a name of only spaces cannot be submitted", async () => {
  renderForm();
  const user = userEvent.setup();

  // ! getByRole, not getByTestId. The test asks the same question a screen
  // ! reader asks, so it fails if the button stops being reachable.
  expect(submit().disabled).toBe(true);

  await user.type(nameBox(), "   ");

  // ? The trim rule, open since lesson 26, finally enforced somewhere.
  // ? Three spaces is still empty.
  expect(submit().disabled).toBe(true);
});

test("a real name submits the trimmed value", async () => {
  const spy = vi
    .spyOn(api, "post")
    .mockResolvedValue({ data: { id: 7, name: "Design" } });
  renderForm();
  const user = userEvent.setup();

  await user.type(nameBox(), "  Design  ");
  expect(submit().disabled).toBe(false);
  await user.click(submit());

  await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));

  // ! The assertion that matters: "Design", not "  Design  ". Asserting only
  // ! that a request happened would pass with the spaces still attached --
  // ! the same family as lesson 20's "a sort test whose two orders agree
  // ! cannot fail".
  expect(spy.mock.calls[0]?.[1]).toEqual({ name: "Design" });
});

test("a refused create leaves the typed name on screen", async () => {
  // ! A REAL AxiosError, not a plain object shaped like one. errorMessage()
  // ! narrows with `instanceof AxiosError`, so a look-alike quietly falls back
  // ! to the default sentence -- an error line still appears and this test
  // ! still passes, while never proving the server's words reach the screen.
  const refusal = new AxiosError("Request failed with status code 403");
  refusal.response = {
    status: 403,
    statusText: "Forbidden",
    data: { error: "forbidden" },
    headers: {},
    config: { headers: {} } as never,
  };
  vi.spyOn(api, "post").mockRejectedValue(refusal);
  renderForm();
  const user = userEvent.setup();

  await user.type(nameBox(), "Design");
  await user.click(submit());

  // * Lesson 26's decision, now a test: clear the box in onSuccess, never in
  // * onSubmit. A 403 that eats the sentence you typed is the rudest thing a
  // * form can do, and nothing has ever stopped this regressing.
  // ? findByText, not getByText -- the message arrives after the request.
  // ? And the SERVER's word, not the fallback: asserting the fallback would
  // ? pass even if errorMessage() never unwrapped the reply.
  await screen.findByText(/forbidden/i);
  expect(nameBox().value).toBe("Design");
});