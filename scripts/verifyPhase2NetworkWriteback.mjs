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

const schedule = buildFabricStepSchedule(result, { maxFleetSystems: 64 });
assert.ok(schedule.length > 1, "fabric should scale in infrastructure steps");
assert.equal(schedule[0].minSystems, 1);
assert.ok(schedule.at(-1).maxSystems >= 64);
for (const step of schedule) {
  assert.ok(step.minSystems <= step.maxSystems);
  assert.ok(step.totalSwitches > 0);
}

const storageFingerprint = "p2-storage-test";
const fingerprint = networkFabricFingerprint(result, storageFingerprint);
assert.match(fingerprint, /^p2-/);

const bundle = buildNetworkFabricWritebackBundle(result, inputs, { upstreamStorageFingerprint: storageFingerprint });
assert.equal(bundle.sourceTool, "network-fabric");
assert.equal(bundle.upstreamStorageFingerprint, storageFingerprint);
assert.equal(bundle.requirements.switchPowerKw, result.estimatedSwitchPowerKw);
assert.equal(bundle.overrides.length, 1);
assert.equal(bundle.overrides[0].target, "tco.network.fabric.capex.currentFleet");
assert.equal(bundle.overrides[0].unit, "USD");
assert.equal(bundle.costResolved, true);
assert.ok(bundle.requirements.fleetStepSchedule.length > 1);

const unresolvedInputs = { ...inputs, switchCost: 0, cableCost: 0, transceiverCost: 0 };
const unresolved = calculateNetworkFabric(unresolvedInputs);
const unresolvedBundle = buildNetworkFabricWritebackBundle(unresolved, unresolvedInputs);
assert.equal(unresolvedBundle.costResolved, false);
assert.equal(unresolvedBundle.overrides[0].provenance.source, "QUOTE");

console.log("Phase 2 Wave 4B network write-back verification: PASS");
