# Vacationly — remaining submission checks

Student name supplied: **henvizman**.

Implemented and verified locally: registration/login, roles, vacation CRUD and image replacement, likes, sorting and filtering, 9-per-page pagination, administrator graph and CSV, public About, and mobile UI. Real MCP tools and their database queries passed integration tests. AI provider orchestration passed isolated tests.

Before final submission:

- Configure `OPENAI_API_KEY` in `Backend/.env` for local development, or the root `.env` for Docker. Run live recommendation and database-question requests. No key is currently configured, so these pages show an honest service-unavailable message.
- Install/enable WSL and get Docker Desktop's Linux engine running. The current Windows machine reports that WSL is not installed. Run `docker compose up -d --build` and verify health, login, CRUD/images, reports, AI/MCP and data persistence. Compose configuration validation alone is not a container test.
- Create/select the GitHub repository, upload the code and put its real URL in `README.md`. A remote URL has not been supplied. Never upload `.env` or the local database export with account data.
- Confirm that `henvizman` is the exact full English name required by the course; it is used exactly as provided.
- Create the administrator credentials using the README instructions if you do not already have an admin account.
- After any further data changes, run `node scripts/export-database.mjs` and `node scripts/verify-export.mjs`, then rebuild the ZIP with `node scripts/package-submission.mjs henvizman`.
- Review the ZIP and upload it to the course assignment tab.

The local ZIP includes a real database export. Browser test accounts were rolled back; existing account data remains in the export. The ZIP excludes node_modules, build caches, environment secrets and the class reference.
