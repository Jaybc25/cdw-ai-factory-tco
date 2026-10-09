import assert from "node:assert/strict";
import fs from "node:fs";

const card = fs.readFileSync(new URL("../src/RtxProAlternativeCard.jsx", import.meta.url), "utf8");
const gpu = fs.readFileSync(new URL("../src/GpuSizingCalculator.jsx", import.meta.url), "utf8");
const sizing = fs.readFileSync(new URL("../src/rtxProGpuSizing.js", import.meta.url), "utf8");

assert.match(card, /Lower-cost alternative/);
assert.match(card, /Potential lower-cost alternative/);
assert.match(card, /VALIDATION REQUIRED/);
assert.match(card, /No NVLink scale-up/);
assert.match(card, /Why validation is required/);
assert.match(card, /current evidence registry cannot yet prove a production GPU count/);
assert.match(card, /aria-pressed=\{selected\}/, "Qualified RTX card must expose a real selected state");
assert.match(card, /Tap to select for TCO/, "Qualified RTX card must present an explicit selection affordance");
assert.match(card, /Selected for TCO/, "Qualified RTX card must present its selected state");
assert.doesNotMatch(card, /Choose a planning configuration/, "RTX evidence gaps must not be converted into a user-picked GPU count");
assert.doesNotMatch(card, /Continue with \{count\} GPUs/, "Manual 2\/4\/8 GPU planning buttons must stay removed");

assert.match(sizing, /rtx-pro-6000-qwen3\.8-27b-fp8-chat-c24/, "Qwen3.8 RTX serving evidence must remain in the admitted registry");
assert.match(sizing, /concurrentStreamsPerGpu: 24/, "Qwen3.8 RTX sizing must retain the measured concurrency guardrail");
assert.match(sizing, /minPerStreamTokPerSec: 33\.9/, "Qwen3.8 RTX sizing must retain the per-stream rate guardrail");
assert.match(sizing, /Math\.ceil\(userCount \/ benchmark\.concurrentStreamsPerGpu\)/, "RTX sizing must account for simultaneous-stream demand when evidence provides it");

const reportUses = (gpu.match(/<RtxProAlternativeCard rtxAlt=\{result\.rtxAlt\} compact reportOnly \/>/g) || []).length;
assert.equal(reportUses, 1, "RTX PRO must remain non-interactive in the report lower-cost tier");

const selectableUses = (gpu.match(/<RtxProAlternativeCard rtxAlt=\{result\.rtxAlt\} compact selectable=\{Boolean\(rtxTcoHref\)\} selected=\{effectiveTcoSelection === "rtx"\} onSelect=\{\(\) => setTcoSelection\("rtx"\)\} \/>/g) || []).length;
assert.equal(selectableUses, 1, "RTX PRO must be selectable in the live lower-cost tier when auto-sizing evidence supports a one-server handoff");

assert.match(gpu, /data-testid="gpu-result-choice-grid"/, "Inference results must use the compact three-choice hierarchy");
assert.match(gpu, /sm:col-start-1 sm:row-start-1 sm:row-span-2/, "Lower-cost RTX must occupy the left column on desktop");
assert.match(gpu, /sm:col-start-2 sm:row-start-1/, "Recommended must remain upper-right on desktop");
assert.match(gpu, /sm:col-start-2 sm:row-start-2/, "Higher-growth must remain directly below Recommended on desktop");

assert.match(gpu, /const effectiveTcoSelection = tcoSelection === "rtx" && rtxTcoHref \? "rtx"/, "RTX selection must participate in the shared TCO selection state");
assert.match(gpu, /data-testid="rtx-selected-handoff"/, "Selected RTX must replace the enterprise handoff with the RTX TCO handoff");
assert.match(gpu, /Continue to RTX PRO TCO/, "Selected RTX must expose the forward RTX TCO action");

const unroundedTitles = (gpu.match(/title="Unrounded requirement"/g) || []).length;
assert.equal(unroundedTitles, 0, "Raw unrounded GPU demand must not appear as a customer-facing purchasable option");
assert.equal(gpu.includes('title="Minimum technical"'), false, "Old Minimum technical label must not return");
assert.match(gpu, /result\.minTechnical/, "Raw technical demand must remain available internally for methodology and handoff math");
assert.match(gpu, /Node-rounded, sourceable production configuration/, "Recommended card must describe a sourceable production configuration");

console.log("RTX lower-cost tier PASS");
console.log("- compact desktop hierarchy restored: lower-cost left, Recommended upper-right, Higher-growth below");
console.log("- benchmark-qualified RTX is whole-card selectable and auto-sized from workload inputs");
console.log("- Qwen3.8 serving evidence gates both aggregate throughput and simultaneous-stream demand");
console.log("- validation-only models remain compact and do not ask customers to guess a GPU count");
console.log("- raw technical demand remains internal/audit methodology rather than a customer-facing option");