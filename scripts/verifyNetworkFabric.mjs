import assert from "node:assert/strict";
import { calculateNetworkFabric, validateNetworkFabricInputs, FABRIC_TECHNOLOGY } from "../src/networkFabricEngine.js";

const base = {
  technology: FABRIC_TECHNOLOGY.INFINIBAND,
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
  switchCost: 0,
  cableCost: 0,
  transceiverCost: 0,
};

const result = calculateNetworkFabric(base);
assert.equal(result.ports.computeEndpointPorts, 64);
assert.equal(result.ports.endpointPorts, 74);
assert.ok(result.switches.total >= 1);
assert.equal(result.bandwidth.storageBandwidthFit, true);
assert.ok(result.estimatedSwitchPowerKw > 0);
assert.ok(result.flags.some((x) => x.includes("Switch cost is unresolved")));

const bandwidthFail = calculateNetworkFabric({ ...base, storageAggregateGbps: 1200, storagePorts: 2 });
assert.equal(bandwidthFail.bandwidth.storageBandwidthFit, false);
assert.ok(bandwidthFail.flags.some((x) => x.includes("Storage requires")));

const invalid = validateNetworkFabricInputs({ ...base, gpuSystems: 0 });
assert.equal(invalid.valid, false);

const ethernet = calculateNetworkFabric({ ...base, technology: FABRIC_TECHNOLOGY.ETHERNET });
assert.ok(ethernet.flags.some((x) => x.includes("Generic Ethernet selected")));

console.log("Wave 4A network fabric verification: PASS");
