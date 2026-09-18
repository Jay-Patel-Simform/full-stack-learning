import { z } from "zod";

// ? Read .env into process.env. Built into Node, so no dotenv at runtime.
// ! In production there is no file - the variables come from the environment.
try {
  process.loadEnvFile();
} catch {
  // ? no .env here, so process.env is already the whole story
}

// * Every variable this app reads, in one place, with its type.
// ! A .default() is a place a typo can hide. The four that decide whether
// ! production is SAFE have no default: no value, no boot.
const Env = z.object({
  // * The OWNER login. Migrations, seeds and tests. Never the running server.
  DATABASE_URL: z.url(),
  // * The login the internet reaches. Owns nothing, cannot CREATE, and cannot
  // ! delete an audit row. No default: a missing value must refuse to boot,
  // ! because the fallback would silently be the owner again.
  APP_DATABASE_URL: z.url(),
  NODE_ENV: z.enum(["development", "test", "production"]),
  ALLOWED_ORIGINS: z
    .string()
    .min(1)
    .transform((s) =>
      s
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  // ? stringbool accepts true/1/yes/on and false/0/no/off, and REFUSES
  // ? anything else. `=== "true"` accepted everything and answered false.
  TRUST_PROXY: z.stringbool(),

  // * These three only decide where it listens and how loud it is. Being
  // * wrong is visible in one second, so here a default is honest.
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().min(1).default("127.0.0.1"),
  LOG_LEVEL: z.enum(["silent", "error", "warn", "info", "debug", "trace"]).default("info"),

  // * How long an audit row is kept, in days. A default is right here for the
  // * opposite reason to PORT: not because being wrong is visible, but because
  // * the alternative is worse. With no default the value is undefined, and a
  // * cutoff built from undefined deletes the whole table.
  // ! min(1) is the real guard. 0 days means "older than now", which is
  // ! every row that exists.
  AUDIT_RETENTION_DAYS: z.coerce.number().int().min(1).default(90),
});

const parsed = Env.safeParse(process.env);

if (!parsed.success) {
  // ! console.error + exit(1), not throw: a stack trace buries the one thing
  // ! you need to read, and exit(1) is how the host knows the boot failed.
  console.error("Bad environment:\n" + z.prettifyError(parsed.error));
  process.exit(1);
}

// * Parsed, typed, and never read from process.env again.
export const config = parsed.data;
