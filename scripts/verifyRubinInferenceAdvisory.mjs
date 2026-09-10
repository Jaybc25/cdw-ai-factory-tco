import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";
import { getRubinInferenceAdvisory, RUBIN_INFERENCE_ADVISORY_THRESHOLD_GPUS } from "../src/rubinInferenceAdvisory.js";

assert.equal(RUBIN_INFERENCE_ADVISORY_THRESHOLD_GPUS, 72);
assert.equal(getRubinInferenceAdvisory({ recommended: 64, selectedClass: "B300", totalThroughputNeeded: 1000 }), null);

const advisory = getRubinInferenceAdvisory({ recommended: 72, selectedClass: "GB300 NVL72", totalThroughputNeeded: 1_000_000 });
assert.ok(advisory?.eligible);
assert.equal(advisory.confidence, "PROVISIONAL");
assert.equal(advisory.verifiedBaselineClass, "GB300 NVL72");
assert.equal(advisory.verifiedBaselineGpus, 72);
assert.equal(advisory.exactRubinSizingAvailable, false);
assert.deepEqual(advisory.architectures, ["DGX Rubin NVL8", "DGX Vera Rubin NVL72"]);
assert.match(advisory.reason, /no qualifying absolute per-GPU throughput anchor/i);
assert.match(advisory.guidance, /Do not infer a Rubin GPU count/i);

const source = readFileSync("src/GpuSizingCalculator.jsx", "utf8");
assert.match(source, /getRubinInferenceAdvisory/);
assert.match(source, /Rubin architecture evaluation recommended/);
assert.match(source, /verified sizing baseline/i);
assert.match(source, /exact Rubin GPU count/i);

console.log("Rubin inference advisory verification passed.");
