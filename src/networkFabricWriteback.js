import {
  PHASE2_DERIVATION,
  PHASE2_SOURCE,
  createPhase2Override,
  fingerprintInputs,
  makeProvenance,
} from "./phase2Contract.js";
import { calculateNetworkFabric, validateNetworkFabricInputs } from "./networkFabricEngine.js";

function baseInputsFromResult(result) {
  return {
    technology: result.inputs.technology,
    linkGbps: result.inputs.linkGbps,
    fabricPortsPerSystem: result.inputs.fabricPortsPerSystem,
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
  return fingerprintInputs({
    ...baseInputsFromResult(result),
    gpuSystems: result.inputs.gpuSystems,
    upstreamStorageFingerprint,
    switches: result.switches,
    ports: result.ports,
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
    const signature = `${sized.switches.leaf}:${sized.switches.spine}:${sized.ports.totalLinks}:${Math.round(sized.estimatedCapitalCost)}`;
    if (signature !== priorSignature) {
      schedule.push({
        minSystems: systems,
        maxSystems: systems,
        leafSwitches: sized.switches.leaf,
        spineSwitches: sized.switches.spine,
        totalSwitches: sized.switches.total,
        totalLinks: sized.ports.totalLinks,
        transceivers: sized.ports.totalTransceivers,
        switchPowerKw: sized.estimatedSwitchPowerKw,
        capitalCost: Math.round(sized.estimatedCapitalCost),
      });
      priorSignature = signature;
    } else {
      schedule[schedule.length - 1].maxSystems = systems;
    }
  }

  return schedule;
}

export function buildNetworkFabricWritebackBundle(result, inputs, { upstreamStorageFingerprint = null } = {}) {
  const validation = validateNetworkFabricInputs(inputs);
  if (!validation.valid) {
    throw new Error(`Cannot stage Network Fabric write-back: ${validation.errors.join(" ")}`);
  }

  const fingerprint = networkFabricFingerprint(result, upstreamStorageFingerprint);
  const schedule = buildFabricStepSchedule(result);
  const costResolved = result.inputs.switchCost > 0 && result.inputs.cableCost > 0 && result.inputs.transceiverCost > 0;

  const overrides = costResolved ? [createPhase2Override({
    id: "network.fabric.capex.current-fleet",
    target: "tco.network.fabric.capex.currentFleet",
    value: Math.round(result.estimatedCapitalCost),
    unit: "USD",
    sourceTool: "network-fabric",
    provenance: makeProvenance({
      source: PHASE2_SOURCE.EST,
      derivation: PHASE2_DERIVATION.CALCULATED,
      label: "Current-fleet fabric capital-cost envelope from switch, cable, and transceiver planning inputs",
    }),
    dependencies: {
      fabricFingerprint: fingerprint,
      gpuSystems: result.inputs.gpuSystems,
      upstreamStorageFingerprint,
      schedule,
    },
    referenceValue: null,
  })] : [];

  return {
    schemaVersion: 1,
    sourceTool: "network-fabric",
    acceptedAt: new Date().toISOString(),
    fingerprint,
    upstreamStorageFingerprint,
    costResolved,
    costStatus: costResolved ? "EST" : "UNRESOLVED",
    overrides,
    requirements: {
      technology: result.inputs.technology,
      linkGbps: result.inputs.linkGbps,
      topology: result.topology,
      switches: result.switches,
      ports: result.ports,
      bandwidth: result.bandwidth,
      switchPowerKw: result.estimatedSwitchPowerKw,
      currentFleetSystems: result.inputs.gpuSystems,
      capitalCostCurrentFleet: costResolved ? Math.round(result.estimatedCapitalCost) : null,
      fleetStepSchedule: schedule,
      flags: result.flags,
      validationWarnings: validation.warnings,
      costNote: costResolved
        ? "Planning-level fabric CAPEX is available from explicit unit-cost assumptions."
        : "Fabric requirement is accepted, but no CAPEX override is eligible until switch, cable, and transceiver prices are all supplied.",
    },
  };
}
