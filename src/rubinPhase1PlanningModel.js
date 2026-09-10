// Phase 1 Rubin TCO planning assumptions.
//
// Purpose: provide a directional, editable planning layer for Phase 1 TCO without
// turning the calculator into the Phase 2 Network/Power planners. VERIFIED values
// stay in the commercial/technical registries. The assumptions below are explicitly
// EST or QUOTE and are intended to be customer-editable when wired into TCO.
//
// Baseline ratios are inherited from the existing DGX B200 Phase 1 reference model:
// hardware $485,000; compute/storage/management fabric $54,323/$23,443/$14,227
// (= $91,993, or 18.97% of hardware); professional services $25,000
// (= 5.15% of hardware). These are methodology anchors, not Rubin vendor quotes.

const B200_REFERENCE_HARDWARE = 485000;
const B200_REFERENCE_FABRIC = 54323 + 23443 + 14227;
const B200_REFERENCE_PROFESSIONAL_SERVICES = 25000;

export const PHASE1_REFERENCE_RATIOS = Object.freeze({
  fabricPctOfHardware: B200_REFERENCE_FABRIC / B200_REFERENCE_HARDWARE,
  professionalServicesPctOfHardware: B200_REFERENCE_PROFESSIONAL_SERVICES / B200_REFERENCE_HARDWARE,
});

function roundToNearest(value, increment = 1000) {
  return Math.round(value / increment) * increment;
}

function estimatedAllowance(hardwareListPrice, pct, label, note) {
  return Object.freeze({
    amount: roundToNearest(hardwareListPrice * pct),
    confidence: "EST",
    editable: true,
    label,
    note,
  });
}

export const RUBIN_PHASE1_PLANNING_MODEL = Object.freeze({
  "DGX Rubin NVL8": Object.freeze({
    methodology: "PHASE1_REFERENCE",
    hardwareListPrice: 995000,
    fabricAllowance: estimatedAllowance(
      995000,
      PHASE1_REFERENCE_RATIOS.fabricPctOfHardware,
      "Reference fabric allowance",
      "Directional Phase 1 allowance using the existing B200 fabric-to-hardware ratio. Replace with a customer/network quote or future Phase 2 Network Fabric Planner result when available."
    ),
    professionalServicesAllowance: estimatedAllowance(
      995000,
      PHASE1_REFERENCE_RATIOS.professionalServicesPctOfHardware,
      "Installation & professional services",
      "Directional Phase 1 allowance using the existing B200 PS-to-hardware ratio. Mandatory Rubin installation is quote-required; customer may override this estimate."
    ),
    highDensityInfrastructure: Object.freeze({
      amount: null,
      confidence: "QUOTE",
      editable: true,
      label: "High-density rack / liquid-cooling infrastructure",
      note: "Do not fabricate CDU, busbar, rack, or facility CAPEX. Use customer-provided existing-facility cost, colo pricing, or a quote. Phase 2 Power/Network planning is the intended source of design-specific values."
    }),
    softwarePolicy: Object.freeze({
      confidence: "LISTED_SELECTION",
      editable: true,
      defaultSelection: "NONE",
      options: Object.freeze(["NONE", "NVAIE", "MISSION_CONTROL", "BOTH"]),
      note: "NVIDIA AI Enterprise and Mission Control are optional commercial components for Rubin; do not silently include them in base hardware economics."
    }),
    phase1TcoReadiness: "PROVISIONAL",
    phase1Note: "Suitable for directional Phase 1 planning once TCO UI exposes the EST/QUOTE assumptions and does not imply engineering precision."
  }),

  "DGX Vera Rubin NVL72": Object.freeze({
    methodology: "PHASE1_REFERENCE",
    hardwareListPrice: 10500000,
    fabricAllowance: estimatedAllowance(
      10500000,
      PHASE1_REFERENCE_RATIOS.fabricPctOfHardware,
      "Reference fabric allowance",
      "Directional Phase 1 allowance using the existing B200 fabric-to-hardware ratio only as a planning proxy. Replace with quote/reference architecture pricing or future Phase 2 Network Fabric Planner result."
    ),
    professionalServicesAllowance: estimatedAllowance(
      10500000,
      PHASE1_REFERENCE_RATIOS.professionalServicesPctOfHardware,
      "Installation & professional services",
      "Directional Phase 1 allowance using the existing B200 PS-to-hardware ratio. This is not an NVIDIA services quote and remains customer-editable."
    ),
    highDensityInfrastructure: Object.freeze({
      amount: null,
      confidence: "QUOTE",
      editable: true,
      label: "Rack / liquid-cooling infrastructure",
      note: "Use customer/colo/partner quote or future Phase 2 Power Planner output; no generic facility CAPEX is invented in Phase 1."
    }),
    softwarePolicy: Object.freeze({
      confidence: "LISTED_SELECTION",
      editable: true,
      defaultSelection: "NONE",
      options: Object.freeze(["NONE", "NVAIE", "MISSION_CONTROL", "BOTH"]),
      note: "NVIDIA AI Enterprise and Mission Control are optional commercial components; base hardware economics do not silently include them."
    }),
    phase1TcoReadiness: "BLOCKED_POWER",
    phase1Note: "Commercial and planning assumptions are sufficient for Phase 1 structure, but canonical Vera Rubin power remains unresolved and must be addressed before normal lifecycle TCO activation."
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
