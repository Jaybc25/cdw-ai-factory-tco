import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/GpuSizingCalculator.jsx", import.meta.url), "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  source.includes("getInferenceSequenceStateMemory"),
  "GPU Sizing must import and use getInferenceSequenceStateMemory from modelSizingMethodology.js."
);

assert(
  !source.includes('const kvBytesPerToken = model.attentionType === "MLA"'),
  "GPU Sizing still contains the legacy inline standard/MLA-only sequence-state formula."
);

assert(
  source.includes("sequenceStateMemory"),
  "GPU Sizing must retain the shared sequence-state result for audit/report disclosure."
);

assert(
  source.includes("sequenceStateMemory.totalGBPerSequence"),
  "GPU Sizing must use total sequence-state GB per sequence from the shared methodology helper."
);

console.log("GPU sequence-state integration PASS: GPU Sizing consumes the shared state-memory helper and the legacy inline standard/MLA-only formula is absent.");
