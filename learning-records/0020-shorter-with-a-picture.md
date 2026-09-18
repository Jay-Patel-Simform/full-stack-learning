# 0020 — Shorter, with a picture

Date: 2026-09-07
Lessons: [all 18, rewritten](../lessons/index.html)

## Context

Jay asked for every lesson to be rewritten: "I am finding it difficult to
understand the concepts." Asked three questions before touching anything,
because rewriting 18 files in the wrong direction is a lot of wasted work.
His answers:

- **Which part is hard:** all of it, from lesson 1.
- **What would help:** shorter, with more pictures.
- **Ideas or code:** both, equally.

## Decision

Rewrote all 18 lessons to one shape, about a third of their previous length:

1. `.tldr` — three or four bullets, never more.
2. **One diagram, high up**, carrying the central idea before any prose.
3. The idea in short paragraphs, with `.word` glosses for each new term.
4. The minimum code, often as a `.vs` bad/good pair.
5. One `.takeaway` sentence.
6. One two-option quiz.
7. "Do this" — three concrete commands.

Originals moved to `lessons/long/`, cross-links repaired, and every short
lesson links to its long twin. Nothing was deleted.

Added two new artefacts, because "all of it is hard" is a navigation problem
as much as a density problem:

- `lessons/index.html` — the 18 lessons, grouped by week, one rule each.
- `reference/the-whole-arc.html` — every rule, every word, every trap and
  every open thread on one printable page, with the eight-layer request
  diagram at the top.

## Why

The old lessons averaged 17 KB. They were not wrong, they were **too much at
once** — working memory is small, and a lesson that takes 20 minutes of
reading spends most of that budget on prose rather than on the idea. Cutting
to ~5 KB forced one idea per lesson and made room for a diagram, which is the
part he actually asked for.

Two things were kept deliberately, against the instinct to trim everything:
the **citations** and the **"what this does NOT fix"** honesty. Both are what
make a lesson trustworthy rather than just short.

## What this changes going forward

- **New default lesson length: ~5 KB, one diagram, one quiz.** Not 17 KB.
- The diagram comes *before* the prose, not after it as an illustration.
- New terms get a `.word` gloss on first use, always.
- `reference/the-whole-arc.html` gets a new row every lesson. It is now the
  document to revisit, and the lessons are the disposable part — which is how
  the workspace was always supposed to work.
- New shared components in `assets/lesson.css`: `.vs`, `.word`, `.ask`.

## Open

Whether the shorter shape actually lands is not yet known. The read-back check
is whether he can say a lesson's `.takeaway` sentence unprompted a week later.
Ask about lessons 9, 10 and 13 first — those are the three whose ideas were
densest in the old format.
