# MAGNUE Provenance Ledger

A compact engineering showcase of a tenant-scoped, append-only source-version ledger extracted from the MAGNUE Knowledge Network.

This repository demonstrates one bounded capability:

```text
DataSource -> SourceVersion -> supersedes SourceVersion
```

It is not the MAGNUE platform and does not include property facts, approval or publication workflows, search, AI, ranking, recommendations, object storage, production infrastructure, or customer data.

## What it preserves

- Distinct branded Source and Source Version identities.
- Validated source classifications and bounded metadata.
- Organization-scoped authoring and reads.
- Server-assigned Source Version receipt time.
- Explicit supersession restricted to a version of the same Source and organization.
- Deterministic chronological reads using `(created_at, id)`.
- PostgreSQL-enforced append-only Source Version rows.
- Composite foreign keys that enforce tenant ownership.
- Transactional authoring with stable domain-facing errors.

Supersession is historical lineage only. The ledger intentionally does not infer which version is current, authoritative, conflict-free, or public.

## Project layout

```text
migrations/001_initial.sql       Consolidated PostgreSQL schema and immutability trigger
src/domain/                      Branded identities, Source types, validation
src/database/                    Drizzle schema and database client
src/persistence/                 Deterministic tenant-scoped queries and hydration
src/workflows/                   Authoring and read use cases
src/authorization.ts             Small caller-supplied actor/tenant boundary
src/demo.ts                      Synthetic end-to-end example
test/                            Focused domain and PostgreSQL integration tests
docs/PROVENANCE.md               Original-file provenance and extraction changes
```

## Requirements

- Node.js 24 or newer
- npm
- PostgreSQL with `psql` and `createdb` available

No Firebase, GCS, AI provider, search service, or production cloud account is required.

## Manual verification on PowerShell

The commands below are intentionally not automated. Replace the example PostgreSQL credentials if your local setup differs.

```powershell
Set-Location 'C:\Users\LENOVO\magnue-provenance-ledger'
npm install
npm run typecheck
```

Create and migrate a disposable demo database:

```powershell
createdb magnue_provenance_demo
$env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/magnue_provenance_demo'
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f .\migrations\001_initial.sql
npm run demo
```

Create and migrate a separate test database, then run the focused suite:

```powershell
createdb magnue_provenance_test
$env:TEST_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/magnue_provenance_test'
psql "$env:TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f .\migrations\001_initial.sql
npm test
```

The integration suite truncates its four showcase tables between cases and refuses to run unless the database name contains `test`. Never point `TEST_DATABASE_URL` at a shared or production database.

To rerun the migration from a clean local database:

```powershell
dropdb magnue_provenance_demo
createdb magnue_provenance_demo
psql "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f .\migrations\001_initial.sql
```

## Synthetic demo

The demo creates a synthetic organization, actor, authority record, and two linked Source Versions. All names and URLs use invented data and the reserved `.test` domain.

## Licensing

No open-source license is granted. The repository intentionally contains no `LICENSE` file.
