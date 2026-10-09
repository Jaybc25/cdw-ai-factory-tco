import {
  PHASE2_DERIVATION,
  PHASE2_SOURCE,
  createPhase2Override,
  makeProvenance,
} from "./phase2Contract.js";
import { makeFleetIdentity } from "./phase2Fleet.js";

export function validatePowerPlannerInputs(result) {
  const errors = [];
  const warnings = [];
  const i = result?.inputs || {};

  if (!i.systemCount || i.systemCount < 1) errors.push("At least one system is required.");
  if (!(i.avgKwPerSystem > 0)) errors.push("Average kW per system must be greater than 0.");
  if (!(i.designKwPerSystem > 0)) errors.push("Design / max kW per system must be greater than 0.");
  if (i.designKwPerSystem < i.avgKwPerSystem) errors.push("Design / max kW per system cannot be lower than average kW per system.");
  if (!(i.pue >= 1 && i.pue <= 3)) errors.push("PUE must be between 1.0 and 3.0 for this planning tool.");
  if (i.utilityRatePerKwh < 0) errors.push("Utility rate cannot be negative.");

  if (i.provisionalNetworkKw === 0) warnings.push("Network/head-node power is still 0 kW; result remains provisional until Fabric supplies this dependency or a planning allowance is entered.");
  if (result?.verdict === "requirement-only") warnings.push("No site-capacity inputs were provided, so the result is a requirement only, not a facility-fit verdict.");
  if (result?.verdict === "partial-check") warnings.push("Only part of the customer site-capacity data was provided. Rack kW, total facility kW, and rack positions are all required before a FITS AS-IS verdict is allowed.");
  if (result?.verdict === "retrofit") warnings.push("The stated site does not fit at least one design requirement and should route to facility engineering / retrofit discovery.");
  if (!result?.economics?.facilityCostResolved) warnings.push(i.facilityBranch === "colocation"
    ? "Colocation is selected but no customer/partner monthly bundle has been entered; facility economics remain unresolved and will not write back to TCO."
    : "Owned-datacenter facility burden is blank or zero; facility economics remain unresolved and will not write back to TCO.");

  return { valid: errors.length === 0, errors, warnings };
}

export function buildPowerPlannerWritebackBundle(result, { systemName = null, upstreamStorage = null, upstreamNetwork = null } = {}) {
  const validation = validatePowerPlannerInputs(result);
  if (!validation.valid) {
    throw new Error(`Cannot stage Power Planner write-back: ${validation.errors.join(" ")}`);
  }

  const fleet = makeFleetIdentity({
    systemClass: systemName,
    systemCount: result.inputs.systemCount,
    source: "power-planner",
  });

  const dependencies = {
    systemName,
    fleet,
    ...result.inputs,
    racks: result.racks,
    designItKw: result.power.designItKw,
    facilityDesignKw: result.power.facilityDesignKw,
    upstreamStorageFingerprint: upstreamStorage?.fingerprint || null,
    upstreamNetworkFingerprint: upstreamNetwork?.fingerprint || null,
  };

  const energy = createPhase2Override({
    id: "power.energy.monthly",
    target: "tco.power.energy.monthly",
    value: Math.round(result.economics.monthlyEnergyCost),
    unit: "USD/month",
    sourceTool: "power-planner",
    provenance: makeProvenance({
      source: PHASE2_SOURCE.CUSTOMER,
      derivation: PHASE2_DERIVATION.CALCULATED,
      label: "Customer utility rate × average IT load × PUE × 730 hours",
    }),
    dependencies,
    referenceValue: null,
  });

  const facilitySource = result.inputs.facilityBranch === "colocation"
    ? PHASE2_SOURCE.QUOTE
    : PHASE2_SOURCE.CUSTOMER;
  const facilityDerivation = result.inputs.facilityBranch === "colocation"
    ? PHASE2_DERIVATION.DIRECT
    : PHASE2_DERIVATION.CALCULATED;
  const facilityResolved = Boolean(result.economics.facilityCostResolved);

  const facility = facilityResolved ? createPhase2Override({
    id: "power.facility-burden.monthly",
    target: "tco.power.facilityBurden.monthly",
    value: Math.round(result.economics.monthlyFacilityBurden),
    unit: "USD/month",
    sourceTool: "power-planner",
    provenance: makeProvenance({
      source: facilitySource,
      derivation: facilityDerivation,
      label: result.inputs.facilityBranch === "colocation"
        ? "Customer/partner colocation monthly bundle"
        : "Customer facility burden × design IT kW",
    }),
    dependencies,
    referenceValue: null,
  }) : null;

  const requirements = {
    schemaVersion: 1,
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
    power: result.power,
    cooling: result.cooling,
    facilityCostResolved: facilityResolved,
    facilityCostStatus: facilityResolved ? (result.inputs.facilityBranch === "colocation" ? "QUOTE" : "CUSTOMER") : "UNRESOLVED",
    flags: result.flags,
    validationWarnings: validation.warnings,
  };

  return {
    fleet,
    costResolved: facilityResolved,
    costStatus: facilityResolved ? "EST" : "UNRESOLVED",
    overrides: facility ? [energy, facility] : [energy],
    requirements,
    validation,
  };
}