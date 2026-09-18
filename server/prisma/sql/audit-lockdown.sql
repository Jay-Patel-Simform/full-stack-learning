-- Lesson 53: split out of tasks_app.sql. This one names a TABLE, so it can
-- only run AFTER migrations. tasks_app.sql names only roles and defaults, so
-- it can run on an empty database -- which is what a container start is.
REVOKE UPDATE, DELETE, TRUNCATE ON "AuditLog" FROM tasks_app;
