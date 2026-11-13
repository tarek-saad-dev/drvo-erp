export { fixtureMatchesResourceScope } from "./scope-fixture";
export { planRequiredFixtureModules } from "./module-planner";
export { previewRequiredFixtureModules } from "./module-preview";
export type { FixtureModulePreview, FixtureModulePreviewItem } from "./module-preview";
export { createCandidateModuleRegistry } from "./candidate-module-registry";
export type { CandidateModuleRegistry } from "./candidate-module-registry";

export {createVerifiedReleaseRegistry,EMPTY_PRODUCTION_RELEASE_REGISTRY} from "./verified-release-registry";
export type {ReleaseEvidence,ReleaseMarketApproval,VerifiedReleaseView,VerifiedReleaseRegistry,TrustedReleaseVerifier} from "./verified-release-registry";
