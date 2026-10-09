import assert from "node:assert/strict";
import { buildPodBrief } from "../src/podBriefEngine.js";
import { makeFleetIdentity } from "../src/phase2Fleet.js";
import { PHASE2_STATE } from "../src/phase2Contract.js";

const current = (id, value, unit) => ({ id, value, unit, state: PHASE2_STATE.CURRENT });
const phase1Snapshot = {
  updated_at: "2026-10-08T09:00:00Z",
  summary: { horizonYears: 3, onPremCost: 2000000, cloudCost: 3000000, recommendedFleet: "8 x DGX B200" },
};
const storageBundle = {
  fingerprint: "storage-a",
  fleet: makeFleetIdentity({ totalGpus: 64, source: "storage-sizer" }),
  requirements: { totalRawTb: 1000, storageRacks: 2, storagePowerKw: 10, aggregateGBps: 25 },
};
const fabricBundle = {
  fingerprint: "fabric-a",
  upstreamStorageFingerprint: "storage-a",
  fleet: makeFleetIdentity({ systemCount: 8, source: "network-fabric" }),
  costResolved: true,
  overrides: [current("network.fabric.capex.current-fleet", 100000, "USD")],
  requirements: { technology: "infiniband", linkGbps: 400, switchPowerKw: 4.5 },
};
const powerFleet = makeFleetIdentity({ systemClass: "DGX B200", systemCount: 8, source: "power-planner" });
const powerBundle = {
  fleet: powerFleet,
  costResolved: true,
  overrides: [current("power.energy.monthly", 10000, "USD/month")],
  requirements: {
    fleet: powerFleet,
    upstreamStorageFingerprint: "storage-a",
    upstreamNetworkFingerprint: "fabric-a",
    systemName: "DGX B200",
    racks: { compute: 4, storage: 2, network: 1, total: 7, footprintComplete: true },
    networkRackFootprintResolved: true,
    power: { designItKw: 140, facilityDesignKw: 189 },
    cooling: { coolingTons: 40 },
    facilityCostResolved: true,
  },
};
const softwareFleet = makeFleetIdentity({ totalGpus: 64, source: "software-stack" });
const unresolvedSoftware = {
  fleet: softwareFleet,
  costResolved: false,
  pricingResolved: true,
  phase1OverlapResolved: false,
  unresolvedCommercialComponents: [],
  unresolvedPhase1OverlapComponents: ["AI enterprise platform"],
  overrides: [],
  requirements: {
    horizonYears: 3,
    rows: [{ name: "AI enterprise platform", tcoTreatment: "review-required" }],
    totals: { total: 300000, tcoEligibleTotal: 0 },
    overlapSummary: { reviewRequiredComponents: ["AI enterprise platform"] },
  },
};

const brief = buildPodBrief({ storageBundle, fabricBundle, powerBundle, softwareBundle: unresolvedSoftware, phase1Snapshot });
assert.equal(brief.engineeringReviewReady, true, "Software overlap review is an economics/open-item blocker, not a fleet/staleness blocker");
assert.equal(brief.clientReady, false, "Unresolved Phase 1 overlap must block client-ready status");
assert.equal(brief.openItemCount, 1);
assert.ok(brief.unresolved.some((item) => item.includes("Software Phase 1 overlap is unresolved")));
assert.equal(brief.unresolved.some((item) => item.includes("Commercial software pricing is unresolved")), false, "Overlap-only blocker must not be mislabeled as missing pricing");
assert.equal(brief.software.phase1OverlapResolved, false);

console.log("Phase 2 Software overlap Pod Brief verification passed");
