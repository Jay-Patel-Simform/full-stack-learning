// * The entry point cron calls: `npm run audit:prune`. Four lines, so the
// * job itself stays a plain function that a test can call directly.
import { compactAuditLog, pruneAuditLog } from "./retention.ts";

const deleted = await pruneAuditLog();
await compactAuditLog();
console.log(`audit prune: deleted ${deleted} rows, reindexed and analysed`);
