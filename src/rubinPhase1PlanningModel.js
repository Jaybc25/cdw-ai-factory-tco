// Phase 1 Rubin TCO planning assumptions.
//
// Purpose: provide a directional, editable planning layer for Phase 1 TCO without
// turning the calculator into the Phase 2 Network/Power planners. VERIFIED values
// stay in the commercial/technical registries. The assumptions below are explicitly
// EST, PROVISIONAL, or QUOTE and are intended to be customer-editable when wired into TCO.
//
// These defaults inherit the closest existing Phase 1 architecture-class planning
// anchors rather than scaling services/fabric as a percentage of expensive Rubin
// hardware. They are methodology proxies, not Rubin vendor quotes.

export const PHASE1_REFERENCE_ANCHORS = Object.freeze({
  eightGpuDgx: Object.freeze({
    fabricAllowance: 91993,
    professionalServicesAllowance: 25000,
    basis: "Existing DGX B200 Phase 1 reference: compute/storage/management fabric $54,323/$23,443/$14,227 and professional services $25,000 per system."
  }),
  nvl72: Object.freeze({
    fabricAllowance: 1717074,
    professionalServicesAllowance: 55558,
    basis: "Existing DGX GB200/GB300 NVL72 Phase 1 loaded-cost decomposition: $1,717,074 residual fabric/infrastructure planning allowance and $55,558 professional services per system."
  }),
});

function estimatedAllowance(amount, label, note, basis) {
  return Object.freeze({ amount, confidence: "EST", editable: true, label, note, basis });
}

export const RUBIN_PHASE1_PLANNING_MODEL = Object.freeze({
  "DGX Rubin NVL8": Object.freeze({
    methodology: "PHASE1_ARCHITECTURE_CLASS_REFERENCE",
    hardwareListPrice: 995000,
    power: Object.freeze({
      amountKW: 24,
      confidence: "LISTED",
      editable: true,
      note: "NVIDIA-published ~24 kW system power; customer may override for a measured/design-specific scenario."
    }),
    fabricAllowance: estimatedAllowance(PHASE1_REFERENCE_ANCHORS.eightGpuDgx.fabricAllowance, "Reference fabric allowance", "Directional Phase 1 placeholder inherited from the existing 8-GPU DGX reference model. It is not Rubin-specific fabric pricing; replace with a customer/network quote or future Phase 2 Network Fabric Planner result when available.", PHASE1_REFERENCE_ANCHORS.eightGpuDgx.basis),
    professionalServicesAllowance: estimatedAllowance(PHASE1_REFERENCE_ANCHORS.eightGpuDgx.professionalServicesAllowance, "Installation & professional services", "Directional Phase 1 placeholder inherited from the existing 8-GPU DGX reference model. Mandatory Rubin installation is quote-required and the customer may override this estimate.", PHASE1_REFERENCE_ANCHORS.eightGpuDgx.basis),
    highDensityInfrastructure: Object.freeze({ amount: null, confidence: "QUOTE", editable: true, label: "High-density rack / liquid-cooling infrastructure", note: "Do not fabricate CDU, busbar, rack, or facility CAPEX. Use customer-provided existing-facility cost, colo pricing, or a quote. Phase 2 Power/Network planning is the intended source of design-specific values." }),
    softwarePolicy: Object.freeze({ confidence: "LISTED_SELECTION", editable: true, defaultSelection: "NONE", options: Object.freeze(["NONE", "NVAIE", "MISSION_CONTROL", "BOTH"]), note: "NVIDIA AI Enterprise and Mission Control are optional commercial components for Rubin; do not silently include them in base hardware economics." }),
    phase1TcoReadiness: "PROVISIONAL",
    phase1Note: "Suitable for directional Phase 1 planning once TCO UI exposes the EST/QUOTE assumptions and does not imply engineering precision."
  }),

  "DGX Vera Rubin NVL72": Object.freeze({
    methodology: "PHASE1_ARCHITECTURE_CLASS_REFERENCE",
    hardwareListPrice: 10500000,
    power: Object.freeze({
      amountKW: 136,
      confidence: "PROVISIONAL",
      editable: true,
      note: "Phase 1 planning basis from NVIDIA MaxLPS material: 136 kW provisioned rack power. This is not presented as canonical rated power. NVIDIA's 101 kW figure is reserved for the explicit MaxLPS scenario; the 330 kW facilities cabinet TDP envelope is not used as normal operating draw."
    }),
    fabricAllowance: estimatedAllowance(PHASE1_REFERENCE_ANCHORS.nvl72.fabricAllowance, "Reference fabric allowance", "Directional Phase 1 placeholder inherited from the existing NVL72 reference model. It is not Vera Rubin-specific fabric pricing; replace with a quote/reference architecture price or future Phase 2 Network Fabric Planner result.", PHASE1_REFERENCE_ANCHORS.nvl72.basis),
    professionalServicesAllowance: estimatedAllowance(PHASE1_REFERENCE_ANCHORS.nvl72.professionalServicesAllowance, "Installation & professional services", "Directional Phase 1 placeholder inherited from the existing NVL72 reference model. This is not an NVIDIA services quote and remains customer-editable.", PHASE1_REFERENCE_ANCHORS.nvl72.basis),
    highDensityInfrastructure: Object.freeze({ amount: null, confidence: "QUOTE", editable: true, label: "Rack / liquid-cooling infrastructure", note: "Use customer/colo/partner quote or future Phase 2 Power Planner output; no generic facility CAPEX is invented in Phase 1." }),
    softwarePolicy: Object.freeze({ confidence: "LISTED_SELECTION", editable: true, defaultSelection: "NONE", options: Object.freeze(["NONE", "NVAIE", "MISSION_CONTROL", "BOTH"]), note: "NVIDIA AI Enterprise and Mission Control are optional commercial components; base hardware economics do not silently include them." }),
    phase1TcoReadiness: "PROVISIONAL",
    phase1Note: "Suitable for directional Phase 1 TCO using an editable 136 kW provisional planning basis, with quote-only/MOQ disclosure and no claim that 136 kW is canonical rated power."
  }),
});

export function getRubinPhase1PlanningModel(systemName) {
  return RUBIN_PHASE1_PLANNING_MODEL[systemName] || null;
}

export function selectedRubinSoftwareCost(commercialSystem, selection = "NONE") {
  const nvaie = commercialSystem?.optionalSoftware?.nvidiaAiEnterprise3Year?.systemListPrice ?? 0;
  const missionControl = commercialSystem?.optionalSoftware?.nvidiaMissionControl3Year?.systemListPrice ?? 0;
  if (selection === "NVAIE") return nvaie;
  if (selection === "MISSION_CONTROL") return missionControl;
  if (selection === "BOTH") return nvaie + missionControl;
  return 0;
}
