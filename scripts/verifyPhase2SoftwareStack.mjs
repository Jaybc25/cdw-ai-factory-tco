import assert from "node:assert/strict";
import { LICENSE_MODE, SOFTWARE_TCO_TREATMENT, calculateSoftwareStack, validateSoftwareStackInputs } from "../src/softwareStackEngine.js";
import { buildSoftwareStackWritebackBundle } from "../src/softwareStackWriteback.js";
import { PHASE2_SOURCE } from "../src/phase2Contract.js";

const inputs = {
  horizonYears: 3,
  annualEscalationPct: 3,
  components: [
    {
      id: "platform",
      category: "platform",
      name: "AI enterprise platform",
      mode: LICENSE_MODE.COMMERCIAL,
      unit: "GPU",
      quantity: 16,
      annualUnitPrice: 2500,
      annualOpsCost: 6000,
      oneTimeCost: 8000,
      supportPct: 15,
      entitlementNotes: "3-year quote",
      priceSource: PHASE2_SOURCE.QUOTE,
      tcoTreatment: SOFTWARE_TCO_TREATMENT.ADDITIVE,
    },
    {
      id: "orchestration",
      category: "orchestration",
      name: "Cluster orchestration",
      mode: LICENSE_MODE.OPEN_SOURCE,
      unit: "GPU",
      quantity: 16,
      annualUnitPrice: 0,
      annualOpsCost: 18000,
      oneTimeCost: 12000,
      supportPct: 0,
      entitlementNotes: "community + internal operations",
      priceSource: PHASE2_SOURCE.EST,
      tcoTreatment: SOFTWARE_TCO_TREATMENT.ADDITIVE,
    },
  ],
};

const validation = validateSoftwareStackInputs(inputs);
assert.equal(validation.valid, true);

const result = calculateSoftwareStack(inputs);
assert.equal(result.horizonYears, 3);
assert.ok(result.totals.license > 0, "Commercial software must create license cost");
assert.ok(result.totals.operations > 0, "Operational/admin cost must remain explicit");
assert.ok(result.totals.implementation > 0, "Implementation cost must be recognized in Year 1");
assert.equal(result.yearlyTotals.length, 3);

const openSourceRow = result.rows.find((row) => row.id === "orchestration");
assert.equal(openSourceRow.yearly[0].license, 0, "Open-source license may be $0");
assert.ok(openSourceRow.yearly[0].operations > 0, "Open-source operating effort must remain non-zero in this fixture");

const bundle = buildSoftwareStackWritebackBundle(result, inputs);
assert.ok(bundle.fingerprint, "Accepted software bundle must carry a fingerprint");
assert.equal(bundle.costResolved, true);
assert.equal(bundle.phase1OverlapResolved, true);
assert.equal(bundle.overrides.length, 3, "One annual TCO override is expected per planning year when commercial pricing and Phase 1 overlap are resolved");
const platformRow = bundle.requirements.rows.find((row) => row.id === "platform");
assert.equal(platformRow.priceSource, PHASE2_SOURCE.QUOTE, "Selected source provenance must survive calculation and writeback");
assert.equal(platformRow.provenance.source, PHASE2_SOURCE.QUOTE);
assert.equal(platformRow.tcoTreatment, SOFTWARE_TCO_TREATMENT.ADDITIVE);
assert.equal(bundle.aggregatePricingMixed, true, "Mixed row sources must be visible at the aggregate bundle level");
assert.deepEqual(bundle.aggregatePricingSources, [PHASE2_SOURCE.EST, PHASE2_SOURCE.QUOTE]);
assert.equal(bundle.costStatus, PHASE2_SOURCE.EST, "Mixed aggregate pricing must not falsely claim QUOTE/CUSTOMER/LISTED provenance");
assert.equal(bundle.overrides[0].provenance.source, PHASE2_SOURCE.EST);
assert.match(bundle.overrides[0].provenance.label, /mixed \(EST, QUOTE\)/i);

const quoteOnlyInputs = {
  horizonYears: 2,
  annualEscalationPct: 0,
  components: [{
    id: "quoted-platform",
    category: "platform",
    name: "Quoted platform",
    mode: LICENSE_MODE.COMMERCIAL,
    unit: "GPU",
    quantity: 8,
    annualUnitPrice: 1000,
    annualOpsCost: 5000,
    oneTimeCost: 2500,
    supportPct: 10,
    entitlementNotes: "quote-backed",
    priceSource: PHASE2_SOURCE.QUOTE,
    tcoTreatment: SOFTWARE_TCO_TREATMENT.ADDITIVE,
  }],
};
const quoteOnlyBundle = buildSoftwareStackWritebackBundle(calculateSoftwareStack(quoteOnlyInputs), quoteOnlyInputs);
assert.equal(quoteOnlyBundle.aggregatePricingMixed, false);
assert.deepEqual(quoteOnlyBundle.aggregatePricingSources, [PHASE2_SOURCE.QUOTE]);
assert.equal(quoteOnlyBundle.costStatus, PHASE2_SOURCE.QUOTE);
assert.equal(quoteOnlyBundle.overrides[0].provenance.source, PHASE2_SOURCE.QUOTE, "Single-source aggregate should inherit that source");

const unresolvedInputs = {
  horizonYears: 3,
  annualEscalationPct: 0,
  components: [{ id: "commercial-zero", name: "Unresolved commercial", category: "platform", mode: LICENSE_MODE.COMMERCIAL, unit: "GPU", quantity: 8, annualUnitPrice: 0, annualOpsCost: 0, oneTimeCost: 0, supportPct: 0, priceSource: PHASE2_SOURCE.EST, tcoTreatment: SOFTWARE_TCO_TREATMENT.ADDITIVE }],
};
const unresolved = calculateSoftwareStack(unresolvedInputs);
assert.ok(unresolved.warnings.some((warning) => warning.includes("$0 unit price")));
const unresolvedBundle = buildSoftwareStackWritebackBundle(unresolved, unresolvedInputs);
assert.equal(unresolvedBundle.costResolved, false, "Unpriced commercial software must remain unresolved");
assert.equal(unresolvedBundle.overrides.length, 0, "Unresolved commercial software must not create zero-dollar annual TCO overrides");
assert.deepEqual(unresolvedBundle.unresolvedCommercialComponents, ["Unresolved commercial"]);
assert.match(unresolvedBundle.requirements.costNote, /no annual TCO overrides are eligible/i);

const implicitOverlapInputs = {
  horizonYears: 3,
  annualEscalationPct: 0,
  components: [{ id: "implicit-overlap", name: "Implicit overlap", category: "orchestration", mode: LICENSE_MODE.OPEN_SOURCE, unit: "GPU", quantity: 8, annualUnitPrice: 0, annualOpsCost: 12000, oneTimeCost: 0, supportPct: 0, priceSource: PHASE2_SOURCE.EST }],
};
const implicitOverlapResult = calculateSoftwareStack(implicitOverlapInputs);
assert.equal(implicitOverlapResult.rows[0].tcoTreatment, SOFTWARE_TCO_TREATMENT.REVIEW_REQUIRED, "Missing overlap classification must default to review-required");
const implicitOverlapBundle = buildSoftwareStackWritebackBundle(implicitOverlapResult, implicitOverlapInputs);
assert.equal(implicitOverlapBundle.phase1OverlapResolved, false);
assert.equal(implicitOverlapBundle.overrides.length, 0, "Review-required overlap must block all Software TCO overrides");

const blankValidation = validateSoftwareStackInputs({
  horizonYears: "",
  annualEscalationPct: "",
  components: [{ id: "blank", name: "Blank inputs", category: "platform", mode: LICENSE_MODE.COMMERCIAL, unit: "GPU", quantity: "", annualUnitPrice: "", annualOpsCost: "", oneTimeCost: "", supportPct: "", priceSource: PHASE2_SOURCE.EST, tcoTreatment: SOFTWARE_TCO_TREATMENT.REVIEW_REQUIRED }],
});
assert.equal(blankValidation.valid, false, "Blank required Software numeric fields must not coerce to zero and pass validation");
assert.ok(blankValidation.errors.some((error) => error.includes("Planning horizon")));
assert.ok(blankValidation.errors.some((error) => error.includes("quantity cannot be blank")));
assert.ok(blankValidation.errors.some((error) => error.includes("unit price cannot be blank")));

console.log("Phase 2 Software Stack verification passed");
