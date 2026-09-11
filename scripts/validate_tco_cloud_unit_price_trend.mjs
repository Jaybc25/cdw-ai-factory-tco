import { cloudGpuUnitPriceFactor, trendCloudGpuCompute } from "../src/cloudUnitPriceTrend.js";
import fs from "node:fs";
function assert(c,m){ if(!c) throw new Error(m); }
function close(a,b,eps=1e-9){ return Math.abs(a-b) < eps; }

// UI stores percentage points (-20..+20), so +5 must mean +5%, not +500%.
assert(cloudGpuUnitPriceFactor(0, 4) === 1, "0% trend must preserve exact baseline");
assert(close(cloudGpuUnitPriceFactor(5, 1), 1.05), "+5% year 2 factor must be 1.05");
assert(close(cloudGpuUnitPriceFactor(5, 2), 1.1025), "+5% year 3 factor must compound to 1.1025");
assert(close(cloudGpuUnitPriceFactor(-5, 2), 0.9025), "-5% year 3 factor must compound to 0.9025");
assert(close(cloudGpuUnitPriceFactor(20, 1), 1.20), "+20% must mean +20%, not +2000%");

// Workload growth and unit-price trend compound independently.
assert(close(trendCloudGpuCompute(100, .25, -10, 1), 112.5), "25% workload growth with -10% unit-price trend must equal 112.5");
assert(close(trendCloudGpuCompute(100, .25, 10, 1), 137.5), "25% workload growth with +10% unit-price trend must equal 137.5");
assert(close(trendCloudGpuCompute(100, .25, 5, 2), 172.265625), "+5% percentage-point input must compound correctly across three modeled years");

const s=fs.readFileSync("src/TcoCalculator.jsx","utf8");
assert(s.includes("trendCloudGpuCompute(adjCloud.monthlyCompute"), "workload-mode cloud compute must use production price trend");
assert(s.includes("trendCloudGpuCompute(inp.bill * inp.computeShare"), "existing-spend mode must trend compute share only");
assert(!s.includes("Preview only — does not affect results yet."), "preview warning must be removed");
assert(s.includes("saved?.cloudUnitPriceTrend ?? 0"), "trend must persist with default 0% semantics");
assert(s.includes('min="-20" max="20" step="5"'), "UI trend control must remain percentage points");
assert(s.includes("CLOUD GPU PRICE SENSITIVITY"), "production control must sit in calculator flow");
console.log("TCO cloud unit-price trend PASS");
