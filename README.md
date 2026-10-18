# FEUP Connect

Platform connecting students with tutors, mentors and industry professionals.

## Prerequisites

- Node.js 22 or newer
- Docker (with Docker Compose)
- Git

## Setup

Run these once, from the **repo** root:

```bash
cp .env.example .env
npm install                 # root: Prettier + Git hooks (Husky)
(cd backend && npm install)
(cd frontend && npm install)
docker compose up -d db     # PostgreSQL
```

## pgAdmin (optional database GUI)

pgAdmin 4 is defined in `docker-compose.yml` and runs next to PostgreSQL. Use it to browse tables and
run queries. Do not change the schema through it: schema changes go in numbered migration files.

1. In `.env`, set `PGADMIN_DEFAULT_EMAIL` to a valid email format (for example `admin@example.com`)
   and set `PGADMIN_DEFAULT_PASSWORD`.
2. Start both services (this also starts `db`):

   ```bash
   docker compose up -d
   ```

3. Open http://localhost:5050. pgAdmin runs in desktop mode here, so there is no login screen.
4. Register the database once: right-click **Servers**, then **Register > Server...**, and fill in:

   | Tab        | Field                | Value                                     |
   | ---------- | -------------------- | ----------------------------------------- |
   | General    | Name                 | `FEUP Connect` (any name)                 |
   | Connection | Host name/address    | `db`                                      |
   | Connection | Port                 | `5432`                                    |
   | Connection | Maintenance database | `POSTGRES_DB` from `.env`                 |
   | Connection | Username             | `POSTGRES_USER` from `.env`               |
   | Connection | Password             | `POSTGRES_PASSWORD` from `.env` (save it) |

   The host is `db`, not `localhost`, because pgAdmin runs inside Docker Compose and reaches
   PostgreSQL through the service name.

5. Browse the tables under **Servers > FEUP Connect > Databases > (your db) > Schemas > public >
   Tables**. The user table is called `"user"` and must be double-quoted in SQL
   (`SELECT * FROM "user";`) because `user` is a reserved word in PostgreSQL.

Your server registration is kept in the `pgadmin-data` volume, so you only do step 4 once.
`docker compose down -v` wipes it together with the database.

## Run

Use two terminals:

```bash
# Terminal 1
cd backend && npm run dev   # http://localhost:3000

# Terminal 2
cd frontend && npm run dev  # http://localhost:5173
```

Open http://localhost:5173. You should see "FEUP Connect: API says ok".

## Useful commands

| Where    | Command                                   | What it does                   |
| -------- | ----------------------------------------- | ------------------------------ |
| root     | `npm run format` / `npm run format:check` | Format / check formatting      |
| backend  | `npm run lint` / `npm run typecheck`      | ESLint / TypeScript check      |
| frontend | `npm run lint`                            | ESLint                         |
| root     | `docker compose down`                     | Stop the database (keeps data) |
| root     | `docker compose down -v`                  | Stop and wipe the database     |

## Troubleshooting

- **Port 5432 already in use:** stop your local Postgres, or change the port mapping in `docker-compose.yml`.
- **Port 5050 already in use:** change the left side of `ports: ['5050:80']` for `pgadmin` in `docker-compose.yml`.
- **pgAdmin container restarts or exits:** `PGADMIN_DEFAULT_EMAIL` in `.env` must be a valid email
  address. Check the logs with `docker compose logs pgadmin`.
- **`ECONNREFUSED` in the frontend:** the backend isn't running (Terminal 1).
