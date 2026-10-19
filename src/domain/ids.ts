declare const idBrand: unique symbol;

type BrandedId<Name extends string> = string & {
  readonly [idBrand]: Name;
};

export type UserId = BrandedId<"UserId">;
export type OrganizationId = BrandedId<"OrganizationId">;
export type SourceId = BrandedId<"SourceId">;
export type SourceVersionId = BrandedId<"SourceVersionId">;

function createId<Name extends string>(value: string, name: Name): BrandedId<Name> {
  if (value.trim().length === 0) {
    throw new TypeError(`${name} cannot be empty`);
  }
  return value as BrandedId<Name>;
}

export const userId = (value: string): UserId => createId(value, "UserId");
export const organizationId = (value: string): OrganizationId =>
  createId(value, "OrganizationId");
export const sourceId = (value: string): SourceId => createId(value, "SourceId");
export const sourceVersionId = (value: string): SourceVersionId =>
  createId(value, "SourceVersionId");
