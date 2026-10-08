import assert from "node:assert/strict";
import { LICENSE_MODE, calculateSoftwareStack, validateSoftwareStackInputs } from "../src/softwareStackEngine.js";
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
assert.equal(bundle.overrides.length, 3, "One annual TCO override is expected per planning year when commercial pricing is resolved");
const platformRow = bundle.requirements.rows.find((row) => row.id === "platform");
assert.equal(platformRow.priceSource, PHASE2_SOURCE.QUOTE, "Selected source provenance must survive calculation and writeback");
assert.equal(platformRow.provenance.source, PHASE2_SOURCE.QUOTE);

const unresolvedInputs = {
  horizonYears: 3,
  annualEscalationPct: 0,
  components: [{ id: "commercial-zero", name: "Unresolved commercial", category: "platform", mode: LICENSE_MODE.COMMERCIAL, unit: "GPU", quantity: 8, annualUnitPrice: 0, annualOpsCost: 0, oneTimeCost: 0, supportPct: 0, priceSource: PHASE2_SOURCE.EST }],
};
const unresolved = calculateSoftwareStack(unresolvedInputs);
assert.ok(unresolved.warnings.some((warning) => warning.includes("$0 unit price")));
const unresolvedBundle = buildSoftwareStackWritebackBundle(unresolved, unresolvedInputs);
assert.equal(unresolvedBundle.costResolved, false, "Unpriced commercial software must remain unresolved");
assert.equal(unresolvedBundle.overrides.length, 0, "Unresolved commercial software must not create zero-dollar annual TCO overrides");
assert.deepEqual(unresolvedBundle.unresolvedCommercialComponents, ["Unresolved commercial"]);
assert.match(unresolvedBundle.requirements.costNote, /no annual TCO overrides are eligible/i);

console.log("Phase 2 Software Stack verification passed");
