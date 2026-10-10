import { PHASE2_DERIVATION, PHASE2_SOURCE, makeProvenance } from "./phase2Contract.js";

export const POWER_PLANNER_SYSTEM_PROFILES = Object.freeze({
  "DGX B200": {
    avgKwPerSystem: 14.3,
    designKwPerSystem: 14.3,
    systemsPerRack: 2,
    coolingCapability: "air-capable",
    evidenceSource: PHASE2_SOURCE.LISTED,
    evidenceAsOf: "2026-10-08",
    reviewedAt: "2026-10-08",
    energyBasis: "LISTED MAX AS CONSERVATIVE ENERGY DEFAULT",
    notes: "NVIDIA's current DGX B200 datasheet lists approximately 14.3 kW maximum system power. The preview uses that listed maximum as the conservative energy-planning default and as design power until a customer supplies a measured/expected operating load.",
    provenance: makeProvenance({ source: PHASE2_SOURCE.LISTED, derivation: PHASE2_DERIVATION.DIRECT, asOf: "2026-10-08", label: "NVIDIA DGX B200 datasheet: ~14.3 kW max system power" }),
    designProvenance: makeProvenance({ source: PHASE2_SOURCE.LISTED, derivation: PHASE2_DERIVATION.DIRECT, asOf: "2026-10-08", label: "NVIDIA DGX B200 datasheet: ~14.3 kW max system power" }),
  },
  "DGX H200": {
    avgKwPerSystem: 10.2,
    designKwPerSystem: 10.2,
    systemsPerRack: 2,
    coolingCapability: "air-capable",
    evidenceSource: PHASE2_SOURCE.LISTED,
    evidenceAsOf: "2026-10-08",
    reviewedAt: "2026-10-08",
    energyBasis: "LISTED MAX AS CONSERVATIVE ENERGY DEFAULT",
    notes: "NVIDIA's DGX H200 datasheet lists 10.2 kW maximum system power for the standard configuration; the Custom Thermal Solution can support up to 14.3 kW. This profile represents the standard configuration and uses the listed 10.2 kW maximum as the conservative energy-planning default until customer operating-load evidence is supplied.",
    provenance: makeProvenance({ source: PHASE2_SOURCE.LISTED, derivation: PHASE2_DERIVATION.DIRECT, asOf: "2026-10-08", label: "NVIDIA DGX H200 datasheet: 10.2 kW max, standard configuration" }),
    designProvenance: makeProvenance({ source: PHASE2_SOURCE.LISTED, derivation: PHASE2_DERIVATION.DIRECT, asOf: "2026-10-08", label: "NVIDIA DGX H200 datasheet: 10.2 kW max, standard configuration" }),
  },
  "GB200 NVL72": {
    avgKwPerSystem: 120,
    designKwPerSystem: 125,
    systemsPerRack: 1,
    coolingCapability: "liquid-only",
    evidenceSource: PHASE2_SOURCE.LISTED,
    evidenceAsOf: "2026-10-08",
    reviewedAt: "2026-10-08",
    energyBasis: "LISTED FULL-LOAD REFERENCE",
    notes: "NVIDIA Mission Control documents approximately 120 kW at full load for a GB200 NVL72 rack. NVIDIA Dynamic Power Software uses a 125 kW floor-PDU envelope for its GB200 reference topology. The planner therefore uses 120 kW as the energy-planning/full-load reference and 125 kW for design capacity.",
    provenance: makeProvenance({ source: PHASE2_SOURCE.LISTED, derivation: PHASE2_DERIVATION.DIRECT, asOf: "2026-10-08", label: "NVIDIA Mission Control: GB200 NVL72 ~120 kW full-load rack power" }),
    designProvenance: makeProvenance({ source: PHASE2_SOURCE.LISTED, derivation: PHASE2_DERIVATION.DIRECT, asOf: "2026-10-08", label: "NVIDIA Dynamic Power Software reference topology: 125 kW GB200 rack PDU envelope" }),
  },
});

const BTU_PER_HOUR_PER_KW = 3412;
const BTU_PER_HOUR_PER_TON = 12000;
const HOURS_PER_MONTH = 730;

function n(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalNonNegative(value) {
  if (value === "" || value == null) return null;
  return Math.max(0, n(value));
}

export function calculatePowerPlanner(inputs) {
  const systemCount = Math.max(0, Math.ceil(n(inputs.systemCount)));
  const avgKwPerSystem = Math.max(0, n(inputs.avgKwPerSystem));
  const designKwPerSystem = Math.max(0, n(inputs.designKwPerSystem));
  const systemsPerRack = Math.max(1, n(inputs.systemsPerRack, 1));
  const storagePb = Math.max(0, n(inputs.storagePb));
  const storageKwPerPb = Math.max(0, n(inputs.storageKwPerPb, 10));
  const explicitStoragePowerKw = optionalNonNegative(inputs.storagePowerKw);
  const provisionalNetworkKw = Math.max(0, n(inputs.provisionalNetworkKw));
  const fabricSwitchPowerKw = optionalNonNegative(inputs.fabricSwitchPowerKw);
  const managementHeadNodeKw = optionalNonNegative(inputs.managementHeadNodeKw);
  const acceptedFabricPower = fabricSwitchPowerKw != null;
  const effectiveManagementHeadNodeKw = acceptedFabricPower ? (managementHeadNodeKw ?? 0) : null;
  const effectiveNetworkKw = acceptedFabricPower
    ? fabricSwitchPowerKw + effectiveManagementHeadNodeKw
    : provisionalNetworkKw;
  const pueInput = optionalNonNegative(inputs.pue);
  const pueProvided = pueInput != null && pueInput > 0;
  const pue = Math.max(1, pueInput ?? 1);
  const utilityRateInput = optionalNonNegative(inputs.utilityRatePerKwh);
  const utilityRateProvided = utilityRateInput != null && utilityRateInput > 0;
  const utilityRatePerKwh = utilityRateInput ?? 0;
  const availableKwPerRack = optionalNonNegative(inputs.availableKwPerRack);
  const totalFacilityKwAvailable = optionalNonNegative(inputs.totalFacilityKwAvailable);
  const rackPositionsAvailable = inputs.rackPositionsAvailable === "" || inputs.rackPositionsAvailable == null ? null : Math.max(0, Math.floor(n(inputs.rackPositionsAvailable)));
  const facilityBranch = inputs.facilityBranch === "colocation" ? "colocation" : "owned-dc";
  const ownedFacilityBurdenPerKwMonth = optionalNonNegative(inputs.ownedFacilityBurdenPerKwMonth);
  const coloMonthlyBundle = optionalNonNegative(inputs.coloMonthlyBundle);
  const coloBundleIncludesPower = facilityBranch === "colocation" && Boolean(inputs.coloBundleIncludesPower);
  const coolingType = inputs.coolingType || "air-standard";
  const coolingCapability = inputs.coolingCapability || "air-capable";

  const computeRacks = Math.ceil(systemCount / systemsPerRack);
  const storageRacks = Math.max(0, Math.ceil(n(inputs.storageRacks)));
  const networkRacksInput = optionalNonNegative(inputs.networkRacks);
  const networkRacks = effectiveNetworkKw > 0 && networkRacksInput != null ? Math.ceil(networkRacksInput) : effectiveNetworkKw > 0 ? null : 0;
  const rackFootprintComplete = networkRacks != null;
  const knownNetworkRacks = networkRacks ?? 0;
  const totalRacks = computeRacks + storageRacks + knownNetworkRacks;

  const computeAvgKw = systemCount * avgKwPerSystem;
  const computeDesignKw = systemCount * designKwPerSystem;
  const storageKw = explicitStoragePowerKw ?? (storagePb * storageKwPerPb);

  const averageItKw = computeAvgKw + storageKw + effectiveNetworkKw;
  const designItKw = computeDesignKw + storageKw + effectiveNetworkKw;
  const facilityDesignKw = designItKw * pue;
  const avgRackDesignKw = totalRacks > 0 ? designItKw / totalRacks : 0;
  const computeRackDesignKw = computeRacks > 0 ? computeDesignKw / computeRacks : 0;

  const heatBtuPerHour = designItKw * BTU_PER_HOUR_PER_KW;
  const coolingTons = heatBtuPerHour / BTU_PER_HOUR_PER_TON;

  const monthlyKwh = averageItKw * pue * HOURS_PER_MONTH;
  const monthlyEnergyCost = monthlyKwh * utilityRatePerKwh;
  const facilityCostInput = facilityBranch === "owned-dc" ? ownedFacilityBurdenPerKwMonth : coloMonthlyBundle;
  const facilityCostResolved = facilityCostInput != null && facilityCostInput > 0;
  const monthlyFacilityBurden = !facilityCostResolved
    ? null
    : facilityBranch === "owned-dc"
      ? designItKw * ownedFacilityBurdenPerKwMonth
      : coloMonthlyBundle;
  const energyIncludedInFacilityBundle = facilityBranch === "colocation" && coloBundleIncludesPower;
  const monthlyStandaloneEnergyCost = energyIncludedInFacilityBundle ? 0 : monthlyEnergyCost;
  const monthlyFacilityTotal = monthlyFacilityBurden == null ? null : monthlyStandaloneEnergyCost + monthlyFacilityBurden;

  const coolingMismatch = coolingCapability === "liquid-only" && !["direct-liquid", "immersion"].includes(coolingType);
  const rackPowerMismatch = availableKwPerRack != null && computeRackDesignKw > availableKwPerRack;
  const totalPowerMismatch = totalFacilityKwAvailable != null && facilityDesignKw > totalFacilityKwAvailable;
  const rackCountMismatch = rackFootprintComplete && rackPositionsAvailable != null && totalRacks > rackPositionsAvailable;
  const siteInputsProvided = [availableKwPerRack, totalFacilityKwAvailable, rackPositionsAvailable].filter((value) => value != null).length;
  const siteInputsComplete = siteInputsProvided === 3 && rackFootprintComplete;

  let verdict = "requirement-only";
  if (facilityBranch === "colocation") verdict = "colocation";
  else if (coolingMismatch || rackPowerMismatch || totalPowerMismatch || rackCountMismatch) verdict = "retrofit";
  else if (siteInputsComplete) verdict = "fits-as-is";
  else if (siteInputsProvided > 0 || !rackFootprintComplete) verdict = "partial-check";

  const flags = [];
  if (!pueProvided) flags.push("PUE is blank or zero. Enter an explicit PUE before accepting Power; the displayed calculation uses 1.0 only as a non-accepted placeholder.");
  if (!utilityRateProvided) flags.push("Utility rate is blank or zero. Enter an explicit $/kWh rate before accepting Power; no zero-dollar energy assumption will be accepted.");
  if (coolingMismatch) flags.push("Selected system requires liquid cooling but the chosen facility cooling type is not liquid-capable.");
  if (rackPowerMismatch) flags.push(`Compute rack design load (${computeRackDesignKw.toFixed(1)} kW/rack) exceeds stated rack capacity (${availableKwPerRack.toFixed(1)} kW/rack).`);
  if (totalPowerMismatch) flags.push(`Facility design demand (${facilityDesignKw.toFixed(1)} kW including PUE) exceeds stated total facility capacity (${totalFacilityKwAvailable.toFixed(1)} kW).`);
  if (rackCountMismatch) flags.push(`Required rack positions (${totalRacks}) exceed stated available positions (${rackPositionsAvailable}).`);
  if (!rackFootprintComplete) flags.push("Network rack footprint is unresolved. Enter the planned network/fabric rack positions before treating total rack count or facility-fit results as complete.");
  if (!acceptedFabricPower && provisionalNetworkKw === 0) flags.push("Network/head-node power allowance is still 0 kW; Power remains provisional until Fabric supplies switch power or a planning allowance is entered.");
  if (acceptedFabricPower && effectiveManagementHeadNodeKw === 0) flags.push("Accepted Fabric switch power is included, but the management/head-node allowance is 0 kW. Confirm that management, control-plane, and head-node power is intentionally excluded before client use.");
  if (siteInputsProvided > 0 && !siteInputsComplete) flags.push("Facility fit is only partially checked. Enter rack kW, total facility kW, rack positions, and the network rack footprint before treating the site verdict as complete.");
  if (!facilityCostResolved) flags.push(facilityBranch === "owned-dc"
    ? "Owned-datacenter facility burden is unresolved. Enter a customer-supported $/design-kW-month value before treating facility economics as TCO-ready."
    : "Colocation facility burden is unresolved. Enter a customer/partner monthly bundle before treating facility economics as TCO-ready.");
  if (energyIncludedInFacilityBundle) flags.push("Colocation bundle is marked as including electricity. Utility energy remains visible for capacity/consumption planning but is suppressed as a separate TCO cost to avoid double counting.");

  return {
    inputs: {
      systemCount,
      avgKwPerSystem,
      designKwPerSystem,
      systemsPerRack,
      storagePb,
      storageKwPerPb,
      storagePowerKw: explicitStoragePowerKw,
      provisionalNetworkKw,
      fabricSwitchPowerKw,
      managementHeadNodeKw: effectiveManagementHeadNodeKw,
      networkRacks,
      pue,
      pueProvided,
      utilityRatePerKwh,
      utilityRateProvided,
      facilityBranch,
      ownedFacilityBurdenPerKwMonth,
      coloMonthlyBundle,
      coloBundleIncludesPower,
      coolingType,
      coolingCapability,
      availableKwPerRack,
      totalFacilityKwAvailable,
      rackPositionsAvailable,
    },
    racks: { compute: computeRacks, storage: storageRacks, network: networkRacks, total: rackFootprintComplete ? totalRacks : null, knownTotal: totalRacks, footprintComplete: rackFootprintComplete },
    networkPower: {
      acceptedFabricPower,
      switchKw: acceptedFabricPower ? fabricSwitchPowerKw : null,
      managementHeadNodeKw: acceptedFabricPower ? effectiveManagementHeadNodeKw : null,
      provisionalCombinedKw: acceptedFabricPower ? null : provisionalNetworkKw,
      totalKw: effectiveNetworkKw,
      basis: acceptedFabricPower ? "accepted Fabric switch power + explicit management/head-node allowance" : "provisional combined network + head-node allowance",
    },
    power: { computeAvgKw, computeDesignKw, storageKw, networkKw: effectiveNetworkKw, averageItKw, designItKw, facilityDesignKw, avgRackDesignKw, computeRackDesignKw },
    cooling: { heatBtuPerHour, coolingTons },
    economics: {
      monthlyKwh,
      monthlyEnergyCost,
      monthlyStandaloneEnergyCost,
      energyIncludedInFacilityBundle,
      monthlyFacilityBurden,
      monthlyFacilityTotal,
      facilityCostResolved,
    },
    verdict,
    siteCheck: { inputsProvided: siteInputsProvided, complete: siteInputsComplete, rackFootprintComplete },
    flags,
    methodology: {
      energy: "energy-planning IT kW × PUE × 730 hours × utility rate; suppressed as a separate TCO cost when an accepted colocation bundle is explicitly marked as including electricity",
      facilityDemand: "design IT kW × PUE",
      heatRejection: "design IT kW × 3,412 BTU/hr per kW",
      coolingTons: "BTU/hr ÷ 12,000",
      storagePower: explicitStoragePowerKw == null ? "storage PB × provisional kW/PB" : "accepted Storage Sizer power requirement",
      networkPower: acceptedFabricPower ? "accepted Fabric switch kW + explicit management/head-node kW" : "provisional combined network + head-node kW",
      networkRacks: effectiveNetworkKw > 0 ? "explicit network/fabric rack positions; unresolved when blank" : "0 racks when no network power is modeled",
      facilityBurden: facilityBranch === "owned-dc" ? "design IT kW × customer-supported owned facility burden $/kW-month; unresolved when blank/zero" : `customer/partner colocation monthly bundle; ${coloBundleIncludesPower ? "electricity included, so standalone utility cost is suppressed" : "electricity excluded, so standalone utility cost remains separate"}`,
    },
  };
}
