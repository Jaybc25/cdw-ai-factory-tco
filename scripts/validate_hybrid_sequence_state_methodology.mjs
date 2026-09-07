import { MODEL_REGISTRY, getVisibleModelOptions } from "../src/modelRegistry.js";
import { STAGED_TECHNICAL_MODEL_REGISTRY, getStagedTechnicalModelById } from "../src/stagedModelRegistry.js";
import { getInferenceSequenceStateMemory, getInferenceThroughputScale } from "../src/modelSizingMethodology.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function exact(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message}: expected ${expected}, received ${actual}.`);
}

const EXPECTED_STAGED = new Set([
  "qwen3.8-27b",
  "deepseek-v4-flash-0731",
  "deepseek-v4-pro-0813",
  "nemotron-3-super-120b-a12b",
]);

assert(STAGED_TECHNICAL_MODEL_REGISTRY.length === 4, "Hybrid methodology tranche must contain exactly four staged technical records.");
for (const model of STAGED_TECHNICAL_MODEL_REGISTRY) {
  assert(EXPECTED_STAGED.has(model.id), `Unexpected staged hybrid model ${model.id}.`);
  assert(model.status === "VERIFIED", `${model.id} staged technical fields must remain source-verified.`);
  assert(model.totalParamsB > 0 && model.activeParamsB > 0, `${model.id} missing total/active parameter semantics.`);
  assert(model.layers > 0, `${model.id} missing verified layer count.`);
  assert(model.sequenceStateType, `${model.id} missing explicit sequenceStateType.`);
  assert(model.architectureSource?.startsWith("https://"), `${model.id} missing architecture source.`);
  assert(model.stateImplementationSource?.startsWith("https://"), `${model.id} missing state implementation source.`);
  assert(!MODEL_REGISTRY.some((active) => active.id === model.id), `${model.id} leaked into production MODEL_REGISTRY during methodology work.`);
}

const visible = new Set(getVisibleModelOptions({ includeExisting: true }).map((model) => model.id));
for (const id of EXPECTED_STAGED) assert(!visible.has(id), `${id} leaked into GPU/TCO visible options before activation.`);

// Existing production standard-KV / MLA formulas must remain numerically identical.
const muse = MODEL_REGISTRY.find((model) => model.id === "muse-glimmer-30b");
const museState = getInferenceSequenceStateMemory(muse, 8192, 2);
exact(museState.bytesPerSequence, 2 * 52 * 2 * 128 * 8192 * 2, "Muse standard-KV parity drift");

const mistralLarge = MODEL_REGISTRY.find((model) => model.id === "mistral-large-3");
const mistralState = getInferenceSequenceStateMemory(mistralLarge, 8192, 2);
exact(mistralState.bytesPerSequence, 61 * (512 + 64) * 8192 * 2, "Mistral Large MLA parity drift");

// Qwen3.8 27B: 48 fixed-state DeltaNet layers + 16 full-attention layers.
const qwen = getStagedTechnicalModelById("qwen3.8-27b");
exact(qwen.linearAttentionLayers, 48, "Qwen linear layer count drift");
exact(qwen.fullAttentionLayers, 16, "Qwen full-attention layer count drift");
const qwenState = getInferenceSequenceStateMemory(qwen, 8192, 2);
exact(qwenState.components[0].bytes, 536870912, "Qwen full-attention KV fixture drift");
exact(qwenState.components[1].bytes, 150994944, "Qwen recurrent-state fixture drift");
exact(qwenState.components[2].bytes, 3932160, "Qwen convolution-state fixture drift");
exact(qwenState.bytesPerSequence, 691798016, "Qwen total sequence-state fixture drift");
exact(qwenState.fixedBytes, 154927104, "Qwen fixed-state fixture drift");
exact(getInferenceThroughputScale(qwen).factor, 1, "Qwen must not receive unsupported throughput uplift");

// DeepSeek V4 Flash: first 43 decoder layers = 2 sliding-only + 21 CSA + 20 HCA.
const flash = getStagedTechnicalModelById("deepseek-v4-flash-0731");
exact(flash.slidingOnlyLayers, 2, "DeepSeek Flash sliding-only count drift");
exact(flash.csaLayers, 21, "DeepSeek Flash CSA count drift");
exact(flash.hcaLayers, 20, "DeepSeek Flash HCA count drift");
const flashState = getInferenceSequenceStateMemory(flash, 8192, 2);
exact(flashState.components[0].bytes, 5636096, "DeepSeek Flash sliding cache fixture drift");
exact(flashState.components[1].bytes, 55050240, "DeepSeek Flash CSA compressed fixture drift");
exact(flashState.components[2].bytes, 53760, "DeepSeek Flash CSA auxiliary fixture drift");
exact(flashState.components[3].bytes, 1310720, "DeepSeek Flash HCA compressed fixture drift");
exact(flashState.components[4].bytes, 0, "DeepSeek Flash HCA buffer fixture drift");
exact(flashState.bytesPerSequence, 62050816, "DeepSeek Flash total sequence-state fixture drift");
exact(getInferenceThroughputScale(flash).factor, 1, "DeepSeek Flash must not receive unsupported throughput uplift");

// DeepSeek V4 Pro: first 61 decoder layers = 30 CSA + 31 HCA; no sliding-only layer.
const pro = getStagedTechnicalModelById("deepseek-v4-pro-0813");
exact(pro.slidingOnlyLayers, 0, "DeepSeek Pro sliding-only count drift");
exact(pro.csaLayers, 30, "DeepSeek Pro CSA count drift");
exact(pro.hcaLayers, 31, "DeepSeek Pro HCA count drift");
const proState = getInferenceSequenceStateMemory(pro, 8192, 2);
exact(proState.components[0].bytes, 7995392, "DeepSeek Pro sliding cache fixture drift");
exact(proState.components[1].bytes, 78643200, "DeepSeek Pro CSA compressed fixture drift");
exact(proState.components[2].bytes, 76800, "DeepSeek Pro CSA auxiliary fixture drift");
exact(proState.components[3].bytes, 2031616, "DeepSeek Pro HCA compressed fixture drift");
exact(proState.components[4].bytes, 0, "DeepSeek Pro HCA buffer fixture drift");
exact(proState.bytesPerSequence, 88747008, "DeepSeek Pro total sequence-state fixture drift");
exact(getInferenceThroughputScale(pro).factor, 1, "DeepSeek Pro must not receive unsupported throughput uplift");

// Nemotron 3 Super: source pattern = 40 Mamba + 40 MoE + 8 attention layers.
const nemotron = getStagedTechnicalModelById("nemotron-3-super-120b-a12b");
exact(nemotron.mambaLayers, 40, "Nemotron Mamba layer count drift");
exact(nemotron.moeLayers, 40, "Nemotron MoE layer count drift");
exact(nemotron.attentionLayers, 8, "Nemotron attention layer count drift");
exact(nemotron.contextLength, 262144, "Nemotron config context must remain the sizing contract until context discrepancy is reconciled");
const nemotronState = getInferenceSequenceStateMemory(nemotron, 8192, 2);
exact(nemotronState.components[0].bytes, 67108864, "Nemotron attention KV fixture drift");
exact(nemotronState.components[1].bytes, 167772160, "Nemotron SSM fixture drift");
exact(nemotronState.components[2].bytes, 3276800, "Nemotron convolution fixture drift");
exact(nemotronState.bytesPerSequence, 238157824, "Nemotron total sequence-state fixture drift");
exact(nemotronState.fixedBytes, 171048960, "Nemotron fixed recurrent-state fixture drift");
exact(getInferenceThroughputScale(nemotron).factor, 1, "Nemotron must not receive unsupported throughput uplift");

// Recurrent state must not shrink when the user selects a smaller KV precision.
const qwenFp8Cache = getInferenceSequenceStateMemory(qwen, 8192, 1);
exact(qwenFp8Cache.fixedBytes, qwenState.fixedBytes, "Qwen recurrent state incorrectly followed KV precision");
const nemotronFp8Cache = getInferenceSequenceStateMemory(nemotron, 8192, 1);
exact(nemotronFp8Cache.fixedBytes, nemotronState.fixedBytes, "Nemotron recurrent state incorrectly followed KV precision");

// DeepSeek compression auxiliaries are model-dtype state; generic KV precision may
// reduce the sliding branch but must not silently halve compressed/auxiliary state.
const flashFp8Cache = getInferenceSequenceStateMemory(flash, 8192, 1);
exact(flashFp8Cache.components[1].bytes, flashState.components[1].bytes, "DeepSeek CSA compressed state incorrectly followed KV precision");
exact(flashFp8Cache.components[2].bytes, flashState.components[2].bytes, "DeepSeek CSA auxiliary state incorrectly followed KV precision");

console.log("Hybrid sequence-state methodology PASS: four blocked models have source-qualified staged technical records, standard/MLA production parity is preserved, DeltaNet/DeepSeek-compressed/Mamba state fixtures reconcile exactly, fixed recurrent state is precision-safe, and no staged model is customer-facing.");
