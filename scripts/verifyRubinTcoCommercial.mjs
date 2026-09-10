import { RUBIN_TCO_COMMERCIAL_SCAFFOLD, getRubinTcoCommercialSystem, isRubinTcoEnabled } from "../src/rubinTcoCommercialRegistry.js";
import { RUBIN_NVL8_REFERENCE_BOM, RUBIN_NVL8_REFERENCE_ALLOCATIONS_PER_NODE } from "../src/rubinTcoReferenceBom.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const nvl8 = getRubinTcoCommercialSystem("DGX Rubin NVL8");
const nvl72 = getRubinTcoCommercialSystem("DGX Vera Rubin NVL72");

assert(nvl8, "DGX Rubin NVL8 commercial scaffold missing.");
assert(nvl72, "DGX Vera Rubin NVL72 commercial scaffold missing.");
assert(Object.keys(RUBIN_TCO_COMMERCIAL_SCAFFOLD).length === 2, "Expected exactly two Rubin TCO commercial scaffold systems.");

assert(nvl8.hardwareSku === "DGXR-G2304+P1CMI36", "Rubin NVL8 hardware SKU drifted.");
assert(nvl8.hardwareListPrice === 995000, "Rubin NVL8 hardware list price drifted.");
assert(nvl8.commercialStatus === "LISTED", "Rubin NVL8 must remain LISTED unless commercial evidence changes.");
assert(nvl8.moq === 1, "Rubin NVL8 MOQ must remain 1 unless commercial evidence changes.");
assert(nvl8.systemPowerKW === 24, "Rubin NVL8 verified system power should remain 24 kW planning basis unless first-party evidence changes.");
assert(nvl8.perRack === null, "Rubin NVL8 TCO rack packing must remain unresolved until NVIDIA rack representations are reconciled.");
assert(nvl8.maximumPhysicalSystemsPerRack === 8, "Rubin NVL8 published maximum physical rack density should remain 8 unless first-party evidence changes.");
assert(nvl8.rackArchitectureStatus === "UNRESOLVED_FOR_TCO", "Rubin NVL8 rack architecture must remain explicitly unresolved for TCO economics.");

assert(nvl72.hardwareSkuFloorFeed === "DGXV-0072F+P1CMI36", "Vera Rubin NVL72 floor-feed SKU drifted.");
assert(nvl72.hardwareSkuTopFeed === "DGXV-0072T+P1CMI36", "Vera Rubin NVL72 top-feed SKU drifted.");
assert(nvl72.hardwareListPrice === 10500000, "Vera Rubin NVL72 hardware list price drifted.");
assert(nvl72.commercialStatus === "QUOTE_ONLY", "Vera Rubin NVL72 must remain QUOTE_ONLY unless NVIDIA T&C changes.");
assert(nvl72.moq === 2, "Vera Rubin NVL72 MOQ must remain 2 unless commercial evidence changes.");
assert(nvl72.moqEnforcedInTco === false, "Do not silently enforce MOQ 2 as a $21M TCO minimum without an explicit methodology decision.");
assert(nvl72.systemPowerKW === null, "Vera Rubin NVL72 canonical rated power must remain null until first-party rated/design evidence qualifies.");
assert(nvl72.phase1PlanningPowerKW === 136, "Vera Rubin Phase 1 planning basis should remain 136 kW unless NVIDIA evidence changes.");
assert(nvl72.phase1PlanningPowerConfidence === "PROVISIONAL", "Vera Rubin 136 kW planning value must remain explicitly PROVISIONAL.");
assert(nvl72.phase1PlanningPowerEditable === true, "Vera Rubin provisional power must remain customer-editable.");
assert(nvl72.maxLpsScenarioPowerKW === 101, "Vera Rubin MaxLPS scenario power should remain 101 kW unless NVIDIA evidence changes.");
assert(nvl72.facilityCabinetTdpKW === 330, "Vera Rubin facilities cabinet TDP evidence should remain 330 kW unless NVIDIA evidence changes.");

for (const system of [nvl8, nvl72]) {
  assert(system.includedHardwareSupportYears === 3, `${system.gpuClass}: expected 3 years included Business Standard hardware support.`);
  assert(system.optionalSoftware.nvidiaAiEnterprise3Year.listPricePerGpu === 13500, `${system.gpuClass}: NVAIE 3-year per-GPU list price drifted.`);
  assert(system.optionalSoftware.nvidiaMissionControl3Year.listPricePerGpu === 12000, `${system.gpuClass}: Mission Control 3-year per-GPU list price drifted.`);
  assert(system.perSys === null, `${system.gpuClass}: perSys must stay null until active Phase 1 TCO wiring explicitly composes the planning values.`);
  assert(system.loadedAdders === null, `${system.gpuClass}: loadedAdders must stay null until active Phase 1 TCO wiring explicitly composes the planning values.`);
  assert(system.sw === null, `${system.gpuClass}: sw must stay null until the explicit software selection is made.`);
  assert(system.prof === null, `${system.gpuClass}: commercial scaffold prof remains null; Phase 1 uses a separate editable EST assumption.`);
  assert(system.fabricAndInfrastructure === null, `${system.gpuClass}: commercial scaffold fabric remains null; Phase 1 uses a separate editable EST assumption.`);
  assert(system.tcoEnabled === false, `${system.gpuClass}: TCO must remain gated in the commercial scaffold until customer-facing wiring is implemented.`);
  assert(isRubinTcoEnabled(system === nvl8 ? "DGX Rubin NVL8" : "DGX Vera Rubin NVL72") === false, `${system.gpuClass}: TCO enablement helper must remain false.`);
  assert(Array.isArray(system.tcoBlockers) && system.tcoBlockers.length > 0, `${system.gpuClass}: explicit TCO blockers are required while gated.`);
}

assert(RUBIN_NVL8_REFERENCE_BOM.dgxNodes === 576, "Rubin NVL8 reference BOM must remain the NVIDIA 576-node / eight-SU design.");
assert(RUBIN_NVL8_REFERENCE_BOM.scalableUnits === 8, "Rubin NVL8 reference BOM must remain eight SUs.");
assert(RUBIN_NVL8_REFERENCE_BOM.computeAndRacks.dgxApprovedComputeRacks.count === 144, "Rubin NVL8 reference compute-rack count drifted.");
assert(RUBIN_NVL8_REFERENCE_BOM.computeAndRacks.computePowerShelves110kW.count === 288, "Rubin NVL8 110 kW compute power-shelf count drifted.");
assert(RUBIN_NVL8_REFERENCE_BOM.computeFabric.q3400ComputeLeafs.count === 64, "Rubin NVL8 Q3400 compute-leaf count drifted.");
assert(RUBIN_NVL8_REFERENCE_BOM.computeFabric.q3400ComputeSpines.count === 36, "Rubin NVL8 Q3400 compute-spine count drifted.");
assert(RUBIN_NVL8_REFERENCE_BOM.computeFabric.dgxLeafCables.count === 4608, "Rubin NVL8 DGX-leaf cable count drifted.");
assert(RUBIN_NVL8_REFERENCE_ALLOCATIONS_PER_NODE.computeDgxLeafCables === 8, "Rubin NVL8 should allocate eight compute-fabric DGX-leaf cables per node in the representative BOM.");
assert(RUBIN_NVL8_REFERENCE_ALLOCATIONS_PER_NODE.computePowerShelves110kW === 0.5, "Rubin NVL8 representative BOM should allocate one 110 kW compute power shelf per two DGX nodes.");
assert(RUBIN_NVL8_REFERENCE_ALLOCATIONS_PER_NODE.computeRacksFromRepresentativeBom === 0.25, "Rubin NVL8 representative BOM implies one listed compute rack per four DGX nodes; retain this as evidence, not as TCO packing policy.");

console.log("Rubin TCO commercial scaffold and Vera Rubin Phase 1 power semantics verification passed.");
