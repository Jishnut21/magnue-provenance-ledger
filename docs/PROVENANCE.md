# Source provenance and extraction notes

This showcase was manually extracted from the private MAGNUE Knowledge Network repository. Original locations below are repository-relative. The showcase contains no Git history, production data, environment files, credentials, customer identities, or infrastructure documentation.

## Original source mapping

| Public file | Original MAGNUE source | Preserved logic |
| --- | --- | --- |
| `src/domain/ids.ts` | `packages/domain/src/ids.ts` | Branded `UserId`, `OrganizationId`, `SourceId`, and `SourceVersionId` identities and nonblank construction. |
| `src/domain/sources.ts` | `packages/domain/src/sources.ts` | Source/document classifications, Source and Source Version records, metadata normalization, bounds, and observation-time validation. |
| `src/database/schema.ts` | `packages/database/src/schema/sources.ts` | `data_sources` and `source_versions`, composite ownership and supersession foreign keys, validation checks, and deterministic indexes. |
| `src/database/client.ts` | `packages/database/src/client.ts` | Drizzle over `node-postgres` and transaction/session types. |
| `src/persistence/sources.ts` | `packages/database/src/persistence/sources.ts` | Frozen hydration, organization-scoped lookups, and chronological ordering by creation time then ID. |
| `src/workflows/source-authoring.ts` | `packages/database/src/workflows/source-authoring.ts` | Transactional Source/Source Version creation, server receipt time, row locking, exact same-source supersession validation, and stable errors. |
| `src/workflows/source-access.ts` | `packages/database/src/workflows/source-access.ts` | Authorized tenant-scoped Source and Source Version reads. |
| `migrations/001_initial.sql` | `packages/database/drizzle/0003_brown_hawkeye.sql`, with the relevant Source Version additions from `0004_easy_apocalypse.sql` and `0009_flowery_the_twelve.sql` | Tables, enums, constraints, indexes, same-source lineage, and the PostgreSQL append-only trigger. |
| `test/sources.domain.test.ts` | `packages/domain/test/sources.test.ts` | Identity distinction, classification validation, metadata bounds, and observation timestamp behavior. |
| `test/source-versions.integration.test.ts` | `packages/database/test/source-versions.integration.test.ts` | Tenant isolation, receipt time, deterministic reads, valid/invalid supersession, append-only enforcement, authorization, and rollback checks. |

## Intentional extraction changes

1. The private external-identity, membership, and role model was replaced by a small caller-supplied `ActorContext`. It retains explicit tenant, read, and write checks without exposing the platform identity architecture.
2. The original `EVIDENCE_ATTACHMENT` capability is represented as the showcase-specific `SOURCE_WRITE`; active private access is represented as `SOURCE_READ`.
3. Minimal `organizations` and `actors` tables replace the larger private identity and tenancy schema while retaining the original Source ownership and author foreign keys.
4. Three historical migrations were consolidated into one initial migration. No database invariant was replaced with an in-memory mock.
5. Source artifact storage, GCS-specific metadata, file-backed workflows, and artifact tests were removed.
6. Testcontainers were removed. Integration tests use an explicitly supplied disposable PostgreSQL test database to keep the project small.
7. All fixtures, names, URLs, organizations, and actors are synthetic.

## Explicit non-features

The showcase does not implement or imply:

- source authority ranking;
- automated conflict resolution;
- automatic current-version selection;
- fact assertions or evidence-link graphs;
- review, approval, publication, or public snapshots;
- buyer reasoning, recommendation, or ranking;
- file storage or public distribution rights.

These omissions are deliberate boundaries, not incomplete implementations of the ledger.
