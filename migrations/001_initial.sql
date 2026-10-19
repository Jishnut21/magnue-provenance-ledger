CREATE TYPE source_type AS ENUM (
  'DEVELOPER_DECLARATION',
  'DEVELOPER_DOCUMENT',
  'PUBLISHED_AUTHORITY_RECORD',
  'EXTERNAL_REFERENCE',
  'SITE_EVIDENCE',
  'INTERNAL_NOTE'
);

CREATE TYPE document_type AS ENUM (
  'RERA_REGISTRATION',
  'STATUTORY_APPROVAL',
  'PROJECT_BROCHURE',
  'FLOOR_PLAN',
  'MASTER_SITE_PLAN',
  'SPECIFICATION_DOCUMENT',
  'PAYMENT_PLAN',
  'PRICE_SHEET',
  'CONSTRUCTION_UPDATE',
  'PROJECT_MEDIA',
  'OTHER_SUPPORTING_DOCUMENT'
);

CREATE TABLE organizations (
  id uuid PRIMARY KEY,
  display_name text NOT NULL
);

CREATE TABLE actors (
  id uuid PRIMARY KEY,
  display_name text NOT NULL
);

CREATE TABLE data_sources (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  source_type source_type NOT NULL,
  display_name text NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES actors(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT data_sources_id_organization_unique UNIQUE (id, organization_id),
  CONSTRAINT data_sources_display_name_valid
    CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 200)
);

CREATE TABLE source_versions (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  source_id uuid NOT NULL,
  document_type document_type,
  version_label text,
  external_reference text,
  observed_at timestamp with time zone,
  received_at timestamp with time zone NOT NULL,
  supersedes_source_version_id uuid,
  created_by_user_id uuid NOT NULL REFERENCES actors(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT source_versions_id_source_organization_unique
    UNIQUE (id, source_id, organization_id),
  CONSTRAINT source_versions_id_organization_unique UNIQUE (id, organization_id),
  CONSTRAINT source_versions_source_ownership_fk
    FOREIGN KEY (source_id, organization_id)
    REFERENCES data_sources(id, organization_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT source_versions_supersedes_same_source_fk
    FOREIGN KEY (supersedes_source_version_id, source_id, organization_id)
    REFERENCES source_versions(id, source_id, organization_id)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT source_versions_not_self_superseding
    CHECK (supersedes_source_version_id IS NULL OR supersedes_source_version_id <> id),
  CONSTRAINT source_versions_version_label_valid
    CHECK (version_label IS NULL OR char_length(btrim(version_label)) BETWEEN 1 AND 100),
  CONSTRAINT source_versions_external_reference_valid
    CHECK (
      external_reference IS NULL
      OR char_length(btrim(external_reference)) BETWEEN 1 AND 2048
    )
);

CREATE INDEX data_sources_organization_created_idx
  ON data_sources (organization_id, created_at, id);

CREATE INDEX source_versions_organization_source_created_idx
  ON source_versions (organization_id, source_id, created_at, id);

CREATE FUNCTION reject_source_version_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'source_versions is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER source_versions_append_only
BEFORE UPDATE OR DELETE ON source_versions
FOR EACH ROW EXECUTE FUNCTION reject_source_version_mutation();
