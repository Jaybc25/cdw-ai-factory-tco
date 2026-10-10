import assert from "node:assert/strict";
import {
  PHASE2_SOURCE,
  PHASE2_DERIVATION,
  PHASE2_STATE,
  PHASE2_TCO_TREATMENT,
  PHASE2_REPLACEMENT_STATUS,
  createPhase2Override,
  evaluatePhase2Override,
  fingerprintInputs,
  makePhase2TcoTreatment,
  makeProvenance,
  markPhase2OverrideCurrent,
  phase2OverrideCanApplyToTco,
  phase2OverrideCanWriteBack,
  recomputePhase2Override,
  revertPhase2Override,
  validatePhase2Override,
} from "../src/phase2Contract.js";

const provenance = makeProvenance({
  source: PHASE2_SOURCE.CUSTOMER,
  derivation: PHASE2_DERIVATION.CALCULATED,
  asOf: "2026-10-08",
  label: "Customer utility bill + PUE",
});

const dependencies = {
  systems: 8,
  designKwPerSystem: 14.4,
  pue: 1.35,
  utilityRatePerKwh: 0.11,
};

const sameShapeDifferentOrder = {
  utilityRatePerKwh: 0.11,
  pue: 1.35,
  designKwPerSystem: 14.4,
  systems: 8,
};

assert.equal(
  fingerprintInputs(dependencies),
  fingerprintInputs(sameShapeDifferentOrder),
  "fingerprints must be stable regardless of object key order",
);

const replacementTreatment = makePhase2TcoTreatment({
  mode: PHASE2_TCO_TREATMENT.REPLACE_PHASE1,
  phase1LineFamily: "power-energy",
  note: "Refines Phase 1 power energy",
});
assert.equal(replacementTreatment.replacementStatus, PHASE2_REPLACEMENT_STATUS.PENDING_LINE_MAP);
assert.equal(replacementTreatment.additiveAllowed, false);

const override = createPhase2Override({
  id: "power.energy.monthly",
  target: "tco.power.energy.monthly",
  value: 8304,
  unit: "USD/month",
  sourceTool: "power-planner",
  provenance,
  dependencies,
  referenceValue: 12000,
  tcoTreatment: replacementTreatment,
  createdAt: "2026-10-08T12:00:00.000Z",
});

assert.equal(override.state, PHASE2_STATE.CURRENT);
assert.equal(validatePhase2Override(override).valid, true);
assert.equal(phase2OverrideCanWriteBack(override), true, "current replacement can participate in Phase 2 planning comparisons");
assert.equal(phase2OverrideCanApplyToTco(override), false, "replacement must not apply to TCO until exact Phase 1 line mapping exists");

const noTreatmentOverride = createPhase2Override({
  id: "legacy.current.no-treatment",
  target: "tco.legacy.monthly",
  value: 1234,
  unit: "USD/month",
  sourceTool: "legacy-phase2-fixture",
  provenance,
  dependencies,
  createdAt: "2026-10-08T12:00:00.000Z",
});
assert.equal(phase2OverrideCanWriteBack(noTreatmentOverride), true, "missing treatment may remain visible inside the Phase 2 planning envelope");
assert.equal(phase2OverrideCanApplyToTco(noTreatmentOverride), false, "missing TCO treatment must fail closed for production application");
assert.equal(phase2OverrideCanApplyToTco({ ...noTreatmentOverride, tcoTreatment: { mode: "UNKNOWN" } }), false, "invalid TCO treatment must also fail closed");

const additiveOverride = {
  ...noTreatmentOverride,
  tcoTreatment: makePhase2TcoTreatment({ mode: PHASE2_TCO_TREATMENT.ADDITIVE }),
};
assert.equal(phase2OverrideCanApplyToTco(additiveOverride), true, "explicit additive/current override may apply to TCO");

const comparisonOnlyOverride = {
  ...noTreatmentOverride,
  tcoTreatment: makePhase2TcoTreatment({ mode: PHASE2_TCO_TREATMENT.COMPARISON_ONLY }),
};
assert.equal(phase2OverrideCanApplyToTco(comparisonOnlyOverride), false, "comparison-only override must never apply to TCO");

const mappedOverride = {
  ...override,
  tcoTreatment: {
    ...override.tcoTreatment,
    replacementStatus: PHASE2_REPLACEMENT_STATUS.MAPPED,
  },
};
assert.equal(phase2OverrideCanApplyToTco(mappedOverride), true, "mapped/current replacement becomes eligible to apply to TCO");

const unchanged = evaluatePhase2Override(override, sameShapeDifferentOrder);
assert.equal(unchanged.state, PHASE2_STATE.CURRENT, "equivalent inputs must remain CURRENT");

const stale = evaluatePhase2Override(
  override,
  { ...dependencies, utilityRatePerKwh: 0.13 },
  "Utility rate changed",
);
assert.equal(stale.state, PHASE2_STATE.STALE);
assert.equal(stale.staleReason, "Utility rate changed");
assert.equal(phase2OverrideCanWriteBack(stale), false, "STALE values must not write back");
assert.equal(phase2OverrideCanApplyToTco(stale), false);
assert.equal(stale.value, override.value, "stale evaluation must preserve the prior visible value");

const staleMarkedCurrent = markPhase2OverrideCurrent(stale);
assert.equal(staleMarkedCurrent.state, PHASE2_STATE.STALE, "STALE values must not be promoted back to CURRENT without recompute");
assert.equal(staleMarkedCurrent.staleReason, "Utility rate changed");
assert.equal(phase2OverrideCanWriteBack(staleMarkedCurrent), false);

const recomputed = recomputePhase2Override(stale, {
  value: 9814,
  dependencies: { ...dependencies, utilityRatePerKwh: 0.13 },
  computedAt: "2026-10-08T12:05:00.000Z",
});
assert.equal(recomputed.state, PHASE2_STATE.RECOMPUTED);
assert.equal(recomputed.staleReason, null);
assert.equal(recomputed.value, 9814);
assert.equal(phase2OverrideCanWriteBack(recomputed), true);
assert.equal(phase2OverrideCanApplyToTco(recomputed), false, "recompute does not bypass pending Phase 1 mapping");

const recomputedMarkedCurrent = markPhase2OverrideCurrent(recomputed);
assert.equal(recomputedMarkedCurrent.state, PHASE2_STATE.CURRENT, "A recomputed value may be acknowledged as CURRENT");
assert.equal(phase2OverrideCanWriteBack(recomputedMarkedCurrent), true);

const reverted = revertPhase2Override(recomputed, "2026-10-08T12:06:00.000Z");
assert.equal(reverted.state, PHASE2_STATE.REVERTED);
assert.equal(phase2OverrideCanWriteBack(reverted), false);
assert.equal(phase2OverrideCanApplyToTco(reverted), false);
assert.equal(reverted.referenceValue, 12000);
assert.equal(markPhase2OverrideCurrent(reverted).state, PHASE2_STATE.REVERTED, "REVERTED values must stay reverted");

assert.throws(
  () => makeProvenance({ source: "CUSTOM", derivation: PHASE2_DERIVATION.DIRECT }),
  /Invalid Phase 2 provenance source/,
);
assert.throws(
  () => makePhase2TcoTreatment({ mode: PHASE2_TCO_TREATMENT.REPLACE_PHASE1 }),
  /phase1LineFamily/,
);

console.log("Phase 2 contract verification: PASS");
