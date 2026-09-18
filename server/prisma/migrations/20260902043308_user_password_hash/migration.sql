-- Existing rows get an empty hash. No real password can ever match it, so those
-- users cannot log in until a password is set. Then drop the default so new
-- rows must supply a hash.
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP DEFAULT;
