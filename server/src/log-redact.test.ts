import { test } from "node:test";
import assert from "node:assert/strict";
import { Writable } from "node:stream";
import { buildApp } from "./app.ts";

test("a secret attached to an error never reaches the log", async () => {
  const out: string[] = [];
  const sink = new Writable({
    write(chunk, _enc, cb) {
      out.push(chunk.toString());
      cb();
    },
  });
  const app = await buildApp(sink);

  const err: any = new Error("db down");
  err.user = { id: 7, passwordHash: "scrypt$SALT$HASH" };
  app.log.error({ err }, "unhandled error");
  app.log.info({ body: { password: "hunter2" } }, "login body");
  await app.close();

  const all = out.join("");
  assert.ok(all.length > 0, "the log wrote nothing - check the level");
  assert.ok(!all.includes("scrypt$SALT$HASH"), "the hash leaked");
  assert.ok(!all.includes("hunter2"), "the password leaked");
  assert.equal((all.match(/\[Redacted\]/g) ?? []).length, 2);
});
