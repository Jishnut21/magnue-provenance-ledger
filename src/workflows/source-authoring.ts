import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import {
  AuthorizationError,
  authorizeSourceWrite,
  type ActorContext,
} from "../authorization.js";
import type { LedgerDatabase } from "../database/client.js";
import { dataSources, sourceVersions } from "../database/schema.js";
import {
  sourceId,
  sourceVersionId,
  type OrganizationId,
  type SourceId,
  type SourceVersionId,
} from "../domain/ids.js";
import {
  documentType,
  optionalObservedAt,
  sourceDisplayName,
  sourceExternalReference,
  sourceType,
  sourceVersionLabel,
  type DataSource,
  type DocumentType,
  type SourceType,
  type SourceVersion,
} from "../domain/sources.js";
import { hydrateDataSource, hydrateSourceVersion } from "../persistence/sources.js";

export const SOURCE_AUTHORING_ERROR_CODES = [
  "SOURCE_NOT_FOUND",
  "SUPERSEDED_SOURCE_VERSION_NOT_FOUND",
  "SOURCE_CREATION_FAILED",
  "SOURCE_VERSION_CREATION_FAILED",
] as const;

export type SourceAuthoringErrorCode = (typeof SOURCE_AUTHORING_ERROR_CODES)[number];

export class SourceAuthoringError extends Error {
  readonly code: SourceAuthoringErrorCode;

  constructor(code: SourceAuthoringErrorCode, message: string) {
    super(message);
    this.name = "SourceAuthoringError";
    this.code = code;
  }
}

function preserveSourceAuthoringError(error: unknown, fallback: SourceAuthoringError): never {
  if (error instanceof AuthorizationError || error instanceof SourceAuthoringError) throw error;
  throw fallback;
}

export interface CreateDataSourceInput {
  readonly actor: ActorContext;
  readonly organizationId: OrganizationId;
  readonly sourceType: SourceType;
  readonly displayName: string;
}

export async function createDataSource(
  database: LedgerDatabase,
  input: CreateDataSourceInput,
): Promise<DataSource> {
  const validatedSourceType = sourceType(input.sourceType);
  const validatedDisplayName = sourceDisplayName(input.displayName);
  const createdSourceId = sourceId(randomUUID());

  try {
    return await database.transaction(async (transaction) => {
      authorizeSourceWrite(input.actor, input.organizationId);
      const createdRows = await transaction
        .insert(dataSources)
        .values({
          id: createdSourceId,
          organizationId: input.organizationId,
          sourceType: validatedSourceType,
          displayName: validatedDisplayName,
          createdByUserId: input.actor.userId,
        })
        .returning();
      const created = createdRows[0];
      if (created === undefined) {
        throw new SourceAuthoringError(
          "SOURCE_CREATION_FAILED",
          "The Source could not be created",
        );
      }
      return hydrateDataSource(created);
    });
  } catch (error) {
    preserveSourceAuthoringError(
      error,
      new SourceAuthoringError("SOURCE_CREATION_FAILED", "The Source could not be created"),
    );
  }
}

export interface CreateSourceVersionInput {
  readonly actor: ActorContext;
  readonly organizationId: OrganizationId;
  readonly sourceId: SourceId;
  readonly documentType?: DocumentType | null;
  readonly versionLabel?: string | null;
  readonly externalReference?: string | null;
  readonly observedAt?: Date | null;
  readonly supersedesSourceVersionId?: SourceVersionId;
}

export async function createSourceVersion(
  database: LedgerDatabase,
  input: CreateSourceVersionInput,
): Promise<SourceVersion> {
  const validatedVersionLabel = sourceVersionLabel(input.versionLabel);
  const validatedDocumentType =
    input.documentType === null || input.documentType === undefined
      ? null
      : documentType(input.documentType);
  const validatedExternalReference = sourceExternalReference(input.externalReference);
  const validatedObservedAt = optionalObservedAt(input.observedAt);
  const createdSourceVersionId = sourceVersionId(randomUUID());

  try {
    return await database.transaction(async (transaction) => {
      authorizeSourceWrite(input.actor, input.organizationId);
      const sourceRows = await transaction
        .select({ id: dataSources.id })
        .from(dataSources)
        .where(
          and(
            eq(dataSources.id, input.sourceId),
            eq(dataSources.organizationId, input.organizationId),
          ),
        )
        .for("update");

      if (sourceRows.length !== 1) {
        throw new SourceAuthoringError(
          "SOURCE_NOT_FOUND",
          "The Source is unavailable in the authorized organization",
        );
      }

      if (input.supersedesSourceVersionId !== undefined) {
        const supersededRows = await transaction
          .select({ id: sourceVersions.id })
          .from(sourceVersions)
          .where(
            and(
              eq(sourceVersions.id, input.supersedesSourceVersionId),
              eq(sourceVersions.sourceId, input.sourceId),
              eq(sourceVersions.organizationId, input.organizationId),
            ),
          )
          .limit(1);
        if (supersededRows.length !== 1) {
          throw new SourceAuthoringError(
            "SUPERSEDED_SOURCE_VERSION_NOT_FOUND",
            "The superseded Source Version is unavailable for this Source",
          );
        }
      }

      const createdRows = await transaction
        .insert(sourceVersions)
        .values({
          id: createdSourceVersionId,
          organizationId: input.organizationId,
          sourceId: input.sourceId,
          documentType: validatedDocumentType,
          versionLabel: validatedVersionLabel,
          externalReference: validatedExternalReference,
          observedAt: validatedObservedAt,
          receivedAt: new Date(),
          supersedesSourceVersionId: input.supersedesSourceVersionId ?? null,
          createdByUserId: input.actor.userId,
        })
        .returning();
      const created = createdRows[0];
      if (created === undefined) {
        throw new SourceAuthoringError(
          "SOURCE_VERSION_CREATION_FAILED",
          "The Source Version could not be created",
        );
      }
      return hydrateSourceVersion(created);
    });
  } catch (error) {
    preserveSourceAuthoringError(
      error,
      new SourceAuthoringError(
        "SOURCE_VERSION_CREATION_FAILED",
        "The Source Version could not be created",
      ),
    );
  }
}
