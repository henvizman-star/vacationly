# Vacationly database

- `01-schema.sql`: non-destructive schema creation for a dedicated database.
- `02-seed.sql`: twelve vacation examples; import only into an empty vacations table.
- `npm run db:init` in Backend applies the schema and skips vacation seeding if data already exists.
- Dates are relative to the first import. Re-running initialization preserves them.
- Geographic descriptions use real destinations; prices and trip dates are demonstration data.
- `country` and `continent` support the MCP geography filters.
- The unique `(userId, vacationId)` key prevents duplicate Likes.
- Local MySQL contains 12 seeded vacations. On 2026-10-12, the API creation integration test passed against the actual schema, including image storage and retrieval. Run `npm run test:mysql` from Backend to repeat this transactional check.
- `vacationly-export.sql` is the real local export (ignored by Git, included in the local submission ZIP). It was restored into a separate temporary schema on 2026-10-12; all three table counts matched, and the temporary schema was removed. Repeat with `node scripts/export-database.mjs` and `node scripts/verify-export.mjs` from the root after changing data.
