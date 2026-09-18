// ! The one place that answers "may this role do this?"
// ! Roles are data (a database row). Permissions are code (this table), so
// ! nobody grants themselves a power by editing a row. Unknown = deny.
// ! https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html

// * Role names come from the Postgres enum, never retyped. Add one there and
// * PERMISSIONS below fails to compile.
import type { Role } from "../generated/prisma/enums.ts";
export type { Role };

// ? Least to most powerful. `satisfies` checks the names, `as const` keeps them.
export const ROLES = [
  "VIEWER",
  "MEMBER",
  "ADMIN",
  "OWNER",
] as const satisfies readonly Role[];

// * Every action the API will ever check. "resource:verb", so it reads aloud.
export const ACTIONS = [
  "task:read",
  "project:read",
  "task:create",
  "task:update",
  "task:delete",
  "project:create",
  "project:delete",
  "member:invite",
  "member:remove",
  "team:delete",
  "audit:read",
] as const;
export type Action = (typeof ACTIONS)[number];

// * The thing being acted on. One fact so far: the role you are aiming at.
// * An action with no target (team:delete) passes nothing.
export type Resource = { targetRole?: Role | undefined };

// ? "The role below, plus these". Our four happen to nest. If one ever needs a
// ? power a lower one lacks the other way round, unroll the spread.
const VIEWER = ["task:read", "project:read"] as const;
const MEMBER = [
  ...VIEWER,
  "task:create",
  "task:update",
  "task:delete",
  "project:create",
] as const;
const ADMIN = [
  ...MEMBER,
  "project:delete",
  "member:invite",
  "member:remove",
  // ! Reading the log is an ADMIN power, not a MEMBER one: the rows name who
  // ! did what, and that is exactly what a curious member should not browse.
  "audit:read",
] as const;
const OWNER = [...ADMIN, "team:delete"] as const;

const PERMISSIONS: Record<Role, readonly Action[]> = {
  VIEWER,
  MEMBER,
  ADMIN,
  OWNER,
};

// * Every action this role may do with no target in mind. The front end asks
// * for this list so it never keeps a second copy of the table below -- one
// * table, two consumers.
// ! Advisory only. The rank rule needs a target and a list has none, so this
// ! is what the UI should *offer*, never what the API will *allow*.
export const allowedActions = (role: Role): readonly Action[] =>
  PERMISSIONS[role] ?? [];

// ? Seniority, derived from ROLES. -1 for junk, which loses every compare.
const rank = (role: Role): number =>
  ROLES.indexOf(role as (typeof ROLES)[number]);

// * Two questions, in order.
// *   1. Does the table grant this role the action at all?
// *   2. If the action has a target, does this role outrank it?
// * undefined role = "not a member of this team at all" = no.
export function can(
  role: Role | undefined,
  action: Action,
  resource?: Resource,
): boolean {
  if (role === undefined) return false;
  // ! `?? false` looks dead, but a role read out of the database is only a Role
  // ! because we said so. A bad value gets a no, not a crash.
  if (!(PERMISSIONS[role]?.includes(action) ?? false)) return false;

  // ! Rank rule: only act on somebody strictly below you. Closes "ADMIN removes
  // ! the OWNER", and equal rank is a no too, so peers cannot touch each other.
  const target = resource?.targetRole;
  if (target !== undefined && rank(role) <= rank(target)) return false;

  return true;
}
