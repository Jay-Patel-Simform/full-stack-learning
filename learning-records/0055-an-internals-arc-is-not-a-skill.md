# 0055 — Seven lessons of Postgres internals were not on the mission

Date: 2026-09-17
Status: accepted

## Context
Lessons 44-50 covered dead tuples and VACUUM, what `pg_database_size` counts,
unused vs bloated indexes, adding an index as a migration, `reltuples`,
`pg_stats` / MCV lists, and visibility. They grew out of lesson 43's prune
deleting 1,162 rows, not out of the plan. Lesson 43 had named three
candidates — the projects screen, a CHECK constraint on the JSON columns,
Vitest — and none was chosen.

Jay's words: "pretty boring, not intuative to learn. can we skip this?"

## Decision
Cut the arc. Lessons 44-50 and their records (0048-0054) are **deleted**, on
Jay's instruction the same day. Lesson numbering resumes at 51 — 44-50 are a
gap on purpose, and this record is the only account of what was there.

## Consequences
- Next lesson is **the projects screen** — the oldest open item, one route
  group with routes, store, schema and migration but no UI.
- Carried forward, the only line worth keeping: **an index is a bet on
  selectivity, and the planner bets on a stored guess.** It matters again only
  if a real query goes slow.
- New rule in NOTES.md: a lesson must name the line of MISSION.md it moves.
  Interesting-but-off-mission becomes a reference paragraph, never a lesson.
- This is the second time Jay has pruned scope himself (see the Docker move on
  2026-09-10). Both times he was right. Ask earlier next time.
