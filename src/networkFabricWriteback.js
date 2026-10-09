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
  const fleet = makeFleetIdentity({ systemCount: result.inputs.gpuSystems, source: "network-fabric" });
  return fingerprintInputs({
    ...baseInputsFromResult(result),
    fleet,
    gpuSystems: result.inputs.gpuSystems,
    upstreamStorageFingerprint,
    switches: result.switches,
    ports: result.ports,
    topologyFeasibility: result.topologyFeasibility,
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
    const signature = `${sized.switches.leaf}:${sized.switches.spine}:${sized.ports.totalLinks}:${sized.topologyFeasibility.status}:${Math.round(sized.estimatedCapitalCost)}`;
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

export function buildNetworkFabricWritebackBundle(result, inputs, { upstreamStorageFingerprint = null } = {}) {
  const validation = validateNetworkFabricInputs(inputs);
  if (!validation.valid) {
    throw new Error(`Cannot stage Network Fabric write-back: ${validation.errors.join(" ")}`);
  }

  const fleet = makeFleetIdentity({ systemCount: result.inputs.gpuSystems, source: "network-fabric" });
  const fingerprint = networkFabricFingerprint(result, upstreamStorageFingerprint);
  const schedule = buildFabricStepSchedule(result);
  const pricingResolved = result.inputs.switchCost > 0 && result.inputs.cableCost > 0 && result.inputs.transceiverCost > 0;
  const topologyResolved = Boolean(result.topologyFeasibility?.twoTierFeasible);
  const costResolved = pricingResolved && topologyResolved;

  const overrides = costResolved ? [createPhase2Override({
    id: "network.fabric.capex.current-fleet",
    target: "tco.network.fabric.capex.currentFleet",
    value: Math.round(result.estimatedCapitalCost),
    unit: "USD",
    sourceTool: "network-fabric",
    provenance: makeProvenance({
      source: PHASE2_SOURCE.EST,
      derivation: PHASE2_DERIVATION.CALCULATED,
      label: "Current-fleet high-speed fabric capital-cost envelope from switch, cable, and transceiver planning inputs",
    }),
    dependencies: {
      fabricFingerprint: fingerprint,
      fleet,
      gpuSystems: result.inputs.gpuSystems,
      upstreamStorageFingerprint,
      topologyFeasibility: result.topologyFeasibility,
      schedule,
    },
    referenceValue: null,
  })] : [];

  return {
    schemaVersion: 3,
    sourceTool: "network-fabric",
    acceptedAt: new Date().toISOString(),
    fingerprint,
    fleet,
    upstreamStorageFingerprint,
    pricingResolved,
    topologyResolved,
    costResolved,
    costStatus: costResolved ? "EST" : topologyResolved ? "UNRESOLVED-PRICING" : "ENGINEERING-REVIEW",
    overrides,
    requirements: {
      technology: result.inputs.technology,
      linkGbps: result.inputs.linkGbps,
      topology: result.topology,
      topologyFeasibility: result.topologyFeasibility,
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
          ? "Planning-level high-speed fabric CAPEX is available from explicit unit-cost assumptions. Management/control-plane networking remains outside this CAPEX envelope."
          : "High-speed fabric requirement is accepted, but no CAPEX override is eligible until switch, cable, and transceiver prices are all supplied. Management/control-plane networking remains separate scope.",
    },
  };
}
