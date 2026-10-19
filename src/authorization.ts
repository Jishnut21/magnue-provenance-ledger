import type { OrganizationId, UserId } from "./domain/ids.js";

export const SOURCE_CAPABILITIES = ["SOURCE_READ", "SOURCE_WRITE"] as const;
export type SourceCapability = (typeof SOURCE_CAPABILITIES)[number];

export interface ActorContext {
  readonly userId: UserId;
  readonly organizationId: OrganizationId;
  readonly capabilities: ReadonlySet<SourceCapability>;
}

export type AuthorizationErrorCode = "TENANT_MISMATCH" | "FORBIDDEN_CAPABILITY";

export class AuthorizationError extends Error {
  readonly code: AuthorizationErrorCode;

  constructor(code: AuthorizationErrorCode, message: string) {
    super(message);
    this.name = "AuthorizationError";
    this.code = code;
  }
}

export function authorizeSourceRead(
  actor: ActorContext,
  organizationId: OrganizationId,
): void {
  if (actor.organizationId !== organizationId) {
    throw new AuthorizationError("TENANT_MISMATCH", "Actor does not belong to this organization");
  }
  if (!actor.capabilities.has("SOURCE_READ")) {
    throw new AuthorizationError("FORBIDDEN_CAPABILITY", "SOURCE_READ is required");
  }
}

export function authorizeSourceWrite(
  actor: ActorContext,
  organizationId: OrganizationId,
): void {
  authorizeSourceRead(actor, organizationId);
  if (!actor.capabilities.has("SOURCE_WRITE")) {
    throw new AuthorizationError("FORBIDDEN_CAPABILITY", "SOURCE_WRITE is required");
  }
}
