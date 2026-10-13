# Vacationly

A full-stack vacation discovery and management application by **henvizman**, built with React, TypeScript, Express and MySQL.

Explore real destinations, save favorite vacations, get AI travel ideas and ask questions about the vacation collection. Administrators manage vacations, uploaded images and likes reports. The English interface features rounded typography, a coastal background with scroll parallax, and accessible AI loading feedback.

## Features

- Registration and login, hashed passwords, JWT session restoration and server-side User/Admin permissions.
- Vacation cards sorted by start date, nine per page, with All, Favorites, Active and Upcoming filters.
- Personal Like/Unlike actions and total likes, with duplicate prevention and per-user isolation.
- Administrator creation, editing and deletion with confirmation, including image replacement and file cleanup.
- Validation of required fields, real dates, price between USD 0 and 10,000, and JPEG/PNG uploads up to 5 MiB.
- Administrator likes chart, accessible report table and UTF-8 CSV export, including vacations with zero likes.
- AI destination recommendations and database questions through real MCP tool calls.
- Public About page, responsive layouts, keyboard focus states and reduced-motion support.

Prices and trip dates are demonstration data for real destinations. This application does not book or sell trips.

## Stack

| Layer        | Technologies                                                             |
| ------------ | ------------------------------------------------------------------------ |
| Frontend     | React, TypeScript, Vite, Redux Toolkit, React Hook Form, Axios, Recharts |
| Backend      | Node.js, Express, TypeScript, Zod, JWT, mysql2                           |
| AI           | OpenAI Responses API, MCP TypeScript SDK                                 |
| Database     | MySQL; users, vacations and likes tables                                 |
| Deployment   | Docker Compose, MySQL 8.4, nginx                                         |
| Verification | Node test runner, Supertest, Vitest, Testing Library, Playwright/Edge    |

## Start with Docker

Install Docker Desktop with Linux containers enabled, and Node.js 24 to run the setup script. From the repository root:

```powershell
node scripts/setup.mjs
docker compose up -d --build
```

The setup script generates local `.env` files and random secrets when absent. It preserves existing settings; no environment templates or default account passwords are required.

| Service        | Address                          |
| -------------- | -------------------------------- |
| Website        | http://localhost:5173            |
| Backend health | http://localhost:4000/api/health |
| Docker MySQL   | 127.0.0.1:3307                   |

Docker initializes the schema and twelve vacations on first startup. The database and uploaded images persist in named volumes. Stop with `docker compose down`; do not remove volumes if you want to retain data. Stop a local Vite server before starting Docker if it occupies port 5173.

For MySQL Workbench, connect to `127.0.0.1`, port `3307`, user `vacationly`, using `MYSQL_PASSWORD` from the root `.env`. A separately installed MySQL server on port `3306` has independent data.

## Create an administrator

Public registration always creates a regular user. To create a new administrator, add these optional settings to the root `.env`:

```dotenv
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=choose-your-own-password
```

Then run:

```powershell
docker compose up -d backend
docker compose exec backend node dist/scripts/init-database.js
```

Use an email that is not already registered. Initialization preserves existing accounts and never promotes or overwrites them. For local backend development, set the optional values in `Backend/.env` and run `npm run db:init` from Backend instead.

## Local development

Install Node.js 24 and MySQL 8.0+, or run just the Docker database:

```powershell
node scripts/setup.mjs
docker compose up -d database
```

In separate terminals:

```powershell
cd Backend
npm ci
npm run db:init
npm run dev
```

```powershell
cd Frontend
npm ci
npm run dev
```

The frontend uses `http://127.0.0.1:5173` and proxies `/api` to backend port `4001`. Generated backend settings connect to Docker MySQL on port `3307`. To use an existing MySQL installation, create a dedicated `vacationly` database and adjust `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD` and `MYSQL_DATABASE` in `Backend/.env`.

Other backend settings: `NODE_ENV`, `PORT`, `JWT_SECRET` (at least 32 characters) and `CLIENT_ORIGIN`. Root `.env` supplies Compose with `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` and `JWT_SECRET`. Keep all real environment files private.

## AI and MCP

Add `OPENAI_API_KEY` to root `.env` for Docker, or `Backend/.env` for local development. `OPENAI_MODEL` is optional and defaults to `gpt-4.1-mini`. Recreate the Docker backend after changing its environment:

```powershell
docker compose up -d backend
```

AI calls use the configured provider account and may incur charges. Without a key, the rest of the application works and AI requests return a clear configuration error.

- `/recommendations`: destination → authenticated backend → OpenAI → travel recommendation.
- `/questions`: question → OpenAI tool selection → actual MCP Client/McpServer calls → MySQL results → answer.
- MCP runs inside the backend using `InMemoryTransport`; there is no separate public MCP URL. Each request initializes its own session and discovers the tools.
- `vacation_statistics` computes counts and price aggregates across all matches. `search_vacations` supports status, geography, destination and price filters, with at most 50 results per call and offset/total metadata.
- Tools are read-only, use parameterized SQL, and expose vacation information rather than user records. Relevant vacation data is sent to the configured AI provider to answer questions.
- Keys stay on the server. Requests have timeouts, step limits and rate limits; failures never produce a fabricated answer.

Active includes both boundary dates in UTC; upcoming means a start date after today. Seed dates are relative to the initial import and do not move each time the website opens. Do not seed an already populated table again.

## Project structure

```text
Backend/
  src/controllers/    HTTP routes and input parsing
  src/services/       Business logic and AI orchestration
  src/mcp/            Read-only MCP tools
  src/middleware/     Authentication, roles, uploads and errors
  src/models/         Types, enums and validation
  src/utils/          Database, configuration, passwords and image storage
  tests/              Unit, API, MySQL and browser checks
  assets/             Seed images and source attribution
Frontend/
  src/components/     Layout, auth, vacations, reports and AI pages
  src/assets/         Generated coastal background
  src/redux/          Authentication state
  src/services/       API operations
  src/index.css       Documented theme, components and responsive styles
Database/             Schema and demonstration seed
scripts/              Setup, verification, export and submission utilities
docs/                 Manual review and design asset provenance
compose.yaml          Database, backend and frontend deployment
```

Source comments are in English. The generated background prompt and provenance are in [docs/design-assets.md](docs/design-assets.md). Seed photo sources are recorded in [Backend/assets/image-sources.json](Backend/assets/image-sources.json).

## Tests and formatting

From Backend:

```powershell
npm test
npm run build
npm run test:mysql
```

From Frontend:

```powershell
npm test
npm run build
```

After installing both sets of dependencies and building Frontend, run the browser flow from Backend. It requires installed Microsoft Edge:

```powershell
npm run test:browser
```

To test the deployed Docker website instead, use PowerShell:

```powershell
$env:DOCKER_BROWSER = "1"
npm run test:browser
Remove-Item Env:DOCKER_BROWSER
```

Local integration/browser checks roll back temporary records; Docker browser checks remove their temporary accounts and vacations afterward. AUTO_INCREMENT counters can advance. Browser AI requests are intercepted to test loading, safe text, error and retry states without provider charges.

Explicit live checks are separate and make paid provider calls:

```powershell
# From Backend, against local backend configuration:
npx tsx tests/live-ai.mts
# From the root, through deployed Docker nginx/API:
Get-Content -Raw scripts/docker-live-ai.mjs | docker compose exec -T backend node --input-type=module
```

The Docker live check requires the unchanged twelve bundled demo vacation fixtures before sending data externally. See [docs/manual-review.md](docs/manual-review.md) for the manual acceptance checklist.

For consistent source formatting, from the root:

```powershell
npm ci
npm run format:check
npm run format
```

Verification includes 36 backend tests, 9 frontend tests, production builds, real MySQL and local/Docker browser flows, live AI/MCP comparisons with SQL, image cleanup, export restoration and restart persistence. Excel application opening and final manual acceptance are separate from automated CSV checks.

## API and Postman

Import [Backend/Vacationly.postman_collection.json](Backend/Vacationly.postman_collection.json). Set `baseUrl`, credentials and dates, and choose actual files in upload requests. Login/register save the token; creation saves a separate `createdVacationId` for management requests.

| Method             | Endpoint                                             | Access               |
| ------------------ | ---------------------------------------------------- | -------------------- |
| GET                | `/api/health`                                        | Public               |
| POST               | `/api/register`, `/api/login`                        | Public               |
| GET                | `/api/me`, `/api/vacations`                          | Signed in            |
| PUT / DELETE       | `/api/vacations/:id/like`                            | User                 |
| POST               | `/api/vacations`                                     | Admin; multipart     |
| GET / PUT / DELETE | `/api/vacations/:id`                                 | Admin; PUT multipart |
| GET                | `/api/vacations/report`, `/api/vacations/report.csv` | Admin                |
| POST               | `/api/ai/recommendation`, `/api/ai/question`         | Signed in            |
| GET                | `/api/vacations/images/:imageName`                   | Public               |

## Database export and course submission

The repository includes schema and seed, sufficient for a fresh installation. Real account data, local database exports, environment files, uploads, dependencies, build outputs and internal working notes are excluded from Git.

To prepare the separate local course archive:

```powershell
node scripts/export-database.mjs
node scripts/verify-export.mjs
node scripts/package-submission.mjs henvizman
```

Export/restore requires installed MySQL CLI tools; override `MYSQLDUMP_PATH` and `MYSQL_CLIENT_PATH` when needed. Restore verification creates a temporary database, compares three table counts and removes it. ZIP packaging currently requires Windows PowerShell.

`artifacts/henvizman.zip` includes a real local database export for course submission. It can contain local account data and is not intended for public GitHub upload. Restore that export into a dedicated empty database rather than adding seed data on top of it.
