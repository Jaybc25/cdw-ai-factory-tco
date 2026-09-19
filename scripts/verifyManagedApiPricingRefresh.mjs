import assert from "node:assert/strict";
import { MANAGED_API_PRICING_SNAPSHOT } from "../src/managedApiPricingRegistry.js";
import {
  evaluateManagedApiPricingCandidate,
  getManagedApiPricingRefreshStatus,
  validateManagedApiPricingSnapshot,
} from "../src/managedApiPricingRefresh.js";

const current = validateManagedApiPricingSnapshot(MANAGED_API_PRICING_SNAPSHOT);
assert.equal(current.ok, true);

const duplicateCandidate = {
  ...MANAGED_API_PRICING_SNAPSHOT,
  snapshotId: "duplicate-test",
  rates: [
    MANAGED_API_PRICING_SNAPSHOT.rates[0],
    MANAGED_API_PRICING_SNAPSHOT.rates[0],
  ],
};
const duplicateValidation = validateManagedApiPricingSnapshot(duplicateCandidate);
assert.equal(duplicateValidation.ok, false);
assert.ok(duplicateValidation.errors.some((e) => e.includes("Duplicate provider/model")));

const badCandidate = {
  ...MANAGED_API_PRICING_SNAPSHOT,
  snapshotId: "bad-candidate",
  rates: [{
    ...MANAGED_API_PRICING_SNAPSHOT.rates[0],
    outputUsdPerMillion: 0,
  }],
};
const rejected = evaluateManagedApiPricingCandidate({
  currentSnapshot: MANAGED_API_PRICING_SNAPSHOT,
  candidateSnapshot: badCandidate,
});
assert.equal(rejected.ok, false);
assert.equal(rejected.candidateAccepted, false);
assert.equal(rejected.reason, "LAST_KNOWN_GOOD_PRESERVED");
assert.equal(rejected.selectedSnapshot, MANAGED_API_PRICING_SNAPSHOT);

const goodCandidate = {
  ...MANAGED_API_PRICING_SNAPSHOT,
  snapshotId: "good-candidate",
  verifiedAt: "2026-09-19",
  lastSuccessfulRefreshAt: "2026-09-19T00:00:00Z",
};
const accepted = evaluateManagedApiPricingCandidate({
  currentSnapshot: MANAGED_API_PRICING_SNAPSHOT,
  candidateSnapshot: goodCandidate,
});
assert.equal(accepted.ok, true);
assert.equal(accepted.candidateAccepted, true);
assert.equal(accepted.selectedSnapshot, goodCandidate);

const currentStatus = getManagedApiPricingRefreshStatus({
  snapshot: MANAGED_API_PRICING_SNAPSHOT,
  asOf: new Date("2026-09-20T00:00:00Z"),
});
assert.equal(currentStatus.state, "CURRENT");
assert.equal(currentStatus.stale, false);

const staleStatus = getManagedApiPricingRefreshStatus({
  snapshot: MANAGED_API_PRICING_SNAPSHOT,
  asOf: new Date("2026-10-10T00:00:00Z"),
});
assert.equal(staleStatus.state, "STALE");
assert.equal(staleStatus.stale, true);

console.log("IE-6.7 managed API pricing refresh architecture verified.");
