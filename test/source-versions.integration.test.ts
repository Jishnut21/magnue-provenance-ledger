import { randomUUID } from "node:crypto";

import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  type ActorContext,
  type SourceCapability,
} from "../src/authorization.js";
import { createDatabase, type LedgerDatabase } from "../src/database/client.js";
import { actors, organizations } from "../src/database/schema.js";
import {
  organizationId,
  sourceId,
  userId,
} from "../src/domain/ids.js";
import { readDataSource, readSourceVersions } from "../src/workflows/source-access.js";
import {
  createDataSource,
  createSourceVersion,
} from "../src/workflows/source-authoring.js";

let pool: Pool | undefined;
let database: LedgerDatabase;

beforeAll(async () => {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (connectionString === undefined || connectionString.trim().length === 0) {
    throw new Error("TEST_DATABASE_URL is required for PostgreSQL integration tests");
  }
  pool = new Pool({ connectionString });
  const result = await pool.query<{ current_database: string }>("SELECT current_database()");
  const databaseName = result.rows[0]?.current_database ?? "";
  if (!databaseName.toLowerCase().includes("test")) {
    throw new Error("Refusing to run destructive integration fixtures outside a test database");
  }
  database = createDatabase(pool);
});

beforeEach(async () => {
  await pool!.query("TRUNCATE source_versions, data_sources, actors, organizations CASCADE");
});

afterAll(async () => {
  await pool?.end();
});

async function seedActor(
  capabilities: readonly SourceCapability[] = ["SOURCE_READ", "SOURCE_WRITE"],
): Promise<ActorContext> {
  const organization = organizationId(randomUUID());
  const actorId = userId(randomUUID());
  await database.insert(organizations).values({
    id: organization,
    displayName: "Synthetic Organization",
  });
  await database.insert(actors).values({ id: actorId, displayName: "Synthetic User" });
  return Object.freeze({
    userId: actorId,
    organizationId: organization,
    capabilities: new Set<SourceCapability>(capabilities),
  });
}

async function seedSource(actor: ActorContext, name = "Authority record") {
  return createDataSource(database, {
    actor,
    organizationId: actor.organizationId,
    sourceType: "PUBLISHED_AUTHORITY_RECORD",
    displayName: name,
  });
}

describe("organization-owned Sources and immutable Source Versions", () => {
  it("creates versions with server receipt time and reads them deterministically", async () => {
    const actor = await seedActor();
    const source = await seedSource(actor);
    const before = Date.now();
    const first = await createSourceVersion(database, {
      actor,
      organizationId: actor.organizationId,
      sourceId: source.id,
      documentType: "STATUTORY_APPROVAL",
      versionLabel: "  release-a  ",
      observedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    const second = await createSourceVersion(database, {
      actor,
      organizationId: actor.organizationId,
      sourceId: source.id,
      versionLabel: "release-b",
      supersedesSourceVersionId: first.id,
    });

    expect(first.receivedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(second.supersedesSourceVersionId).toBe(first.id);
    const versions = await readSourceVersions(database, {
      actor,
      organizationId: actor.organizationId,
      sourceId: source.id,
    });
    const expectedOrder = [first, second].sort(
      (left, right) =>
        left.createdAt.getTime() - right.createdAt.getTime()
        || left.id.localeCompare(right.id),
    );
    expect(versions).toEqual(expectedOrder);
  });

  it("isolates organization reads and foreign UUID knowledge", async () => {
    const firstActor = await seedActor();
    const secondActor = await seedActor();
    const source = await seedSource(firstActor);

    await expect(readDataSource(database, {
      actor: secondActor,
      organizationId: firstActor.organizationId,
      sourceId: source.id,
    })).rejects.toMatchObject({ code: "TENANT_MISMATCH" });

    expect(await readDataSource(database, {
      actor: secondActor,
      organizationId: secondActor.organizationId,
      sourceId: source.id,
    })).toBeNull();
  });

  it("accepts same-Source supersession and rejects cross-Source supersession", async () => {
    const actor = await seedActor();
    const firstSource = await seedSource(actor, "First register");
    const secondSource = await seedSource(actor, "Second register");
    const firstVersion = await createSourceVersion(database, {
      actor,
      organizationId: actor.organizationId,
      sourceId: firstSource.id,
    });

    await expect(createSourceVersion(database, {
      actor,
      organizationId: actor.organizationId,
      sourceId: secondSource.id,
      supersedesSourceVersionId: firstVersion.id,
    })).rejects.toMatchObject({
      code: "SUPERSEDED_SOURCE_VERSION_NOT_FOUND",
    });
  });

  it("database-enforces same-tenant ownership and append-only history", async () => {
    const firstActor = await seedActor();
    const secondActor = await seedActor();
    const source = await seedSource(firstActor);
    const version = await createSourceVersion(database, {
      actor: firstActor,
      organizationId: firstActor.organizationId,
      sourceId: source.id,
    });

    await expect(pool!.query(
      "INSERT INTO source_versions (id, organization_id, source_id, received_at, created_by_user_id) VALUES ($1, $2, $3, now(), $4)",
      [randomUUID(), secondActor.organizationId, source.id, secondActor.userId],
    )).rejects.toMatchObject({ code: "23503" });
    const selfSupersedingId = randomUUID();
    await expect(pool!.query(
      "INSERT INTO source_versions (id, organization_id, source_id, received_at, supersedes_source_version_id, created_by_user_id) VALUES ($1, $2, $3, now(), $1, $4)",
      [selfSupersedingId, firstActor.organizationId, source.id, firstActor.userId],
    )).rejects.toMatchObject({ code: "23514" });
    await expect(pool!.query(
      "UPDATE source_versions SET version_label = 'changed' WHERE id = $1",
      [version.id],
    )).rejects.toThrow(/append-only/);
    await expect(pool!.query("DELETE FROM source_versions WHERE id = $1", [version.id]))
      .rejects.toThrow(/append-only/);
  });

  it("requires read and write authority", async () => {
    const reader = await seedActor(["SOURCE_READ"]);
    await expect(seedSource(reader)).rejects.toMatchObject({
      code: "FORBIDDEN_CAPABILITY",
    });
    expect(await readSourceVersions(database, {
      actor: reader,
      organizationId: reader.organizationId,
      sourceId: sourceId(randomUUID()),
    })).toEqual([]);
  });

  it("rolls back a rejected Source Version insertion", async () => {
    const actor = await seedActor();
    const source = await seedSource(actor);
    await pool!.query(`
      CREATE FUNCTION reject_showcase_version_insert() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'induced test failure'; END;
      $$ LANGUAGE plpgsql
    `);
    await pool!.query(`
      CREATE TRIGGER reject_showcase_version_insert
      BEFORE INSERT ON source_versions
      FOR EACH ROW EXECUTE FUNCTION reject_showcase_version_insert()
    `);
    try {
      await expect(createSourceVersion(database, {
        actor,
        organizationId: actor.organizationId,
        sourceId: source.id,
        versionLabel: "rejected",
      })).rejects.toMatchObject({
        code: "SOURCE_VERSION_CREATION_FAILED",
      });
    } finally {
      await pool!.query("DROP TRIGGER reject_showcase_version_insert ON source_versions");
      await pool!.query("DROP FUNCTION reject_showcase_version_insert()");
    }
    const count = await pool!.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM source_versions WHERE source_id = $1",
      [source.id],
    );
    expect(count.rows[0]?.count).toBe(0);
  });
});
