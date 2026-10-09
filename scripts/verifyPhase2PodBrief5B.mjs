import assert from "node:assert/strict";
import { buildPodBrief } from "../src/podBriefEngine.js";
import { createAcceptedPodBriefRecord, evaluateAcceptedPodBrief, POD_BRIEF_STATUS } from "../src/podBriefState.js";
import { PHASE2_STATE } from "../src/phase2Contract.js";
import { makeFleetIdentity } from "../src/phase2Fleet.js";

function override(id, value, unit) {
  return { id, value, unit, state: PHASE2_STATE.CURRENT };
}

const storageBundle = {
  acceptedAt: "2026-10-08T10:00:00Z",
  fingerprint: "storage-a",
  fleet: makeFleetIdentity({ totalGpus: 64, source: "storage-sizer" }),
  economicsScope: "REQUIREMENT-ONLY",
  pricingIncluded: false,
  requirements: { fastUsableTb: 500, bulkUsableTb: 1000, totalRawTb: 2000, storageRacks: 3, storagePowerKw: 18, aggregateGBps: 50, aggregateGbps: 50, bandwidthUnit: "GB/s", pricingStatus: "OUT-OF-SCOPE", pricingNote: "Vendor-neutral sizing requirement only." },
};
const fabricBundle = {
  acceptedAt: "2026-10-08T10:01:00Z",
  fingerprint: "fabric-a",
  fleet: makeFleetIdentity({ systemCount: 8, source: "network-fabric" }),
  upstreamStorageFingerprint: "storage-a",
  topologyResolved: true,
  costResolved: true,
  overrides: [override("network.fabric.capex.current-fleet", 150000, "USD")],
  requirements: { technology: "infiniband", linkGbps: 400, topology: "leaf-spine", topologyFeasibility: { twoTierFeasible: true, status: "FEASIBLE" }, media: { type: "optical" }, switches: { leaf: 2, spine: 1 }, ports: { endpointPorts: 70, totalLinks: 90 }, switchPowerKw: 4.5, currentFleetSystems: 8, fleetStepSchedule: [{ minSystems: 1, maxSystems: 8 }] },
};
const powerFleet = makeFleetIdentity({ systemClass: "DGX B200", systemCount: 8, source: "power-planner" });
const powerBundle = {
  fleet: powerFleet,
  costResolved: true,
  requirements: { acceptedAt: "2026-10-08T10:02:00Z", fleet: powerFleet, upstreamStorageFingerprint: "storage-a", upstreamNetworkFingerprint: "fabric-a", systemName: "DGX B200", verdict: "fits-as-is", racks: { compute: 4, storage: 3, network: 1, total: 8 }, power: { designItKw: 150, facilityDesignKw: 202.5 }, cooling: { coolingTons: 42.6 }, facilityCostResolved: true, facilityCostStatus: "CUSTOMER" },
  overrides: [override("power.energy.monthly", 12000, "USD/month"), override("power.facility-burden.monthly", 8000, "USD/month")],
};
const softwareBundle = {
  acceptedAt: "2026-10-08T10:03:00Z",
  fingerprint: "software-a",
  fleet: makeFleetIdentity({ totalGpus: 64, source: "software-stack" }),
  costResolved: true,
  overrides: [override("software.total.year-1", 100000, "USD/year"), override("software.total.year-2", 105000, "USD/year"), override("software.total.year-3", 110000, "USD/year")],
  requirements: { horizonYears: 3, rows: [], totals: { annualRecurringYear1: 100000, implementation: 0, total: 315000 } },
};
const phase1Snapshot = { updated_at: "2026-10-08T09:00:00Z", inputs: { ownSys: "DGX B200" }, summary: { horizonYears: 3, onPremCost: 2000000, cloudCost: 3000000, savings: 1000000, planningBasis: "Workload Requirement", recommendedFleet: "8 x DGX B200" } };

const dependencies = { storageBundle, fabricBundle, powerBundle, softwareBundle };
const brief = buildPodBrief({ ...dependencies, phase1Snapshot });
assert.equal(brief.engineeringReviewReady, true, "Complete/current sizing should be ready for engineering review");
assert.equal(brief.clientReady, true, "Storage pricing is outside sizing scope and must not create a fake open item");
assert.equal(brief.openItemCount, 0);
assert.equal(brief.status, "PRE-ARCHITECTURE READY");
assert.equal(brief.fleetIssues.length, 0);
assert.equal(brief.stale.length, 0);
assert.equal(brief.storage.aggregateGBps, 50);
assert.equal(brief.storage.bandwidthUnit, "GB/s");
assert.equal(brief.storage.pricingStatus, "OUT-OF-SCOPE");
assert.equal(brief.phase1Delta, null, "Additive Phase 1 → Phase 2 delta must remain suppressed");
assert.equal(brief.phase1Comparison.baselineOnPrem, 2000000);
assert.equal(brief.phase1Comparison.phase2RefinedLines.powerFacilityHorizon, 720000);
assert.equal(brief.phase1Comparison.phase2RefinedLines.networkCapex, 150000);
assert.equal(brief.phase1Comparison.phase2RefinedLines.softwareHorizon, 315000);
assert.equal(brief.phase1Comparison.additiveTotalSuppressed, true);
assert.ok(brief.phase1Comparison.note.includes("not additive"));
assert.equal(brief.unresolved.some((x) => x.includes("Storage OEM/BOM")), false);

const staleRequirementStorage = buildPodBrief({
  ...dependencies,
  storageBundle: { ...storageBundle, stale: true, staleReason: "Local inputs changed" },
  phase1Snapshot,
});
assert.equal(staleRequirementStorage.engineeringReviewReady, false, "Bundle-level stale state must block readiness even when a requirement has no stale cost override");
assert.ok(staleRequirementStorage.stale.some((x) => x.includes("Storage contains stale accepted values")));

const staleRequirementFabric = buildPodBrief({
  ...dependencies,
  fabricBundle: { ...fabricBundle, stale: true, overrides: [], requirements: { ...fabricBundle.requirements, stale: true } },
  phase1Snapshot,
});
assert.equal(staleRequirementFabric.engineeringReviewReady, false, "Requirement-only Fabric acceptance must still become stale after local edits");
assert.ok(staleRequirementFabric.stale.some((x) => x.includes("Fabric contains stale accepted values")));

const unresolvedPower = buildPodBrief({
  ...dependencies,
  powerBundle: {
    ...powerBundle,
    costResolved: false,
    requirements: { ...powerBundle.requirements, facilityCostResolved: false, facilityCostStatus: "UNRESOLVED" },
    overrides: [override("power.energy.monthly", 12000, "USD/month")],
  },
  phase1Snapshot,
});
assert.equal(unresolvedPower.engineeringReviewReady, true);
assert.equal(unresolvedPower.clientReady, false);
assert.equal(unresolvedPower.openItemCount, 1);
assert.ok(unresolvedPower.unresolved.some((x) => x.includes("Facility-burden economics are unresolved")));

const unresolvedFabric = buildPodBrief({
  ...dependencies,
  fabricBundle: { ...fabricBundle, costResolved: false },
  phase1Snapshot,
});
assert.equal(unresolvedFabric.clientReady, false);
assert.ok(unresolvedFabric.unresolved.some((x) => x.includes("Fabric pricing is unresolved")));

const engineeringFabric = buildPodBrief({
  ...dependencies,
  fabricBundle: { ...fabricBundle, costResolved: false, topologyResolved: false },
  phase1Snapshot,
});
assert.equal(engineeringFabric.clientReady, false);
assert.ok(engineeringFabric.unresolved.some((x) => x.includes("Fabric topology requires engineering review")));

const missingSoftwareFleet = buildPodBrief({
  ...dependencies,
  softwareBundle: { ...softwareBundle, fleet: null },
  phase1Snapshot,
});
assert.equal(missingSoftwareFleet.engineeringReviewReady, false, "Missing accepted fleet identity must block engineering-review readiness");
assert.ok(missingSoftwareFleet.fleetIssues.some((x) => x.includes("Software fleet identity is missing")));

const insufficientSoftwareFleet = buildPodBrief({
  ...dependencies,
  softwareBundle: { ...softwareBundle, fleet: makeFleetIdentity({ source: "software-stack" }) },
  phase1Snapshot,
});
assert.equal(insufficientSoftwareFleet.engineeringReviewReady, false, "An accepted bundle with no comparable fleet dimension must block readiness");
assert.ok(insufficientSoftwareFleet.fleetIssues.some((x) => x.includes("Software fleet identity is insufficient")));

const mismatchedSoftwareFleet = buildPodBrief({
  ...dependencies,
  softwareBundle: { ...softwareBundle, fleet: makeFleetIdentity({ totalGpus: 32, source: "software-stack" }) },
  phase1Snapshot,
});
assert.equal(mismatchedSoftwareFleet.engineeringReviewReady, false);
assert.ok(mismatchedSoftwareFleet.fleetIssues.some((x) => x.includes("Software fleet mismatch")));

const accepted = createAcceptedPodBriefRecord({ brief, dependencies, phase1Snapshot });
assert.equal(evaluateAcceptedPodBrief(accepted, { dependencies, phase1Snapshot }).state, POD_BRIEF_STATUS.CURRENT);

const changedFabric = { ...fabricBundle, fingerprint: "fabric-b" };
const stale = evaluateAcceptedPodBrief(accepted, { dependencies: { ...dependencies, fabricBundle: changedFabric }, phase1Snapshot });
assert.equal(stale.state, POD_BRIEF_STATUS.STALE);
assert.match(stale.staleReason, /changed/i);

const changedTco = { ...phase1Snapshot, updated_at: "2026-10-08T11:00:00Z", summary: { ...phase1Snapshot.summary, onPremCost: 2100000 } };
assert.equal(evaluateAcceptedPodBrief(accepted, { dependencies, phase1Snapshot: changedTco }).state, POD_BRIEF_STATUS.STALE);

console.log("Phase 2 Wave 5B Pod Brief verification passed");
