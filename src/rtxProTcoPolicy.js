import { getRtxProServerConfigByGpuCount } from "./rtxProServerRegistry.js";

export const RTX_PRO_TCO_POLICY_VERSION = "2026-10-10.v2";

function hasExplicitFiniteNumber(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function hasExplicitPositiveNumber(value) {
  return hasExplicitFiniteNumber(value) && Number(value) > 0;
}

// V1 TCO activation is intentionally limited to one physical RTX PRO server.
// Multi-server deployments can still be sized in GPU Sizing, but coordinated
// management/networking economics remain project-specific until separately
// evidenced. Planning estimates may support directional TCO, but quote-only
// configuration facts remain explicit client-ready confirmations.
export function buildRtxProSingleServerTcoPolicy({
  gpuCount,
  existingServerManagement = true,
  existingEthernet = true,
  existingRackCapacity = true,
  hardwarePlanningUSD = null,
  hardwarePlanningProvenance = null,
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
      directionalReady: false,
      clientReady: false,
      reason: "RTX PRO TCO v1 supports one admitted 2/4/8-GPU server configuration only.",
    };
  }

  const requiredInputs = [];
  const confirmationInputs = [];
  if (!hasExplicitFiniteNumber(nvidiaSoftwareUSD)) requiredInputs.push("NVIDIA software/support entitlement");
  if (!hasExplicitFiniteNumber(supportUSD)) requiredInputs.push("OEM/server support");
  if (!hasExplicitFiniteNumber(professionalServicesUSD)) requiredInputs.push("professional services / implementation");
  if (!hasExplicitFiniteNumber(storageUSD)) requiredInputs.push("workload-derived storage");
  if (!hasExplicitFiniteNumber(adminFteAnnualUSD)) requiredInputs.push("incremental administration / operations labor");
  if (!hasExplicitPositiveNumber(serverPowerKW)) requiredInputs.push("full configured-server power draw");

  const listedHardwareResolved = Number.isFinite(config.configuredSystemPriceUSD);
  const planningHardwareResolved = hasExplicitPositiveNumber(hardwarePlanningUSD);
  const hardwareUSD = listedHardwareResolved
    ? Number(config.configuredSystemPriceUSD)
    : planningHardwareResolved
      ? Number(hardwarePlanningUSD)
      : null;

  if (hardwareUSD == null) requiredInputs.unshift("configured 8-GPU OEM/CDW server price or planning estimate");
  if (!listedHardwareResolved && planningHardwareResolved) {
    confirmationInputs.push("configured 8-GPU OEM/CDW server quote");
  }

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

  const directionalReady = requiredInputs.length === 0;
  const clientReady = directionalReady && confirmationInputs.length === 0;

  return {
    id: `rtx-pro-single-server-${gpuCount}gpu`,
    platformClass: "RTX_PRO_SERVER",
    status: directionalReady ? (clientReady ? "READY_FOR_DIRECTIONAL_TCO" : "READY_FOR_PLANNING_TCO") : "INPUTS_REQUIRED",
    directionalReady,
    clientReady,
    gpuCount: Number(gpuCount),
    serverCount: 1,
    hardware: {
      configuredSystemSku: config.configuredSystemSku,
      configuredSystemPriceUSD: hardwareUSD,
      priceProvenance: listedHardwareResolved ? config.priceProvenance : (hardwarePlanningProvenance?.source || "EST"),
      priceDerivation: listedHardwareResolved ? config.priceDerivation : (hardwarePlanningProvenance?.derivation || "PLANNING_ESTIMATE"),
      priceAsOf: listedHardwareResolved ? config.priceAsOf : (hardwarePlanningProvenance?.asOf || config.priceAsOf),
      source: listedHardwareResolved ? config.pricingSource : (hardwarePlanningProvenance?.basis || config.pricingSource),
      quoteRequired: !listedHardwareResolved,
    },
    assumptions,
    requiredInputs: Object.freeze([...new Set(requiredInputs)]),
    confirmationInputs: Object.freeze([...new Set(confirmationInputs)]),
    userInputs: {
      nvidiaSoftwareUSD: hasExplicitFiniteNumber(nvidiaSoftwareUSD) ? Number(nvidiaSoftwareUSD) : null,
      supportUSD: hasExplicitFiniteNumber(supportUSD) ? Number(supportUSD) : null,
      professionalServicesUSD: hasExplicitFiniteNumber(professionalServicesUSD) ? Number(professionalServicesUSD) : null,
      storageUSD: hasExplicitFiniteNumber(storageUSD) ? Number(storageUSD) : null,
      adminFteAnnualUSD: hasExplicitFiniteNumber(adminFteAnnualUSD) ? Number(adminFteAnnualUSD) : null,
      serverPowerKW: hasExplicitPositiveNumber(serverPowerKW) ? Number(serverPowerKW) : null,
    },
    note: clientReady
      ? "Directional TCO using explicit sourced/planning inputs."
      : directionalReady
        ? "Planning TCO is available from an explicitly labeled hardware estimate; replace the estimate with a configured OEM/CDW quote before client-ready use."
        : "Directional TCO requires the remaining commercial/workload inputs. This policy deliberately avoids the legacy DGX $600K cluster allowance and DGX fabric assumptions.",
  };
}
