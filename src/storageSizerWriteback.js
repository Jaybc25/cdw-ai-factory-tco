import {
  PHASE2_DERIVATION,
  PHASE2_SOURCE,
  createPhase2Override,
  makeProvenance,
} from "./phase2Contract.js";

export function buildStorageDependencyBundle(result, { workload } = {}) {
  const dependencies = {
    workload,
    capacity: result.capacity,
    throughput: result.throughput,
    racks: result.racks,
    estimatedPowerKw: result.estimatedPowerKw,
  };

  const capacityOverride = createPhase2Override({
    id: "storage.capacity.raw.total",
    target: "tco.storage.rawCapacity.tb",
    value: Math.round(result.capacity.totalRawTb),
    unit: "TB",
    sourceTool: "storage-sizer",
    provenance: makeProvenance({
      source: PHASE2_SOURCE.EST,
      derivation: PHASE2_DERIVATION.CALCULATED,
      label: "Vendor-neutral raw capacity requirement derived from workload, growth, copies, reserve, and usable-efficiency assumptions",
    }),
    dependencies,
    referenceValue: null,
  });

  return {
    schemaVersion: 1,
    sourceTool: "storage-sizer",
    acceptedAt: new Date().toISOString(),
    workload,
    overrides: [capacityOverride],
    requirements: {
      fastUsableTb: result.capacity.fastUsableTb,
      bulkUsableTb: result.capacity.bulkUsableTb,
      totalRawTb: result.capacity.totalRawTb,
      readGbps: result.throughput.requiredReadGbps,
      writeGbps: result.throughput.requiredWriteGbps,
      aggregateGbps: result.throughput.aggregateGbps,
      storageRacks: result.racks.total,
      storagePowerKw: result.estimatedPowerKw,
      flags: result.flags,
    },
  };
}
