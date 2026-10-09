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

const changed = calculateSoftwareStack({
  ...inputs,
  components: inputs.components.map((component) => component.id === "platform" ? { ...component, annualUnitPrice: 3000 } : component),
});
const fingerprintB = softwareStackFingerprint(changed);
assert.notEqual(fingerprintA, fingerprintB, "price changes must alter the software fingerprint");

console.log("Phase 2 Wave 3B software write-back verification: PASS");
