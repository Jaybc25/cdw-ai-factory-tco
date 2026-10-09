import assert from "node:assert/strict";
import {
  calculateNetworkFabric,
  validateNetworkFabricInputs,
  FABRIC_TECHNOLOGY,
  FABRIC_LINK_MEDIA,
  FABRIC_PRICE_SOURCE,
  FABRIC_PORT_SOURCE,
  STORAGE_FABRIC_MODE,
} from "../src/networkFabricEngine.js";

const base = {
  technology: FABRIC_TECHNOLOGY.INFINIBAND,
  linkGbps: 400,
  linkMedia: FABRIC_LINK_MEDIA.OPTICAL,
  priceSource: FABRIC_PRICE_SOURCE.EST,
  storageFabricMode: STORAGE_FABRIC_MODE.CONVERGED,
  gpuSystems: 8,
  fabricPortsPerSystem: 8,
  fabricPortsPerSystemSource: FABRIC_PORT_SOURCE.EST,
  fabricPortsPerSystemNote: "",
  storageAggregateGbps: 400,
  storagePorts: 2,
  managementPorts: 8,
  uplinkPorts: 2,
  switchRadix: 64,
  targetOversubscription: 1,
  switchPowerKw: 1.5,
  switchCost: 0,
  cableCost: 0,
  transceiverCost: 0,
};

const result = calculateNetworkFabric(base);
assert.equal(result.inputs.linkMedia, "optical");
assert.equal(result.inputs.priceSource, "EST");
assert.equal(result.fabricPortBasis.portsPerGpuSystem, 8);
assert.equal(result.fabricPortBasis.source, "EST");
assert.equal(result.fabricPortBasis.status, "PLANNING-ASSUMPTION");
assert.equal(result.fabricPortBasis.authoritative, false);
assert.ok(result.flags.some((x) => x.includes("planning estimate")));
assert.equal(result.storageFabric.converged, true);
assert.equal(result.storageFabric.status, "CONVERGED");
assert.equal(result.ports.computeEndpointPorts, 64);
assert.equal(result.ports.storagePorts, 2);
assert.equal(result.ports.dataPlaneEndpointPorts, 66);
assert.equal(result.ports.endpointPorts, 66, "management ports must not consume high-speed fabric leaf ports");
assert.equal(result.ports.managementPorts, 8);
assert.equal(result.ports.managementPortsExcludedFromFabric, true);
assert.ok(result.switches.total >= 1);
assert.equal(result.bandwidth.storageBandwidthFit, true);
assert.equal(result.bandwidth.storageCheckApplicable, true);
assert.equal(result.topologyFeasibility.twoTierFeasible, true);
assert.equal(result.topologyFeasibility.status, "FEASIBLE");
assert.equal(result.media.opticalTransceiversRequired, true);
assert.equal(result.media.transceiverCount, result.ports.totalLinks * 2);
assert.ok(result.estimatedSwitchPowerKw > 0);
assert.ok(result.flags.some((x) => x.includes("management ports are tracked as out-of-band")));
assert.ok(result.flags.some((x) => x.includes("Switch cost is unresolved")));
assert.ok(result.flags.some((x) => x.includes("Optical transceiver economics are unresolved")));

const listedPortBasis = calculateNetworkFabric({
  ...base,
  fabricPortsPerSystemSource: FABRIC_PORT_SOURCE.LISTED,
  fabricPortsPerSystemNote: "OEM system port map",
});
assert.equal(listedPortBasis.fabricPortBasis.status, "SUPPORTED");
assert.equal(listedPortBasis.fabricPortBasis.authoritative, true);
assert.equal(listedPortBasis.fabricPortBasis.note, "OEM system port map");
assert.ok(!listedPortBasis.flags.some((x) => x.includes("planning estimate")));

const listedWithoutNote = calculateNetworkFabric({
  ...base,
  fabricPortsPerSystemSource: FABRIC_PORT_SOURCE.LISTED,
  fabricPortsPerSystemNote: "",
});
assert.equal(listedWithoutNote.fabricPortBasis.status, "SOURCE-NOTE-MISSING");
assert.equal(listedWithoutNote.fabricPortBasis.authoritative, false);
assert.ok(listedWithoutNote.flags.some((x) => x.includes("no supporting basis/note")));
const listedWithoutNoteValidation = validateNetworkFabricInputs({
  ...base,
  fabricPortsPerSystemSource: FABRIC_PORT_SOURCE.LISTED,
  fabricPortsPerSystemNote: "",
});
assert.ok(listedWithoutNoteValidation.warnings.some((x) => x.includes("supporting basis/note is blank")));

const separateStorage = calculateNetworkFabric({
  ...base,
  storageFabricMode: STORAGE_FABRIC_MODE.SEPARATE,
});
assert.equal(separateStorage.storageFabric.converged, false);
assert.equal(separateStorage.storageFabric.status, "SEPARATE");
assert.equal(separateStorage.ports.storagePorts, 0, "separate storage network must not consume high-speed compute-fabric ports");
assert.equal(separateStorage.ports.requestedStoragePorts, 2);
assert.equal(separateStorage.ports.dataPlaneEndpointPorts, 64);
assert.equal(separateStorage.bandwidth.storageBandwidthFit, null);
assert.equal(separateStorage.bandwidth.storageCheckApplicable, false);
assert.ok(separateStorage.flags.some((x) => x.includes("Storage networking is modeled as separate")));
assert.ok(separateStorage.switches.total <= result.switches.total);

const separateValidation = validateNetworkFabricInputs({
  ...base,
  storageFabricMode: STORAGE_FABRIC_MODE.SEPARATE,
});
assert.equal(separateValidation.valid, true);
assert.ok(separateValidation.warnings.some((x) => x.includes("Storage networking is separate")));

const dac = calculateNetworkFabric({
  ...base,
  linkMedia: FABRIC_LINK_MEDIA.DAC,
  switchCost: 20000,
  cableCost: 500,
  transceiverCost: 0,
  priceSource: FABRIC_PRICE_SOURCE.QUOTE,
});
assert.equal(dac.media.type, "dac");
assert.equal(dac.ports.totalTransceivers, 0, "DAC must not invent separate optical transceivers");
assert.equal(dac.media.opticalTransceiversRequired, false);
assert.equal(dac.pricing.source, "QUOTE");
assert.equal(dac.pricing.transceiverCost, 0);
assert.equal(dac.estimatedCapitalCost, dac.switches.total * 20000 + dac.ports.totalLinks * 500);
assert.ok(dac.flags.some((x) => x.includes("Direct-attach cabling selected")));
assert.ok(!dac.flags.some((x) => x.includes("Optical transceiver economics are unresolved")));
const dacValidation = validateNetworkFabricInputs({ ...base, linkMedia: FABRIC_LINK_MEDIA.DAC, switchCost: 20000, cableCost: 500, transceiverCost: 0 });
assert.equal(dacValidation.valid, true);
assert.ok(dacValidation.warnings.some((x) => x.includes("zero transceiver cost is valid")));
assert.ok(!dacValidation.warnings.some((x) => x.includes("transceiver pricing is unresolved")));

const withoutManagement = calculateNetworkFabric({ ...base, managementPorts: 0 });
assert.equal(result.switches.total, withoutManagement.switches.total, "management demand must not change high-speed switch count");
assert.equal(result.ports.totalTransceivers, withoutManagement.ports.totalTransceivers, "management demand must not change high-speed optic count");
assert.equal(result.estimatedSwitchPowerKw, withoutManagement.estimatedSwitchPowerKw, "management demand must not change high-speed switch power");
assert.equal(result.estimatedCapitalCost, withoutManagement.estimatedCapitalCost, "management demand must not change high-speed fabric CAPEX");

const validation = validateNetworkFabricInputs(base);
assert.equal(validation.valid, true);
assert.ok(validation.warnings.some((x) => x.includes("Fabric ports per GPU system is still an EST planning assumption")));
assert.ok(validation.warnings.some((x) => x.includes("Management/control-plane ports are tracked separately")));

const bandwidthFail = calculateNetworkFabric({ ...base, storageAggregateGbps: 1200, storagePorts: 2 });
assert.equal(bandwidthFail.bandwidth.storageBandwidthFit, false);
assert.ok(bandwidthFail.flags.some((x) => x.includes("Storage requires")));

const largeFleet = calculateNetworkFabric({
  ...base,
  gpuSystems: 512,
  fabricPortsPerSystem: 8,
  storagePorts: 0,
  storageAggregateGbps: 0,
  managementPorts: 0,
  switchRadix: 64,
  targetOversubscription: 1,
  switchCost: 20000,
  cableCost: 500,
  transceiverCost: 750,
});
assert.equal(largeFleet.topology, "multi-tier-review");
assert.equal(largeFleet.topologyFeasibility.twoTierFeasible, false);
assert.equal(largeFleet.topologyFeasibility.requiresAdditionalTier, true);
assert.equal(largeFleet.topologyFeasibility.status, "ENGINEERING-REVIEW");
assert.ok(largeFleet.flags.some((x) => x.includes("two-tier fabric is not physically feasible")));

const invalid = validateNetworkFabricInputs({ ...base, gpuSystems: 0 });
assert.equal(invalid.valid, false);

const ethernet = calculateNetworkFabric({ ...base, technology: FABRIC_TECHNOLOGY.ETHERNET });
assert.ok(ethernet.flags.some((x) => x.includes("Generic Ethernet selected")));

console.log("Wave 4A network fabric verification: PASS");
