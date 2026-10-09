export const FABRIC_TECHNOLOGY = Object.freeze({
  INFINIBAND: "infiniband",
  SPECTRUM_X: "spectrum-x",
  ETHERNET: "ethernet",
});

export const FABRIC_SPEED = Object.freeze({
  G200: 200,
  G400: 400,
  G800: 800,
});

function n(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function calculateNetworkFabric(inputs) {
  const technology = Object.values(FABRIC_TECHNOLOGY).includes(inputs.technology) ? inputs.technology : FABRIC_TECHNOLOGY.INFINIBAND;
  const linkGbps = Object.values(FABRIC_SPEED).includes(Number(inputs.linkGbps)) ? Number(inputs.linkGbps) : FABRIC_SPEED.G400;
  const gpuSystems = Math.max(1, Math.ceil(n(inputs.gpuSystems, 1)));
  const fabricPortsPerSystem = Math.max(1, Math.ceil(n(inputs.fabricPortsPerSystem, 1)));
  const storageAggregateGbps = Math.max(0, n(inputs.storageAggregateGbps));
  const storagePorts = Math.max(0, Math.ceil(n(inputs.storagePorts)));
  const managementPorts = Math.max(0, Math.ceil(n(inputs.managementPorts)));
  const uplinkPorts = Math.max(0, Math.ceil(n(inputs.uplinkPorts)));
  const switchRadix = Math.max(8, Math.ceil(n(inputs.switchRadix, 64)));
  const targetOversubscription = Math.max(1, n(inputs.targetOversubscription, 1));
  const switchPowerKw = Math.max(0, n(inputs.switchPowerKw, 1.5));
  const cableCost = Math.max(0, n(inputs.cableCost));
  const switchCost = Math.max(0, n(inputs.switchCost));
  const transceiverCost = Math.max(0, n(inputs.transceiverCost));

  const computeEndpointPorts = gpuSystems * fabricPortsPerSystem;
  const endpointPorts = computeEndpointPorts + storagePorts + managementPorts;
  const effectiveDownlinkBudgetPerSwitch = Math.max(1, Math.floor(switchRadix / (1 + 1 / targetOversubscription)));
  const leafSwitches = Math.max(1, Math.ceil(endpointPorts / effectiveDownlinkBudgetPerSwitch));
  const usedLeafDownlinks = endpointPorts;
  const leafUplinksPerSwitch = Math.max(1, switchRadix - effectiveDownlinkBudgetPerSwitch);
  const requiredLeafUplinks = leafSwitches * leafUplinksPerSwitch;

  const spineSwitches = leafSwitches <= 1 ? 0 : Math.ceil(requiredLeafUplinks / switchRadix);
  const totalSwitches = leafSwitches + spineSwitches;
  const interSwitchLinks = leafSwitches <= 1 ? 0 : requiredLeafUplinks;
  const totalLinks = endpointPorts + interSwitchLinks + uplinkPorts;
  const totalTransceivers = totalLinks * 2;
  const portHeadroom = leafSwitches * effectiveDownlinkBudgetPerSwitch - endpointPorts;

  const theoreticalStorageGbps = storagePorts * linkGbps;
  const storageBandwidthFit = storageAggregateGbps <= theoreticalStorageGbps;
  const aggregateFabricEdgeGbps = computeEndpointPorts * linkGbps;
  const estimatedSwitchPowerKw = totalSwitches * switchPowerKw;
  const estimatedCapitalCost = totalSwitches * switchCost + totalLinks * cableCost + totalTransceivers * transceiverCost;

  const topology = leafSwitches === 1 ? "single-tier" : "leaf-spine";
  const flags = [];
  if (!storageBandwidthFit) flags.push(`Storage requires ${storageAggregateGbps.toFixed(1)} Gbps but ${storagePorts} storage ports at ${linkGbps} Gbps provide ${theoreticalStorageGbps.toFixed(1)} Gbps theoretical edge bandwidth.`);
  if (portHeadroom < Math.ceil(endpointPorts * 0.1)) flags.push("Less than 10% endpoint-port headroom remains in the calculated leaf tier; consider additional growth capacity.");
  if (switchCost === 0) flags.push("Switch cost is unresolved; fabric economics remain QUOTE/EST until a validated BOM or price book is supplied.");
  if (cableCost === 0 || transceiverCost === 0) flags.push("Cable/transceiver economics are unresolved and are excluded from current capital-cost output.");
  if (technology === FABRIC_TECHNOLOGY.ETHERNET) flags.push("Generic Ethernet selected. The tool sizes ports and bandwidth only; congestion-control, lossless behavior, routing, QoS, and implementation design remain engineering scope.");

  return {
    inputs: {
      technology,
      linkGbps,
      gpuSystems,
      fabricPortsPerSystem,
      storageAggregateGbps,
      storagePorts,
      managementPorts,
      uplinkPorts,
      switchRadix,
      targetOversubscription,
      switchPowerKw,
      cableCost,
      switchCost,
      transceiverCost,
    },
    topology,
    ports: {
      computeEndpointPorts,
      storagePorts,
      managementPorts,
      endpointPorts,
      effectiveDownlinkBudgetPerSwitch,
      portHeadroom,
      leafUplinksPerSwitch,
      interSwitchLinks,
      uplinkPorts,
      totalLinks,
      totalTransceivers,
    },
    switches: { leaf: leafSwitches, spine: spineSwitches, total: totalSwitches },
    bandwidth: {
      aggregateFabricEdgeGbps,
      storageRequiredGbps: storageAggregateGbps,
      storageTheoreticalGbps: theoreticalStorageGbps,
      storageBandwidthFit,
    },
    estimatedSwitchPowerKw,
    estimatedCapitalCost,
    flags,
    methodology: {
      endpointPorts: "GPU systems × fabric ports/system + storage ports + management ports",
      leafSizing: "endpoint ports ÷ calculated leaf downlink budget from switch radix and target oversubscription",
      spineSizing: "leaf uplink demand ÷ switch radix",
      storageCheck: "accepted Storage aggregate bandwidth compared with storage-facing port bandwidth",
      scope: "planning-level port, bandwidth, rack-power and cost envelope; not a routing/QoS/cabling implementation design",
    },
  };
}

export function validateNetworkFabricInputs(inputs) {
  const errors = [];
  const warnings = [];
  if (n(inputs.gpuSystems) < 1) errors.push("At least one GPU system is required.");
  if (n(inputs.fabricPortsPerSystem) < 1) errors.push("Fabric ports per system must be at least 1.");
  if (n(inputs.switchRadix) < 8) errors.push("Switch radix must be at least 8 ports.");
  if (n(inputs.targetOversubscription, 1) < 1) errors.push("Target oversubscription must be 1.0 or greater.");
  if (n(inputs.storageAggregateGbps) > 0 && n(inputs.storagePorts) < 1) errors.push("Storage bandwidth is non-zero but no storage-facing fabric ports are defined.");
  if (n(inputs.switchCost) === 0) warnings.push("Switch pricing is unresolved; capital cost is incomplete.");
  return { valid: errors.length === 0, errors, warnings };
}
