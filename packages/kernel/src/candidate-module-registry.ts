import type { ModuleManifest } from "../../contracts/src/index";
import {
  previewRequiredFixtureModules,
  type FixtureModulePreview,
} from "./module-preview";

/**
 * K6B developer-only, in-memory snapshot of UNAPPROVED candidate manifests.
 * It is not an authoritative registry, release approval, public API or
 * permission to activate a Module for a customer Business.
 */
export interface CandidateModuleRegistry {
  readonly manifests: readonly ModuleManifest[];
  preview(
    requested: readonly string[],
    alreadyActive?: readonly string[],
  ): FixtureModulePreview;
}

const KEY = /^[A-Za-z][A-Za-z0-9._-]{0,63}$/;
// Fixture convention only: NOT the final DRVO release compatibility policy.
const VERSION = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/;

function copyKeys(
  value: readonly string[],
  field: string,
  owner: string,
): readonly string[] {
  if (!Array.isArray(value)) throw new Error("Invalid " + field + " list");
  const found = new Set<string>();
  for (const key of value) {
    if (typeof key !== "string" || !KEY.test(key) || found.has(key)) {
      throw new Error("Invalid or duplicate " + field + " key for " + owner);
    }
    found.add(key);
  }
  return Object.freeze([...found].sort());
}

/**
 * Snapshot a set of candidate releases without trusting or retaining caller
 * objects. A candidate is NOT published or eligible for activation. Required
 * graph closure is checked for every individual entry; incompatible candidates
 * can coexist in the catalog but cannot be selected together.
 */
export function createCandidateModuleRegistry(
  input: readonly ModuleManifest[],
): CandidateModuleRegistry {
  if (!Array.isArray(input)) throw new Error("Invalid candidate manifest list");

  const seen = new Set<string>();
  const manifests: ModuleManifest[] = [];

  for (const raw of input) {
    if (!raw || typeof raw.key !== "string" || !KEY.test(raw.key) ||
        typeof raw.version !== "string" || !VERSION.test(raw.version) ||
        seen.has(raw.key)) {
      throw new Error("Invalid or duplicate candidate release");
    }
    seen.add(raw.key);

    const required = copyKeys(raw.required, "required", raw.key);
    const optional = copyKeys(raw.optional, "optional", raw.key);
    const conflicts = copyKeys(raw.conflicts, "conflicts", raw.key);
    const edges = [...required, ...optional, ...conflicts];
    if (edges.includes(raw.key) || new Set(edges).size !== edges.length) {
      throw new Error("Self-reference or overlapping dependency groups: " + raw.key);
    }
    manifests.push(Object.freeze({
      key: raw.key,
      version: raw.version,
      required,
      optional,
      conflicts,
    }));
  }

  manifests.sort((a, b) => a.key.localeCompare(b.key, "en"));
  const frozen = Object.freeze(manifests);

  // Validate each candidate's own Required closure, including missing
  // releases, cycles and conflicts. Do not activate anything or force Optionals.
  for (const manifest of frozen) {
    previewRequiredFixtureModules(frozen, [manifest.key]);
  }

  return Object.freeze({
    manifests: frozen,
    preview(
      requested: readonly string[],
      alreadyActive: readonly string[] = [],
    ): FixtureModulePreview {
      // The preview is a fresh result; no business state is remembered.
      return previewRequiredFixtureModules(frozen, requested, alreadyActive);
    },
  });
}
