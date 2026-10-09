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
  costResolved: false,
  requirements: { fastUsableTb: 500, bulkUsableTb: 1000, totalRawTb: 2000, storageRacks: 3, storagePowerKw: 18, aggregateGbps: 50 },
};
const fabricBundle = {
  acceptedAt: "2026-10-08T10:01:00Z",
  fingerprint: "fabric-a",
  fleet: makeFleetIdentity({ systemCount: 8, source: "network-fabric" }),
  upstreamStorageFingerprint: "storage-a",
  costResolved: true,
  overrides: [override("network.fabric.capex.current-fleet", 150000, "USD")],
  requirements: { technology: "infiniband", linkGbps: 400, topology: "leaf-spine", switches: { leaf: 2, spine: 1 }, ports: { endpointPorts: 70, totalLinks: 90 }, switchPowerKw: 4.5, currentFleetSystems: 8, fleetStepSchedule: [{ minSystems: 1, maxSystems: 8 }] },
};
const powerFleet = makeFleetIdentity({ systemClass: "DGX B200", systemCount: 8, source: "power-planner" });
const powerBundle = {
  fleet: powerFleet,
  requirements: { acceptedAt: "2026-10-08T10:02:00Z", fleet: powerFleet, upstreamStorageFingerprint: "storage-a", upstreamNetworkFingerprint: "fabric-a", systemName: "DGX B200", verdict: "fits-as-is", racks: { compute: 4, storage: 3, network: 1, total: 8 }, power: { designItKw: 150, facilityDesignKw: 202.5 }, cooling: { coolingTons: 42.6 } },
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
assert.equal(brief.clientReady, false, "Open storage pricing must prevent unqualified client-ready status");
assert.equal(brief.openItemCount, 1);
assert.match(brief.status, /^READY FOR ENGINEERING REVIEW/);
assert.equal(brief.fleetIssues.length, 0);
assert.equal(brief.stale.length, 0);
assert.equal(brief.phase1Delta, null, "Additive Phase 1 → Phase 2 delta must remain suppressed");
assert.equal(brief.phase1Comparison.baselineOnPrem, 2000000);
assert.equal(brief.phase1Comparison.phase2RefinedLines.powerFacilityHorizon, 720000);
assert.equal(brief.phase1Comparison.phase2RefinedLines.networkCapex, 150000);
assert.equal(brief.phase1Comparison.phase2RefinedLines.softwareHorizon, 315000);
assert.equal(brief.phase1Comparison.additiveTotalSuppressed, true);
assert.ok(brief.phase1Comparison.note.includes("not additive"));
assert.ok(brief.unresolved.some((x) => x.includes("Storage OEM/BOM")));

const accepted = createAcceptedPodBriefRecord({ brief, dependencies, phase1Snapshot });
assert.equal(evaluateAcceptedPodBrief(accepted, { dependencies, phase1Snapshot }).state, POD_BRIEF_STATUS.CURRENT);

const changedFabric = { ...fabricBundle, fingerprint: "fabric-b" };
const stale = evaluateAcceptedPodBrief(accepted, { dependencies: { ...dependencies, fabricBundle: changedFabric }, phase1Snapshot });
assert.equal(stale.state, POD_BRIEF_STATUS.STALE);
assert.match(stale.staleReason, /changed/i);

const changedTco = { ...phase1Snapshot, updated_at: "2026-10-08T11:00:00Z", summary: { ...phase1Snapshot.summary, onPremCost: 2100000 } };
assert.equal(evaluateAcceptedPodBrief(accepted, { dependencies, phase1Snapshot: changedTco }).state, POD_BRIEF_STATUS.STALE);

console.log("Phase 2 Wave 5B Pod Brief verification passed");
