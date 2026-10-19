import { describe, expect, expectTypeOf, it } from "vitest";

import {
  SOURCE_TYPES,
  documentType,
  optionalObservedAt,
  sourceDisplayName,
  sourceExternalReference,
  sourceType,
  sourceVersionLabel,
} from "../src/domain/sources.js";
import {
  sourceId,
  sourceVersionId,
  type SourceId,
  type SourceVersionId,
} from "../src/domain/ids.js";

describe("Source domain", () => {
  it("accepts exactly the supported provenance Source types", () => {
    for (const supported of SOURCE_TYPES) expect(sourceType(supported)).toBe(supported);
    expect(() => sourceType("BROCHURE")).toThrow(/Unsupported Source type/);
    expect(() => sourceType("AI_EXTRACTION")).toThrow(/Unsupported Source type/);
  });

  it("keeps Source and Source Version identities semantically distinct", () => {
    expectTypeOf<SourceId>().not.toEqualTypeOf<SourceVersionId>();
    expect(sourceId("source-id")).toBe("source-id");
    expect(sourceVersionId("source-version-id")).toBe("source-version-id");
  });

  it("normalizes and bounds Source metadata", () => {
    expect(sourceDisplayName("  Authority register  ")).toBe("Authority register");
    expect(sourceVersionLabel("  release-a  ")).toBe("release-a");
    expect(sourceExternalReference("  https://records.example.test/1  ")).toBe(
      "https://records.example.test/1",
    );
    expect(documentType("STATUTORY_APPROVAL")).toBe("STATUTORY_APPROVAL");
    expect(() => sourceDisplayName(" ")).toThrow(/cannot be blank/);
    expect(() => sourceVersionLabel("x".repeat(101))).toThrow(/cannot exceed 100/);
    expect(() => sourceExternalReference("x".repeat(2_049))).toThrow(/cannot exceed 2048/);
  });

  it("allows an optional observation timestamp and rejects invalid dates", () => {
    const observed = new Date("2026-01-02T00:00:00.000Z");
    expect(optionalObservedAt(observed)).toBe(observed);
    expect(optionalObservedAt(undefined)).toBeNull();
    expect(() => optionalObservedAt(new Date(Number.NaN))).toThrow(/valid timestamp/);
  });
});
