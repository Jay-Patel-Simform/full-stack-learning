-- Written by hand. The app now lower-cases every email at the door
-- (src/schemas/auth.schema.ts), so the rows written before it must catch up,
-- or an old "Jay@x.com" account can never be logged into again.

-- Two rows that differ only in case are two accounts for one person. Only a
-- human can say which one is real, so refuse to guess: the UPDATE below hits
-- the @unique on email and this whole migration rolls back.
-- Find them first with:
--   SELECT lower(email), count(*) FROM "User" GROUP BY 1 HAVING count(*) > 1;
UPDATE "User" SET email = lower(email) WHERE email <> lower(email);
