import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("src/App.jsx", "utf8");
const ui = fs.readFileSync("src/InferenceEconomicsPreview.jsx", "utf8");

assert.ok(app.includes('path="/tco/inference-economics-preview"'));
assert.ok(app.includes('title="Inference Economics Preview"'));
assert.ok(app.includes('backHref="/tco"'));

// Preview must stay isolated from normal TCO navigation in IE-4.
const tco = fs.readFileSync("src/TcoCalculator.jsx", "utf8");
assert.equal(tco.includes("/tco/inference-economics-preview"), false);

// Guardrails that should remain visible in the Preview UI.
assert.ok(ui.includes("PREVIEW — IE-4"));
assert.ok(ui.includes("Capacity is not consumption") === false); // principle lives in methodology, not marketing copy
assert.ok(ui.includes("Unused capacity does not lower this result."));
assert.ok(ui.includes("Configuration does not meet stated demand"));
assert.ok(ui.includes("MODELED"));
assert.ok(ui.includes("Production-serving factor"));
assert.ok(ui.includes("Cost/token currently uses generated output tokens"));

console.log("Inference economics preview UI contract verified.");
