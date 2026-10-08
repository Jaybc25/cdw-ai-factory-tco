import assert from "node:assert/strict";
import { buildPodBrief } from "../src/podBriefEngine.js";
import { PHASE2_STATE } from "../src/phase2Contract.js";
import { makeFleetIdentity } from "../src/phase2Fleet.js";

const canonicalFleet = makeFleetIdentity({ systemClass: "DGX B200", systemCount: 8, source: "phase1-tco" });
const storageBundle = {
  fingerprint: "storage-a",
  fleet: makeFleetIdentity({ totalGpus: 64, source: "storage-sizer" }),
  costResolved: false,
  requirements: {
    fastUsableTb: 600,
    bulkUsableTb: 400,
    totalRawTb: 1400,
    storageRacks: 3,
    storagePowerKw: 18,
    aggregateGbps: 42,
  },
};

const fabricBundle = {
  fingerprint: "fabric-a",
  upstreamStorageFingerprint: "storage-a",
  fleet: makeFleetIdentity({ systemCount: 8, source: "network-fabric" }),
  costResolved: true,
  requirements: {
    technology: "infiniband",
    linkGbps: 400,
    topology: "leaf-spine",
    switches: { leaf: 2, spine: 1, total: 3 },
    ports: { endpointPorts: 72, totalLinks: 140 },
    switchPowerKw: 4.5,
    currentFleetSystems: 8,
    fleetStepSchedule: [{ minSystems: 1, maxSystems: 8, totalSwitches: 3 }],
  },
  overrides: [{ id: "fabric", unit: "USD", value: 150000, state: PHASE2_STATE.CURRENT }],
};

const powerFleet = makeFleetIdentity({ systemClass: "DGX B200", systemCount: 8, source: "power-planner" });
const powerBundle = {
  fleet: powerFleet,
  requirements: {
    fleet: powerFleet,
    systemName: "DGX B200",
    upstreamStorageFingerprint: "storage-a",
    upstreamNetworkFingerprint: "fabric-a",
    verdict: "fits-as-is",
    racks: { compute: 4, storage: 3, network: 1, total: 8 },
    power: { designItKw: 160, facilityDesignKw: 216 },
    cooling: { coolingTons: 45.5 },
  },
  overrides: [
    { id: "energy", unit: "USD/month", value: 18000, state: PHASE2_STATE.CURRENT },
    { id: "facility", unit: "USD/month", value: 32000, state: PHASE2_STATE.CURRENT },
  ],
};

const softwareBundle = {
  fleet: makeFleetIdentity({ totalGpus: 64, source: "software-stack" }),
  requirements: {
    horizonYears: 3,
    rows: [{ name: "Platform", mode: "commercial", priceSource: "QUOTE", unit: "GPU", quantity: 64 }],
    totals: { annualRecurringYear1: 50000, implementation: 12000, total: 170000 },
  },
  overrides: [
    { id: "software.total.year-1", unit: "USD/year", value: 62000, state: PHASE2_STATE.CURRENT },
    { id: "software.total.year-2", unit: "USD/year", value: 54000, state: PHASE2_STATE.CURRENT },
    { id: "software.total.year-3", unit: "USD/year", value: 54000, state: PHASE2_STATE.CURRENT },
  ],
};

const phase1Snapshot = {
  summary: { onPremCost: 2000000, cloudCost: 3000000, horizonYears: 3, recommendedFleet: "8 x DGX B200" },
  inputs: { ownSys: "DGX B200" },
};
const brief = buildPodBrief({ storageBundle, fabricBundle, powerBundle, softwareBundle, phase1Snapshot });
assert.deepEqual(brief.canonicalFleet, canonicalFleet);
assert.equal(brief.clientReady, true);
assert.equal(brief.fleetIssues.length, 0);
assert.equal(brief.compute.totalRacks, 8);
assert.equal(brief.storage.totalRawTb, 1400);
assert.equal(brief.fabric.switchPowerKw, 4.5);
assert.equal(brief.facility.facilityDesignKw, 216);
assert.equal(brief.economics.powerMonthly, 50000);
assert.equal(brief.economics.powerAnnualized, 600000);
assert.equal(brief.economics.networkCapex, 150000);
assert.equal(brief.economics.softwareByYear[1], 62000);
assert.ok(brief.unresolved.some((item) => item.includes("Storage OEM/BOM pricing")));

const mismatchedSoftware = { ...softwareBundle, fleet: makeFleetIdentity({ totalGpus: 16, source: "software-stack" }) };
const fleetMismatchBrief = buildPodBrief({ storageBundle, fabricBundle, powerBundle, softwareBundle: mismatchedSoftware, phase1Snapshot });
assert.equal(fleetMismatchBrief.clientReady, false);
assert.ok(fleetMismatchBrief.fleetIssues.some((item) => item.includes("Software fleet mismatch")));

const staleFabric = { ...fabricBundle, upstreamStorageFingerprint: "storage-old" };
const dependencyStaleBrief = buildPodBrief({ storageBundle, fabricBundle: staleFabric, powerBundle, softwareBundle, phase1Snapshot });
assert.equal(dependencyStaleBrief.clientReady, false);
assert.ok(dependencyStaleBrief.stale.some((item) => item.includes("Network Fabric is stale")));

const stalePower = {
  ...powerBundle,
  overrides: powerBundle.overrides.map((item) => ({ ...item, state: PHASE2_STATE.STALE })),
};
const staleBrief = buildPodBrief({ storageBundle, fabricBundle, powerBundle: stalePower, softwareBundle, phase1Snapshot });
assert.equal(staleBrief.clientReady, false);
assert.ok(staleBrief.stale.length > 0);
assert.equal(staleBrief.economics.powerMonthly, 0);

const incomplete = buildPodBrief({ storageBundle: null, fabricBundle: null, powerBundle: null, softwareBundle: null });
assert.equal(incomplete.clientReady, false);
assert.equal(incomplete.unresolved.length, 5);

console.log("Phase 2 Pod Brief verification: PASS");
