-- Lesson 41 -- the login the internet reaches.
--
-- Run this ONCE, as the postgres superuser, against the tasks database:
--
--   psql -U postgres -h localhost -d tasks -f prisma/sql/tasks_app.sql
--
-- It needs the superuser password because CREATE ROLE does. Everything else
-- in this project runs as `tasks`, and it stays that way: migrations, seeds
-- and `npm test` all keep the owner role. Only the running API moves.
--
-- ! Do not change DATABASE_URL yet. Lesson 42 wires this login in as its own
-- ! config value and adds the test that proves a delete is refused.

-- A second login that owns nothing. That is the whole point: a role cannot
-- grant itself a privilege on a table it does not own, so the REVOKE at the
-- bottom of this file is a wall and not a note.
-- ! The password is NOT in this file. This file is committed; a password in it
-- ! is a password in the history forever. \getenv reads it from the environment
-- ! at run time -- from `env_file` when the db container inits, from your shell
-- ! when you run it against Neon by hand.
\getenv app_password APP_PASSWORD
CREATE ROLE tasks_app LOGIN PASSWORD :'app_password';

GRANT CONNECT ON DATABASE :"DBNAME" TO tasks_app;
GRANT USAGE ON SCHEMA public TO tasks_app;

-- Everything an ordinary request does. No CREATE, no ALTER, no DROP -- those
-- belong to migrations, and migrations are not a web request.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tasks_app;

-- Auto-increment ids read a sequence. Without this every INSERT fails with
-- "permission denied for sequence".
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tasks_app;

-- ! The two GRANTs above cover the tables that exist RIGHT NOW. A table added
-- ! by tomorrow's migration would have no grants at all, and the API would
-- ! start answering 500 on a route that worked in dev. FOR ROLE tasks, because
-- ! :"USER" is whichever role you are connected as -- the one that creates them.
ALTER DEFAULT PRIVILEGES FOR ROLE :"USER" IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tasks_app;
ALTER DEFAULT PRIVILEGES FOR ROLE :"USER" IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO tasks_app;

-- The audit log is append-only for the API. It may write rows and read them
-- back for the audit page; it may not change one or take one away.
--
-- TRUNCATE is listed because it is a SEPARATE privilege. Revoking DELETE and
-- stopping there leaves one word that empties the whole table -- measured in
-- lesson 41, on a copy of this database.
--
-- Deleting old rows is still necessary (6,664 rows in four days). It moves to
-- a scheduled job that connects as `tasks`, off the request path.
-- REVOKE UPDATE, DELETE, TRUNCATE ON "AuditLog" FROM tasks_app;

-- Check it: expect r and a for tasks_app, with no w, no d and no D.
--   \dp "AuditLog"
