import { MODEL_REGISTRY, getVisibleModelOptions, getModelById } from "../src/modelRegistry.js";
import { STAGED_TECHNICAL_MODEL_REGISTRY, getStagedTechnicalModelById } from "../src/stagedModelRegistry.js";
import { getInferenceSequenceStateMemory, getInferenceThroughputScale } from "../src/modelSizingMethodology.js";

function assert(c, m) { if (!c) throw new Error(m); }
function exact(a, e, m) { if (a !== e) throw new Error(`${m}: expected ${e}, received ${a}.`); }
const IDS = ["qwen3.8-27b", "deepseek-v4-flash-0731", "deepseek-v4-pro-0813", "nemotron-3-super-120b-a12b"];

assert(STAGED_TECHNICAL_MODEL_REGISTRY.length === 4, "Hybrid methodology source registry must contain exactly four records.");
for (const id of IDS) {
  const source = getStagedTechnicalModelById(id);
  const runtime = getModelById(id);
  assert(source?.status === "VERIFIED", `${id} methodology source fields must remain verified.`);
  assert(runtime?.catalogStatus === "recommended", `${id} must be promoted to recommended runtime.`);
  assert(runtime.sequenceStateType === source.sequenceStateType, `${id} promoted state type drifted.`);
  assert(runtime.totalParamsB === source.totalParamsB && runtime.activeParamsB === source.activeParamsB, `${id} promoted parameter semantics drifted.`);
}

const muse = MODEL_REGISTRY.find((m) => m.id === "muse-glimmer-30b");
exact(getInferenceSequenceStateMemory(muse, 8192, 2).bytesPerSequence, 2 * 52 * 2 * 128 * 8192 * 2, "Muse standard-KV parity drift");
const mistral = MODEL_REGISTRY.find((m) => m.id === "mistral-large-3");
exact(getInferenceSequenceStateMemory(mistral, 8192, 2).bytesPerSequence, 61 * (512 + 64) * 8192 * 2, "Mistral Large MLA parity drift");

const qwen = getModelById("qwen3.8-27b");
const q = getInferenceSequenceStateMemory(qwen, 8192, 2);
exact(q.components[0].bytes, 536870912, "Qwen attention fixture drift"); exact(q.components[1].bytes, 150994944, "Qwen recurrent fixture drift"); exact(q.components[2].bytes, 3932160, "Qwen conv fixture drift"); exact(q.bytesPerSequence, 691798016, "Qwen total fixture drift"); exact(q.fixedBytes, 154927104, "Qwen fixed fixture drift");

const flash = getModelById("deepseek-v4-flash-0731");
const f = getInferenceSequenceStateMemory(flash, 8192, 2);
exact(f.bytesPerSequence, 62050816, "DeepSeek Flash total fixture drift"); exact(f.components[0].bytes, 5636096, "DeepSeek Flash sliding fixture drift"); exact(f.components[1].bytes, 55050240, "DeepSeek Flash CSA compressed fixture drift");

const pro = getModelById("deepseek-v4-pro-0813");
const p = getInferenceSequenceStateMemory(pro, 8192, 2);
exact(p.bytesPerSequence, 88747008, "DeepSeek Pro total fixture drift"); exact(p.components[0].bytes, 7995392, "DeepSeek Pro sliding fixture drift"); exact(p.components[1].bytes, 78643200, "DeepSeek Pro CSA compressed fixture drift");

const nemotron = getModelById("nemotron-3-super-120b-a12b");
const n = getInferenceSequenceStateMemory(nemotron, 8192, 2);
exact(n.bytesPerSequence, 238157824, "Nemotron total fixture drift"); exact(n.fixedBytes, 171048960, "Nemotron fixed fixture drift"); exact(nemotron.contextLength, 262144, "Nemotron verified runtime context drift"); exact(nemotron.advertisedExtendedContextLength, 1000000, "Nemotron advertised extended context drift");

for (const model of [qwen, flash, pro, nemotron]) exact(getInferenceThroughputScale(model).factor, 1, `${model.id} must not receive unsupported throughput uplift`);
exact(getInferenceSequenceStateMemory(qwen, 8192, 1).fixedBytes, q.fixedBytes, "Qwen recurrent state incorrectly followed KV precision");
exact(getInferenceSequenceStateMemory(nemotron, 8192, 1).fixedBytes, n.fixedBytes, "Nemotron recurrent state incorrectly followed KV precision");
exact(getInferenceSequenceStateMemory(flash, 8192, 1).components[1].bytes, f.components[1].bytes, "DeepSeek compressed state incorrectly followed generic KV precision");

const visible = new Set(getVisibleModelOptions().map((m) => m.id));
for (const id of IDS) assert(visible.has(id), `${id} must be customer-visible after coordinated activation.`);

console.log("Hybrid sequence-state methodology PASS: promoted Qwen/DeepSeek/Nemotron runtime records reconcile exactly to source-qualified fixtures; standard-KV/MLA parity remains intact; fixed/compressed state precision safeguards and conservative throughput semantics remain unchanged.");
