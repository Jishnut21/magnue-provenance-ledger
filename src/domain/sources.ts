import type { OrganizationId, SourceId, SourceVersionId, UserId } from "./ids.js";

export const SOURCE_TYPES = [
  "DEVELOPER_DECLARATION",
  "DEVELOPER_DOCUMENT",
  "PUBLISHED_AUTHORITY_RECORD",
  "EXTERNAL_REFERENCE",
  "SITE_EVIDENCE",
  "INTERNAL_NOTE",
] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export const DOCUMENT_TYPES = [
  "RERA_REGISTRATION",
  "STATUTORY_APPROVAL",
  "PROJECT_BROCHURE",
  "FLOOR_PLAN",
  "MASTER_SITE_PLAN",
  "SPECIFICATION_DOCUMENT",
  "PAYMENT_PLAN",
  "PRICE_SHEET",
  "CONSTRUCTION_UPDATE",
  "PROJECT_MEDIA",
  "OTHER_SUPPORTING_DOCUMENT",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const SOURCE_DISPLAY_NAME_MAX_LENGTH = 200;
export const SOURCE_VERSION_LABEL_MAX_LENGTH = 100;
export const SOURCE_EXTERNAL_REFERENCE_MAX_LENGTH = 2_048;

export interface DataSource {
  readonly id: SourceId;
  readonly organizationId: OrganizationId;
  readonly sourceType: SourceType;
  readonly displayName: string;
  readonly createdByUserId: UserId;
  readonly createdAt: Date;
}

export interface SourceVersion {
  readonly id: SourceVersionId;
  readonly organizationId: OrganizationId;
  readonly sourceId: SourceId;
  readonly documentType: DocumentType | null;
  readonly versionLabel: string | null;
  readonly externalReference: string | null;
  readonly observedAt: Date | null;
  readonly receivedAt: Date;
  readonly supersedesSourceVersionId: SourceVersionId | null;
  readonly createdByUserId: UserId;
  readonly createdAt: Date;
}

export function sourceType(value: unknown): SourceType {
  const type = SOURCE_TYPES.find((candidate) => candidate === value);
  if (type === undefined) throw new TypeError(`Unsupported Source type: ${String(value)}`);
  return type;
}

export function documentType(value: unknown): DocumentType {
  const type = DOCUMENT_TYPES.find((candidate) => candidate === value);
  if (type === undefined) throw new TypeError(`Unsupported document type: ${String(value)}`);
  return type;
}

function boundedRequiredText(value: string, name: string, maximumLength: number): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new TypeError(`${name} cannot be blank`);
  if (trimmed.length > maximumLength) {
    throw new TypeError(`${name} cannot exceed ${maximumLength} characters`);
  }
  return trimmed;
}

function boundedOptionalText(
  value: string | null | undefined,
  name: string,
  maximumLength: number,
): string | null {
  return value === null || value === undefined
    ? null
    : boundedRequiredText(value, name, maximumLength);
}

export function sourceDisplayName(value: string): string {
  return boundedRequiredText(value, "Source display name", SOURCE_DISPLAY_NAME_MAX_LENGTH);
}

export function sourceVersionLabel(value: string | null | undefined): string | null {
  return boundedOptionalText(
    value,
    "Source Version label",
    SOURCE_VERSION_LABEL_MAX_LENGTH,
  );
}

export function sourceExternalReference(value: string | null | undefined): string | null {
  return boundedOptionalText(
    value,
    "Source Version external reference",
    SOURCE_EXTERNAL_REFERENCE_MAX_LENGTH,
  );
}

export function optionalObservedAt(value: Date | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value.getTime())) {
    throw new TypeError("Source Version observed time must be a valid timestamp");
  }
  return value;
}
