import assert from "node:assert/strict";
import { calculatePowerPlanner } from "../src/powerPlannerEngine.js";

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
assert.equal(base.racks.total, 6);
assert.equal(base.power.computeAvgKw, 115.2);
assert.equal(base.power.computeDesignKw, 128);
assert.equal(base.power.designItKw, 150);
assert.equal(base.power.facilityDesignKw, 202.5);
assert.equal(base.power.computeRackDesignKw, 32);
assert.ok(Math.abs(base.cooling.heatBtuPerHour - 511800) < 0.001);
assert.ok(Math.abs(base.cooling.coolingTons - 42.65) < 0.01);
assert.ok(Math.abs(base.economics.monthlyKwh - (137.2 * 1.35 * 730)) < 0.001);
assert.equal(base.verdict, "fits-as-is");
assert.equal(base.siteCheck.complete, true);
assert.equal(base.flags.length, 0);

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
