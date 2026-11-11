import type { ModuleManifest } from "../../contracts/src/index";
import { planRequiredFixtureModules } from "./module-planner";

/**
 * K6A engineering fixture ONLY: deterministic read-only dependency preview.
 * NOT a release registry, commercial quote, authorization or activation API.
 * Input manifests are test data, never trusted tenant/customer release data.
 */
export interface FixtureModulePreviewItem {
  readonly key: string;
  readonly version: string;
  readonly origin: "selected" | "required" | "existing";
  readonly alreadyActive: boolean;
}

export interface FixtureModulePreview {
  readonly items: readonly FixtureModulePreviewItem[];
  readonly newlyRequired: readonly string[];
}

const KEY = /^[A-Za-z][A-Za-z0-9._-]{0,63}$/;

function canonicalKeys(keys: readonly string[], label: string): string[] {
  if (!Array.isArray(keys)) throw new Error("Invalid " + label + " list");
  const seen = new Set<string>();
  for (const key of keys) {
    if (typeof key !== "string" || !KEY.test(key) || seen.has(key)) {
      throw new Error("Invalid or duplicate " + label + " key");
    }
    seen.add(key);
  }
  return [...seen].sort();
}

export function previewRequiredFixtureModules(
  manifests: readonly ModuleManifest[],
  requested: readonly string[],
  alreadyActive: readonly string[] = [],
): FixtureModulePreview {
  if (!Array.isArray(manifests)) throw new Error("Invalid manifest list");
  const canonical = manifests.map(m => {
    if (!m || typeof m.key !== "string" || !KEY.test(m.key) ||
        typeof m.version !== "string" || !m.version.trim()) {
      throw new Error("Invalid manifest identity");
    }
    return {
      key: m.key,
      version: m.version,
      required: canonicalKeys(m.required, "required"),
      optional: canonicalKeys(m.optional, "optional"),
      conflicts: canonicalKeys(m.conflicts, "conflict"),
    };
  }).sort((a, b) => a.key.localeCompare(b.key, "en"));
  const requestedKeys = canonicalKeys(requested, "requested");
  const activeKeys = canonicalKeys(alreadyActive, "active");
  const plan = planRequiredFixtureModules(canonical, requestedKeys, activeKeys);
  const byKey = new Map(canonical.map(m => [m.key, m]));
  const selected = new Set(requestedKeys);
  const active = new Set(activeKeys);
  return {
    items: plan.ordered.map(key => {
      const manifest = byKey.get(key);
      if (!manifest) throw new Error("Missing manifest for preview");
      return {
        key,
        version: manifest.version,
        origin: selected.has(key) ? "selected" as const
          : active.has(key) ? "existing" as const : "required" as const,
        alreadyActive: active.has(key),
      };
    }),
    newlyRequired: [...plan.newlyRequired],
  };
}
