import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const sourceTypeEnum = pgEnum("source_type", [
  "DEVELOPER_DECLARATION",
  "DEVELOPER_DOCUMENT",
  "PUBLISHED_AUTHORITY_RECORD",
  "EXTERNAL_REFERENCE",
  "SITE_EVIDENCE",
  "INTERNAL_NOTE",
]);

export const documentTypeEnum = pgEnum("document_type", [
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
]);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name").notNull(),
});

export const actors = pgTable("actors", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name").notNull(),
});

export const dataSources = pgTable(
  "data_sources",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict", onUpdate: "restrict" }),
    sourceType: sourceTypeEnum("source_type").notNull(),
    displayName: text("display_name").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => actors.id, { onDelete: "restrict", onUpdate: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("data_sources_id_organization_unique").on(table.id, table.organizationId),
    check(
      "data_sources_display_name_valid",
      sql`char_length(btrim(${table.displayName})) BETWEEN 1 AND 200`,
    ),
    index("data_sources_organization_created_idx").on(
      table.organizationId,
      table.createdAt,
      table.id,
    ),
  ],
);

export const sourceVersions = pgTable(
  "source_versions",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    sourceId: uuid("source_id").notNull(),
    documentType: documentTypeEnum("document_type"),
    versionLabel: text("version_label"),
    externalReference: text("external_reference"),
    observedAt: timestamp("observed_at", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    supersedesSourceVersionId: uuid("supersedes_source_version_id"),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => actors.id, { onDelete: "restrict", onUpdate: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("source_versions_id_source_organization_unique").on(
      table.id,
      table.sourceId,
      table.organizationId,
    ),
    unique("source_versions_id_organization_unique").on(table.id, table.organizationId),
    foreignKey({
      columns: [table.sourceId, table.organizationId],
      foreignColumns: [dataSources.id, dataSources.organizationId],
      name: "source_versions_source_ownership_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    foreignKey({
      columns: [table.supersedesSourceVersionId, table.sourceId, table.organizationId],
      foreignColumns: [table.id, table.sourceId, table.organizationId],
      name: "source_versions_supersedes_same_source_fk",
    })
      .onDelete("restrict")
      .onUpdate("restrict"),
    check(
      "source_versions_not_self_superseding",
      sql`${table.supersedesSourceVersionId} IS NULL OR ${table.supersedesSourceVersionId} <> ${table.id}`,
    ),
    check(
      "source_versions_version_label_valid",
      sql`${table.versionLabel} IS NULL OR char_length(btrim(${table.versionLabel})) BETWEEN 1 AND 100`,
    ),
    check(
      "source_versions_external_reference_valid",
      sql`${table.externalReference} IS NULL OR char_length(btrim(${table.externalReference})) BETWEEN 1 AND 2048`,
    ),
    index("source_versions_organization_source_created_idx").on(
      table.organizationId,
      table.sourceId,
      table.createdAt,
      table.id,
    ),
  ],
);
