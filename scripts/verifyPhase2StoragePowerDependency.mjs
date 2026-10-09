import assert from "node:assert/strict";
import { calculateStorageSizer } from "../src/storageSizerEngine.js";
import { buildStorageDependencyBundle } from "../src/storageSizerWriteback.js";
import { calculatePowerPlanner } from "../src/powerPlannerEngine.js";
import { buildPowerPlannerWritebackBundle } from "../src/powerPlannerWriteback.js";

function makeStorage(baseDatasetTb, activeWorkingSetTb = "") {
  const result = calculateStorageSizer({
    workload: "training",
    baseDatasetTb,
    annualGrowthPct: 25,
    years: 3,
    copies: 2,
    modelParamsBillions: 70,
    checkpointBytesPerParam: 16,
    checkpointsRetained: 5,
    activeWorkingSetPct: 35,
    activeWorkingSetTb,
    indexOverheadPct: 10,
    reservePct: 20,
    usableEfficiency: 0.75,
    gpuCount: 16,
    ingestGbps: 2,
    fastTierTbPerRack: 500,
    bulkTierTbPerRack: 1000,
    fastTierKwPerRack: 6,
    bulkTierKwPerRack: 4,
  });
  return buildStorageDependencyBundle(result, { workload: "training" });
}

function makePower(storage) {
  const r = storage.requirements;
  const result = calculatePowerPlanner({
    systemCount: 8,
    avgKwPerSystem: 14.3,
    designKwPerSystem: 14.3,
    systemsPerRack: 2,
    storagePb: r.totalRawTb / 1000,
    storagePowerKw: r.storagePowerKw,
    storageRacks: r.storageRacks,
    provisionalNetworkKw: 12,
    networkRacks: 1,
    pue: 1.35,
    utilityRatePerKwh: 0.11,
    facilityBranch: "owned-dc",
    ownedFacilityBurdenPerKwMonth: 200,
    coolingType: "air-containment",
    coolingCapability: "air-capable",
    availableKwPerRack: 40,
    totalFacilityKwAvailable: 400,
    rackPositionsAvailable: 20,
  });
  return buildPowerPlannerWritebackBundle(result, {
    systemName: "DGX B200",
    upstreamStorage: { fingerprint: storage.fingerprint, acceptedAt: storage.acceptedAt },
  });
}

const storageA = makeStorage(500);
const storageB = makeStorage(750);
assert.notEqual(storageA.fingerprint, storageB.fingerprint, "Storage fingerprint must change when accepted inputs change");
assert.equal(storageA.schemaVersion, 3);
assert.equal(storageA.economicsScope, "REQUIREMENT-ONLY");
assert.equal(storageA.pricingIncluded, false);
assert.equal(storageA.requirements.pricingStatus, "OUT-OF-SCOPE");
assert.match(storageA.requirements.pricingNote, /vendor-neutral capacity\/performance\/rack\/power requirement/i);
assert.equal(storageA.requirements.bandwidthUnit, "GB/s");
assert.equal(storageA.requirements.aggregateGBps, storageA.requirements.aggregateGbps, "Legacy alias must remain numerically identical during preview migration");
assert.equal(storageA.assumptions.activeWorkingSet.source, "EST");
assert.equal(storageA.assumptions.throughputPerGpu.source, "EST");
assert.equal(storageA.assumptions.rackDensity.source, "EST");
assert.equal(storageA.assumptions.rackPower.source, "EST");
assert.equal("costResolved" in storageA, false, "Storage sizing must not pretend to have unresolved pricing state");

const explicitWorkingSet = makeStorage(500, 120);
assert.equal(explicitWorkingSet.assumptions.activeWorkingSet.source, "CUSTOMER", "Explicit active working set must preserve customer provenance");
assert.equal(explicitWorkingSet.assumptions.activeWorkingSet.explicitTb, 120);
assert.match(explicitWorkingSet.assumptions.activeWorkingSet.note, /customer active-working-set capacity/i);

const powerA = makePower(storageA);
assert.equal(powerA.requirements.upstreamStorageFingerprint, storageA.fingerprint);
assert.equal(powerA.overrides.length, 2);
assert.ok(powerA.requirements.power.storageKw > 0, "Power must consume explicit storage kW");
assert.equal(powerA.requirements.racks.storage, storageA.requirements.storageRacks, "Power must consume accepted storage rack count");

assert.equal(powerA.requirements.upstreamStorageFingerprint !== storageB.fingerprint, true, "A new accepted Storage fingerprint must stale the prior Power result");

const powerB = makePower(storageB);
assert.equal(powerB.requirements.upstreamStorageFingerprint, storageB.fingerprint, "Recompute must bind Power to the new Storage fingerprint");
assert.notEqual(powerA.requirements.power.storageKw, powerB.requirements.power.storageKw, "Changed Storage sizing should propagate into Power when the requirement changes materially");

console.log("PASS: Phase 2 Storage requirement contract, provenance, and Storage → Power dependency verified");
