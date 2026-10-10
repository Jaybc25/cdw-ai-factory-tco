import assert from "node:assert/strict";
import { calculatePowerPlanner } from "../src/powerPlannerEngine.js";
import { validatePowerPlannerInputs } from "../src/powerPlannerWriteback.js";

const base = calculatePowerPlanner({
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
  coolingType: "air-containment",
  coolingCapability: "air-capable",
  availableKwPerRack: 40,
  totalFacilityKwAvailable: 400,
  rackPositionsAvailable: 20,
});

assert.equal(base.racks.compute, 4);
assert.equal(base.racks.network, 1);
assert.equal(base.racks.total, 6);
assert.equal(base.racks.footprintComplete, true);
assert.equal(base.power.computeAvgKw, 115.2);
assert.equal(base.power.computeDesignKw, 128);
assert.equal(base.power.designItKw, 150);
assert.equal(base.power.facilityDesignKw, 202.5);
assert.equal(base.power.computeRackDesignKw, 32);
assert.equal(base.networkPower.acceptedFabricPower, false);
assert.equal(base.networkPower.totalKw, 12);
assert.ok(Math.abs(base.cooling.heatBtuPerHour - 511800) < 0.001);
assert.ok(Math.abs(base.cooling.coolingTons - 42.65) < 0.01);
assert.ok(Math.abs(base.economics.monthlyKwh - (137.2 * 1.35 * 730)) < 0.001);
assert.equal(base.verdict, "fits-as-is");
assert.equal(base.siteCheck.complete, true);
assert.equal(base.flags.length, 0);
assert.equal(validatePowerPlannerInputs(base).valid, true);

const blankPue = calculatePowerPlanner({ ...base.inputs, storageRacks: 1, pue: "" });
assert.equal(blankPue.inputs.pueProvided, false, "blank PUE must remain distinguishable from an explicit 1.0");
assert.equal(blankPue.inputs.pue, 1, "display math may use 1.0 as a non-accepted placeholder");
assert.equal(validatePowerPlannerInputs(blankPue).valid, false, "blank PUE must block acceptance");
assert.ok(validatePowerPlannerInputs(blankPue).errors.some((x) => x.includes("PUE is required")));

const zeroedBlankPue = calculatePowerPlanner({ ...base.inputs, storageRacks: 1, pue: 0 });
assert.equal(zeroedBlankPue.inputs.pueProvided, false, "Number('') style zero coercion must not make PUE look supplied");
assert.equal(validatePowerPlannerInputs(zeroedBlankPue).valid, false);

const blankUtility = calculatePowerPlanner({ ...base.inputs, storageRacks: 1, utilityRatePerKwh: "" });
assert.equal(blankUtility.inputs.utilityRateProvided, false, "blank utility rate must remain unresolved");
assert.equal(blankUtility.economics.monthlyEnergyCost, 0, "placeholder math may be zero but cannot be accepted");
assert.equal(validatePowerPlannerInputs(blankUtility).valid, false, "blank utility rate must block a $0 energy override");
assert.ok(validatePowerPlannerInputs(blankUtility).errors.some((x) => x.includes("Utility rate is required")));

const zeroedBlankUtility = calculatePowerPlanner({ ...base.inputs, storageRacks: 1, utilityRatePerKwh: 0 });
assert.equal(zeroedBlankUtility.inputs.utilityRateProvided, false, "Number('') style zero coercion must not make utility rate look supplied");
assert.equal(validatePowerPlannerInputs(zeroedBlankUtility).valid, false);

const acceptedFabric = calculatePowerPlanner({
  ...base.inputs,
  storageRacks: 1,
  networkRacks: 2,
  provisionalNetworkKw: 12,
  fabricSwitchPowerKw: 4.5,
  managementHeadNodeKw: 3.5,
});
assert.equal(acceptedFabric.networkPower.acceptedFabricPower, true);
assert.equal(acceptedFabric.networkPower.switchKw, 4.5);
assert.equal(acceptedFabric.networkPower.managementHeadNodeKw, 3.5);
assert.equal(acceptedFabric.networkPower.totalKw, 8);
assert.equal(acceptedFabric.racks.network, 2);
assert.equal(acceptedFabric.racks.total, 7);
assert.equal(acceptedFabric.power.networkKw, 8);
assert.equal(acceptedFabric.power.designItKw, 146, "Accepted Fabric switch power must add to, not erase, management/head-node power");

const acceptedFabricMissingManagement = calculatePowerPlanner({
  ...base.inputs,
  storageRacks: 1,
  networkRacks: 1,
  fabricSwitchPowerKw: 4.5,
  managementHeadNodeKw: "",
});
assert.equal(acceptedFabricMissingManagement.networkPower.totalKw, 4.5);
assert.ok(acceptedFabricMissingManagement.flags.some((f) => f.includes("management/head-node allowance is 0 kW")));

const unresolvedNetworkRackFootprint = calculatePowerPlanner({
  ...base.inputs,
  networkRacks: "",
});
assert.equal(unresolvedNetworkRackFootprint.racks.network, null);
assert.equal(unresolvedNetworkRackFootprint.racks.total, null);
assert.equal(unresolvedNetworkRackFootprint.racks.footprintComplete, false);
assert.equal(unresolvedNetworkRackFootprint.siteCheck.complete, false);
assert.equal(unresolvedNetworkRackFootprint.verdict, "partial-check", "Missing network rack footprint must block FITS AS-IS");
assert.ok(unresolvedNetworkRackFootprint.flags.some((f) => f.includes("Network rack footprint is unresolved")));

const requirementOnly = calculatePowerPlanner({
  ...base.inputs,
  storageRacks: 1,
  networkRacks: 1,
  availableKwPerRack: "",
  totalFacilityKwAvailable: "",
  rackPositionsAvailable: "",
});
assert.equal(requirementOnly.verdict, "requirement-only", "No customer site-capacity data must not produce a green fit verdict");
assert.equal(requirementOnly.siteCheck.complete, false);

const partial = calculatePowerPlanner({
  ...base.inputs,
  storageRacks: 1,
  networkRacks: 1,
  availableKwPerRack: 40,
  totalFacilityKwAvailable: "",
  rackPositionsAvailable: "",
});
assert.equal(partial.verdict, "partial-check", "One site input is not enough for FITS AS-IS");
assert.ok(partial.flags.some((f) => f.includes("partially checked")));

const constrained = calculatePowerPlanner({
  ...base.inputs,
  storageRacks: 1,
  networkRacks: 1,
  availableKwPerRack: 20,
});
assert.equal(constrained.verdict, "retrofit");
assert.ok(constrained.flags.some((f) => f.includes("exceeds stated rack capacity")));

const liquidMismatch = calculatePowerPlanner({
  systemCount: 1,
  avgKwPerSystem: 120,
  designKwPerSystem: 130,
  systemsPerRack: 1,
  storagePb: 0,
  provisionalNetworkKw: 5,
  networkRacks: 1,
  pue: 1.2,
  utilityRatePerKwh: 0.1,
  facilityBranch: "owned-dc",
  ownedFacilityBurdenPerKwMonth: 200,
  coolingType: "air-containment",
  coolingCapability: "liquid-only",
});
assert.equal(liquidMismatch.verdict, "retrofit");
assert.ok(liquidMismatch.flags.some((f) => f.includes("requires liquid cooling")));

const colo = calculatePowerPlanner({
  systemCount: 2,
  avgKwPerSystem: 14.4,
  designKwPerSystem: 16,
  systemsPerRack: 2,
  storagePb: 0,
  provisionalNetworkKw: 4,
  networkRacks: 1,
  pue: 1.2,
  utilityRatePerKwh: 0.1,
  facilityBranch: "colocation",
  coloMonthlyBundle: 25000,
  coolingType: "direct-liquid",
  coolingCapability: "air-capable",
});
assert.equal(colo.verdict, "colocation");
assert.equal(colo.economics.monthlyFacilityBurden, 25000);

console.log("Phase 2 Power Planner verification passed");
