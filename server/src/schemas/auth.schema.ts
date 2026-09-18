import { z } from "zod";

// ! Normalise BEFORE the format check, or a pasted "  Jay@x.com " is a 400.
// ! Order matters: each step in a zod chain sees the output of the one to its
// ! left, so .trim() after .email() trims a string that already passed.
// * One door for the address. The store below only ever sees lower case, so
// * "Jay@x.com" and "jay@x.com" are the same account, not two rows.
const emailField = z.string().trim().toLowerCase();

export const Register = z.object({
  email: emailField.pipe(z.email().max(254)),
  password: z.string().min(8).max(256),
});

// ! No .min(8) and no .email(): "too short" and "not an email" are free hints
// ! about what a real address looks like here. Same normalisation, though --
// ! login must find the row register wrote.
export const Login = z.object({
  email: emailField.pipe(z.string().max(254)),
  password: z.string().max(256),
});

export const UserPublic = z.object({
  id: z.number(),
  email: z.string(),
});

export type RegisterInput = z.infer<typeof Register>;
export type LoginInput = z.infer<typeof Login>;
