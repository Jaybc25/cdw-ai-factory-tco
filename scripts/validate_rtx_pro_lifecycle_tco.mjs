import { buildRtxProLifecycleTco } from "../src/rtxProLifecycleTco.js";

const annual = buildRtxProLifecycleTco({
  hardwareUSD: 66680.45,
  managementControlPlaneCapexUSD: 0,
  fabricCapexUSD: 0,
  rackCapexUSD: 0,
  nvidiaSoftwareUSD: 10000,
  nvidiaSoftwareBasis: "annual",
  supportUSD: 6000,
  supportBasis: "annual",
  professionalServicesUSD: 5000,
  storageUSD: 20000,
  adminFteAnnualUSD: 15000,
  serverPowerKW: 2,
  powerBurdenPerKwMonth: 200,
  horizonYears: 3,
});
if (!annual.clientReady) throw new Error("Annual-basis RTX lifecycle case should be ready.");
const expectedAnnualPower = 2 * 200 * 12;
const expectedAnnualTotal = 66680.45 + 5000 + 20000 + (10000 * 3) + (6000 * 3) + (15000 * 3) + (expectedAnnualPower * 3);
if (annual.annualFacilityPowerUSD !== expectedAnnualPower || Math.abs(annual.totalTcoUSD - expectedAnnualTotal) > 1e-9) {
  throw new Error("Annual-basis RTX lifecycle total does not reconcile exactly.");
}

const term = buildRtxProLifecycleTco({
  hardwareUSD: 127673,
  managementControlPlaneCapexUSD: 0,
  fabricCapexUSD: 0,
  rackCapexUSD: 0,
  nvidiaSoftwareUSD: 24000,
  nvidiaSoftwareBasis: "term-total",
  nvidiaSoftwareCoverageYears: 3,
  supportUSD: 12000,
  supportBasis: "term-total",
  supportCoverageYears: 3,
  professionalServicesUSD: 7500,
  storageUSD: 30000,
  adminFteAnnualUSD: 20000,
  serverPowerKW: 3.2,
  powerBurdenPerKwMonth: 180,
  horizonYears: 3,
});
if (!term.clientReady) throw new Error("Full-horizon term-total RTX lifecycle case should be ready.");
if (term.software.lifecycleUSD !== 24000 || term.support.lifecycleUSD !== 12000) {
  throw new Error("Term-total commercial inputs must not be multiplied by horizon.");
}

const shortTerm = buildRtxProLifecycleTco({
  hardwareUSD: 66680.45,
  managementControlPlaneCapexUSD: 0,
  fabricCapexUSD: 0,
  rackCapexUSD: 0,
  nvidiaSoftwareUSD: 10000,
  nvidiaSoftwareBasis: "term-total",
  nvidiaSoftwareCoverageYears: 1,
  supportUSD: 5000,
  supportBasis: "annual",
  professionalServicesUSD: 0,
  storageUSD: 0,
  adminFteAnnualUSD: 0,
  serverPowerKW: 2,
  powerBurdenPerKwMonth: 150,
  horizonYears: 3,
});
if (shortTerm.clientReady || !shortTerm.requiredInputs.some((item) => item.includes("term coverage"))) {
  throw new Error("Term-total quote shorter than the TCO horizon must remain blocked instead of inventing renewal pricing.");
}

const missingPower = buildRtxProLifecycleTco({
  hardwareUSD: 66680.45,
  managementControlPlaneCapexUSD: 0,
  fabricCapexUSD: 0,
  rackCapexUSD: 0,
  nvidiaSoftwareUSD: 0,
  nvidiaSoftwareBasis: "annual",
  supportUSD: 0,
  supportBasis: "annual",
  professionalServicesUSD: 0,
  storageUSD: 0,
  adminFteAnnualUSD: 0,
  serverPowerKW: null,
  powerBurdenPerKwMonth: 150,
  horizonYears: 3,
});
if (missingPower.clientReady || !missingPower.requiredInputs.includes("full configured-server power draw")) {
  throw new Error("Missing configured-server power must block lifecycle TCO.");
}

console.log("RTX PRO lifecycle TCO validation PASS");
console.log("- annual commercial inputs multiply by horizon");
console.log("- full-horizon term-total inputs are counted once");
console.log("- short term-total coverage is blocked; renewal pricing is not invented");
console.log("- facility power = server kW × $/kW-month × 12 × horizon");
