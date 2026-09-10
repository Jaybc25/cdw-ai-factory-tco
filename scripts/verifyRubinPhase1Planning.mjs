import { RUBIN_PHASE1_PLANNING_MODEL, PHASE1_REFERENCE_RATIOS, selectedRubinSoftwareCost } from "../src/rubinPhase1PlanningModel.js";
import { getRubinTcoCommercialSystem } from "../src/rubinTcoCommercialRegistry.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const nvl8 = RUBIN_PHASE1_PLANNING_MODEL["DGX Rubin NVL8"];
const nvl72 = RUBIN_PHASE1_PLANNING_MODEL["DGX Vera Rubin NVL72"];
const c8 = getRubinTcoCommercialSystem("DGX Rubin NVL8");
const c72 = getRubinTcoCommercialSystem("DGX Vera Rubin NVL72");

assert(nvl8 && nvl72, "Expected both Rubin Phase 1 planning models.");
assert(PHASE1_REFERENCE_RATIOS.fabricPctOfHardware > 0.18 && PHASE1_REFERENCE_RATIOS.fabricPctOfHardware < 0.20, "Fabric reference ratio drifted outside expected B200 planning range.");
assert(PHASE1_REFERENCE_RATIOS.professionalServicesPctOfHardware > 0.05 && PHASE1_REFERENCE_RATIOS.professionalServicesPctOfHardware < 0.06, "PS reference ratio drifted outside expected B200 planning range.");

for (const model of [nvl8, nvl72]) {
  assert(model.fabricAllowance.confidence === "EST", `${model.hardwareListPrice}: fabric must remain EST.`);
  assert(model.fabricAllowance.editable === true, `${model.hardwareListPrice}: fabric estimate must remain editable.`);
  assert(model.professionalServicesAllowance.confidence === "EST", `${model.hardwareListPrice}: PS/install must remain EST.`);
  assert(model.professionalServicesAllowance.editable === true, `${model.hardwareListPrice}: PS/install estimate must remain editable.`);
  assert(model.highDensityInfrastructure.amount === null, `${model.hardwareListPrice}: do not invent high-density infrastructure CAPEX.`);
  assert(model.highDensityInfrastructure.confidence === "QUOTE", `${model.hardwareListPrice}: infrastructure should remain quote/customer supplied.`);
  assert(model.softwarePolicy.defaultSelection === "NONE", `${model.hardwareListPrice}: optional software must not be silently included.`);
}

assert(nvl8.phase1TcoReadiness === "PROVISIONAL", "Rubin NVL8 should be provisional for Phase 1 planning, not fully activated by this registry alone.");
assert(nvl72.phase1TcoReadiness === "BLOCKED_POWER", "Vera Rubin NVL72 must remain blocked on canonical power.");

assert(selectedRubinSoftwareCost(c8, "NONE") === 0, "NVL8 NONE software selection should cost $0.");
assert(selectedRubinSoftwareCost(c8, "NVAIE") === 108000, "NVL8 NVAIE selection drifted.");
assert(selectedRubinSoftwareCost(c8, "MISSION_CONTROL") === 96000, "NVL8 Mission Control selection drifted.");
assert(selectedRubinSoftwareCost(c8, "BOTH") === 204000, "NVL8 combined software selection drifted.");
assert(selectedRubinSoftwareCost(c72, "BOTH") === 1836000, "Vera Rubin combined software selection drifted.");

console.log("Rubin Phase 1 planning model verification passed.");
