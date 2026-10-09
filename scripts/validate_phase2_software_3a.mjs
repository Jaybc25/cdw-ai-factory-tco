import assert from "node:assert/strict";
import { LICENSE_MODE, calculateSoftwareStack, validateSoftwareStackInputs } from "../src/softwareStackEngine.js";

const inputs = {
  horizonYears: 3,
  annualEscalationPct: 3,
  components: [
    { id: "commercial", category: "platform", name: "Commercial platform", mode: LICENSE_MODE.COMMERCIAL, unit: "GPU", quantity: 16, annualUnitPrice: 2500, supportPct: 15, annualOpsCost: 6000, oneTimeCost: 8000 },
    { id: "oss", category: "mlops", name: "OSS MLOps", mode: LICENSE_MODE.OPEN_SOURCE, unit: "node", quantity: 4, annualUnitPrice: 0, supportPct: 0, annualOpsCost: 12000, oneTimeCost: 6000 },
  ],
};

const validation = validateSoftwareStackInputs(inputs);
assert.equal(validation.valid, true);

const result = calculateSoftwareStack(inputs);
assert.equal(result.rows.length, 2);
assert.equal(result.yearlyTotals.length, 3);
assert.ok(result.totals.license > 0, "commercial component should create license cost");
assert.ok(result.totals.operations > 0, "open-source component should retain operating cost");
assert.ok(result.totals.implementation > 0, "one-time implementation should appear in Year 1");
assert.ok(result.totals.total > result.totals.license, "software TCO should include more than license alone");

const ossZeroOps = calculateSoftwareStack({
  horizonYears: 3,
  annualEscalationPct: 0,
  components: [{ id: "oss", category: "orchestration", name: "Open stack", mode: LICENSE_MODE.OPEN_SOURCE, unit: "GPU", quantity: 8, annualUnitPrice: 0, supportPct: 0, annualOpsCost: 0, oneTimeCost: 0 }],
});
assert.ok(ossZeroOps.warnings.some((warning) => warning.includes("$0 operating/admin cost")), "must warn when open source is modeled as operationally free");

const unresolved = validateSoftwareStackInputs({
  horizonYears: 3,
  components: [{ id: "c", name: "Commercial unresolved", mode: LICENSE_MODE.COMMERCIAL, quantity: 1, annualUnitPrice: 0, oneTimeCost: 0, annualOpsCost: 0, supportPct: 0 }],
});
assert.ok(unresolved.warnings.some((warning) => warning.includes("commercial price is unresolved")));

console.log("Wave 3A software validation passed");
