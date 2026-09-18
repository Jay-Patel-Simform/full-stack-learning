import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client.ts";

import { config } from "./config.ts";

// // ? Read .env into process.env. Built into Node, so no dotenv package at runtime.
// // ! Throws when the file is missing, and in production there is no file - the
// // ! variables come from the environment. Missing file is fine; missing URL is not.
// try {
//   process.loadEnvFile();
// } catch {
//   // ? no .env here, so process.env is already the whole story
// }
// if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

// * Which login the app holds depends on the job, not on the file.
// * Serving requests uses the restricted role. Tests keep the owner, because
// * their cleanup deletes audit rows and a test is not a web request.
// ! Shell variables beat .env - process.loadEnvFile() does not overwrite an
// ! existing value - so `NODE_ENV=test npm test` really does pick the owner.
const connectionString = config.NODE_ENV === "test" ? config.DATABASE_URL : config.APP_DATABASE_URL;

// ? Prisma 7 talks to Postgres through a driver adapter. `pg` is that driver.
const adapter = new PrismaPg({ connectionString });

// * One client for the whole app. It holds a pool of connections.I
export const prisma = new PrismaClient({ adapter });
