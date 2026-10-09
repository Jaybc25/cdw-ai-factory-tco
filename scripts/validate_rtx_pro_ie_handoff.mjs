import fs from "node:fs";
import { buildRtxProInferenceEconomicsHandoff } from "../src/rtxProInferenceEconomicsConnector.js";
import { deriveInferenceEconomicsThroughput } from "../src/inferenceEconomicsThroughput.js";
import { getModelById } from "../src/modelRegistry.js";

const SHORT_BENCHMARK = "rtx-pro-6000-llama-3.3-70b-fp4-1k1k";
const model = getModelById("llama-3.3-70b");
if (!model) throw new Error("Llama 3.3 70B must remain available for the admitted RTX benchmark path.");

const handoff = buildRtxProInferenceEconomicsHandoff({
  gpuCount: 2,
  modelId: model.id,
  quant: "FP4",
  horizonYears: 3,
  onPremTcoUsd: 123456,
  benchmarkId: SHORT_BENCHMARK,
});
if (!handoff.eligible || handoff.blockers.length) throw new Error("Qualified RTX TCO must be eligible for IE handoff.");
if (handoff.attributableTcoUsd !== 123456 || handoff.inferenceShare !== 1) {
  throw new Error("RTX lifecycle TCO must enter IE as 100% inference-attributable for this inference-only path.");
}
const params = new URLSearchParams(handoff.href.split("?")[1]);
for (const [key, expected] of [
  ["source", "tco"],
  ["rtx", "1"],
  ["hardware", "RTX PRO 6000"],
  ["gpuCount", "2"],
  ["model", model.id],
  ["quant", "FP4"],
  ["horizon", "3"],
  ["benchmarkId", SHORT_BENCHMARK],
  ["tcoAllocation", "DIRECT_INFERENCE_WORKLOAD"],
]) {
  if (params.get(key) !== expected) throw new Error(`RTX IE handoff drifted for ${key}: expected ${expected}.`);
}

const throughput = deriveInferenceEconomicsThroughput({
  hardwareClass: "RTX PRO 6000",
  deployedGpuCount: 2,
  quant: "FP4",
  model,
  benchmarkId: SHORT_BENCHMARK,
});
if (!throughput.ok) throw new Error(`Qualified RTX IE throughput failed: ${throughput.errors?.join(" ")}`);
if (throughput.sourceThroughputTokPerSec !== 1724 || throughput.effectiveThroughputTokPerSec !== 3448) {
  throw new Error("RTX IE must scale the direct 1-GPU benchmark only through independent replicas.");
}
if (throughput.benchmarkGpuCount !== 1 || throughput.deploymentEvidenceBasis !== "REPLICA_SCALED") {
  throw new Error("RTX IE must preserve the direct single-GPU benchmark basis and label multi-GPU capacity as replica-scaled.");
}
if (!String(throughput.evidence?.adjustmentBasis || "").includes("not a model-parallel scaling claim")) {
  throw new Error("RTX IE audit basis must explicitly reject a model-parallel interpretation of replica scaling.");
}

const missingBenchmark = deriveInferenceEconomicsThroughput({
  hardwareClass: "RTX PRO 6000",
  deployedGpuCount: 2,
  quant: "FP4",
  model,
  benchmarkId: "not-admitted",
});
if (missingBenchmark.ok || missingBenchmark.reason !== "INSUFFICIENT_EVIDENCE") {
  throw new Error("Unknown/tampered RTX benchmark ids must be blocked rather than accepting URL throughput claims.");
}

const mismatchedModel = buildRtxProInferenceEconomicsHandoff({
  gpuCount: 2,
  modelId: "llama-3.1-8b",
  quant: "FP4",
  horizonYears: 3,
  onPremTcoUsd: 123456,
  benchmarkId: SHORT_BENCHMARK,
});
if (mismatchedModel.eligible || !mismatchedModel.blockers.includes("RTX_BENCHMARK_MODEL_MISMATCH")) {
  throw new Error("RTX benchmark/model mismatch must block the connector.");
}

const intake = fs.readFileSync("src/RtxProTcoIntake.jsx", "utf8");
const guided = fs.readFileSync("src/InferenceEconomicsGuidedPreview.jsx", "utf8");
const app = fs.readFileSync("src/App.jsx", "utf8");
const card = fs.readFileSync("src/RtxProAlternativeCard.jsx", "utf8");

for (const [source, text, message] of [
  [card, "benchmarkId: benchmark.id", "GPU Sizing must carry the admitted RTX benchmark id into TCO."],
  [intake, "buildRtxProInferenceEconomicsHandoff", "RTX TCO must use the guarded RTX IE connector."],
  [intake, "Continue to Inference Economics", "Client-ready RTX lifecycle TCO must expose the IE continuation action."],
  [guided, '"RTX PRO 6000": ["FP4"]', "IE must expose only the admitted RTX precision in v1."],
  [guided, "benchmarkId: hardwareClass === \"RTX PRO 6000\" ? rtxBenchmarkId : null", "IE must pass the exact RTX benchmark identity to its throughput adapter."],
  [app, 'params.get("rtx") === "1"', "IE route must recognize the RTX TCO source marker."],
  [app, '"Adjust RTX PRO TCO inputs"', "RTX IE back navigation must return to the RTX TCO surface."],
]) {
  if (!source.includes(text)) throw new Error(message);
}

console.log("RTX PRO TCO → Inference Economics validation PASS");
console.log("- exact benchmark id is carried and revalidated internally");
console.log("- 2-GPU throughput is direct single-GPU evidence × independent replicas");
console.log("- model/precision mismatch and unknown benchmark ids are blocked");
console.log("- full RTX lifecycle TCO is 100% inference-attributable on this inference-only path");
console.log("- IE returns to the dedicated RTX TCO surface");
