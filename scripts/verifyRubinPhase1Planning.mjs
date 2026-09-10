import { RUBIN_PHASE1_PLANNING_MODEL, PHASE1_REFERENCE_ANCHORS, selectedRubinSoftwareCost } from "../src/rubinPhase1PlanningModel.js";
import { getRubinTcoCommercialSystem } from "../src/rubinTcoCommercialRegistry.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const nvl8 = RUBIN_PHASE1_PLANNING_MODEL["DGX Rubin NVL8"];
const nvl72 = RUBIN_PHASE1_PLANNING_MODEL["DGX Vera Rubin NVL72"];
const c8 = getRubinTcoCommercialSystem("DGX Rubin NVL8");
const c72 = getRubinTcoCommercialSystem("DGX Vera Rubin NVL72");

assert(nvl8 && nvl72, "Expected both Rubin Phase 1 planning models.");
assert(PHASE1_REFERENCE_ANCHORS.eightGpuDgx.fabricAllowance === 91993, "8-GPU DGX fabric planning anchor drifted.");
assert(PHASE1_REFERENCE_ANCHORS.eightGpuDgx.professionalServicesAllowance === 25000, "8-GPU DGX PS planning anchor drifted.");
assert(PHASE1_REFERENCE_ANCHORS.nvl72.fabricAllowance === 1717074, "NVL72 fabric planning anchor drifted.");
assert(PHASE1_REFERENCE_ANCHORS.nvl72.professionalServicesAllowance === 55558, "NVL72 PS planning anchor drifted.");

for (const model of [nvl8, nvl72]) {
  assert(model.methodology === "PHASE1_ARCHITECTURE_CLASS_REFERENCE", `${model.hardwareListPrice}: expected architecture-class planning methodology.`);
  assert(model.fabricAllowance.confidence === "EST", `${model.hardwareListPrice}: fabric must remain EST.`);
  assert(model.fabricAllowance.editable === true, `${model.hardwareListPrice}: fabric estimate must remain editable.`);
  assert(model.professionalServicesAllowance.confidence === "EST", `${model.hardwareListPrice}: PS/install must remain EST.`);
  assert(model.professionalServicesAllowance.editable === true, `${model.hardwareListPrice}: PS/install estimate must remain editable.`);
  assert(model.highDensityInfrastructure.amount === null, `${model.hardwareListPrice}: do not invent high-density infrastructure CAPEX.`);
  assert(model.highDensityInfrastructure.confidence === "QUOTE", `${model.hardwareListPrice}: infrastructure should remain quote/customer supplied.`);
  assert(model.softwarePolicy.defaultSelection === "NONE", `${model.hardwareListPrice}: optional software must not be silently included.`);
  assert(model.power.editable === true, `${model.hardwareListPrice}: Phase 1 power must remain editable.`);
}

assert(nvl8.fabricAllowance.amount === 91993, "Rubin NVL8 should inherit the 8-GPU DGX fabric planning anchor until replaced by better evidence.");
assert(nvl8.professionalServicesAllowance.amount === 25000, "Rubin NVL8 should inherit the 8-GPU DGX PS planning anchor until replaced by quote/evidence.");
assert(nvl72.fabricAllowance.amount === 1717074, "Vera Rubin NVL72 should inherit the existing NVL72 fabric planning anchor until replaced by better evidence.");
assert(nvl72.professionalServicesAllowance.amount === 55558, "Vera Rubin NVL72 should inherit the existing NVL72 PS planning anchor until replaced by quote/evidence.");

assert(nvl8.power.amountKW === 24 && nvl8.power.confidence === "LISTED", "Rubin NVL8 should retain the NVIDIA-published ~24 kW Phase 1 power basis.");
assert(nvl72.power.amountKW === 136, "Vera Rubin Phase 1 planning power should remain 136 kW unless NVIDIA evidence changes.");
assert(nvl72.power.confidence === "PROVISIONAL", "Vera Rubin 136 kW power must remain explicitly PROVISIONAL.");
assert(nvl8.phase1TcoReadiness === "PROVISIONAL", "Rubin NVL8 should be provisional for Phase 1 planning.");
assert(nvl72.phase1TcoReadiness === "PROVISIONAL", "Vera Rubin NVL72 should be provisional only while 136 kW remains clearly labeled and editable.");

assert(selectedRubinSoftwareCost(c8, "NONE") === 0, "NVL8 NONE software selection should cost $0.");
assert(selectedRubinSoftwareCost(c8, "NVAIE") === 108000, "NVL8 NVAIE selection drifted.");
assert(selectedRubinSoftwareCost(c8, "MISSION_CONTROL") === 96000, "NVL8 Mission Control selection drifted.");
assert(selectedRubinSoftwareCost(c8, "BOTH") === 204000, "NVL8 combined software selection drifted.");
assert(selectedRubinSoftwareCost(c72, "BOTH") === 1836000, "Vera Rubin combined software selection drifted.");

console.log("Rubin Phase 1 planning model verification passed.");
