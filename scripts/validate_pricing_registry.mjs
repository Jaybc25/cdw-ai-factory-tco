import fs from "node:fs";
import {
  CLOUD_GPU_RATES,
  ONPREM_SYSTEMS,
  GPU_SIZING_SYSTEM_MAP,
  GPU_SIZING_PRICE_USD,
} from "../src/pricingRegistry.js";
import {
  RTX_PRO_6000_GPU_SPEC,
  RTX_PRO_SERVER_CONFIGURATION_POLICY,
  RTX_PRO_SERVER_CONFIGS,
  RTX_PRO_CLOUD_COMPARATOR,
} from "../src/rtxProServerRegistry.js";

const errors = [];
const expectedProviders = ["AWS", "Azure", "GCP", "OCI", "CoreWeave"];
const expectedSizingClasses = ["B200", "GB200 NVL72", "B300"];

for (const provider of expectedProviders) {
  if (!CLOUD_GPU_RATES[provider]) errors.push(`Missing cloud provider ${provider}`);
}

for (const [provider, rates] of Object.entries(CLOUD_GPU_RATES)) {
  for (const [gpuClass, row] of Object.entries(rates)) {
    if (!Number.isFinite(row.od) || row.od <= 0) errors.push(`${provider}/${gpuClass}: invalid od rate`);
    if (!row.conf) errors.push(`${provider}/${gpuClass}: missing confidence`);
    if (!row.note) errors.push(`${provider}/${gpuClass}: missing source note`);
  }
}

if (CLOUD_GPU_RATES.AWS?.["B200-class"]?.res !== 8.545) {
  errors.push("AWS B200 reserved rate must preserve exact validated 8.545 per-GPU equivalent");
}

const sep2026Hardware = {
  "DGX B200": { list: 485000, sku: "DGXB-G1440+P1CMI36", loaded: 744793 },
  "DGX B300": { list: 615000, sku: "D0B3-G2304+P1CMI36", loaded: 874793 },
  "DGX GB200 NVL-72": { list: 4600000, sku: "DGXG-0072F+P1CMI36", loaded: 7841432 },
  "DGX GB300 NVL-72": { list: 6500000, sku: "DGB3-0072F+P1CMI36", loaded: 9741432 },
};

for (const [systemName, expected] of Object.entries(sep2026Hardware)) {
  const system = ONPREM_SYSTEMS[systemName];
  if (!system) {
    errors.push(`${systemName}: missing September 2026 on-prem system record`);
    continue;
  }
  if (system.hardwareListPrice !== expected.list) errors.push(`${systemName}: hardware list price must be ${expected.list}`);
  if (system.hardwareSku !== expected.sku) errors.push(`${systemName}: hardware SKU must be ${expected.sku}`);
  if (system.perSys !== expected.loaded) errors.push(`${systemName}: loaded-system planning cost must be ${expected.loaded}`);
  if (system.loadedAdders !== system.perSys - system.hardwareListPrice) {
    errors.push(`${systemName}: loadedAdders must reconcile exactly to perSys - hardwareListPrice`);
  }
  if (system.hardwarePriceAsOf !== "2026-09-08") errors.push(`${systemName}: hardware price verification date must be 2026-09-08`);
}

if (ONPREM_SYSTEMS["DGX B200"].loadedAdders !== ONPREM_SYSTEMS["DGX B300"].loadedAdders) {
  errors.push("B200 and B300 must preserve the same validated non-hardware loaded-system adders in this pricing-only refresh");
}
if (ONPREM_SYSTEMS["DGX GB200 NVL-72"].loadedAdders !== ONPREM_SYSTEMS["DGX GB300 NVL-72"].loadedAdders) {
  errors.push("GB200 and GB300 must preserve the same validated non-hardware loaded-system adders in this pricing-only refresh");
}

// Commercial eligibility is price-book gated for NVIDIA on-prem systems.
for (const retiredClass of ["A100", "H100", "H200"]) {
  if (GPU_SIZING_SYSTEM_MAP[retiredClass]) errors.push(`${retiredClass}: must not be mapped as a new on-prem GPU Sizing option`);
  if (GPU_SIZING_PRICE_USD[retiredClass]) errors.push(`${retiredClass}: must not have a new-purchase GPU Sizing price`);
}
if (ONPREM_SYSTEMS["DGX H200"]) errors.push("DGX H200: must not remain in the current on-prem purchase registry");

for (const [systemName, system] of Object.entries(ONPREM_SYSTEMS)) {
  if (!system.hardwareSku || !system.hardwareListPrice || !system.hardwarePriceAsOf) {
    errors.push(`${systemName}: current on-prem systems must be backed by an approved current NVIDIA price-book SKU`);
  }
}

for (const gpuClass of expectedSizingClasses) {
  const systemName = GPU_SIZING_SYSTEM_MAP[gpuClass];
  const system = ONPREM_SYSTEMS[systemName];
  const sizingPrice = GPU_SIZING_PRICE_USD[gpuClass];
  if (!systemName || !system) {
    errors.push(`${gpuClass}: missing shared system mapping`);
    continue;
  }
  if (!sizingPrice) {
    errors.push(`${gpuClass}: missing derived GPU Sizing price`);
    continue;
  }
  const expectedAmount = Math.round(system.perSys / system.gpus);
  if (sizingPrice.amount !== expectedAmount) {
    errors.push(`${gpuClass}: derived amount ${sizingPrice.amount} does not match ${systemName} ${expectedAmount}`);
  }
}

// Right-Sized Private AI evidence gate: RTX PRO is staged in its own registry
// until support/software/power and platform policy are resolved. This ensures
// that simply adding public server prices cannot activate a client-facing path.
if (RTX_PRO_6000_GPU_SPEC.vramGB !== 96 || RTX_PRO_6000_GPU_SPEC.powerMaxW !== 600) {
  errors.push("RTX PRO 6000 Server Edition must preserve NVIDIA's 96 GB / 600 W published specification basis");
}
if (JSON.stringify(RTX_PRO_SERVER_CONFIGURATION_POLICY.supportedGpuCounts) !== JSON.stringify([2, 4, 8])) {
  errors.push("RTX PRO server architecture must remain constrained to the admitted 2/4/8-GPU configuration classes");
}
if (RTX_PRO_SERVER_CONFIGURATION_POLICY.oneGpuProductionRecommended !== false) {
  errors.push("RTX PRO v1 must not create an inferred 1-GPU production server recommendation");
}
if (RTX_PRO_SERVER_CONFIGURATION_POLICY.multiGpuModelParallelAutonomous !== false) {
  errors.push("RTX PRO v1 must keep split-model multi-GPU serving behind engineering validation");
}

const rtx2 = RTX_PRO_SERVER_CONFIGS["RTX PRO 6000 Server 2-GPU"];
const rtx4 = RTX_PRO_SERVER_CONFIGS["RTX PRO 6000 Server 4-GPU"];
const rtx8 = RTX_PRO_SERVER_CONFIGS["RTX PRO 6000 Server 8-GPU"];
if (rtx2?.configuredSystemSku !== "SYS-212GB-FNR-01-G2" || rtx2?.configuredSystemPriceUSD !== 66680.45 || rtx2?.priceProvenance !== "LISTED") {
  errors.push("RTX PRO 2-GPU record must preserve the verified configured Supermicro public-list anchor");
}
if (rtx4?.configuredSystemSku !== "SYS-422GA-NRT-01-G2" || rtx4?.configuredSystemPriceUSD !== 127673 || rtx4?.priceProvenance !== "LISTED") {
  errors.push("RTX PRO 4-GPU record must preserve the verified configured Supermicro public-list anchor");
}
if (rtx8?.configuredSystemPriceUSD !== null || rtx8?.priceProvenance !== "QUOTE") {
  errors.push("RTX PRO 8-GPU record must remain quote/evidence-required; do not derive a configured price from barebones chassis + GPU arithmetic");
}
for (const row of Object.values(RTX_PRO_SERVER_CONFIGS)) {
  if (row.clientFacingReady !== false) errors.push(`${row.id}: staging registry must not activate client-facing RTX economics`);
  if (row.serverPowerKW !== null) errors.push(`${row.id}: server power must remain unresolved until an OEM/full-system value is admitted`);
  if (row.nvidiaSoftwareUSD !== null || row.supportTerm !== null) errors.push(`${row.id}: unresolved software/support must not be represented as zero-cost facts`);
}

const cloudRtxExpected = 0.00036522 * 3600 + (20 * 0.000018 * 3600) + (80 * 0.000002 * 3600);
if (Math.abs(RTX_PRO_CLOUD_COMPARATOR.minimumInstanceRatePerHourUSD - cloudRtxExpected) > 1e-9) {
  errors.push("Cloud Run RTX PRO comparator must include mandatory GPU + 20 vCPU + 80 GiB memory components");
}
if (RTX_PRO_CLOUD_COMPARATOR.gpuRatePerHourUSD === RTX_PRO_CLOUD_COMPARATOR.minimumInstanceRatePerHourUSD) {
  errors.push("Cloud Run GPU component rate must never masquerade as the total minimum instance rate");
}

// RTX staging must not leak into the existing active purchase registries yet.
for (const activeName of Object.keys(ONPREM_SYSTEMS)) {
  if (/RTX PRO/i.test(activeName)) errors.push("RTX PRO must remain staged outside ONPREM_SYSTEMS until its activation PR");
}
for (const activeClass of Object.keys(GPU_SIZING_SYSTEM_MAP)) {
  if (/RTX/i.test(activeClass)) errors.push("RTX PRO must remain staged outside GPU_SIZING_SYSTEM_MAP until sizing activation");
}

const tcoSource = fs.readFileSync(new URL("../src/TcoCalculator.jsx", import.meta.url), "utf8");
const sizingSource = fs.readFileSync(new URL("../src/GpuSizingCalculator.jsx", import.meta.url), "utf8");

if (/const\s+RATES\s*=/.test(tcoSource)) errors.push("TcoCalculator.jsx reintroduced a local RATES table");
if (/const\s+SYSTEMS\s*=/.test(tcoSource)) errors.push("TcoCalculator.jsx reintroduced a local SYSTEMS table");
if (/const\s+GPU_PRICE_USD\s*=/.test(sizingSource)) errors.push("GpuSizingCalculator.jsx reintroduced a local GPU_PRICE_USD table");
if (!tcoSource.includes("CLOUD_GPU_RATES as RATES") || !tcoSource.includes("ONPREM_SYSTEMS as SYSTEMS")) {
  errors.push("TcoCalculator.jsx is not consuming the shared pricing registry");
}
if (!sizingSource.includes("GPU_SIZING_PRICE_USD as GPU_PRICE_USD")) {
  errors.push("GpuSizingCalculator.jsx is not consuming the shared pricing registry");
}
if (!sizingSource.includes("].filter((gpu) => GPU_PRICE_USD[gpu.id]);")) {
  errors.push("GpuSizingCalculator.jsx must filter technical GPU references to current price-book-backed on-prem purchase classes");
}

if (errors.length) {
  console.error("Shared pricing registry validation FAILED:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Shared pricing registry validation PASS");
console.log(`Providers: ${Object.keys(CLOUD_GPU_RATES).join(", ")}`);
console.log(`On-prem systems: ${Object.keys(ONPREM_SYSTEMS).length}`);
console.log(`GPU Sizing classes derived from shared systems: ${expectedSizingClasses.join(", ")}`);
console.log("RTX PRO staging registry: 2/4 listed, 8 quote-required, client-facing activation blocked");
