/**
 * Cross-module, non-domain-specific contract shapes only.
 * NO authentication/session/storage behavior is implemented in K0.
 */
export type ScopeClass = "tenant" | "business" | "branch";

export interface ScopedResource {
  readonly scope: ScopeClass;
  readonly tenantId: string;
  readonly businessId?: string;
  readonly branchId?: string;
}

/** This is a TEST FIXTURE input, not an authentication artifact. */
export interface VerifiedScopeFixture {
  readonly tenantId: string;
  readonly businessId?: string;
  readonly branchId?: string;
}

export interface ModuleManifest {
  readonly key: string;
  readonly version: string;
  readonly required: readonly string[];
  readonly optional: readonly string[];
  readonly conflicts: readonly string[];
}

export interface RequiredModulePlan {
  /** Dependencies first. Requested modules appear after prerequisites. */
  readonly ordered: readonly string[];
  readonly newlyRequired: readonly string[];
}
