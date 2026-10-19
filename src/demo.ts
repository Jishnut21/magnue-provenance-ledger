import { randomUUID } from "node:crypto";

import { Pool } from "pg";

import { createDatabase } from "./database/client.js";
import { actors, organizations } from "./database/schema.js";
import { organizationId, userId } from "./domain/ids.js";
import { readSourceVersions } from "./workflows/source-access.js";
import { createDataSource, createSourceVersion } from "./workflows/source-authoring.js";

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({ connectionString: databaseUrl });
const database = createDatabase(pool);

try {
  const organization = organizationId(randomUUID());
  const actorId = userId(randomUUID());
  await database.insert(organizations).values({
    id: organization,
    displayName: "Northstar Developments",
  });
  await database.insert(actors).values({ id: actorId, displayName: "Synthetic Editor" });

  const actor = Object.freeze({
    userId: actorId,
    organizationId: organization,
    capabilities: new Set(["SOURCE_READ", "SOURCE_WRITE"] as const),
  });
  const source = await createDataSource(database, {
    actor,
    organizationId: organization,
    sourceType: "PUBLISHED_AUTHORITY_RECORD",
    displayName: "Municipal planning register",
  });
  const first = await createSourceVersion(database, {
    actor,
    organizationId: organization,
    sourceId: source.id,
    documentType: "STATUTORY_APPROVAL",
    versionLabel: "2026-01",
    externalReference: "https://records.example.test/planning/harbor-view/2026-01",
  });
  await createSourceVersion(database, {
    actor,
    organizationId: organization,
    sourceId: source.id,
    documentType: "STATUTORY_APPROVAL",
    versionLabel: "2026-02",
    externalReference: "https://records.example.test/planning/harbor-view/2026-02",
    supersedesSourceVersionId: first.id,
  });

  const versions = await readSourceVersions(database, {
    actor,
    organizationId: organization,
    sourceId: source.id,
  });
  console.log(JSON.stringify({ source, versions }, null, 2));
} finally {
  await pool.end();
}
