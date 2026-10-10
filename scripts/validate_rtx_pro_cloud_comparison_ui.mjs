import assert from "node:assert/strict";
import fs from "node:fs";

const intake = fs.readFileSync(new URL("../src/RtxProTcoIntake.jsx", import.meta.url), "utf8");
const panel = fs.readFileSync(new URL("../src/RtxProCloudComparisonPanel.jsx", import.meta.url), "utf8");

assert.ok(intake.includes('buildRtxProCloudComparison'), "RTX TCO must invoke the cloud comparison engine.");
assert.ok(intake.includes('<RtxProCloudComparisonPanel comparison={cloudComparison} horizonYears={horizonYears} />'), "RTX TCO calculator must render the full cloud comparison panel when lifecycle TCO is ready.");
assert.ok(intake.includes('<RtxProCloudComparisonPanel comparison={cloudComparison} horizonYears={horizonYears} compact />'), "RTX TCO report must carry the preferred-path summary.");
assert.ok(!intake.includes('GoogleCloudReference'), "Legacy Google-only reference surface must be removed from RTX TCO.");
assert.ok(panel.includes('Preferred path: On-prem RTX PRO'), "Results panel must expose a clear on-prem preferred-path headline.");
assert.ok(panel.includes('Preferred path: ${recommendation.cloudProvider}'), "Results panel must expose a clear cloud preferred-path headline.");
assert.ok(panel.includes('Comparable RTX PRO cloud options'), "Results panel must expose provider comparison choices.");
assert.ok(panel.includes('Crossover month'), "Results panel must expose crossover timing.");
assert.ok(panel.includes('rtx-cloud-crossover-chart'), "Results panel must render cumulative-spend crossover visualization.");
assert.ok(panel.includes('VERIFIED PUBLIC RATE'), "Verified public-rate evidence must be explicit.");
assert.ok(panel.includes('ENGINEERING RATE · VERIFY BEFORE CLIENT USE'), "Engineering-only rate evidence must be explicit.");
assert.ok(panel.includes('cannot override the verified preferred-path recommendation'), "Engineering-only providers must be visibly prevented from driving the customer recommendation.");
assert.ok(panel.includes('730 active cloud hours/month'), "Cloud runtime assumption must be visible in the results UX.");

console.log("RTX PRO cloud comparison UX PASS");
console.log("- preferred path is prominent");
console.log("- provider choices distinguish verified vs engineering-only evidence");
console.log("- crossover month and cumulative spend chart are present");
console.log("- legacy Google-only reference surface is removed");
