import { buildApp } from "./app.ts";
import { config } from "./config.ts";

// * The entry point. Only job: build the app and start listening.
const app = await buildApp();

// * A restart arrives as a signal, not as a crash. Without this the process
// * dies mid-request and the Postgres pool is never handed back. close() stops
// * accepting, lets what is in flight finish, then runs the onClose hooks.
// ? once, not on: a second Ctrl-C should kill it outright, not queue a second close.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, async () => {
    await app.close();
    process.exit(0);
  });
}

try {
  // ! Default host is loopback on purpose. In deploy/nginx.conf nginx is the
  // ! only thing that may reach this port; binding 0.0.0.0 puts the API on the
  // ! public internet with no TLS in front of it.
  await app.listen({
    port: Number(config.PORT),
    host: config.HOST,
  });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
