import assert from "node:assert/strict";
import { calculateStorageSizer, validateStorageSizerInputs } from "../src/storageSizerEngine.js";

const base = {
  workload: "training",
  baseDatasetTb: 500,
  annualGrowthPct: 35,
  years: 3,
  copies: 2,
  checkpointMultiplier: 0.5,
  indexOverheadPct: 10,
  usableEfficiency: 0.75,
  reservePct: 20,
  gpuCount: 16,
  manualThroughputGbps: "",
  ingestGbps: 2,
  fastTierTbPerRack: 500,
  bulkTierTbPerRack: 1000,
  fastTierKwPerRack: 6,
  bulkTierKwPerRack: 4,
};

const validation = validateStorageSizerInputs(base);
assert.equal(validation.valid, true);

const result = calculateStorageSizer(base);
assert.ok(result.capacity.totalRawTb > result.capacity.totalUsableTb);
assert.ok(result.capacity.fastUsableTb > 0);
assert.ok(result.throughput.requiredReadGbps > 0);
assert.ok(result.racks.total >= 1);
assert.ok(result.estimatedPowerKw > 0);

const manual = calculateStorageSizer({ ...base, manualThroughputGbps: 42 });
assert.equal(manual.throughput.requiredReadGbps, 42);
assert.ok(manual.throughput.aggregateGbps > 42);

const invalid = validateStorageSizerInputs({ ...base, baseDatasetTb: 0, usableEfficiency: 1.2 });
assert.equal(invalid.valid, false);
assert.ok(invalid.errors.length >= 2);

const rag = calculateStorageSizer({ ...base, workload: "rag" });
assert.notEqual(rag.tiering.fastPct, result.tiering.fastPct);

console.log("Wave 2A storage verification passed");
