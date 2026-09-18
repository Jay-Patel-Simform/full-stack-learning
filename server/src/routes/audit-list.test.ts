// Run with: npm test
// The audit list route. Two people, one team: an ADMIN who may read the log
// and a MEMBER who may not. Own file, own fixture -- node:test gives each file
// its own process, so nothing here can be disturbed by another file.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../db.ts";
import { buildApp } from "../app.ts";
import { COOKIE_NAME, createSession } from "../auth/session.ts";
import { hashPassword } from "../auth/password.ts";

const app = await buildApp();
const stamp = Date.now();

let adminCookie = "";
let memberCookie = "";
let adminId = 0;
let memberId = 0;
let teamId = 0;
let otherTeamId = 0;

// * 25 rows seeded, 5 of them refusals.
const SEEDED = 25;
const SEEDED_403 = 5;

async function makeUser(tag: string) {
  const user = await prisma.user.create({
    data: {
      email: `t34-${tag}-${stamp}@example.com`,
      passwordHash: await hashPassword("correct horse battery"),
    },
  });
  return { id: user.id, cookie: `${COOKIE_NAME}=${(await createSession(user.id)).id}` };
}

before(async () => {
  await app.ready();
  const admin = await makeUser("admin");
  const member = await makeUser("member");
  adminId = admin.id;
  memberId = member.id;
  adminCookie = admin.cookie;
  memberCookie = member.cookie;

  const team = await prisma.team.create({
    data: {
      name: `t34-${stamp}`,
      members: {
        create: [
          { userId: adminId, role: "ADMIN" },
          { userId: memberId, role: "MEMBER" },
        ],
      },
    },
  });
  teamId = team.id;

  const other = await prisma.team.create({
    data: { name: `t34-other-${stamp}`, members: { create: { userId: adminId, role: "ADMIN" } } },
  });
  otherTeamId = other.id;

  await prisma.auditLog.createMany({
    data: Array.from({ length: SEEDED }, (_, i) => ({
      teamId,
      userId: adminId,
      method: "POST",
      route: "/teams/:teamId/tasks",
      // ? The last five are refusals, so ?status=403 has something to find.
      status: i >= SEEDED - SEEDED_403 ? 403 : 201,
      ip: "203.0.113.7",
    })),
  });

  // ! One row in a different team. If the store ever drops its teamId filter,
  // ! this row shows up in someone else's log and every count below is off.
  await prisma.auditLog.create({
    data: {
      teamId: otherTeamId,
      userId: adminId,
      method: "POST",
      route: "/teams/:teamId/tasks",
      status: 201,
      ip: "203.0.113.8",
    },
  });
});

after(async () => {
  await prisma.auditLog.deleteMany({ where: { teamId: { in: [teamId, otherTeamId] } } });
  await prisma.team.deleteMany({ where: { id: { in: [teamId, otherTeamId] } } });
  await prisma.user.deleteMany({ where: { id: { in: [adminId, memberId] } } });
  await app.close();
});

function list(query: string, cookie = adminCookie) {
  return app.inject({ method: "GET", url: `/teams/${teamId}/audit${query}`, headers: { cookie } });
}

// ! The audit hook runs in onResponse, which finishes AFTER inject resolves.
// ! Without this wait the next test counts the rows before the 403 lands, and
// ! fails about one time in five.
async function waitForRows(n: number) {
  for (let i = 0; i < 50; i++) {
    if ((await prisma.auditLog.count({ where: { teamId } })) >= n) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  assert.fail(`only ${await prisma.auditLog.count({ where: { teamId } })} rows, wanted ${n}`);
}

// * Runs first on purpose: its own refusal is a row the tests below count.
test("a MEMBER may not read the log", async () => {
  const res = await list("", memberCookie);
  assert.equal(res.statusCode, 403);
  await waitForRows(SEEDED + 1);
});

test("an ADMIN sees the rows, newest first", async () => {
  const res = await list("?limit=100");
  assert.equal(res.statusCode, 200);
  const items = res.json().items as { id: number; route: string; status: number }[];

  // ! 26, not 25. The MEMBER's 403 above was itself audited -- the refusal is
  // ! the row the log most wants, and it is now the newest one.
  assert.equal(items.length, SEEDED + 1);
  assert.equal(items[0]!.route, "/teams/:teamId/audit");
  assert.equal(items[0]!.status, 403);

  const ids = items.map((r) => r.id);
  assert.deepEqual(
    ids,
    [...ids].sort((a, b) => b - a),
  );
});

test("the cursor walks the whole log in three pages, no id twice", async () => {
  const seen: number[] = [];
  let cursor: number | null = null;

  for (let page = 0; page < 3; page++) {
    const res = await list(`?limit=10${cursor === null ? "" : `&cursor=${cursor}`}`);
    assert.equal(res.statusCode, 200);
    const body = res.json() as { items: { id: number }[]; nextCursor: number | null };
    seen.push(...body.items.map((r) => r.id));
    cursor = body.nextCursor;
    if (cursor === null) break;
  }

  assert.equal(cursor, null); // ? three pages was enough: 10 + 10 + 6
  assert.equal(seen.length, SEEDED + 1);
  assert.equal(new Set(seen).size, seen.length);
});

test("?status=403 filters, ?limit=1000000 is refused", async () => {
  const res = await list("?status=403&limit=100");
  assert.equal(res.statusCode, 200);
  const items = res.json().items as { status: number }[];
  // ! 6 again, not 5: the MEMBER's refusal is a 403 too.
  assert.equal(items.length, SEEDED_403 + 1);
  assert.ok(items.every((r) => r.status === 403));

  // ! The whole point of the querystring key. Leave it out of the route schema
  // ! and Fastify skips validation without failing, and this answers 200.
  assert.equal((await list("?limit=1000000")).statusCode, 400);
});

test("the reply carries no ip", async () => {
  const res = await list("?limit=100");
  // * The column is there; the schema does not name it, so the serializer
  // * drops it. Checking the raw text catches it anywhere in the body.
  assert.ok((await prisma.auditLog.findFirst({ where: { teamId } }))!.ip.length > 0);
  assert.ok(!res.body.includes("203.0.113"));
  assert.equal(Object.hasOwn(res.json().items[0], "ip"), false);
});
