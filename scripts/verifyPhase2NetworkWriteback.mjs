import assert from "node:assert/strict";
import { calculateNetworkFabric } from "../src/networkFabricEngine.js";
import { buildNetworkFabricWritebackBundle, buildFabricStepSchedule, networkFabricFingerprint } from "../src/networkFabricWriteback.js";

const inputs = {
  technology: "infiniband",
  linkGbps: 400,
  linkMedia: "optical",
  priceSource: "EST",
  gpuSystems: 8,
  fabricPortsPerSystem: 8,
  storageAggregateGbps: 400,
  storagePorts: 2,
  managementPorts: 8,
  uplinkPorts: 2,
  switchRadix: 64,
  targetOversubscription: 1,
  switchPowerKw: 1.5,
  switchCost: 20000,
  cableCost: 500,
  transceiverCost: 750,
};

const result = calculateNetworkFabric(inputs);
assert.ok(result.switches.total > 0);
assert.ok(result.estimatedSwitchPowerKw > 0);
assert.equal(result.bandwidth.storageBandwidthFit, true);
assert.equal(result.topologyFeasibility.twoTierFeasible, true);
assert.equal(result.ports.managementPortsExcludedFromFabric, true);
assert.equal(result.ports.endpointPorts, result.ports.computeEndpointPorts + result.ports.storagePorts);
assert.equal(result.media.type, "optical");
assert.equal(result.pricing.source, "EST");

const schedule = buildFabricStepSchedule(result, { maxFleetSystems: 64 });
assert.ok(schedule.length > 1, "fabric should scale in infrastructure steps");
assert.equal(schedule[0].minSystems, 1);
assert.ok(schedule.at(-1).maxSystems >= 64);
for (const step of schedule) {
  assert.ok(step.minSystems <= step.maxSystems);
  assert.ok(step.totalSwitches > 0);
  assert.ok(["FEASIBLE", "ENGINEERING-REVIEW"].includes(step.topologyStatus));
  assert.ok(["optical", "dac"].includes(step.linkMedia));
  if (step.topologyStatus === "ENGINEERING-REVIEW") assert.equal(step.capitalCost, null);
}

const storageFingerprint = "p2-storage-test";
const fingerprint = networkFabricFingerprint(result, storageFingerprint);
assert.match(fingerprint, /^p2-/);

const bundle = buildNetworkFabricWritebackBundle(result, inputs, { upstreamStorageFingerprint: storageFingerprint });
assert.equal(bundle.schemaVersion, 4);
assert.equal(bundle.sourceTool, "network-fabric");
assert.equal(bundle.upstreamStorageFingerprint, storageFingerprint);
assert.equal(bundle.requirements.switchPowerKw, result.estimatedSwitchPowerKw);
assert.equal(bundle.requirements.topologyFeasibility.twoTierFeasible, true);
assert.equal(bundle.requirements.media.type, "optical");
assert.equal(bundle.requirements.pricing.source, "EST");
assert.equal(bundle.requirements.management.ports, 8);
assert.equal(bundle.requirements.management.excludedFromHighSpeedFabricSizing, true);
assert.equal(bundle.requirements.management.sizingStatus, "REQUIREMENT-ONLY");
assert.match(bundle.requirements.management.note, /separate requirement/i);
assert.match(bundle.requirements.costNote, /management\/control-plane networking remains outside/i);
assert.equal(bundle.overrides.length, 1);
assert.equal(bundle.overrides[0].target, "tco.network.fabric.capex.currentFleet");
assert.equal(bundle.overrides[0].unit, "USD");
assert.equal(bundle.overrides[0].provenance.source, "EST");
assert.match(bundle.overrides[0].provenance.label, /EST high-speed fabric unit pricing/i);
assert.equal(bundle.pricingResolved, true);
assert.equal(bundle.topologyResolved, true);
assert.equal(bundle.costResolved, true);
assert.equal(bundle.costStatus, "EST");
assert.equal(bundle.priceSource, "EST");
assert.ok(bundle.requirements.fleetStepSchedule.length > 1);

const quoteInputs = { ...inputs, priceSource: "QUOTE" };
const quote = calculateNetworkFabric(quoteInputs);
const quoteBundle = buildNetworkFabricWritebackBundle(quote, quoteInputs);
assert.equal(quoteBundle.costResolved, true);
assert.equal(quoteBundle.costStatus, "QUOTE");
assert.equal(quoteBundle.overrides[0].provenance.source, "QUOTE");

const customerInputs = { ...inputs, priceSource: "CUSTOMER" };
const customer = calculateNetworkFabric(customerInputs);
const customerBundle = buildNetworkFabricWritebackBundle(customer, customerInputs);
assert.equal(customerBundle.costResolved, true);
assert.equal(customerBundle.costStatus, "CUSTOMER");
assert.equal(customerBundle.overrides[0].provenance.source, "CUSTOMER");

const dacInputs = {
  ...inputs,
  linkMedia: "dac",
  priceSource: "QUOTE",
  transceiverCost: 0,
};
const dac = calculateNetworkFabric(dacInputs);
const dacBundle = buildNetworkFabricWritebackBundle(dac, dacInputs);
assert.equal(dac.ports.totalTransceivers, 0);
assert.equal(dacBundle.pricingResolved, true, "DAC pricing can resolve with zero separate transceiver cost");
assert.equal(dacBundle.costResolved, true);
assert.equal(dacBundle.costStatus, "QUOTE");
assert.equal(dacBundle.overrides.length, 1);
assert.equal(dacBundle.overrides[0].provenance.source, "QUOTE");
assert.equal(dacBundle.requirements.media.type, "dac");
assert.match(dacBundle.requirements.costNote, /DAC/i);

const unresolvedOpticalInputs = { ...inputs, switchCost: 20000, cableCost: 500, transceiverCost: 0 };
const unresolvedOptical = calculateNetworkFabric(unresolvedOpticalInputs);
const unresolvedOpticalBundle = buildNetworkFabricWritebackBundle(unresolvedOptical, unresolvedOpticalInputs);
assert.equal(unresolvedOpticalBundle.pricingResolved, false);
assert.equal(unresolvedOpticalBundle.topologyResolved, true);
assert.equal(unresolvedOpticalBundle.costResolved, false);
assert.equal(unresolvedOpticalBundle.costStatus, "UNRESOLVED-PRICING");
assert.equal(unresolvedOpticalBundle.overrides.length, 0, "Unresolved optical pricing must not create a TCO override");
assert.equal(unresolvedOpticalBundle.requirements.capitalCostCurrentFleet, null);
assert.match(unresolvedOpticalBundle.requirements.costNote, /switch, cable, and transceiver prices/i);

const unresolvedInputs = { ...inputs, switchCost: 0, cableCost: 0, transceiverCost: 0 };
const unresolved = calculateNetworkFabric(unresolvedInputs);
const unresolvedBundle = buildNetworkFabricWritebackBundle(unresolved, unresolvedInputs);
assert.equal(unresolvedBundle.pricingResolved, false);
assert.equal(unresolvedBundle.topologyResolved, true);
assert.equal(unresolvedBundle.costResolved, false);
assert.equal(unresolvedBundle.costStatus, "UNRESOLVED-PRICING");
assert.equal(unresolvedBundle.overrides.length, 0, "Unresolved Fabric pricing must not create a zero-dollar TCO override");
assert.equal(unresolvedBundle.requirements.capitalCostCurrentFleet, null);
assert.match(unresolvedBundle.requirements.costNote, /no CAPEX override is eligible/i);

const infeasibleInputs = {
  ...inputs,
  gpuSystems: 512,
  storageAggregateGbps: 0,
  storagePorts: 0,
  managementPorts: 0,
};
const infeasible = calculateNetworkFabric(infeasibleInputs);
assert.equal(infeasible.topologyFeasibility.twoTierFeasible, false);
const infeasibleBundle = buildNetworkFabricWritebackBundle(infeasible, infeasibleInputs);
assert.equal(infeasibleBundle.pricingResolved, true);
assert.equal(infeasibleBundle.topologyResolved, false);
assert.equal(infeasibleBundle.costResolved, false);
assert.equal(infeasibleBundle.costStatus, "ENGINEERING-REVIEW");
assert.equal(infeasibleBundle.overrides.length, 0, "Topology-infeasible fabric must not create a TCO CAPEX override");
assert.equal(infeasibleBundle.requirements.capitalCostCurrentFleet, null);
assert.match(infeasibleBundle.requirements.costNote, /additional-tier or alternate-topology engineering/i);

const noManagement = calculateNetworkFabric({ ...inputs, managementPorts: 0 });
const noManagementBundle = buildNetworkFabricWritebackBundle(noManagement, { ...inputs, managementPorts: 0 });
assert.equal(noManagementBundle.requirements.management.sizingStatus, "NOT-SPECIFIED");
assert.equal(noManagementBundle.requirements.management.ports, 0);

console.log("Phase 2 Wave 4B network write-back verification: PASS");
