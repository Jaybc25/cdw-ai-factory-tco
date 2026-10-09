import assert from "node:assert/strict";
import { POWER_PLANNER_SYSTEM_PROFILES, calculatePowerPlanner } from "../src/powerPlannerEngine.js";

const b200 = POWER_PLANNER_SYSTEM_PROFILES["DGX B200"];
assert.equal(b200.evidenceSource, "LISTED");
assert.equal(b200.reviewedAt, "2026-10-08");
assert.equal(b200.energyBasis, "LISTED MAX AS CONSERVATIVE ENERGY DEFAULT");
assert.equal(b200.designKwPerSystem, 14.3);
assert.equal(b200.avgKwPerSystem, 14.3);
assert.equal(b200.designProvenance.source, "LISTED");

const h200 = POWER_PLANNER_SYSTEM_PROFILES["DGX H200"];
assert.equal(h200.evidenceSource, "LISTED");
assert.equal(h200.reviewedAt, "2026-10-08");
assert.equal(h200.energyBasis, "LISTED MAX AS CONSERVATIVE ENERGY DEFAULT");
assert.equal(h200.designKwPerSystem, 10.2);
assert.equal(h200.coolingCapability, "air-capable");

const gb200 = POWER_PLANNER_SYSTEM_PROFILES["GB200 NVL72"];
assert.equal(gb200.evidenceSource, "LISTED");
assert.equal(gb200.reviewedAt, "2026-10-08");
assert.equal(gb200.energyBasis, "LISTED FULL-LOAD REFERENCE");
assert.equal(gb200.avgKwPerSystem, 120);
assert.equal(gb200.designKwPerSystem, 125);
assert.equal(gb200.systemsPerRack, 1);
assert.equal(gb200.coolingCapability, "liquid-only");

const result = calculatePowerPlanner({
  systemCount: 1,
  avgKwPerSystem: gb200.avgKwPerSystem,
  designKwPerSystem: gb200.designKwPerSystem,
  systemsPerRack: gb200.systemsPerRack,
  storagePb: 0,
  storageKwPerPb: 10,
  storageRacks: 0,
  provisionalNetworkKw: 0,
  networkRacks: 0,
  pue: 1.2,
  utilityRatePerKwh: 0.1,
  facilityBranch: "owned-dc",
  ownedFacilityBurdenPerKwMonth: 0,
  coloMonthlyBundle: 0,
  coolingType: "direct-liquid",
  coolingCapability: gb200.coolingCapability,
  availableKwPerRack: 125,
  totalFacilityKwAvailable: 150,
  rackPositionsAvailable: 1,
});

assert.equal(result.power.computeRackDesignKw, 125);
assert.equal(result.power.facilityDesignKw, 150);
assert.equal(result.verdict, "fits-as-is");
assert.ok(result.cooling.heatBtuPerHour > 426000 && result.cooling.heatBtuPerHour < 427000);
assert.ok(result.flags.some((x) => x.includes("Network/head-node power allowance")));
assert.match(result.methodology.energy, /energy-planning IT kW/i);

console.log("Phase 2 Wave 1C evidence verification passed.");