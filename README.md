# Vacationly

Vacation discovery and management project by **henvizman**. English UI, React/TypeScript, Node.js/Express/TypeScript and MySQL.

GitHub repository: **pending — add the real repository URL before submission**.

## Implemented features

- Registration, login, JWT session restoration, logout and server-side User/Admin permissions.
- Vacation cards, images, like counts and personal likes; 9 vacations per page, departure-date sorting and All/Favorites/Active/Upcoming filters.
- Administrator creation, editing and deletion with confirmation; optional image replacement when editing, required image when creating.
- Price range 0–10,000 USD, valid date ordering, no past dates on creation and past dates allowed on editing.
- Administrator likes graph, accessible table and CSV download for all vacations including zero likes.
- AI travel recommendations and natural-language database questions through a real backend MCP server.
- Public About, role-aware navigation, developer details and responsive layout.

AI requires an `OPENAI_API_KEY`; no key is bundled. Without it the API returns a clear 503 response. Local CRUD, reports and MCP tools were verified against real MySQL. A live AI response and container startup remain pending; see [PRE_SUBMISSION.md](PRE_SUBMISSION.md).

## Structure

```text
Database/       schema, seed and local real database export
Backend/        REST API, MCP server, tests, assets and Postman collection
Frontend/       React client and tests
scripts/        setup, export/restore verification and submission packaging
compose.yaml    MySQL + backend (including MCP) + frontend
```

The `01 - Northwind` class reference is unchanged and excluded from Git/build/submission. [PROJECT_MEMORY.md](PROJECT_MEMORY.md) records requirements, decisions and verification history; its later entries supersede earlier milestones.

## Local setup

Use Node.js 24, npm and MySQL 8.0+ or Docker Desktop with Linux containers.

From the project root:

```powershell
node scripts/setup.mjs
```

This creates root `.env` and `Backend/.env` only when absent; existing settings are preserved. New local backend settings use port **4001** and the Docker database on **3307**. For an existing local MySQL server, set the real `MYSQL_*` values in `Backend/.env`; create the dedicated `vacationly` database first. Passwords and keys belong only in ignored environment files.

Backend terminal:

```powershell
cd Backend
npm ci
npm run db:init
npm run dev
```

Frontend terminal:

```powershell
cd Frontend
npm ci
npm run dev
```

Site: `http://127.0.0.1:5173`. The development proxy forwards `/api` to port 4001. Backend health: `http://127.0.0.1:4001/api/health`.

Initialization preserves existing tables and vacation data. Seed dates are relative to the initial import and do not move each time the application starts. Prices and trip dates are demonstration data for real destinations. Do not re-import seed into an already populated table.

## Administrator account

Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `Backend/.env`, then run `npm run db:init` from Backend. There is no fixed default administrator password. The script creates an administrator only if that email is unused; it never promotes or overwrites an existing user.

For Docker, set those variables in the **root** `.env`, recreate the backend with Compose, then run:

```powershell
docker compose exec backend node dist/scripts/init-database.js
```

## Docker

With Docker Desktop's Linux engine running, from the root:

```powershell
node scripts/setup.mjs
docker compose up -d --build
```

Site: `http://localhost:5173`. Backend: `http://localhost:4000/api/health`. Database: `127.0.0.1:3307`. Ensure host ports 5173, 4000 and 3307 are free. Compose creates three services, waits for database/backend health and persists the database and uploads in named volumes. MCP runs inside the backend process.

Stop with `docker compose down`; preserve volumes to keep data and uploaded images.

Compose syntax was validated locally. Container startup is **not yet verified** because this Windows machine reports that WSL is not installed and Docker's Linux engine cannot start.

## AI and MCP

For local development, put `OPENAI_API_KEY` and optionally `OPENAI_MODEL` in `Backend/.env`. For Docker, put them in root `.env` and recreate the backend. Default model: `gpt-4.1-mini`.

- `/recommendations` sends a destination to the backend, which invokes the OpenAI Responses API.
- `/questions` sends a question to the backend. The model discovers `vacation_statistics` and `search_vacations`, calls them through an actual MCP Client/McpServer pair, and receives database results before answering.
- `InMemoryTransport` carries real MCP initialization, discovery and JSON-RPC calls inside the backend. Each request has its own MCP session; tools are not exposed through an unauthenticated public endpoint.
- Tools provide read-only, parameterized vacation queries; no user records or arbitrary SQL. Status, country, continent, destination and price filters are supported. Search is limited to 50 rows per call with offset and total; statistics cover every match.
- Active includes both date boundaries in UTC; upcoming starts after today. Country/continent are documented additions to support geographic questions.
- Provider keys never enter the frontend. The API uses bounded requests, timeouts and rate limits; missing configuration or provider failure shows a service error, never a fake answer.

Implementation references: [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling), [model documentation](https://developers.openai.com/api/docs/models/gpt-4.1-mini), [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk/tree/v1.x).

## Verification

Backend:

```powershell
npm test
npm run build
npm run test:mysql
```

Frontend:

```powershell
npm test
npm run build
```

After building the frontend and installing dependencies in both projects, from Backend:

```powershell
npm run test:browser
```

The browser check uses the installed Microsoft Edge in headless mode. It starts a temporary local app server and runs the real UI against MySQL: auth/roles, CRUD/images, confirmation cancellation, graph/CSV, 9+3 pagination, likes, session restoration and mobile width. Test records are created inside a rolled-back InnoDB transaction, and generated test images are cleaned. MySQL AUTO_INCREMENT counters can advance despite rollback.

Verified on 2026-10-12: **36 backend tests, 9 frontend tests, both production builds, real MySQL integration, real-browser flow, and database export restoration**. AI orchestration is tested with an isolated provider; a paid live provider call was not made.

## API and Postman

Import `Backend/Vacationly.postman_collection.json`. Set `baseUrl`, credentials and dates; select a real file in upload requests. Login/register save the token. Adding a vacation saves `createdVacationId`, and the collection's management requests use that ID.

| Method | Path | Access |
| --- | --- | --- |
| GET | `/api/health` | Public |
| POST | `/api/register`, `/api/login` | Public |
| GET | `/api/me` | Signed in |
| GET | `/api/vacations?filter=all&page=1` | Signed in |
| PUT / DELETE | `/api/vacations/:id/like` | User |
| POST | `/api/vacations` | Admin, multipart |
| GET / PUT / DELETE | `/api/vacations/:id` | Admin; PUT accepts multipart |
| GET | `/api/vacations/report`, `/api/vacations/report.csv` | Admin |
| POST | `/api/ai/recommendation`, `/api/ai/question` | Signed in |
| GET | `/api/vacations/images/:imageName` | Public image files |

## Database export and submission ZIP

From the root, after installing backend dependencies:

```powershell
node scripts/export-database.mjs
node scripts/verify-export.mjs
node scripts/package-submission.mjs henvizman
```

Export/restore scripts use MySQL command-line tools. On Windows their defaults point to MySQL Server 8.0; override `MYSQLDUMP_PATH` and `MYSQL_CLIENT_PATH` if needed. Restore verification creates a separate temporary database, compares all three table counts, then removes that temporary database. It requires permission to create a database.

`Database/vacationly-export.sql` is a real export, including existing local account data; it is included in the local ZIP but ignored by Git. To restore manually into a dedicated empty database, import that export rather than running the seed on top of it.

The ZIP is `artifacts/henvizman.zip`, with a top folder named `henvizman`, containing Database, Backend, Frontend, README, Compose and supporting scripts. It excludes node_modules, secrets, build caches and Northwind. The packaging script currently uses Windows PowerShell.

Complete [PRE_SUBMISSION.md](PRE_SUBMISSION.md), add the real GitHub URL above and upload the reviewed ZIP to the course assignment tab.
