import { PHASE2_DERIVATION, PHASE2_SOURCE, makeProvenance } from "./phase2Contract.js";

export const POWER_PLANNER_SYSTEM_PROFILES = Object.freeze({
  "DGX B200": {
    avgKwPerSystem: 14.4,
    designKwPerSystem: 14.4,
    systemsPerRack: 2,
    coolingCapability: "air-capable",
    notes: "Average-load anchor from the Phase 2 plan. Design/max kW remains provisional until validated against the current system spec.",
    provenance: makeProvenance({ source: PHASE2_SOURCE.LISTED, derivation: PHASE2_DERIVATION.DIRECT, label: "NVIDIA capture carried into Phase 2 plan" }),
    designProvenance: makeProvenance({ source: PHASE2_SOURCE.EST, derivation: PHASE2_DERIVATION.DIRECT, label: "Provisional: defaults to average-load anchor until max-rated value is sourced" }),
  },
  "DGX H200": {
    avgKwPerSystem: 10.2,
    designKwPerSystem: 10.2,
    systemsPerRack: 2,
    coolingCapability: "air-capable",
    notes: "Average-load anchor from the Phase 2 plan. Design/max kW remains provisional until validated against the current system spec.",
    provenance: makeProvenance({ source: PHASE2_SOURCE.LISTED, derivation: PHASE2_DERIVATION.DIRECT, label: "NVIDIA capture carried into Phase 2 plan" }),
    designProvenance: makeProvenance({ source: PHASE2_SOURCE.EST, derivation: PHASE2_DERIVATION.DIRECT, label: "Provisional: defaults to average-load anchor until max-rated value is sourced" }),
  },
  "GB200 NVL72": {
    avgKwPerSystem: 120,
    designKwPerSystem: 120,
    systemsPerRack: 1,
    coolingCapability: "liquid-only",
    notes: "120 kW/rack is the plan's captured average-load anchor. It must not be treated as max-rated power until validated.",
    provenance: makeProvenance({ source: PHASE2_SOURCE.LISTED, derivation: PHASE2_DERIVATION.DIRECT, label: "NVIDIA capture carried into Phase 2 plan" }),
    designProvenance: makeProvenance({ source: PHASE2_SOURCE.EST, derivation: PHASE2_DERIVATION.DIRECT, label: "Provisional: defaults to average-load anchor until max-rated value is sourced" }),
  },
});

const BTU_PER_HOUR_PER_KW = 3412;
const BTU_PER_HOUR_PER_TON = 12000;
const HOURS_PER_MONTH = 730;

function n(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function calculatePowerPlanner(inputs) {
  const systemCount = Math.max(0, Math.ceil(n(inputs.systemCount)));
  const avgKwPerSystem = Math.max(0, n(inputs.avgKwPerSystem));
  const designKwPerSystem = Math.max(0, n(inputs.designKwPerSystem));
  const systemsPerRack = Math.max(1, n(inputs.systemsPerRack, 1));
  const storagePb = Math.max(0, n(inputs.storagePb));
  const storageKwPerPb = Math.max(0, n(inputs.storageKwPerPb, 10));
  const provisionalNetworkKw = Math.max(0, n(inputs.provisionalNetworkKw));
  const pue = Math.max(1, n(inputs.pue, 1));
  const utilityRatePerKwh = Math.max(0, n(inputs.utilityRatePerKwh));
  const availableKwPerRack = inputs.availableKwPerRack === "" || inputs.availableKwPerRack == null ? null : Math.max(0, n(inputs.availableKwPerRack));
  const totalFacilityKwAvailable = inputs.totalFacilityKwAvailable === "" || inputs.totalFacilityKwAvailable == null ? null : Math.max(0, n(inputs.totalFacilityKwAvailable));
  const rackPositionsAvailable = inputs.rackPositionsAvailable === "" || inputs.rackPositionsAvailable == null ? null : Math.max(0, Math.floor(n(inputs.rackPositionsAvailable)));
  const facilityBranch = inputs.facilityBranch === "colocation" ? "colocation" : "owned-dc";
  const ownedFacilityBurdenPerKwMonth = Math.max(0, n(inputs.ownedFacilityBurdenPerKwMonth));
  const coloMonthlyBundle = Math.max(0, n(inputs.coloMonthlyBundle));
  const coolingType = inputs.coolingType || "air-standard";
  const coolingCapability = inputs.coolingCapability || "air-capable";

  const computeRacks = Math.ceil(systemCount / systemsPerRack);
  const storageRacks = Math.max(0, Math.ceil(n(inputs.storageRacks)));
  const networkRacks = Math.max(0, Math.ceil(n(inputs.networkRacks)));
  const totalRacks = computeRacks + storageRacks + networkRacks;

  const computeAvgKw = systemCount * avgKwPerSystem;
  const computeDesignKw = systemCount * designKwPerSystem;
  const storageKw = storagePb * storageKwPerPb;

  const averageItKw = computeAvgKw + storageKw + provisionalNetworkKw;
  const designItKw = computeDesignKw + storageKw + provisionalNetworkKw;
  const facilityDesignKw = designItKw * pue;
  const avgRackDesignKw = totalRacks > 0 ? designItKw / totalRacks : 0;
  const computeRackDesignKw = computeRacks > 0 ? computeDesignKw / computeRacks : 0;

  // Heat rejection tracks IT load, not IT load * PUE. PUE is used for total
  // facility electrical demand and energy economics only.
  const heatBtuPerHour = designItKw * BTU_PER_HOUR_PER_KW;
  const coolingTons = heatBtuPerHour / BTU_PER_HOUR_PER_TON;

  const monthlyKwh = averageItKw * pue * HOURS_PER_MONTH;
  const monthlyEnergyCost = monthlyKwh * utilityRatePerKwh;
  const monthlyFacilityBurden = facilityBranch === "owned-dc"
    ? designItKw * ownedFacilityBurdenPerKwMonth
    : coloMonthlyBundle;
  const monthlyFacilityTotal = monthlyEnergyCost + monthlyFacilityBurden;

  const coolingMismatch = coolingCapability === "liquid-only" && !["direct-liquid", "immersion"].includes(coolingType);
  const rackPowerMismatch = availableKwPerRack != null && computeRackDesignKw > availableKwPerRack;
  const totalPowerMismatch = totalFacilityKwAvailable != null && facilityDesignKw > totalFacilityKwAvailable;
  const rackCountMismatch = rackPositionsAvailable != null && totalRacks > rackPositionsAvailable;

  let verdict = "requirement-only";
  if (facilityBranch === "colocation") verdict = "colocation";
  else if (coolingMismatch || rackPowerMismatch || totalPowerMismatch || rackCountMismatch) verdict = "retrofit";
  else if (availableKwPerRack != null || totalFacilityKwAvailable != null || rackPositionsAvailable != null) verdict = "fits-as-is";

  const flags = [];
  if (coolingMismatch) flags.push("Selected system requires liquid cooling but the chosen facility cooling type is not liquid-capable.");
  if (rackPowerMismatch) flags.push(`Compute rack design load (${computeRackDesignKw.toFixed(1)} kW/rack) exceeds stated rack capacity (${availableKwPerRack.toFixed(1)} kW/rack).`);
  if (totalPowerMismatch) flags.push(`Facility design demand (${facilityDesignKw.toFixed(1)} kW including PUE) exceeds stated total facility capacity (${totalFacilityKwAvailable.toFixed(1)} kW).`);
  if (rackCountMismatch) flags.push(`Required rack positions (${totalRacks}) exceed stated available positions (${rackPositionsAvailable}).`);
  if (provisionalNetworkKw === 0) flags.push("Network/head-node power allowance is still 0 kW; Power remains provisional until Fabric supplies this dependency or a planning allowance is entered.");

  return {
    inputs: {
      systemCount,
      avgKwPerSystem,
      designKwPerSystem,
      systemsPerRack,
      storagePb,
      storageKwPerPb,
      provisionalNetworkKw,
      pue,
      utilityRatePerKwh,
      facilityBranch,
      ownedFacilityBurdenPerKwMonth,
      coloMonthlyBundle,
      coolingType,
      coolingCapability,
      availableKwPerRack,
      totalFacilityKwAvailable,
      rackPositionsAvailable,
    },
    racks: { compute: computeRacks, storage: storageRacks, network: networkRacks, total: totalRacks },
    power: { computeAvgKw, computeDesignKw, storageKw, averageItKw, designItKw, facilityDesignKw, avgRackDesignKw, computeRackDesignKw },
    cooling: { heatBtuPerHour, coolingTons },
    economics: { monthlyKwh, monthlyEnergyCost, monthlyFacilityBurden, monthlyFacilityTotal },
    verdict,
    flags,
    methodology: {
      energy: "average IT kW × PUE × 730 hours × utility rate",
      facilityDemand: "design IT kW × PUE",
      heatRejection: "design IT kW × 3,412 BTU/hr per kW",
      coolingTons: "BTU/hr ÷ 12,000",
      facilityBurden: facilityBranch === "owned-dc" ? "design IT kW × owned facility burden $/kW-month" : "customer/partner colocation monthly bundle",
    },
  };
}
