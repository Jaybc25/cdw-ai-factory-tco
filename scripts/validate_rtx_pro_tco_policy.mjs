import { buildRtxProSingleServerTcoPolicy } from "../src/rtxProTcoPolicy.js";
import { buildRtxProTcoPlanningDefaults, effectiveFacilityRatePerKwMonth } from "../src/rtxProTcoPlanningDefaults.js";

const blocked = buildRtxProSingleServerTcoPolicy({ gpuCount: 2 });
if (blocked.clientReady || blocked.status !== "INPUTS_REQUIRED") {
  throw new Error("RTX PRO TCO policy must stay blocked until explicit commercial/workload values are supplied.");
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
if (blocked.userInputs.storageUSD !== null) throw new Error("Core RTX policy must not invent a storage default; planning defaults belong in the separate provenance layer.");

const defaults2 = buildRtxProTcoPlanningDefaults(2);
if (defaults2.nvidiaSoftwareUSD !== 9000) throw new Error("2-GPU NVIDIA AI Enterprise planning default must equal public list $4,500/GPU/year × 2.");
if (defaults2.supportUSD !== 6668 || defaults2.professionalServicesUSD !== 6668) throw new Error("2-GPU percentage planning allowances must reconcile to the listed configured-system price.");
if (defaults2.storageUSD !== 0 || defaults2.adminFteAnnualUSD !== 15000 || defaults2.serverPowerKW !== 1.8) throw new Error("2-GPU planning defaults changed unexpectedly.");
if (defaults2.provenance.supportUSD.source !== "EST" || defaults2.provenance.nvidiaSoftwareUSD.source !== "LISTED") throw new Error("RTX planning-default provenance must distinguish EST from LISTED.");

const defaults4 = buildRtxProTcoPlanningDefaults(4);
if (defaults4.nvidiaSoftwareUSD !== 18000 || defaults4.serverPowerKW !== 3.4) throw new Error("4-GPU planning defaults changed unexpectedly.");
if (defaults4.supportUSD !== 12767 || defaults4.professionalServicesUSD !== 12767) throw new Error("4-GPU percentage planning allowances must reconcile to the listed configured-system price.");

const defaults8 = buildRtxProTcoPlanningDefaults(8);
if (defaults8.supportUSD !== null || defaults8.professionalServicesUSD !== null) throw new Error("8-GPU quote-only hardware must not generate percentage support/services dollars from an invented hardware price.");

const ownedDcRate = effectiveFacilityRatePerKwMonth({ facilityMode: "owned-dc", electricityRatePerKwh: 0.1453, pue: 1.52, coloRatePerKwMonth: 300 });
if (Math.abs(ownedDcRate - (0.1453 * 730 * 1.52)) > 0.000001) throw new Error("Owned-DC facility normalization must be electricity $/kWh × 730 hours × PUE.");
const coloRate = effectiveFacilityRatePerKwMonth({ facilityMode: "colocation", electricityRatePerKwh: 0.1453, pue: 1.52, coloRatePerKwMonth: 300 });
if (coloRate !== 300) throw new Error("Colocation branch must use the explicit all-in $/kW-month input rather than owned-DC utility math.");

const ready2 = buildRtxProSingleServerTcoPolicy({
  gpuCount: 2,
  nvidiaSoftwareUSD: defaults2.nvidiaSoftwareUSD,
  supportUSD: defaults2.supportUSD,
  professionalServicesUSD: defaults2.professionalServicesUSD,
  storageUSD: defaults2.storageUSD,
  adminFteAnnualUSD: defaults2.adminFteAnnualUSD,
  serverPowerKW: defaults2.serverPowerKW,
});
if (!ready2.clientReady || ready2.hardware.configuredSystemPriceUSD !== 66680.45) throw new Error("2-GPU RTX PRO policy must reconcile after explicit planning values are supplied.");

const ready4 = buildRtxProSingleServerTcoPolicy({
  gpuCount: 4,
  nvidiaSoftwareUSD: defaults4.nvidiaSoftwareUSD,
  supportUSD: defaults4.supportUSD,
  professionalServicesUSD: defaults4.professionalServicesUSD,
  storageUSD: defaults4.storageUSD,
  adminFteAnnualUSD: defaults4.adminFteAnnualUSD,
  serverPowerKW: defaults4.serverPowerKW,
});
if (!ready4.clientReady || ready4.hardware.configuredSystemPriceUSD !== 127673) throw new Error("4-GPU RTX PRO policy must reconcile after explicit planning values are supplied.");

const blocked8 = buildRtxProSingleServerTcoPolicy({
  gpuCount: 8,
  nvidiaSoftwareUSD: defaults8.nvidiaSoftwareUSD,
  supportUSD: 1,
  professionalServicesUSD: 1,
  storageUSD: defaults8.storageUSD,
  adminFteAnnualUSD: defaults8.adminFteAnnualUSD,
  serverPowerKW: defaults8.serverPowerKW,
});
if (blocked8.clientReady || !blocked8.requiredInputs.includes("configured 8-GPU OEM/CDW server price")) throw new Error("8-GPU RTX PRO TCO must remain blocked until a configured OEM/CDW server price is admitted.");

const noExistingInfra = buildRtxProSingleServerTcoPolicy({
  gpuCount: 2,
  existingServerManagement: false,
  existingEthernet: false,
  existingRackCapacity: false,
  nvidiaSoftwareUSD: defaults2.nvidiaSoftwareUSD,
  supportUSD: defaults2.supportUSD,
  professionalServicesUSD: defaults2.professionalServicesUSD,
  storageUSD: defaults2.storageUSD,
  adminFteAnnualUSD: defaults2.adminFteAnnualUSD,
  serverPowerKW: defaults2.serverPowerKW,
});
if (noExistingInfra.clientReady) throw new Error("RTX PRO TCO must still require customer/quote inputs when existing management, Ethernet, or rack capacity cannot be assumed.");

console.log("RTX PRO single-server TCO policy validation PASS");
console.log("- core policy remains strict; planning defaults are a separate explicit layer");
console.log("- 2/4-GPU public hardware anchors reconcile");
console.log("- 8-GPU configured hardware remains quote-required");
console.log("- LISTED and EST provenance remain distinct");
console.log("- owned-DC utility/PUE and colocation $/kW-month branches reconcile");
console.log("- legacy DGX cluster/fabric allowances do not leak into RTX");
