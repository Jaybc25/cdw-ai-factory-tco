import assert from "node:assert/strict";
import { calculateNetworkFabric } from "../src/networkFabricEngine.js";
import { buildNetworkFabricWritebackBundle, buildFabricStepSchedule, networkFabricFingerprint } from "../src/networkFabricWriteback.js";

const inputs = {
  technology: "infiniband",
  linkGbps: 400,
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

const schedule = buildFabricStepSchedule(result, { maxFleetSystems: 64 });
assert.ok(schedule.length > 1, "fabric should scale in infrastructure steps");
assert.equal(schedule[0].minSystems, 1);
assert.ok(schedule.at(-1).maxSystems >= 64);
for (const step of schedule) {
  assert.ok(step.minSystems <= step.maxSystems);
  assert.ok(step.totalSwitches > 0);
  assert.ok(["FEASIBLE", "ENGINEERING-REVIEW"].includes(step.topologyStatus));
  if (step.topologyStatus === "ENGINEERING-REVIEW") assert.equal(step.capitalCost, null);
}

const storageFingerprint = "p2-storage-test";
const fingerprint = networkFabricFingerprint(result, storageFingerprint);
assert.match(fingerprint, /^p2-/);

const bundle = buildNetworkFabricWritebackBundle(result, inputs, { upstreamStorageFingerprint: storageFingerprint });
assert.equal(bundle.schemaVersion, 3);
assert.equal(bundle.sourceTool, "network-fabric");
assert.equal(bundle.upstreamStorageFingerprint, storageFingerprint);
assert.equal(bundle.requirements.switchPowerKw, result.estimatedSwitchPowerKw);
assert.equal(bundle.requirements.topologyFeasibility.twoTierFeasible, true);
assert.equal(bundle.requirements.management.ports, 8);
assert.equal(bundle.requirements.management.excludedFromHighSpeedFabricSizing, true);
assert.equal(bundle.requirements.management.sizingStatus, "REQUIREMENT-ONLY");
assert.match(bundle.requirements.management.note, /separate requirement/i);
assert.match(bundle.requirements.costNote, /management\/control-plane networking remains outside/i);
assert.equal(bundle.overrides.length, 1);
assert.equal(bundle.overrides[0].target, "tco.network.fabric.capex.currentFleet");
assert.equal(bundle.overrides[0].unit, "USD");
assert.equal(bundle.pricingResolved, true);
assert.equal(bundle.topologyResolved, true);
assert.equal(bundle.costResolved, true);
assert.equal(bundle.costStatus, "EST");
assert.ok(bundle.requirements.fleetStepSchedule.length > 1);

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
