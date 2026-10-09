import assert from "node:assert/strict";
import { calculateStorageSizer, validateStorageSizerInputs } from "../src/storageSizerEngine.js";

const base = {
  workload: "training",
  baseDatasetTb: 500,
  annualGrowthPct: 35,
  years: 3,
  copies: 2,
  modelParamsBillions: 70,
  checkpointBytesPerParam: 16,
  checkpointsRetained: 5,
  activeWorkingSetPct: 35,
  activeWorkingSetTb: "",
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
assert.ok(result.capacity.bulkUsableTb > 0, "Training must not force nearly the entire dataset onto fast tier by default");
assert.ok(result.throughput.requiredReadGbps > 0);
assert.ok(result.racks.total >= 1);
assert.ok(result.estimatedPowerKw > 0);

const expectedCheckpointTb = (70 * 16 * 5) / 1000;
assert.equal(result.capacity.checkpointTb, expectedCheckpointTb, "Checkpoint capacity must be derived from model size, bytes/parameter and retention count");
assert.equal(result.capacity.activeWorkingSetTb, result.capacity.replicatedDatasetTb * 0.35);
assert.ok(result.tiering.fastPct < 70, "Default training fast tier should no longer be dominated by the old checkpoint-fraction double count");

const largerDatasetSameModel = calculateStorageSizer({ ...base, baseDatasetTb: 5000 });
assert.equal(largerDatasetSameModel.capacity.checkpointTb, result.capacity.checkpointTb, "Checkpoint capacity must not scale with dataset size for the same model and retention policy");

const largerModel = calculateStorageSizer({ ...base, modelParamsBillions: 140 });
assert.equal(largerModel.capacity.checkpointTb, expectedCheckpointTb * 2, "Checkpoint capacity should scale with model parameter count");

const explicitWorkingSet = calculateStorageSizer({ ...base, activeWorkingSetTb: 100 });
assert.equal(explicitWorkingSet.capacity.activeWorkingSetTb, 100, "Explicit working-set TB must override the percentage suggestion");

const manual = calculateStorageSizer({ ...base, manualThroughputGbps: 42 });
assert.equal(manual.throughput.requiredReadGbps, 42);
assert.ok(manual.throughput.aggregateGbps > 42);

const invalid = validateStorageSizerInputs({ ...base, baseDatasetTb: 0, usableEfficiency: 1.2, activeWorkingSetPct: 120 });
assert.equal(invalid.valid, false);
assert.ok(invalid.errors.length >= 3);

const rag = calculateStorageSizer({ ...base, workload: "rag", activeWorkingSetPct: 30 });
assert.notEqual(rag.tiering.fastPct, result.tiering.fastPct);

console.log("Wave 2A storage verification passed");
