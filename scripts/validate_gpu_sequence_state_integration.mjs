import fs from "node:fs";

const gpuSource = fs.readFileSync(new URL("../src/GpuSizingCalculator.jsx", import.meta.url), "utf8");
const appSource = fs.readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  gpuSource.includes("getInferenceSequenceStateMemory"),
  "GPU Sizing must import and use getInferenceSequenceStateMemory from modelSizingMethodology.js."
);

assert(
  !gpuSource.includes('const kvBytesPerToken = model.attentionType === "MLA"'),
  "GPU Sizing still contains the legacy inline standard/MLA-only sequence-state formula."
);

assert(
  gpuSource.includes("sequenceStateMemory"),
  "GPU Sizing must retain the shared sequence-state result for audit/report disclosure."
);

assert(
  gpuSource.includes("sequenceStateMemory.totalGBPerSequence"),
  "GPU Sizing must use total sequence-state GB per sequence from the shared methodology helper."
);

assert(
  appSource.includes('const E2E_AUTH_BYPASS = import.meta.env.VITE_E2E_AUTH_BYPASS === "true";'),
  "Hybrid sequence-state browser harness must remain gated by the explicit E2E auth-bypass build flag."
);
assert(
  appSource.includes('E2E_AUTH_BYPASS && <Route path="/__e2e/hybrid-sequence-state"'),
  "Hybrid sequence-state browser harness route must remain conditional on E2E_AUTH_BYPASS."
);

console.log("GPU sequence-state integration PASS: GPU Sizing consumes the shared state-memory helper, the legacy inline standard/MLA-only formula is absent, and the staged browser harness remains E2E-only.");
