import { getRubinTcoCommercialSystem } from "./rubinTcoCommercialRegistry.js";
import { getRubinPhase1PlanningModel } from "./rubinPhase1PlanningModel.js";

// Customer-facing Phase 1 TCO activation values are DERIVED from the evidence
// registries rather than copied. This prevents the live TCO layer from drifting
// away from the current price-book facts or the explicitly labeled Phase 1
// planning assumptions.
function buildPhase1RubinSystem(systemName) {
  const commercial = getRubinTcoCommercialSystem(systemName);
  const planning = getRubinPhase1PlanningModel(systemName);
  if (!commercial || !planning) throw new Error(`Missing Rubin TCO evidence for ${systemName}`);

  const hardware = commercial.hardwareListPrice;
  const fabric = planning.fabricAllowance.amount;
  const prof = planning.professionalServicesAllowance.amount;
  const sw = 0; // Rubin software policy defaults to NONE; optional licenses are not silently bundled.
  const loadedAdders = fabric + prof + sw;
  const power = commercial.systemPowerKW ?? commercial.phase1PlanningPowerKW;
  const powerConfidence = commercial.systemPowerKW != null
    ? commercial.systemPowerConfidence
    : commercial.phase1PlanningPowerConfidence;

  if (![hardware, fabric, prof, power].every(Number.isFinite)) {
    throw new Error(`Incomplete Phase 1 Rubin activation values for ${systemName}`);
  }

  return Object.freeze({
    gpus: commercial.gpus,
    perSys: hardware + loadedAdders,
    hardwareListPrice: hardware,
    loadedAdders,
    hardwareSku: commercial.hardwareSku ?? commercial.hardwareSkuFloorFeed,
    hardwarePriceAsOf: commercial.hardwarePriceAsOf,
    kW: power,
    powerConfidence,
    powerSource: commercial.systemPowerKW != null
      ? commercial.systemPowerSource
      : commercial.phase1PlanningPowerSource,
    // Phase 1 uses one logical system/rack unit for rack accounting and does not
    // invent high-density rack/CDU/busbar CAPEX. Detailed physical packing is Phase 2.
    perRack: 1,
    rackCost: 0,
    rackPlanningBasis: "PHASE1_LOGICAL_SYSTEM_UNIT",
    highDensityInfrastructureCost: null,
    highDensityInfrastructureConfidence: "QUOTE",
    vram: commercial.vramGBPerGpu,
    prof,
    profConfidence: planning.professionalServicesAllowance.confidence,
    fabricAndInfrastructure: fabric,
    fabricConfidence: planning.fabricAllowance.confidence,
    sw,
    softwareDefault: planning.softwarePolicy.defaultSelection,
    optionalSoftware: commercial.optionalSoftware,
    phase1Confidence: "PROVISIONAL",
    commercialStatus: commercial.commercialStatus,
    moq: commercial.moq,
    moqEnforcedInTco: commercial.moqEnforcedInTco ?? false,
    commercialStatusNote: commercial.commercialStatusNote ?? null,
    // Critical evidence gates: the TCO can model ownership economics, but Rubin
    // gets no synthetic hardware performance credit and no token/serving estimate
    // until a qualifying absolute inference benchmark is verified.
    generationalCreditAvailable: false,
    servingCapacityAvailable: false,
    inferenceEvidenceStatus: "UNAVAILABLE",
    pricingSource: `${commercial.pricingSource}; Phase 1 ${planning.methodology} fabric/PS estimates; optional software default NONE`,
  });
}

export const RUBIN_PHASE1_TCO_SYSTEMS = Object.freeze({
  "DGX Rubin NVL8": buildPhase1RubinSystem("DGX Rubin NVL8"),
  "DGX Vera Rubin NVL72": buildPhase1RubinSystem("DGX Vera Rubin NVL72"),
});

export const isRubinPhase1TcoSystem = (systemName) =>
  Object.prototype.hasOwnProperty.call(RUBIN_PHASE1_TCO_SYSTEMS, systemName);
