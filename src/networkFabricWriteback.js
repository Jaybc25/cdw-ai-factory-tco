import {
  PHASE2_DERIVATION,
  PHASE2_SOURCE,
  createPhase2Override,
  fingerprintInputs,
  makeProvenance,
} from "./phase2Contract.js";
import { makeFleetIdentity } from "./phase2Fleet.js";
import { calculateNetworkFabric, validateNetworkFabricInputs } from "./networkFabricEngine.js";

function baseInputsFromResult(result) {
  return {
    technology: result.inputs.technology,
    linkGbps: result.inputs.linkGbps,
    linkMedia: result.inputs.linkMedia,
    priceSource: result.inputs.priceSource,
    storageFabricMode: result.inputs.storageFabricMode,
    fabricPortsPerSystem: result.inputs.fabricPortsPerSystem,
    fabricPortsPerSystemSource: result.inputs.fabricPortsPerSystemSource,
    fabricPortsPerSystemNote: result.inputs.fabricPortsPerSystemNote,
    storageAggregateGbps: result.inputs.storageAggregateGbps,
    storagePorts: result.inputs.storagePorts,
    managementPorts: result.inputs.managementPorts,
    uplinkPorts: result.inputs.uplinkPorts,
    switchRadix: result.inputs.switchRadix,
    targetOversubscription: result.inputs.targetOversubscription,
    switchPowerKw: result.inputs.switchPowerKw,
    switchCost: result.inputs.switchCost,
    cableCost: result.inputs.cableCost,
    transceiverCost: result.inputs.transceiverCost,
  };
}

export function networkFabricFingerprint(result, upstreamStorageFingerprint = null) {
  const fleet = makeFleetIdentity({ systemCount: result.inputs.gpuSystems, source: "network-fabric" });
  return fingerprintInputs({
    ...baseInputsFromResult(result),
    fleet,
    gpuSystems: result.inputs.gpuSystems,
    upstreamStorageFingerprint,
    fabricPortBasis: result.fabricPortBasis,
    storageFabric: result.storageFabric,
    switches: result.switches,
    ports: result.ports,
    topologyFeasibility: result.topologyFeasibility,
    media: result.media,
    pricing: result.pricing,
  });
}

export function buildFabricStepSchedule(result, { maxFleetSystems = null } = {}) {
  const current = Math.max(1, result.inputs.gpuSystems);
  const maxSystems = Math.max(current, Math.min(256, maxFleetSystems || Math.max(64, current * 4)));
  const baseInputs = baseInputsFromResult(result);
  const schedule = [];
  let priorSignature = null;

  for (let systems = 1; systems <= maxSystems; systems += 1) {
    const sized = calculateNetworkFabric({ ...baseInputs, gpuSystems: systems });
    const signature = `${sized.switches.leaf}:${sized.switches.spine}:${sized.ports.totalLinks}:${sized.ports.totalTransceivers}:${sized.topologyFeasibility.status}:${Math.round(sized.estimatedCapitalCost)}`;
    if (signature !== priorSignature) {
      schedule.push({
        minSystems: systems,
        maxSystems: systems,
        leafSwitches: sized.switches.leaf,
        spineSwitches: sized.switches.spine,
        totalSwitches: sized.switches.total,
        totalLinks: sized.ports.totalLinks,
        transceivers: sized.ports.totalTransceivers,
        linkMedia: sized.media.type,
        switchPowerKw: sized.estimatedSwitchPowerKw,
        topology: sized.topology,
        topologyStatus: sized.topologyFeasibility.status,
        capitalCost: sized.topologyFeasibility.twoTierFeasible ? Math.round(sized.estimatedCapitalCost) : null,
      });
      priorSignature = signature;
    } else {
      schedule[schedule.length - 1].maxSystems = systems;
    }
  }

  return schedule;
}

function provenanceSource(priceSource) {
  if (priceSource === "QUOTE") return PHASE2_SOURCE.QUOTE;
  if (priceSource === "CUSTOMER") return PHASE2_SOURCE.CUSTOMER;
  return PHASE2_SOURCE.EST;
}

export function buildNetworkFabricWritebackBundle(result, inputs, { upstreamStorageFingerprint = null } = {}) {
  const validation = validateNetworkFabricInputs(inputs);
  if (!validation.valid) {
    throw new Error(`Cannot stage Network Fabric write-back: ${validation.errors.join(" ")}`);
  }

  const fleet = makeFleetIdentity({ systemCount: result.inputs.gpuSystems, source: "network-fabric" });
  const fingerprint = networkFabricFingerprint(result, upstreamStorageFingerprint);
  const schedule = buildFabricStepSchedule(result);
  const optical = result.media?.type === "optical";
  const pricingResolved = result.inputs.switchCost > 0 && result.inputs.cableCost > 0 && (!optical || result.inputs.transceiverCost > 0);
  const topologyResolved = Boolean(result.topologyFeasibility?.twoTierFeasible);
  const costResolved = pricingResolved && topologyResolved;
  const priceSource = result.inputs.priceSource || "EST";
  const source = provenanceSource(priceSource);

  const overrides = costResolved ? [createPhase2Override({
    id: "network.fabric.capex.current-fleet",
    target: "tco.network.fabric.capex.currentFleet",
    value: Math.round(result.estimatedCapitalCost),
    unit: "USD",
    sourceTool: "network-fabric",
    provenance: makeProvenance({
      source,
      derivation: PHASE2_DERIVATION.CALCULATED,
      label: `${priceSource} high-speed fabric unit pricing × calculated switch/media quantities (${result.media.type}); ${result.fabricPortBasis.portsPerGpuSystem} ports/GPU system from ${result.fabricPortBasis.source}; storage ${result.storageFabric.converged ? "converged into" : "separate from"} this fabric`,
    }),
    dependencies: {
      fabricFingerprint: fingerprint,
      fleet,
      gpuSystems: result.inputs.gpuSystems,
      upstreamStorageFingerprint,
      fabricPortBasis: result.fabricPortBasis,
      storageFabric: result.storageFabric,
      topologyFeasibility: result.topologyFeasibility,
      media: result.media,
      pricing: result.pricing,
      schedule,
    },
    referenceValue: null,
  })] : [];

  return {
    schemaVersion: 6,
    sourceTool: "network-fabric",
    acceptedAt: new Date().toISOString(),
    fingerprint,
    fleet,
    upstreamStorageFingerprint,
    pricingResolved,
    topologyResolved,
    costResolved,
    costStatus: costResolved ? priceSource : topologyResolved ? "UNRESOLVED-PRICING" : "ENGINEERING-REVIEW",
    priceSource,
    overrides,
    requirements: {
      technology: result.inputs.technology,
      linkGbps: result.inputs.linkGbps,
      topology: result.topology,
      topologyFeasibility: result.topologyFeasibility,
      fabricPortBasis: result.fabricPortBasis,
      storageFabric: result.storageFabric,
      media: result.media,
      pricing: result.pricing,
      switches: result.switches,
      ports: result.ports,
      bandwidth: result.bandwidth,
      switchPowerKw: result.estimatedSwitchPowerKw,
      management: {
        ports: result.inputs.managementPorts,
        excludedFromHighSpeedFabricSizing: true,
        sizingStatus: result.inputs.managementPorts > 0 ? "REQUIREMENT-ONLY" : "NOT-SPECIFIED",
        note: "Management/control-plane connectivity is carried as a separate requirement. Its switches, optics/cabling, rack footprint, power, and cost are not included in this high-speed fabric plan.",
      },
      currentFleetSystems: result.inputs.gpuSystems,
      capitalCostCurrentFleet: costResolved ? Math.round(result.estimatedCapitalCost) : null,
      fleetStepSchedule: schedule,
      flags: result.flags,
      validationWarnings: validation.warnings,
      costNote: !topologyResolved
        ? "The current fleet exceeds the modeled two-tier topology envelope. Fabric switch count, power, cabling, optics, and CAPEX remain lower-bound planning values only; no TCO CAPEX override is eligible until engineering resolves the topology."
        : costResolved
          ? `${priceSource} high-speed fabric pricing is resolved for ${result.media.type} media. The GPU-system port-count basis is ${result.fabricPortBasis.source}${result.fabricPortBasis.note ? ` (${result.fabricPortBasis.note})` : ""}. Storage networking is ${result.storageFabric.converged ? "explicitly converged into" : "explicitly separate from"} this fabric. Management/control-plane networking remains outside this CAPEX envelope.`
          : optical
            ? `High-speed optical fabric requirement is accepted, but no CAPEX override is eligible until switch, cable, and transceiver prices are supplied. GPU-system port-count basis: ${result.fabricPortBasis.source}. Storage networking is ${result.storageFabric.converged ? "converged" : "separate"}.`
            : `High-speed DAC fabric requirement is accepted, but no CAPEX override is eligible until switch and DAC cable prices are supplied. GPU-system port-count basis: ${result.fabricPortBasis.source}. Storage networking is ${result.storageFabric.converged ? "converged" : "separate"}. Separate optical transceiver pricing is not required in DAC mode.`,
    },
  };
}
