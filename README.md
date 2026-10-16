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
- **`ECONNREFUSED` in the frontend:** the backend isn't running (Terminal 1).
