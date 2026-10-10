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

export const FABRIC_LINK_MEDIA = Object.freeze({
  OPTICAL: "optical",
  DAC: "dac",
});

export const FABRIC_PRICE_SOURCE = Object.freeze({
  EST: "EST",
  CUSTOMER: "CUSTOMER",
  QUOTE: "QUOTE",
});

export const FABRIC_PORT_SOURCE = Object.freeze({
  EST: "EST",
  LISTED: "LISTED",
  CUSTOMER: "CUSTOMER",
  QUOTE: "QUOTE",
});

export const STORAGE_FABRIC_MODE = Object.freeze({
  CONVERGED: "converged",
  SEPARATE: "separate",
});

function n(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalNumber(value) {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function calculateNetworkFabric(inputs) {
  const technology = Object.values(FABRIC_TECHNOLOGY).includes(inputs.technology) ? inputs.technology : FABRIC_TECHNOLOGY.INFINIBAND;
  const linkGbps = Object.values(FABRIC_SPEED).includes(Number(inputs.linkGbps)) ? Number(inputs.linkGbps) : FABRIC_SPEED.G400;
  const linkMedia = Object.values(FABRIC_LINK_MEDIA).includes(inputs.linkMedia) ? inputs.linkMedia : FABRIC_LINK_MEDIA.OPTICAL;
  const priceSource = Object.values(FABRIC_PRICE_SOURCE).includes(inputs.priceSource) ? inputs.priceSource : FABRIC_PRICE_SOURCE.EST;
  const fabricPortsPerSystemSource = Object.values(FABRIC_PORT_SOURCE).includes(inputs.fabricPortsPerSystemSource) ? inputs.fabricPortsPerSystemSource : FABRIC_PORT_SOURCE.EST;
  const fabricPortsPerSystemNote = String(inputs.fabricPortsPerSystemNote || "").trim();
  const storageFabricMode = Object.values(STORAGE_FABRIC_MODE).includes(inputs.storageFabricMode) ? inputs.storageFabricMode : STORAGE_FABRIC_MODE.SEPARATE;
  const storageConverged = storageFabricMode === STORAGE_FABRIC_MODE.CONVERGED;
  const gpuSystems = Math.max(1, Math.ceil(n(inputs.gpuSystems, 1)));
  const fabricPortsPerSystem = Math.max(1, Math.ceil(n(inputs.fabricPortsPerSystem, 1)));
  const storageAggregateGbps = Math.max(0, n(inputs.storageAggregateGbps));
  const storagePorts = Math.max(0, Math.ceil(n(inputs.storagePorts)));
  const storagePortsInFabric = storageConverged ? storagePorts : 0;
  const managementPorts = Math.max(0, Math.ceil(n(inputs.managementPorts)));
  const uplinkPorts = Math.max(0, Math.ceil(n(inputs.uplinkPorts)));
  const switchRadix = Math.max(8, Math.ceil(n(inputs.switchRadix, 64)));
  const targetOversubscription = Math.max(1, n(inputs.targetOversubscription, 1));
  const switchPowerKw = Math.max(0, n(inputs.switchPowerKw, 1.5));
  const cableCost = Math.max(0, n(inputs.cableCost));
  const switchCost = Math.max(0, n(inputs.switchCost));
  const transceiverCost = Math.max(0, n(inputs.transceiverCost));

  const computeEndpointPorts = gpuSystems * fabricPortsPerSystem;
  const dataPlaneEndpointPorts = computeEndpointPorts + storagePortsInFabric;
  const effectiveDownlinkBudgetPerSwitch = Math.max(1, Math.floor(switchRadix / (1 + 1 / targetOversubscription)));
  const leafSwitches = Math.max(1, Math.ceil(dataPlaneEndpointPorts / effectiveDownlinkBudgetPerSwitch));
  const usedLeafDownlinks = dataPlaneEndpointPorts;
  const leafUplinksPerSwitch = Math.max(1, switchRadix - effectiveDownlinkBudgetPerSwitch);
  const requiredLeafUplinks = leafSwitches * leafUplinksPerSwitch;

  const spineSwitches = leafSwitches <= 1 ? 0 : Math.ceil(requiredLeafUplinks / switchRadix);
  const leafCountFitsSpineRadix = leafSwitches <= switchRadix;
  const spineCountFitsLeafUplinks = spineSwitches <= leafUplinksPerSwitch;
  const twoTierFeasible = leafSwitches <= 1 || (leafCountFitsSpineRadix && spineCountFitsLeafUplinks);
  const requiresAdditionalTier = leafSwitches > 1 && !twoTierFeasible;

  const totalSwitches = leafSwitches + spineSwitches;
  const interSwitchLinks = leafSwitches <= 1 ? 0 : requiredLeafUplinks;
  const highSpeedFabricLinks = dataPlaneEndpointPorts + interSwitchLinks + uplinkPorts;
  const totalTransceivers = linkMedia === FABRIC_LINK_MEDIA.OPTICAL ? highSpeedFabricLinks * 2 : 0;
  const portHeadroom = leafSwitches * effectiveDownlinkBudgetPerSwitch - dataPlaneEndpointPorts;

  const theoreticalStorageGbps = storageConverged ? storagePorts * linkGbps : 0;
  const storageBandwidthFit = storageConverged ? storageAggregateGbps <= theoreticalStorageGbps : null;
  const aggregateFabricEdgeGbps = computeEndpointPorts * linkGbps;
  const estimatedSwitchPowerKw = totalSwitches * switchPowerKw;
  const estimatedCapitalCost = totalSwitches * switchCost + highSpeedFabricLinks * cableCost + totalTransceivers * transceiverCost;

  const topology = leafSwitches === 1 ? "single-tier" : twoTierFeasible ? "leaf-spine" : "multi-tier-review";
  const flags = [];
  if (fabricPortsPerSystemSource === FABRIC_PORT_SOURCE.EST) flags.push(`${fabricPortsPerSystem} high-speed fabric ports per GPU system is a planning estimate. Replace or confirm it from a listed system/OEM port map, customer standard, or quote before treating the BOM as authoritative.`);
  if (fabricPortsPerSystemSource !== FABRIC_PORT_SOURCE.EST && !fabricPortsPerSystemNote) flags.push(`Fabric port-count source is marked ${fabricPortsPerSystemSource}, but no supporting basis/note is recorded. Add the system/OEM/customer/quote reference before client use.`);
  if (storageConverged && !storageBandwidthFit) flags.push(`Storage requires ${storageAggregateGbps.toFixed(1)} Gbps but ${storagePorts} storage ports at ${linkGbps} Gbps provide ${theoreticalStorageGbps.toFixed(1)} Gbps theoretical edge bandwidth.`);
  if (!storageConverged && storageAggregateGbps > 0) flags.push("Storage networking is modeled as separate from this high-speed compute fabric. Accepted Storage bandwidth remains a dependency/reference but does not consume compute-fabric switch ports, links, optics/cables, or switch power in this plan.");
  if (portHeadroom < Math.ceil(dataPlaneEndpointPorts * 0.1)) flags.push("Less than 10% data-plane endpoint-port headroom remains in the calculated leaf tier; consider additional growth capacity.");
  if (requiresAdditionalTier) flags.push(`The calculated two-tier fabric is not physically feasible with ${leafSwitches} leaf switches, ${spineSwitches} spine switches, and ${switchRadix}-port switches. This fleet exceeds the modeled leaf/spine connectivity envelope and requires additional-tier or alternate-topology engineering; switch count, power, cabling, optics, and CAPEX are lower-bound planning values only.`);
  if (managementPorts > 0) flags.push(`${managementPorts} management ports are tracked as out-of-band/control-plane demand and are intentionally excluded from high-speed fabric switch, optic, cable, and power sizing.`);
  if (switchCost === 0) flags.push("Switch cost is unresolved; fabric economics remain unresolved until a supported unit cost is supplied.");
  if (cableCost === 0) flags.push("Cable/DAC cost is unresolved and is excluded from current capital-cost output.");
  if (linkMedia === FABRIC_LINK_MEDIA.OPTICAL && transceiverCost === 0) flags.push("Optical transceiver economics are unresolved and are excluded from current capital-cost output.");
  if (linkMedia === FABRIC_LINK_MEDIA.DAC) flags.push("Direct-attach cabling selected. Separate optical transceivers are intentionally not counted or priced; engineering must confirm DAC reach and compatibility for the planned topology.");
  if (technology === FABRIC_TECHNOLOGY.ETHERNET) flags.push("Generic Ethernet selected. The tool sizes ports and bandwidth only; congestion-control, lossless behavior, routing, QoS, and implementation design remain engineering scope.");

  return {
    inputs: {
      technology,
      linkGbps,
      linkMedia,
      priceSource,
      storageFabricMode,
      gpuSystems,
      fabricPortsPerSystem,
      fabricPortsPerSystemSource,
      fabricPortsPerSystemNote,
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
    fabricPortBasis: {
      portsPerGpuSystem: fabricPortsPerSystem,
      source: fabricPortsPerSystemSource,
      note: fabricPortsPerSystemNote || null,
      status: fabricPortsPerSystemSource === FABRIC_PORT_SOURCE.EST ? "PLANNING-ASSUMPTION" : fabricPortsPerSystemNote ? "SUPPORTED" : "SOURCE-NOTE-MISSING",
      authoritative: fabricPortsPerSystemSource !== FABRIC_PORT_SOURCE.EST && Boolean(fabricPortsPerSystemNote),
    },
    storageFabric: {
      mode: storageFabricMode,
      converged: storageConverged,
      acceptedStorageBandwidthGbps: storageAggregateGbps,
      requestedStoragePorts: storagePorts,
      portsIncludedInHighSpeedFabric: storagePortsInFabric,
      status: storageConverged ? "CONVERGED" : "SEPARATE",
      note: storageConverged
        ? "Storage-facing ports and bandwidth are included in this high-speed fabric sizing envelope."
        : "Storage networking is separate from this high-speed compute fabric and is not included in its switch/media/power/CAPEX quantities.",
    },
    topology,
    topologyFeasibility: {
      twoTierFeasible,
      requiresAdditionalTier,
      leafCountFitsSpineRadix,
      spineCountFitsLeafUplinks,
      switchRadix,
      leafSwitches,
      spineSwitches,
      leafUplinksPerSwitch,
      maxLeafSwitchesPerSpinePlane: switchRadix,
      status: twoTierFeasible ? "FEASIBLE" : "ENGINEERING-REVIEW",
      note: twoTierFeasible
        ? "The calculated single-tier or leaf/spine structure fits the modeled switch-radix connectivity envelope."
        : "Aggregate port arithmetic alone is insufficient at this scale. Additional-tier or alternate-topology engineering is required before BOM, power, and CAPEX are treated as resolved.",
    },
    ports: {
      computeEndpointPorts,
      storagePorts: storagePortsInFabric,
      requestedStoragePorts: storagePorts,
      dataPlaneEndpointPorts,
      endpointPorts: dataPlaneEndpointPorts,
      managementPorts,
      managementPortsExcludedFromFabric: true,
      effectiveDownlinkBudgetPerSwitch,
      usedLeafDownlinks,
      portHeadroom,
      leafUplinksPerSwitch,
      interSwitchLinks,
      uplinkPorts,
      highSpeedFabricLinks,
      totalLinks: highSpeedFabricLinks,
      totalTransceivers,
    },
    media: {
      type: linkMedia,
      opticalTransceiversRequired: linkMedia === FABRIC_LINK_MEDIA.OPTICAL,
      transceiverCount: totalTransceivers,
      engineeringNote: linkMedia === FABRIC_LINK_MEDIA.DAC
        ? "DAC reach/compatibility must be confirmed by engineering."
        : "Optical media modeled as two transceivers per high-speed link.",
    },
    pricing: {
      source: priceSource,
      switchCost,
      cableCost,
      transceiverCost: linkMedia === FABRIC_LINK_MEDIA.OPTICAL ? transceiverCost : 0,
    },
    switches: { leaf: leafSwitches, spine: spineSwitches, total: totalSwitches },
    bandwidth: {
      aggregateFabricEdgeGbps,
      storageRequiredGbps: storageAggregateGbps,
      storageTheoreticalGbps: theoreticalStorageGbps,
      storageBandwidthFit,
      storageCheckApplicable: storageConverged,
    },
    estimatedSwitchPowerKw,
    estimatedCapitalCost,
    flags,
    methodology: {
      fabricPortBasis: `${fabricPortsPerSystem} high-speed fabric ports per GPU system from ${fabricPortsPerSystemSource}${fabricPortsPerSystemNote ? ` (${fabricPortsPerSystemNote})` : ""}; this count drives compute endpoint-port, switch, media, power, and CAPEX sizing`,
      endpointPorts: storageConverged
        ? "GPU-system fabric ports + explicitly converged storage-facing ports; management/control-plane ports are tracked separately"
        : "GPU-system fabric ports only; storage and management/control-plane networks are tracked separately and excluded from high-speed compute-fabric sizing",
      leafSizing: "data-plane endpoint ports ÷ calculated leaf downlink budget from switch radix and target oversubscription",
      spineSizing: "leaf uplink demand ÷ switch radix, followed by a two-tier connectivity-feasibility check",
      topologyFeasibility: "a modeled two-tier fabric is feasible only when every spine can reach the leaf set within switch radix and each leaf can reach the spine set within its uplink-port budget",
      media: linkMedia === FABRIC_LINK_MEDIA.DAC ? "one direct-attach cable per high-speed link; separate optical transceivers = 0" : "one cable plus two optical transceivers per high-speed link",
      managementScope: "management/control-plane connectivity is a separate network requirement; this planner does not size its switches, optics/cabling, or power",
      storageCheck: storageConverged
        ? "accepted Storage aggregate bandwidth compared with explicitly converged storage-facing high-speed fabric port bandwidth"
        : "not applicable to the compute-fabric BOM because storage networking is explicitly modeled as separate",
      scope: "planning-level data-plane port, bandwidth, rack-power and cost envelope; not a routing/QoS/cabling implementation design",
    },
  };
}

export function validateNetworkFabricInputs(inputs) {
  const errors = [];
  const warnings = [];
  const linkMedia = Object.values(FABRIC_LINK_MEDIA).includes(inputs.linkMedia) ? inputs.linkMedia : FABRIC_LINK_MEDIA.OPTICAL;
  const storageFabricMode = Object.values(STORAGE_FABRIC_MODE).includes(inputs.storageFabricMode) ? inputs.storageFabricMode : STORAGE_FABRIC_MODE.SEPARATE;
  const fabricPortsPerSystemSource = Object.values(FABRIC_PORT_SOURCE).includes(inputs.fabricPortsPerSystemSource) ? inputs.fabricPortsPerSystemSource : FABRIC_PORT_SOURCE.EST;
  const gpuSystems = optionalNumber(inputs.gpuSystems);
  const fabricPortsPerSystem = optionalNumber(inputs.fabricPortsPerSystem);
  const switchRadix = optionalNumber(inputs.switchRadix);
  const targetOversubscription = optionalNumber(inputs.targetOversubscription);
  const switchPowerKw = optionalNumber(inputs.switchPowerKw);
  const storageAggregateGbps = optionalNumber(inputs.storageAggregateGbps);
  const storagePorts = optionalNumber(inputs.storagePorts);
  const managementPorts = optionalNumber(inputs.managementPorts);
  const switchCost = optionalNumber(inputs.switchCost);
  const cableCost = optionalNumber(inputs.cableCost);
  const transceiverCost = optionalNumber(inputs.transceiverCost);

  if (!(gpuSystems >= 1)) errors.push("At least one GPU system is required.");
  if (!(fabricPortsPerSystem >= 1)) errors.push("Fabric ports per system must be at least 1.");
  if (fabricPortsPerSystemSource === FABRIC_PORT_SOURCE.EST) warnings.push("Fabric ports per GPU system is still an EST planning assumption. Confirm the count from a listed system/OEM port map, customer standard, or quote before treating the fabric BOM as authoritative.");
  if (fabricPortsPerSystemSource !== FABRIC_PORT_SOURCE.EST && !String(inputs.fabricPortsPerSystemNote || "").trim()) warnings.push(`Fabric port-count source is ${fabricPortsPerSystemSource}, but its supporting basis/note is blank.`);
  if (!(switchRadix >= 8)) errors.push("Switch radix must be at least 8 ports.");
  if (!(targetOversubscription >= 1)) errors.push("Target oversubscription must be 1.0 or greater.");
  if (!(switchPowerKw > 0)) errors.push("Switch power is required and must be greater than 0 kW.");
  if (storageFabricMode === STORAGE_FABRIC_MODE.CONVERGED && storageAggregateGbps == null) errors.push("Converged storage bandwidth cannot be blank.");
  if (storageFabricMode === STORAGE_FABRIC_MODE.CONVERGED && storageAggregateGbps > 0 && !(storagePorts >= 1)) errors.push("Converged storage bandwidth is non-zero but no storage-facing high-speed fabric ports are defined.");
  if (storageFabricMode === STORAGE_FABRIC_MODE.SEPARATE && storagePorts > 0) warnings.push("Storage networking is separate; entered storage-facing port count is retained as a reference but excluded from this high-speed compute-fabric BOM.");
  if (managementPorts > 0) warnings.push("Management/control-plane ports are tracked separately and are not included in the high-speed fabric BOM, transceiver count, switch power, or leaf/spine sizing.");
  if (switchCost == null || switchCost === 0) warnings.push("Switch pricing is unresolved; capital cost is incomplete.");
  if (cableCost == null || cableCost === 0) warnings.push("Cable/DAC pricing is unresolved; capital cost is incomplete.");
  if (linkMedia === FABRIC_LINK_MEDIA.OPTICAL && (transceiverCost == null || transceiverCost === 0)) warnings.push("Optical media is selected but transceiver pricing is unresolved; capital cost is incomplete.");
  if (linkMedia === FABRIC_LINK_MEDIA.DAC) warnings.push("DAC media selected. Validate reach and hardware compatibility during engineering review; zero transceiver cost is valid in this mode.");
  return { valid: errors.length === 0, errors, warnings };
}
