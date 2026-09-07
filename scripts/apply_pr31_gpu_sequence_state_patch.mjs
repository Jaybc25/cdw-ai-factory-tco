import fs from "node:fs";

const path = new URL("../src/GpuSizingCalculator.jsx", import.meta.url);
let source = fs.readFileSync(path, "utf8");

function replaceExact(oldText, newText, label) {
  const count = source.split(oldText).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected exactly one match, found ${count}.`);
  }
  source = source.replace(oldText, newText);
}

replaceExact(
  'import { getInferenceThroughputScale, getTrainingParameterSemantics } from "./modelSizingMethodology.js";',
  'import { getInferenceSequenceStateMemory, getInferenceThroughputScale, getTrainingParameterSemantics } from "./modelSizingMethodology.js";',
  "methodology import"
);

replaceExact(
  '? { id: "custom", totalParamsB: inputs.customParamsB, activeParamsB: inputs.customParamsB, architectureType: "dense", layers: inputs.customLayers, kvHeads: inputs.customKvHeads, headDim: inputs.customHeadDim, status: "CUSTOM" }',
  '? { id: "custom", totalParamsB: inputs.customParamsB, activeParamsB: inputs.customParamsB, architectureType: "dense", layers: inputs.customLayers, attentionType: "standard", kvHeads: inputs.customKvHeads, headDim: inputs.customHeadDim, status: "CUSTOM" }',
  "custom model sequence-state contract"
);

replaceExact(
`  const avgTokens = inputs.avgInputTokens + inputs.avgOutputTokens;
  const kvBytesPerToken = model.attentionType === "MLA"
    ? model.layers * (model.kvLoraRank + model.qkRopeHeadDim) * inputs.kvBytesPerElement
    : 2 * model.layers * model.kvHeads * model.headDim * inputs.kvBytesPerElement;
  const kvCacheGBPerSeq = (kvBytesPerToken * avgTokens) / 1e9;
  const kvCacheTotalGB = kvCacheGBPerSeq * inputs.concurrentUsers;`,
`  const avgTokens = inputs.avgInputTokens + inputs.avgOutputTokens;
  const sequenceStateMemory = getInferenceSequenceStateMemory(model, avgTokens, inputs.kvBytesPerElement);
  // Retain the historical audit field for standard KV/MLA parity. For hybrid
  // state models, this represents only the token-growing portion; fixed
  // recurrent/compression state is carried separately in sequenceStateMemory.
  const kvBytesPerToken = avgTokens > 0 ? sequenceStateMemory.tokenGrowingBytes / avgTokens : 0;
  const kvCacheGBPerSeq = sequenceStateMemory.totalGBPerSequence;
  const kvCacheTotalGB = kvCacheGBPerSeq * inputs.concurrentUsers;`,
  "inference sequence-state calculation"
);

replaceExact(
  "    model, quantBytes, weightMemoryGB, kvBytesPerToken, kvCacheGBPerSeq, kvCacheTotalGB, runtimeOverheadGB,",
  "    model, quantBytes, weightMemoryGB, sequenceStateMemory, kvBytesPerToken, kvCacheGBPerSeq, kvCacheTotalGB, runtimeOverheadGB,",
  "inference result audit state"
);

fs.writeFileSync(path, source);
console.log("Applied PR31 GPU sequence-state integration patch.");
