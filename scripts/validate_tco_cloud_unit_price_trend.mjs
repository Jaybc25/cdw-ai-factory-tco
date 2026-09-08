import { cloudGpuUnitPriceFactor, trendCloudGpuCompute } from "../src/cloudUnitPriceTrend.js";
import fs from "node:fs";
function assert(c,m){ if(!c) throw new Error(m); }
assert(cloudGpuUnitPriceFactor(0, 4) === 1, "0% trend must preserve exact baseline");
assert(Math.abs(trendCloudGpuCompute(100, .25, -.10, 1) - 112.5) < 1e-9, "workload growth and price trend must compound independently");
assert(Math.abs(trendCloudGpuCompute(100, .25, .10, 1) - 137.5) < 1e-9, "positive price trend must compound with workload growth");
const s=fs.readFileSync("src/TcoCalculator.jsx","utf8");
assert(s.includes("trendCloudGpuCompute(adjCloud.monthlyCompute"), "workload-mode cloud compute must use production price trend");
assert(s.includes("trendCloudGpuCompute(inp.bill * inp.computeShare"), "existing-spend mode must trend compute share only");
assert(!s.includes("Preview only — does not affect results yet."), "preview warning must be removed");
assert(s.includes("saved?.cloudUnitPriceTrend ?? 0"), "trend must persist with default 0% semantics");
assert(s.includes("CLOUD GPU PRICE SENSITIVITY"), "production control must sit in calculator flow");
console.log("TCO cloud unit-price trend PASS");
