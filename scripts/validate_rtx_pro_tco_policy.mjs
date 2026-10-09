import { buildRtxProSingleServerTcoPolicy } from "../src/rtxProTcoPolicy.js";

const blocked = buildRtxProSingleServerTcoPolicy({ gpuCount: 2 });
if (blocked.clientReady || blocked.status !== "INPUTS_REQUIRED") {
  throw new Error("RTX PRO TCO must stay blocked until all required commercial/workload inputs are supplied.");
}
for (const required of [
  "NVIDIA software/support entitlement",
  "OEM/server support",
  "professional services / implementation",
  "workload-derived storage",
  "incremental administration / operations labor",
  "full configured-server power draw",
]) {
  if (!blocked.requiredInputs.includes(required)) throw new Error(`Missing RTX TCO required-input guard: ${required}`);
}
if (blocked.assumptions.managementControlPlaneCapexUSD !== 0 || blocked.assumptions.fabricCapexUSD !== 0 || blocked.assumptions.rackCapexUSD !== 0) {
  throw new Error("Single-server RTX should use explicit EST incremental-zero assumptions only when existing management/Ethernet/rack capacity are selected.");
}
if (JSON.stringify(blocked).includes("600000") || JSON.stringify(blocked).includes("54323") || JSON.stringify(blocked).includes("23443") || JSON.stringify(blocked).includes("14227")) {
  throw new Error("RTX PRO TCO policy must not inherit legacy DGX cluster/fabric allowances.");
}
if (blocked.userInputs.storageUSD !== null) {
  throw new Error("RTX PRO TCO must not invent a universal storage default.");
}

const ready2 = buildRtxProSingleServerTcoPolicy({
  gpuCount: 2,
  nvidiaSoftwareUSD: 1,
  supportUSD: 1,
  professionalServicesUSD: 1,
  storageUSD: 1,
  adminFteAnnualUSD: 1,
  serverPowerKW: 1,
});
if (!ready2.clientReady || ready2.hardware.configuredSystemPriceUSD !== 66680.45) {
  throw new Error("2-GPU RTX PRO policy must reconcile to the admitted configured public-list hardware anchor after required inputs are supplied.");
}

const ready4 = buildRtxProSingleServerTcoPolicy({
  gpuCount: 4,
  nvidiaSoftwareUSD: 1,
  supportUSD: 1,
  professionalServicesUSD: 1,
  storageUSD: 1,
  adminFteAnnualUSD: 1,
  serverPowerKW: 1,
});
if (!ready4.clientReady || ready4.hardware.configuredSystemPriceUSD !== 127673) {
  throw new Error("4-GPU RTX PRO policy must reconcile to the admitted configured public-list hardware anchor after required inputs are supplied.");
}

const blocked8 = buildRtxProSingleServerTcoPolicy({
  gpuCount: 8,
  nvidiaSoftwareUSD: 1,
  supportUSD: 1,
  professionalServicesUSD: 1,
  storageUSD: 1,
  adminFteAnnualUSD: 1,
  serverPowerKW: 1,
});
if (blocked8.clientReady || !blocked8.requiredInputs.includes("configured 8-GPU OEM/CDW server price")) {
  throw new Error("8-GPU RTX PRO TCO must remain blocked until a configured OEM/CDW server price is admitted.");
}

const noExistingInfra = buildRtxProSingleServerTcoPolicy({
  gpuCount: 2,
  existingServerManagement: false,
  existingEthernet: false,
  existingRackCapacity: false,
  nvidiaSoftwareUSD: 1,
  supportUSD: 1,
  professionalServicesUSD: 1,
  storageUSD: 1,
  adminFteAnnualUSD: 1,
  serverPowerKW: 1,
});
if (noExistingInfra.clientReady) throw new Error("RTX PRO TCO must require customer/quote inputs when existing management, Ethernet, or rack capacity cannot be assumed.");

console.log("RTX PRO single-server TCO policy validation PASS");
console.log("- 2/4-GPU public hardware anchors reconcile");
console.log("- 8-GPU configured hardware remains quote-required");
console.log("- software/support/services/storage/admin/power cannot become implicit zeroes");
console.log("- legacy DGX cluster/fabric allowances do not leak into RTX");
