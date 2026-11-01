import type { ModuleManifest, RequiredModulePlan } from "../../contracts/src/index";

/**
 * Pure, in-memory dependency-closure demonstration; NOT module activation.
 * No billing, approved releases, entitlements, permissions, DB or state transitions.
 */
export function planRequiredFixtureModules(
  manifests: readonly ModuleManifest[],
  requested: readonly string[],
  alreadyActive: readonly string[] = [],
): RequiredModulePlan {
  const catalog = new Map<string, ModuleManifest>();
  for (const m of manifests) {
    if (!m.key || !m.version || catalog.has(m.key)) throw new Error("Invalid or duplicate module key");
    catalog.set(m.key, m);
  }
  const active = new Set(alreadyActive);
  const selected = new Set([...requested, ...alreadyActive]);
  const visiting = new Set<string>();
  const resolved = new Set<string>();
  const ordered: string[] = [];
  function walk(key: string): void {
    if (visiting.has(key)) throw new Error("Required dependency cycle: " + key);
    if (resolved.has(key)) return;
    const manifest = catalog.get(key);
    if (!manifest) throw new Error("Missing module: " + key);
    visiting.add(key);
    for (const dependency of manifest.required) {
      if (!dependency || dependency === key) throw new Error("Invalid dependency: " + key);
      selected.add(dependency);
      walk(dependency);
    }
    visiting.delete(key);
    resolved.add(key);
    ordered.push(key);
  }
  for (const key of selected) walk(key);
  for (const key of ordered) {
    const manifest = catalog.get(key);
    if (!manifest) throw new Error("Missing module: " + key);
    if (manifest.conflicts.some(other => selected.has(other))) {
      throw new Error("Incompatible modules: " + key);
    }
  }
  return {
    ordered,
    newlyRequired: ordered.filter(key => !active.has(key)),
  };
}
