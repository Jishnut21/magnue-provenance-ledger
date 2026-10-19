import { and, asc, eq } from "drizzle-orm";

import {
  organizationId,
  sourceId,
  sourceVersionId,
  userId,
  type OrganizationId,
  type SourceId,
  type SourceVersionId,
} from "../domain/ids.js";
import {
  documentType,
  sourceDisplayName,
  sourceExternalReference,
  sourceType,
  sourceVersionLabel,
  type DataSource,
  type SourceVersion,
} from "../domain/sources.js";
import type { LedgerDatabaseSession } from "../database/client.js";
import { dataSources, sourceVersions } from "../database/schema.js";

export function hydrateDataSource(row: typeof dataSources.$inferSelect): DataSource {
  return Object.freeze({
    id: sourceId(row.id),
    organizationId: organizationId(row.organizationId),
    sourceType: sourceType(row.sourceType),
    displayName: sourceDisplayName(row.displayName),
    createdByUserId: userId(row.createdByUserId),
    createdAt: row.createdAt,
  });
}

export function hydrateSourceVersion(row: typeof sourceVersions.$inferSelect): SourceVersion {
  return Object.freeze({
    id: sourceVersionId(row.id),
    organizationId: organizationId(row.organizationId),
    sourceId: sourceId(row.sourceId),
    documentType: row.documentType === null ? null : documentType(row.documentType),
    versionLabel: sourceVersionLabel(row.versionLabel),
    externalReference: sourceExternalReference(row.externalReference),
    observedAt: row.observedAt,
    receivedAt: row.receivedAt,
    supersedesSourceVersionId:
      row.supersedesSourceVersionId === null
        ? null
        : sourceVersionId(row.supersedesSourceVersionId),
    createdByUserId: userId(row.createdByUserId),
    createdAt: row.createdAt,
  });
}

export async function findDataSourceInOrganization(
  database: LedgerDatabaseSession,
  requestedSourceId: SourceId,
  requestedOrganizationId: OrganizationId,
): Promise<DataSource | null> {
  const rows = await database
    .select()
    .from(dataSources)
    .where(
      and(
        eq(dataSources.id, requestedSourceId),
        eq(dataSources.organizationId, requestedOrganizationId),
      ),
    )
    .limit(1);
  return rows[0] === undefined ? null : hydrateDataSource(rows[0]);
}

export async function listDataSourcesInOrganization(
  database: LedgerDatabaseSession,
  requestedOrganizationId: OrganizationId,
): Promise<readonly DataSource[]> {
  const rows = await database
    .select()
    .from(dataSources)
    .where(eq(dataSources.organizationId, requestedOrganizationId))
    .orderBy(asc(dataSources.createdAt), asc(dataSources.id));
  return Object.freeze(rows.map(hydrateDataSource));
}

export async function findSourceVersionInOrganization(
  database: LedgerDatabaseSession,
  requestedSourceVersionId: SourceVersionId,
  requestedOrganizationId: OrganizationId,
): Promise<SourceVersion | null> {
  const rows = await database
    .select()
    .from(sourceVersions)
    .where(
      and(
        eq(sourceVersions.id, requestedSourceVersionId),
        eq(sourceVersions.organizationId, requestedOrganizationId),
      ),
    )
    .limit(1);
  return rows[0] === undefined ? null : hydrateSourceVersion(rows[0]);
}

export async function listSourceVersionsInOrganization(
  database: LedgerDatabaseSession,
  requestedSourceId: SourceId,
  requestedOrganizationId: OrganizationId,
): Promise<readonly SourceVersion[]> {
  const rows = await database
    .select()
    .from(sourceVersions)
    .where(
      and(
        eq(sourceVersions.sourceId, requestedSourceId),
        eq(sourceVersions.organizationId, requestedOrganizationId),
      ),
    )
    .orderBy(asc(sourceVersions.createdAt), asc(sourceVersions.id));
  return Object.freeze(rows.map(hydrateSourceVersion));
}
