import {
  PHASE2_DERIVATION,
  PHASE2_SOURCE,
  createPhase2Override,
  makeProvenance,
} from "./phase2Contract.js";
import { makeFleetIdentity } from "./phase2Fleet.js";

function normalizeSource(value, fallback) {
  return Object.values(PHASE2_SOURCE).includes(value) ? value : fallback;
}

export function validatePowerPlannerInputs(result) {
  const errors = [];
  const warnings = [];
  const i = result?.inputs || {};

  if (!i.systemCount || i.systemCount < 1) errors.push("At least one system is required.");
  if (!(i.avgKwPerSystem > 0)) errors.push("Energy-planning kW per system must be greater than 0.");
  if (!(i.designKwPerSystem > 0)) errors.push("Design / max kW per system must be greater than 0.");
  if (i.designKwPerSystem < i.avgKwPerSystem) errors.push("Design / max kW per system cannot be lower than energy-planning kW per system.");
  if (!(i.pue >= 1 && i.pue <= 3)) errors.push("PUE must be between 1.0 and 3.0 for this planning tool.");
  if (i.utilityRatePerKwh < 0) errors.push("Utility rate cannot be negative.");

  if (!result?.networkPower?.acceptedFabricPower && i.provisionalNetworkKw === 0) warnings.push("Network/head-node power is still 0 kW; result remains provisional until Fabric supplies switch power or a planning allowance is entered.");
  if (result?.networkPower?.acceptedFabricPower && result.networkPower.managementHeadNodeKw === 0) warnings.push("Accepted Fabric switch power is included, but management/head-node power is 0 kW. Confirm that management, control-plane, and head-node power is intentionally excluded before client use.");
  if (result?.racks?.footprintComplete === false) warnings.push("Network/fabric rack footprint is unresolved. Total rack count and rack-position fit must remain provisional until planned network rack positions are entered.");
  if (result?.verdict === "requirement-only") warnings.push("No site-capacity inputs were provided, so the result is a requirement only, not a facility-fit verdict.");
  if (result?.verdict === "partial-check") warnings.push("Only part of the customer site-capacity or rack-footprint data is complete. Rack kW, total facility kW, rack positions, and network/fabric rack footprint are all required before a FITS AS-IS verdict is allowed.");
  if (result?.verdict === "retrofit") warnings.push("The stated site does not fit at least one design requirement and should route to facility engineering / retrofit discovery.");
  if (!result?.economics?.facilityCostResolved) warnings.push(i.facilityBranch === "colocation"
    ? "Colocation is selected but no customer/partner monthly bundle has been entered; facility economics remain unresolved and will not write back to TCO."
    : "Owned-datacenter facility burden is blank or zero; facility economics remain unresolved and will not write back to TCO.");
  if (result?.economics?.energyIncludedInFacilityBundle) warnings.push("Colocation bundle includes electricity. Standalone utility energy will be suppressed from TCO to avoid double counting.");

  return { valid: errors.length === 0, errors, warnings };
}

export function buildPowerPlannerWritebackBundle(result, {
  systemName = null,
  upstreamStorage = null,
  upstreamNetwork = null,
  utilityRateSource = PHASE2_SOURCE.EST,
  facilityCostSource = null,
} = {}) {
  const validation = validatePowerPlannerInputs(result);
  if (!validation.valid) throw new Error(`Cannot stage Power Planner write-back: ${validation.errors.join(" ")}`);

  const normalizedUtilitySource = normalizeSource(utilityRateSource, PHASE2_SOURCE.EST);
  const defaultFacilitySource = result.inputs.facilityBranch === "colocation" ? PHASE2_SOURCE.QUOTE : PHASE2_SOURCE.CUSTOMER;
  const normalizedFacilitySource = normalizeSource(facilityCostSource, defaultFacilitySource);

  const fleet = makeFleetIdentity({ systemClass: systemName, systemCount: result.inputs.systemCount, source: "power-planner" });
  const dependencies = {
    systemName,
    fleet,
    ...result.inputs,
    utilityRateSource: normalizedUtilitySource,
    facilityCostSource: normalizedFacilitySource,
    networkPower: result.networkPower,
    racks: result.racks,
    designItKw: result.power.designItKw,
    facilityDesignKw: result.power.facilityDesignKw,
    upstreamStorageFingerprint: upstreamStorage?.fingerprint || null,
    upstreamNetworkFingerprint: upstreamNetwork?.fingerprint || null,
  };

  const energyIncludedInFacilityBundle = Boolean(result.economics.energyIncludedInFacilityBundle);
  const energy = energyIncludedInFacilityBundle ? null : createPhase2Override({
    id: "power.energy.monthly",
    target: "tco.power.energy.monthly",
    value: Math.round(result.economics.monthlyStandaloneEnergyCost ?? result.economics.monthlyEnergyCost),
    unit: "USD/month",
    sourceTool: "power-planner",
    provenance: makeProvenance({
      source: normalizedUtilitySource,
      derivation: PHASE2_DERIVATION.CALCULATED,
      label: `${normalizedUtilitySource} utility rate × energy-planning IT load × PUE × 730 hours`,
    }),
    dependencies,
    referenceValue: null,
  });

  const facilityResolved = Boolean(result.economics.facilityCostResolved);
  const facilityDerivation = result.inputs.facilityBranch === "colocation" ? PHASE2_DERIVATION.DIRECT : PHASE2_DERIVATION.CALCULATED;
  const facility = facilityResolved ? createPhase2Override({
    id: "power.facility-burden.monthly",
    target: "tco.power.facilityBurden.monthly",
    value: Math.round(result.economics.monthlyFacilityBurden),
    unit: "USD/month",
    sourceTool: "power-planner",
    provenance: makeProvenance({
      source: normalizedFacilitySource,
      derivation: facilityDerivation,
      label: result.inputs.facilityBranch === "colocation"
        ? `${normalizedFacilitySource} colocation monthly bundle${energyIncludedInFacilityBundle ? " including electricity" : " excluding electricity"}`
        : `${normalizedFacilitySource} facility burden × design IT kW`,
    }),
    dependencies,
    referenceValue: null,
  }) : null;

  const requirements = {
    schemaVersion: 4,
    sourceTool: "power-planner",
    systemName,
    fleet,
    acceptedAt: new Date().toISOString(),
    upstreamStorageFingerprint: upstreamStorage?.fingerprint || null,
    upstreamStorageAcceptedAt: upstreamStorage?.acceptedAt || null,
    upstreamNetworkFingerprint: upstreamNetwork?.fingerprint || null,
    upstreamNetworkAcceptedAt: upstreamNetwork?.acceptedAt || null,
    verdict: result.verdict,
    siteCheck: result.siteCheck,
    racks: result.racks,
    networkRackFootprintResolved: result.racks?.footprintComplete !== false,
    networkPower: result.networkPower,
    power: result.power,
    cooling: result.cooling,
    utilityRateSource: normalizedUtilitySource,
    energyIncludedInFacilityBundle,
    standaloneEnergyWritebackEligible: !energyIncludedInFacilityBundle,
    facilityCostResolved: facilityResolved,
    facilityCostStatus: facilityResolved ? normalizedFacilitySource : "UNRESOLVED",
    facilityCostSource: facilityResolved ? normalizedFacilitySource : null,
    flags: result.flags,
    validationWarnings: validation.warnings,
  };

  return {
    fleet,
    costResolved: facilityResolved,
    costStatus: facilityResolved ? normalizedFacilitySource : "UNRESOLVED",
    utilityRateSource: normalizedUtilitySource,
    facilityCostSource: facilityResolved ? normalizedFacilitySource : null,
    energyIncludedInFacilityBundle,
    overrides: [energy, facility].filter(Boolean),
    requirements,
    validation,
  };
}