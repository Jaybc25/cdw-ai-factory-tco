import assert from "node:assert/strict";
import { calculateSoftwareStack, LICENSE_MODE } from "../src/softwareStackEngine.js";
import { buildSoftwareStackWritebackBundle, softwareStackFingerprint } from "../src/softwareStackWriteback.js";

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
      entitlementNotes: "planning assumption",
      priceSource: "EST",
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
      entitlementNotes: "open source with modeled operations",
      priceSource: "EST",
    },
  ],
};

const result = calculateSoftwareStack(inputs);
const fingerprintA = softwareStackFingerprint(result);
const bundle = buildSoftwareStackWritebackBundle(result, inputs);

assert.equal(bundle.overrides.length, 3, "one override per planning year");
assert.equal(bundle.overrides[0].unit, "USD/year");
assert.equal(bundle.overrides[0].target, "tco.software.year1.total");
assert.equal(bundle.requirements.rows.length, 2);
assert.equal(bundle.requirements.rows[0].priceSource, "EST");
assert.equal(bundle.requirements.rows[1].mode, LICENSE_MODE.OPEN_SOURCE);
assert.ok(bundle.requirements.totals.operations > 0, "open-source operating cost remains explicit");
assert.equal(bundle.fingerprint, fingerprintA);
assert.equal(bundle.fleet.totalGpus, 16, "consistent GPU-priced rows should establish a comparable Software fleet identity");

const changed = calculateSoftwareStack({
  ...inputs,
  components: inputs.components.map((component) => component.id === "platform" ? { ...component, annualUnitPrice: 3000 } : component),
});
const fingerprintB = softwareStackFingerprint(changed);
assert.notEqual(fingerprintA, fingerprintB, "price changes must alter the software fingerprint");

const mismatchedGpuQuantitiesInputs = {
  ...inputs,
  components: [
    { ...inputs.components[0], quantity: 16 },
    { ...inputs.components[1], quantity: 32 },
  ],
};
const mismatchedGpuQuantities = calculateSoftwareStack(mismatchedGpuQuantitiesInputs);
const mismatchedGpuBundle = buildSoftwareStackWritebackBundle(mismatchedGpuQuantities, mismatchedGpuQuantitiesInputs);
assert.equal(mismatchedGpuBundle.fleet.totalGpus, null, "conflicting GPU-priced row quantities must not invent a canonical Software fleet size");
assert.equal(mismatchedGpuBundle.costResolved, true, "fleet ambiguity is separate from pricing resolution");

const openSourceOnlyInputs = {
  horizonYears: 3,
  annualEscalationPct: 0,
  components: [
    {
      id: "oss-orchestration",
      category: "orchestration",
      name: "Open-source orchestration",
      mode: LICENSE_MODE.OPEN_SOURCE,
      unit: "GPU",
      quantity: 16,
      annualUnitPrice: 0,
      annualOpsCost: 24000,
      oneTimeCost: 10000,
      supportPct: 0,
      entitlementNotes: "No separate license; operating/admin effort modeled explicitly",
      priceSource: "CUSTOMER",
    },
  ],
};
const openSourceOnly = calculateSoftwareStack(openSourceOnlyInputs);
const openSourceOnlyBundle = buildSoftwareStackWritebackBundle(openSourceOnly, openSourceOnlyInputs);
assert.equal(openSourceOnlyBundle.costResolved, true, "$0 open-source license must remain resolved when operating economics are modeled");
assert.equal(openSourceOnlyBundle.unresolvedCommercialComponents.length, 0);
assert.equal(openSourceOnlyBundle.overrides.length, 3, "resolved open-source operating economics remain eligible for yearly TCO write-back");
assert.equal(openSourceOnlyBundle.requirements.totals.license, 0);
assert.equal(openSourceOnlyBundle.requirements.totals.operations, 72000);
assert.equal(openSourceOnlyBundle.requirements.totals.implementation, 10000);
assert.ok(openSourceOnlyBundle.requirements.totals.total > 0, "$0 license must not be interpreted as $0 software TCO");

console.log("Phase 2 Wave 3B software write-back verification: PASS");
