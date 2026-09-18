# Base image: Node 22 on Debian slim. `slim` keeps glibc, which Prisma's query
# engine needs, while dropping the compilers a full node image carries.
FROM node:22-slim

# Working directory inside the image. Created if missing, and every path in the
# COPY/RUN/CMD lines below is relative to it.
WORKDIR /app

# * Both COPY sources are relative to the build context -- the directory given
# to `docker build`, which for this file is `server/`. Nothing above it exists
# as far as the build is concerned.
#
# The glob matches server/package.json and server/package-lock.json (that is
# what the `*` is for), and nothing else. The workspace-root package.json is
# outside the context and unreachable.
#
# They are copied alone, before the source, because Docker caches a layer by
# what went into it: editing a file in src/ leaves this layer untouched, so the
# `npm ci` below is reused instead of rerun. Copying everything up front would
# reinstall on every source edit.
COPY package*.json ./

# `ci`, not `install`: installs exactly what package-lock.json pins and fails on
# a mismatch, instead of quietly rewriting the lock file.
RUN npm ci

# Now the source. First `.` is the build context (all of server/), second `.` is
# the current WORKDIR, /app. So: the whole server directory lands in /app.
#
# * .dockerignore keeps node_modules, .env, src/generated, logs and .git out of
# the context, so none of them reach this layer. That matters twice: the host's
# node_modules no longer overwrites what `npm ci` built (which broke the moment
# the image was built for another platform), and .env no longer bakes real
# credentials into a layer anyone with the image can read.
#
# ! .dockerignore is read from the build context root, so it has to be
# server/.dockerignore -- a copy at the workspace root is never consulted.
COPY . .

RUN npx prisma generate
# src/generated/prisma is not in git and not in the image. db.ts imports it,
# so without this line the container starts and crashes on the first import.


# Documentation only. It publishes nothing -- `-p` does that.
EXPOSE 3000

# ! Exec form (a JSON array), not a shell string. The command becomes PID 1 and
# gets SIGTERM directly, which is what lets server.ts close the app on shutdown.
# A string form runs it under `sh -c`, and the signal stops at the shell.

RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]