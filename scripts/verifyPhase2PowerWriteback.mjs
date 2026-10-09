import assert from "node:assert/strict";
import { calculatePowerPlanner } from "../src/powerPlannerEngine.js";
import { buildPowerPlannerWritebackBundle, validatePowerPlannerInputs } from "../src/powerPlannerWriteback.js";
import { phase2OverrideCanWriteBack } from "../src/phase2Contract.js";

const base = {
  systemCount: 8,
  avgKwPerSystem: 14.4,
  designKwPerSystem: 16,
  systemsPerRack: 2,
  storagePb: 1,
  storageKwPerPb: 10,
  storageRacks: 1,
  provisionalNetworkKw: 12,
  networkRacks: 1,
  pue: 1.35,
  utilityRatePerKwh: 0.11,
  facilityBranch: "owned-dc",
  ownedFacilityBurdenPerKwMonth: 200,
  coloMonthlyBundle: 0,
  coolingType: "air-containment",
  coolingCapability: "air-capable",
  availableKwPerRack: 80,
  totalFacilityKwAvailable: 400,
  rackPositionsAvailable: 20,
};

const result = calculatePowerPlanner(base);
const validation = validatePowerPlannerInputs(result);
assert.equal(validation.valid, true);

const bundle = buildPowerPlannerWritebackBundle(result, { systemName: "DGX B200" });
assert.equal(bundle.overrides.length, 2);
assert.equal(bundle.overrides[0].target, "tco.power.energy.monthly");
assert.equal(bundle.overrides[1].target, "tco.power.facilityBurden.monthly");
assert.equal(bundle.overrides.every(phase2OverrideCanWriteBack), true);
assert.equal(bundle.requirements.systemName, "DGX B200");
assert.equal(bundle.requirements.racks.total, result.racks.total);
assert.equal(bundle.requirements.power.designItKw, result.power.designItKw);
assert.equal(bundle.requirements.cooling.coolingTons, result.cooling.coolingTons);

const invalid = calculatePowerPlanner({ ...base, designKwPerSystem: 10, avgKwPerSystem: 14.4 });
assert.equal(validatePowerPlannerInputs(invalid).valid, false);
assert.throws(() => buildPowerPlannerWritebackBundle(invalid, { systemName: "DGX B200" }), /Cannot stage Power Planner write-back/);

const colo = calculatePowerPlanner({ ...base, facilityBranch: "colocation", coloMonthlyBundle: 50000 });
const coloBundle = buildPowerPlannerWritebackBundle(colo, { systemName: "DGX B200" });
assert.equal(coloBundle.overrides[1].provenance.source, "QUOTE");
assert.equal(coloBundle.overrides[1].provenance.derivation, "DIRECT");
assert.equal(coloBundle.overrides[1].value, 50000);

console.log("Phase 2 Power Planner write-back verification passed");
