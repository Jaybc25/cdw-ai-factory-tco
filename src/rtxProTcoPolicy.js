import { getRtxProServerConfigByGpuCount } from "./rtxProServerRegistry.js";

export const RTX_PRO_TCO_POLICY_VERSION = "2026-10-08.v1";

function hasExplicitFiniteNumber(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function hasExplicitPositiveNumber(value) {
  return hasExplicitFiniteNumber(value) && Number(value) > 0;
}

// V1 TCO activation is intentionally limited to one physical RTX PRO server.
// Multi-server deployments can still be sized in GPU Sizing, but coordinated
// management/networking economics remain project-specific until separately
// evidenced. Unknown commercial values are never coerced to zero.
export function buildRtxProSingleServerTcoPolicy({
  gpuCount,
  existingServerManagement = true,
  existingEthernet = true,
  existingRackCapacity = true,
  nvidiaSoftwareUSD = null,
  supportUSD = null,
  professionalServicesUSD = null,
  storageUSD = null,
  adminFteAnnualUSD = null,
  serverPowerKW = null,
} = {}) {
  const config = getRtxProServerConfigByGpuCount(gpuCount);
  if (!config || ![2, 4, 8].includes(Number(gpuCount))) {
    return {
      status: "UNSUPPORTED_CONFIGURATION",
      clientReady: false,
      reason: "RTX PRO TCO v1 supports one admitted 2/4/8-GPU server configuration only.",
    };
  }

  const requiredInputs = [];
  if (!hasExplicitFiniteNumber(nvidiaSoftwareUSD)) requiredInputs.push("NVIDIA software/support entitlement");
  if (!hasExplicitFiniteNumber(supportUSD)) requiredInputs.push("OEM/server support");
  if (!hasExplicitFiniteNumber(professionalServicesUSD)) requiredInputs.push("professional services / implementation");
  if (!hasExplicitFiniteNumber(storageUSD)) requiredInputs.push("workload-derived storage");
  if (!hasExplicitFiniteNumber(adminFteAnnualUSD)) requiredInputs.push("incremental administration / operations labor");
  if (!hasExplicitPositiveNumber(serverPowerKW)) requiredInputs.push("full configured-server power draw");

  const hardwareResolved = Number.isFinite(config.configuredSystemPriceUSD);
  if (!hardwareResolved) requiredInputs.unshift("configured 8-GPU OEM/CDW server price");

  const assumptions = {
    managementControlPlaneCapexUSD: existingServerManagement ? 0 : null,
    managementControlPlaneBasis: existingServerManagement
      ? "EST · incremental dedicated management/control-plane hardware $0 because existing server-management tooling is assumed; total management cost is not zero."
      : "QUOTE/CUSTOMER INPUT REQUIRED",
    fabricCapexUSD: existingEthernet ? 0 : null,
    fabricBasis: existingEthernet
      ? "EST · no dedicated AI fabric added for a single independent-replica server; existing Ethernet is assumed."
      : "QUOTE/CUSTOMER INPUT REQUIRED",
    rackCapexUSD: existingRackCapacity ? 0 : null,
    rackBasis: existingRackCapacity
      ? "EST · existing rack capacity assumed; no new rack purchase allocated."
      : "QUOTE/CUSTOMER INPUT REQUIRED",
  };

  if (assumptions.managementControlPlaneCapexUSD == null) requiredInputs.push("management/control-plane hardware if existing tooling is not used");
  if (assumptions.fabricCapexUSD == null) requiredInputs.push("network/fabric if existing Ethernet is not used");
  if (assumptions.rackCapexUSD == null) requiredInputs.push("rack capacity if a new rack is required");

  return {
    id: `rtx-pro-single-server-${gpuCount}gpu`,
    platformClass: "RTX_PRO_SERVER",
    status: requiredInputs.length ? "INPUTS_REQUIRED" : "READY_FOR_DIRECTIONAL_TCO",
    clientReady: requiredInputs.length === 0,
    gpuCount: Number(gpuCount),
    serverCount: 1,
    hardware: {
      configuredSystemSku: config.configuredSystemSku,
      configuredSystemPriceUSD: config.configuredSystemPriceUSD,
      priceProvenance: config.priceProvenance,
      priceDerivation: config.priceDerivation,
      priceAsOf: config.priceAsOf,
      source: config.pricingSource,
    },
    assumptions,
    requiredInputs: Object.freeze([...new Set(requiredInputs)]),
    userInputs: {
      nvidiaSoftwareUSD: hasExplicitFiniteNumber(nvidiaSoftwareUSD) ? Number(nvidiaSoftwareUSD) : null,
      supportUSD: hasExplicitFiniteNumber(supportUSD) ? Number(supportUSD) : null,
      professionalServicesUSD: hasExplicitFiniteNumber(professionalServicesUSD) ? Number(professionalServicesUSD) : null,
      storageUSD: hasExplicitFiniteNumber(storageUSD) ? Number(storageUSD) : null,
      adminFteAnnualUSD: hasExplicitFiniteNumber(adminFteAnnualUSD) ? Number(adminFteAnnualUSD) : null,
      serverPowerKW: hasExplicitPositiveNumber(serverPowerKW) ? Number(serverPowerKW) : null,
    },
    note: "Directional TCO only after every required commercial/workload input is supplied. This policy deliberately avoids the legacy DGX $600K cluster allowance, DGX fabric assumptions, and any universal RTX storage default.",
  };
}
