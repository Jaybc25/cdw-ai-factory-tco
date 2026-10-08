import assert from "node:assert/strict";
import { calculateStorageSizer } from "../src/storageSizerEngine.js";
import { buildStorageDependencyBundle } from "../src/storageSizerWriteback.js";
import { calculateNetworkFabric } from "../src/networkFabricEngine.js";
import { buildNetworkFabricWritebackBundle } from "../src/networkFabricWriteback.js";
import { calculatePowerPlanner } from "../src/powerPlannerEngine.js";
import { buildPowerPlannerWritebackBundle } from "../src/powerPlannerWriteback.js";
import { calculateSoftwareStack, LICENSE_MODE } from "../src/softwareStackEngine.js";
import { buildSoftwareStackWritebackBundle } from "../src/softwareStackWriteback.js";
import { buildPodBrief } from "../src/podBriefEngine.js";
import { createAcceptedPodBriefRecord, evaluateAcceptedPodBrief, POD_BRIEF_STATUS } from "../src/podBriefState.js";
import { PHASE2_SOURCE, PHASE2_STATE } from "../src/phase2Contract.js";

const storageInputs = {
  workload: "training",
  baseDatasetTb: 500,
  annualGrowthPct: 35,
  years: 3,
  copies: 2,
  checkpointMultiplier: 0.5,
  indexOverheadPct: 10,
  reservePct: 20,
  usableEfficiency: 0.75,
  gpuCount: 16,
  manualThroughputGbps: "",
  ingestGbps: 2,
  fastTierTbPerRack: 500,
  bulkTierTbPerRack: 1000,
  fastTierKwPerRack: 6,
  bulkTierKwPerRack: 4,
};
const storageResult = calculateStorageSizer(storageInputs);
const storageBundle = buildStorageDependencyBundle(storageResult, { workload: storageInputs.workload });
assert.ok(storageBundle.fingerprint, "Storage bundle must carry a fingerprint");
assert.ok(storageBundle.requirements.totalRawTb > 0, "Storage must produce positive raw capacity");

const unresolvedFabricInputs = {
  technology: "infiniband",
  linkGbps: 400,
  gpuSystems: 8,
  fabricPortsPerSystem: 8,
  storageAggregateGbps: storageBundle.requirements.aggregateGbps * 8,
  storagePorts: Math.max(2, Math.ceil((storageBundle.requirements.aggregateGbps * 8) / 400)),
  managementPorts: 8,
  uplinkPorts: 2,
  switchRadix: 64,
  targetOversubscription: 1,
  switchPowerKw: 1.5,
  switchCost: 0,
  cableCost: 0,
  transceiverCost: 0,
};
const unresolvedFabricResult = calculateNetworkFabric(unresolvedFabricInputs);
const unresolvedFabricBundle = buildNetworkFabricWritebackBundle(unresolvedFabricResult, unresolvedFabricInputs, { upstreamStorageFingerprint: storageBundle.fingerprint });
assert.equal(unresolvedFabricBundle.costResolved, false, "Zero fabric pricing must remain unresolved");
assert.equal(unresolvedFabricBundle.overrides.length, 0, "Unresolved fabric pricing must not create a zero-dollar TCO override");
assert.equal(unresolvedFabricBundle.requirements.capitalCostCurrentFleet, null, "Unresolved fabric CAPEX must not masquerade as $0");

const fabricInputs = { ...unresolvedFabricInputs, switchCost: 18000, cableCost: 500, transceiverCost: 1200 };
const fabricResult = calculateNetworkFabric(fabricInputs);
const fabricBundle = buildNetworkFabricWritebackBundle(fabricResult, fabricInputs, { upstreamStorageFingerprint: storageBundle.fingerprint });
assert.equal(fabricBundle.costResolved, true);
assert.equal(fabricBundle.overrides.length, 1);
assert.ok(fabricBundle.requirements.fleetStepSchedule.length > 1, "Fabric must carry a non-linear fleet step schedule");
assert.equal(fabricBundle.upstreamStorageFingerprint, storageBundle.fingerprint);

const powerResult = calculatePowerPlanner({
  systemCount: 8,
  avgKwPerSystem: 14.3,
  designKwPerSystem: 14.3,
  systemsPerRack: 2,
  storagePb: storageBundle.requirements.totalRawTb / 1000,
  storagePowerKw: storageBundle.requirements.storagePowerKw,
  storageRacks: storageBundle.requirements.storageRacks,
  storageKwPerPb: 10,
  provisionalNetworkKw: fabricBundle.requirements.switchPowerKw,
  networkRacks: 1,
  pue: 1.35,
  utilityRatePerKwh: 0.11,
  facilityBranch: "owned-dc",
  ownedFacilityBurdenPerKwMonth: 200,
  coloMonthlyBundle: 0,
  coolingType: "air-containment",
  coolingCapability: "air-capable",
  availableKwPerRack: 80,
  totalFacilityKwAvailable: 1000,
  rackPositionsAvailable: 30,
});
const powerBundle = buildPowerPlannerWritebackBundle(powerResult, {
  systemName: "DGX B200",
  upstreamStorage: { fingerprint: storageBundle.fingerprint, acceptedAt: storageBundle.acceptedAt },
  upstreamNetwork: { fingerprint: fabricBundle.fingerprint, acceptedAt: fabricBundle.acceptedAt },
});
assert.equal(powerBundle.requirements.upstreamStorageFingerprint, storageBundle.fingerprint);
assert.equal(powerBundle.requirements.upstreamNetworkFingerprint, fabricBundle.fingerprint);
assert.ok(powerBundle.overrides.every((item) => item.state === PHASE2_STATE.CURRENT));

const softwareInputs = {
  horizonYears: 3,
  annualEscalationPct: 3,
  components: [
    { id: "platform", category: "platform", name: "AI enterprise platform", mode: LICENSE_MODE.COMMERCIAL, unit: "GPU", quantity: 16, annualUnitPrice: 2500, supportPct: 15, annualOpsCost: 6000, oneTimeCost: 8000, entitlementNotes: "3-year quote", priceSource: PHASE2_SOURCE.QUOTE },
    { id: "orchestration", category: "orchestration", name: "Cluster orchestration", mode: LICENSE_MODE.OPEN_SOURCE, unit: "GPU", quantity: 16, annualUnitPrice: 0, supportPct: 0, annualOpsCost: 18000, oneTimeCost: 12000, entitlementNotes: "community + internal ops", priceSource: PHASE2_SOURCE.EST },
  ],
};
const softwareResult = calculateSoftwareStack(softwareInputs);
const softwareBundle = buildSoftwareStackWritebackBundle(softwareResult, softwareInputs);
const platformRow = softwareBundle.requirements.rows.find((row) => row.id === "platform");
assert.equal(platformRow.priceSource, PHASE2_SOURCE.QUOTE, "Selected software price-source provenance must survive calculation/writeback");
assert.equal(platformRow.provenance.source, PHASE2_SOURCE.QUOTE);

const phase1Snapshot = {
  updated_at: "2026-10-08T12:00:00.000Z",
  summary: { horizonYears: 3, onPremCost: 2000000, cloudCost: 3000000 },
};
const brief = buildPodBrief({ storageBundle, fabricBundle, powerBundle, softwareBundle, phase1Snapshot });
assert.equal(brief.clientReady, true, "Complete, current four-pillar brief should be pre-architecture ready");
assert.equal(brief.phase1Delta, null, "The Pod Brief must not calculate an additive Phase 1 → Phase 2 total");
assert.equal(brief.phase1Comparison.baselineOnPrem, 2000000);
assert.equal(brief.phase1Comparison.additiveTotalSuppressed, true);
assert.ok(brief.phase1Comparison.phase2RefinedLines.powerFacilityHorizon > 0);
assert.ok(brief.phase1Comparison.phase2RefinedLines.softwareHorizon > 0);

const dependencies = { storageBundle, fabricBundle, powerBundle, softwareBundle };
const acceptedBrief = createAcceptedPodBriefRecord({ brief, dependencies, phase1Snapshot });
assert.equal(evaluateAcceptedPodBrief(acceptedBrief, { dependencies, phase1Snapshot }).state, POD_BRIEF_STATUS.CURRENT);

const changedFabricInputs = { ...fabricInputs, gpuSystems: 12 };
const changedFabricResult = calculateNetworkFabric(changedFabricInputs);
const changedFabricBundle = buildNetworkFabricWritebackBundle(changedFabricResult, changedFabricInputs, { upstreamStorageFingerprint: storageBundle.fingerprint });
const changedDependencies = { ...dependencies, fabricBundle: changedFabricBundle };
const staleBrief = evaluateAcceptedPodBrief(acceptedBrief, { dependencies: changedDependencies, phase1Snapshot });
assert.equal(staleBrief.state, POD_BRIEF_STATUS.STALE, "Accepted Pod Brief must become stale when Fabric changes");

const changedPhase1 = { ...phase1Snapshot, updated_at: "2026-10-08T13:00:00.000Z", summary: { ...phase1Snapshot.summary, onPremCost: 2100000 } };
assert.equal(evaluateAcceptedPodBrief(acceptedBrief, { dependencies, phase1Snapshot: changedPhase1 }).state, POD_BRIEF_STATUS.STALE, "Accepted Pod Brief must become stale when Phase 1 TCO changes");

const stalePowerBundle = { ...powerBundle, overrides: powerBundle.overrides.map((item) => ({ ...item, state: PHASE2_STATE.STALE, staleReason: "upstream changed" })) };
const stalePowerBrief = buildPodBrief({ storageBundle, fabricBundle, powerBundle: stalePowerBundle, softwareBundle, phase1Snapshot });
assert.equal(stalePowerBrief.clientReady, false, "A stale Power result must block Pod Brief readiness");
assert.equal(stalePowerBrief.economics.powerMonthly, 0, "Stale Power overrides must be excluded from economics");

console.log("Phase 2 Wave 5C end-to-end acceptance verification passed.");
