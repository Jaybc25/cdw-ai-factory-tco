import assert from "node:assert/strict";
import fs from "node:fs";

const card = fs.readFileSync(new URL("../src/RtxProAlternativeCard.jsx", import.meta.url), "utf8");
const gpu = fs.readFileSync(new URL("../src/GpuSizingCalculator.jsx", import.meta.url), "utf8");

assert.match(card, /Lower-cost alternative · Right-sized private AI/);
assert.match(card, /Potential lower-cost alternative/);
assert.match(card, /VALIDATION REQUIRED/);
assert.match(card, /does not provide NVLink\/NVSwitch-style scale-up/);
assert.match(card, /Why choose this:/);
assert.match(card, /Continue with RTX PRO/);
assert.match(card, /\/tco\/rtx-pro\?/);
assert.match(card, /benchmarkId/);
assert.match(card, /production GPU count is therefore not inferred/);

const compactUses = (gpu.match(/<RtxProAlternativeCard rtxAlt=\{result\.rtxAlt\} compact \/>/g) || []).length;
assert.equal(compactUses, 2, "RTX PRO must occupy the lower-cost tier in calculator and report");

const standaloneUses = (gpu.match(/<RtxProAlternativeCard rtxAlt=\{result\.rtxAlt\} \/>/g) || []).length;
assert.equal(standaloneUses, 0, "Standalone duplicate RTX cards must remain removed");

const unroundedTitles = (gpu.match(/title="Unrounded requirement"/g) || []).length;
assert.equal(unroundedTitles, 0, "Raw unrounded GPU demand must not appear as a customer-facing purchasable option");
assert.equal(gpu.includes('title="Minimum technical"'), false, "Old Minimum technical label must not return");
assert.match(gpu, /result\.minTechnical/, "Raw technical demand must remain available internally for methodology and handoff math");
assert.match(gpu, /Node-rounded, sourceable production configuration/, "Recommended card must describe a sourceable production configuration");

console.log("RTX lower-cost tier PASS");
console.log("- RTX PRO occupies the lower-cost alternative slot in calculator and report");
console.log("- Evidence-qualified 2/4/8 configurations continue through the dedicated RTX TCO path");
console.log("- Validation-required states remain distinct and do not invent a GPU count");
console.log("- NVLink/NVSwitch scale-up trade-off is explicit");
console.log("- Raw technical demand remains internal/audit methodology rather than a customer-facing option");
