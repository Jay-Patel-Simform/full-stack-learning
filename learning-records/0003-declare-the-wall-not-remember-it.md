# Declarative schemas beat per-handler safeParse

Lesson 2 (2026-09-01) moved validation out of handlers and into Fastify route `schema` options, with Zod plugged in via `setValidatorCompiler`, plus `setSerializerCompiler` + a `response` schema for output filtering.

The insight to hold on to: a safety check you must remember to write is a check you will eventually skip. Prefer the shape where forgetting is impossible. This is the same argument that will justify a global auth hook in week 3-4 and one `can()` call in week 5-6 — so re-use this framing rather than re-arguing it.

Deliberately deferred: `fastify-type-provider-zod`. Handlers cast `request.body as z.infer<typeof Schema>` for now. Introduce the plugin only when the casts start hiding a real bug, and explain type providers then.

Verified working against Fastify 5 + Zod 4 before shipping (custom validator must return `{ value }` / `{ error }`; a ZodError does not populate `error.validation`, so the readable message is built inside the compiler).

Evidence: [[0002-teach-by-building-one-app]], lessons/0002-schemas-at-the-door.html.
