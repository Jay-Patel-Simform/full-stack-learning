export type AuditRow = {
  id: number;
  at: string; // ! ISO text, not a Date
  userId: number | null;
  actorEmail: string | null;
  method: string;
  route: string;
  status: number;
  targetType: string | null;
  targetId: number | null;
};

export type AuditPage = { items: AuditRow[]; nextCursor: number | null };
export type AuditFilter = { status?: number };

export const auditKey = (teamId: number, filter: AuditFilter) =>
  ["teams", teamId, "audit", filter] as const;

// Built once, not once per row. The formatter is expensive; the rows are not.
const when = new Intl.DateTimeFormat(undefined, {
  dateStyle: "short",
  timeStyle: "medium",
});

export const formatAt = (at: string) => when.format(new Date(at));

function isAuditRow(v: unknown): v is AuditRow {
  const r = v as Partial<AuditRow>;
  return (
    typeof r?.id === "number" &&
    typeof r.at === "string" &&
    (r.userId === null || typeof r.userId === "number") &&
    (r.actorEmail === null || typeof r.actorEmail === "string") &&
    typeof r.method === "string" &&
    typeof r.route === "string" &&
    typeof r.status === "number" &&
    (r.targetType === null || typeof r.targetType === "string") &&
    (r.targetId === null || typeof r.targetId === "number")
  );
}
export function assertAuditPage(v: unknown): AuditPage {
  const p = v as Partial<AuditPage>;
  if (!p || !Array.isArray(p.items) || !p.items.every(isAuditRow)) {
    throw new Error("audit page did not match the shape the page expects");
  }
  return v as AuditPage;
}
