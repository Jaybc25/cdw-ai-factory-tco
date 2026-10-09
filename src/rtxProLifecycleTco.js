export const RTX_PRO_LIFECYCLE_TCO_VERSION = "2026-10-08.v1";

function explicitFinite(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function normalizeRecurring({ amount, basis, coverageYears, horizonYears, label }) {
  if (!explicitFinite(amount)) {
    return { ready: false, annualizedUSD: null, lifecycleUSD: null, missing: `${label} amount` };
  }
  const numericAmount = Number(amount);
  if (numericAmount < 0) {
    return { ready: false, annualizedUSD: null, lifecycleUSD: null, missing: `${label} amount must be zero or greater` };
  }
  if (basis === "annual") {
    return {
      ready: true,
      annualizedUSD: numericAmount,
      lifecycleUSD: numericAmount * horizonYears,
      basis: "ANNUAL",
      coverageYears: horizonYears,
    };
  }
  if (basis === "term-total") {
    if (!explicitFinite(coverageYears) || Number(coverageYears) < horizonYears) {
      return {
        ready: false,
        annualizedUSD: null,
        lifecycleUSD: null,
        missing: `${label} term coverage must span the ${horizonYears}-year TCO horizon`,
      };
    }
    return {
      ready: true,
      annualizedUSD: numericAmount / Number(coverageYears),
      lifecycleUSD: numericAmount,
      basis: "TERM_TOTAL",
      coverageYears: Number(coverageYears),
    };
  }
  return { ready: false, annualizedUSD: null, lifecycleUSD: null, missing: `${label} commercial basis` };
}

export function buildRtxProLifecycleTco({
  hardwareUSD,
  managementControlPlaneCapexUSD,
  fabricCapexUSD,
  rackCapexUSD,
  nvidiaSoftwareUSD,
  nvidiaSoftwareBasis,
  nvidiaSoftwareCoverageYears,
  supportUSD,
  supportBasis,
  supportCoverageYears,
  professionalServicesUSD,
  storageUSD,
  adminFteAnnualUSD,
  serverPowerKW,
  powerBurdenPerKwMonth,
  horizonYears = 3,
} = {}) {
  const horizon = Number(horizonYears);
  const missing = [];
  if (![1, 3, 5].includes(horizon)) missing.push("TCO horizon (1, 3, or 5 years)");

  for (const [label, value] of [
    ["configured server hardware", hardwareUSD],
    ["management/control-plane CAPEX", managementControlPlaneCapexUSD],
    ["network/fabric CAPEX", fabricCapexUSD],
    ["rack CAPEX", rackCapexUSD],
    ["professional services / implementation", professionalServicesUSD],
    ["workload-derived storage", storageUSD],
    ["incremental administration / operations labor", adminFteAnnualUSD],
    ["full configured-server power draw", serverPowerKW],
    ["facility power burden", powerBurdenPerKwMonth],
  ]) {
    if (!explicitFinite(value)) missing.push(label);
  }

  if (explicitFinite(serverPowerKW) && Number(serverPowerKW) <= 0) missing.push("full configured-server power draw must be greater than zero");
  if (explicitFinite(powerBurdenPerKwMonth) && Number(powerBurdenPerKwMonth) < 0) missing.push("facility power burden must be zero or greater");

  const software = normalizeRecurring({
    amount: nvidiaSoftwareUSD,
    basis: nvidiaSoftwareBasis,
    coverageYears: nvidiaSoftwareCoverageYears,
    horizonYears: horizon,
    label: "NVIDIA software/support",
  });
  const support = normalizeRecurring({
    amount: supportUSD,
    basis: supportBasis,
    coverageYears: supportCoverageYears,
    horizonYears: horizon,
    label: "OEM/server support",
  });
  if (!software.ready) missing.push(software.missing);
  if (!support.ready) missing.push(support.missing);

  const uniqueMissing = [...new Set(missing.filter(Boolean))];
  if (uniqueMissing.length) {
    return {
      status: "INPUTS_REQUIRED",
      clientReady: false,
      horizonYears: horizon,
      requiredInputs: uniqueMissing,
      software,
      support,
      totalTcoUSD: null,
    };
  }

  const oneTimeCapexUSD =
    Number(hardwareUSD) +
    Number(managementControlPlaneCapexUSD) +
    Number(fabricCapexUSD) +
    Number(rackCapexUSD) +
    Number(professionalServicesUSD) +
    Number(storageUSD);

  const annualFacilityPowerUSD = Number(serverPowerKW) * Number(powerBurdenPerKwMonth) * 12;
  const annualOperationsUSD = Number(adminFteAnnualUSD) + annualFacilityPowerUSD;
  const recurringLifecycleUSD = software.lifecycleUSD + support.lifecycleUSD + annualOperationsUSD * horizon;
  const totalTcoUSD = oneTimeCapexUSD + recurringLifecycleUSD;

  return {
    status: "READY_FOR_DIRECTIONAL_TCO",
    clientReady: true,
    horizonYears: horizon,
    requiredInputs: [],
    oneTimeCapexUSD,
    annualFacilityPowerUSD,
    annualOperationsUSD,
    software,
    support,
    recurringLifecycleUSD,
    totalTcoUSD,
    breakdown: Object.freeze({
      hardwareUSD: Number(hardwareUSD),
      managementControlPlaneCapexUSD: Number(managementControlPlaneCapexUSD),
      fabricCapexUSD: Number(fabricCapexUSD),
      rackCapexUSD: Number(rackCapexUSD),
      professionalServicesUSD: Number(professionalServicesUSD),
      storageUSD: Number(storageUSD),
      nvidiaSoftwareLifecycleUSD: software.lifecycleUSD,
      supportLifecycleUSD: support.lifecycleUSD,
      adminLifecycleUSD: Number(adminFteAnnualUSD) * horizon,
      facilityPowerLifecycleUSD: annualFacilityPowerUSD * horizon,
    }),
    note: "Directional lifecycle TCO. Annual commercial values are multiplied by the selected horizon; term-total values are admitted only when their stated coverage spans the full horizon, avoiding invented renewal pricing.",
  };
}
