import assert from "node:assert/strict";
import fs from "node:fs";

const card = fs.readFileSync(new URL("../src/RtxProAlternativeCard.jsx", import.meta.url), "utf8");
const gpu = fs.readFileSync(new URL("../src/GpuSizingCalculator.jsx", import.meta.url), "utf8");

assert.match(card, /Lower-cost alternative · Right-sized private AI/);
assert.match(card, /Potential lower-cost alternative/);
assert.match(card, /VALIDATION REQUIRED/);
assert.match(card, /does not provide NVLink\/NVSwitch-style scale-up/);
assert.match(card, /Why choose this:/);
assert.match(card, /Select RTX PRO for TCO/);
assert.match(card, /production GPU count is therefore not inferred/);

const compactUses = (gpu.match(/<RtxProAlternativeCard rtxAlt=\{result\.rtxAlt\} compact \/>/g) || []).length;
assert.equal(compactUses, 2, "RTX PRO must occupy the lower-cost tier in calculator and report");

const standaloneUses = (gpu.match(/<RtxProAlternativeCard rtxAlt=\{result\.rtxAlt\} \/>/g) || []).length;
assert.equal(standaloneUses, 0, "Standalone duplicate RTX cards must remain removed");

const unroundedTitles = (gpu.match(/title="Unrounded requirement"/g) || []).length;
assert.equal(unroundedTitles, 2, "Calculator and report must label the raw requirement as unrounded");
assert.equal(gpu.includes('title="Minimum technical"'), false, "Old Minimum technical label must not return");
assert.match(gpu, /Technical workload requirement before production-system rounding/);

console.log("RTX lower-cost tier PASS");
console.log("- RTX PRO occupies the lower-cost alternative slot in calculator and report");
console.log("- Evidence-qualified and validation-required states remain distinct");
console.log("- NVLink\/NVSwitch scale-up trade-off is explicit");
console.log("- Raw workload requirement is labeled as unrounded, not purchasable minimum");
