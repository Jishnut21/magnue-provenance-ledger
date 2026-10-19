import { authorizeSourceRead, type ActorContext } from "../authorization.js";
import type { LedgerDatabaseSession } from "../database/client.js";
import type { OrganizationId, SourceId, SourceVersionId } from "../domain/ids.js";
import type { DataSource, SourceVersion } from "../domain/sources.js";
import {
  findDataSourceInOrganization,
  findSourceVersionInOrganization,
  listDataSourcesInOrganization,
  listSourceVersionsInOrganization,
} from "../persistence/sources.js";

export interface SourceAccessInput {
  readonly actor: ActorContext;
  readonly organizationId: OrganizationId;
}

export async function readDataSource(
  database: LedgerDatabaseSession,
  input: SourceAccessInput & { readonly sourceId: SourceId },
): Promise<DataSource | null> {
  authorizeSourceRead(input.actor, input.organizationId);
  return findDataSourceInOrganization(database, input.sourceId, input.organizationId);
}

export async function readOrganizationDataSources(
  database: LedgerDatabaseSession,
  input: SourceAccessInput,
): Promise<readonly DataSource[]> {
  authorizeSourceRead(input.actor, input.organizationId);
  return listDataSourcesInOrganization(database, input.organizationId);
}

export async function readSourceVersion(
  database: LedgerDatabaseSession,
  input: SourceAccessInput & { readonly sourceVersionId: SourceVersionId },
): Promise<SourceVersion | null> {
  authorizeSourceRead(input.actor, input.organizationId);
  return findSourceVersionInOrganization(database, input.sourceVersionId, input.organizationId);
}

export async function readSourceVersions(
  database: LedgerDatabaseSession,
  input: SourceAccessInput & { readonly sourceId: SourceId },
): Promise<readonly SourceVersion[]> {
  authorizeSourceRead(input.actor, input.organizationId);
  return listSourceVersionsInOrganization(database, input.sourceId, input.organizationId);
}
