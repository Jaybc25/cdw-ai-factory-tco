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
  coloMonthlyBundle: "",
  coolingType: "air-containment",
  coolingCapability: "air-capable",
  availableKwPerRack: 80,
  totalFacilityKwAvailable: 400,
  rackPositionsAvailable: 20,
};

const result = calculatePowerPlanner(base);
const validation = validatePowerPlannerInputs(result);
assert.equal(validation.valid, true);
assert.equal(result.economics.facilityCostResolved, true);

const bundle = buildPowerPlannerWritebackBundle(result, { systemName: "DGX B200" });
assert.equal(bundle.costResolved, true);
assert.equal(bundle.overrides.length, 2);
assert.equal(bundle.overrides[0].target, "tco.power.energy.monthly");
assert.equal(bundle.overrides[1].target, "tco.power.facilityBurden.monthly");
assert.equal(bundle.overrides.every(phase2OverrideCanWriteBack), true);
assert.equal(bundle.requirements.systemName, "DGX B200");
assert.equal(bundle.requirements.racks.total, result.racks.total);
assert.equal(bundle.requirements.power.designItKw, result.power.designItKw);
assert.equal(bundle.requirements.cooling.coolingTons, result.cooling.coolingTons);
assert.equal(bundle.requirements.facilityCostStatus, "CUSTOMER");

const unresolvedOwned = calculatePowerPlanner({ ...base, ownedFacilityBurdenPerKwMonth: "" });
const unresolvedOwnedValidation = validatePowerPlannerInputs(unresolvedOwned);
assert.equal(unresolvedOwnedValidation.valid, true, "Physical Power requirement remains stageable with unresolved facility cost");
assert.equal(unresolvedOwned.economics.monthlyFacilityBurden, null);
assert.equal(unresolvedOwned.economics.facilityCostResolved, false);
assert.ok(unresolvedOwnedValidation.warnings.some((x) => x.includes("facility economics remain unresolved")));
const unresolvedOwnedBundle = buildPowerPlannerWritebackBundle(unresolvedOwned, { systemName: "DGX B200" });
assert.equal(unresolvedOwnedBundle.costResolved, false);
assert.equal(unresolvedOwnedBundle.costStatus, "UNRESOLVED");
assert.equal(unresolvedOwnedBundle.overrides.length, 1, "Unresolved facility burden must not become a $0 TCO override");
assert.equal(unresolvedOwnedBundle.overrides[0].target, "tco.power.energy.monthly");
assert.equal(unresolvedOwnedBundle.requirements.facilityCostStatus, "UNRESOLVED");

const invalid = calculatePowerPlanner({ ...base, designKwPerSystem: 10, avgKwPerSystem: 14.4 });
assert.equal(validatePowerPlannerInputs(invalid).valid, false);
assert.throws(() => buildPowerPlannerWritebackBundle(invalid, { systemName: "DGX B200" }), /Cannot stage Power Planner write-back/);

const unresolvedColo = calculatePowerPlanner({ ...base, facilityBranch: "colocation", coloMonthlyBundle: "" });
const unresolvedColoBundle = buildPowerPlannerWritebackBundle(unresolvedColo, { systemName: "DGX B200" });
assert.equal(unresolvedColoBundle.costResolved, false);
assert.equal(unresolvedColoBundle.overrides.length, 1);
assert.equal(unresolvedColoBundle.requirements.facilityCostStatus, "UNRESOLVED");

const colo = calculatePowerPlanner({ ...base, facilityBranch: "colocation", coloMonthlyBundle: 50000 });
const coloBundle = buildPowerPlannerWritebackBundle(colo, { systemName: "DGX B200" });
assert.equal(coloBundle.costResolved, true);
assert.equal(coloBundle.overrides[1].provenance.source, "QUOTE");
assert.equal(coloBundle.overrides[1].provenance.derivation, "DIRECT");
assert.equal(coloBundle.overrides[1].value, 50000);
assert.equal(coloBundle.requirements.facilityCostStatus, "QUOTE");

console.log("Phase 2 Power Planner write-back verification passed");
