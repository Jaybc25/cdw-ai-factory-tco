import fs from "node:fs";
import {
  CLOUD_GPU_RATES,
  ONPREM_SYSTEMS,
  GPU_SIZING_SYSTEM_MAP,
  GPU_SIZING_PRICE_USD,
} from "../src/pricingRegistry.js";

const errors = [];
const expectedProviders = ["AWS", "Azure", "GCP", "OCI", "CoreWeave"];
const expectedSizingClasses = ["H200", "B200", "GB200 NVL72", "B300"];

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

const tcoSource = fs.readFileSync(new URL("../src/TcoCalculator.jsx", import.meta.url), "utf8");
const sizingSource = fs.readFileSync(new URL("../src/GpuSizingCalculator.jsx", import.meta.url), "utf8");

if (/const\s+RATES\s*=/.test(tcoSource)) errors.push("TcoCalculator.jsx reintroduced a local RATES table");
if (/const\s+SYSTEMS\s*=/.test(tcoSource)) errors.push("TcoCalculator.jsx reintroduced a local SYSTEMS table");
if (/const\s+GPU_PRICE_USD\s*=/.test(sizingSource))
  errors.push("GpuSizingCalculator.jsx reintroduced a local GPU_PRICE_USD table");
if (!tcoSource.includes("CLOUD_GPU_RATES as RATES") || !tcoSource.includes("ONPREM_SYSTEMS as SYSTEMS")) {
  errors.push("TcoCalculator.jsx is not consuming the shared pricing registry");
}
if (!sizingSource.includes("GPU_SIZING_PRICE_USD as GPU_PRICE_USD")) {
  errors.push("GpuSizingCalculator.jsx is not consuming the shared pricing registry");
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
