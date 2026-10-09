import {
  PHASE2_DERIVATION,
  PHASE2_SOURCE,
  createPhase2Override,
  fingerprintInputs,
  makeProvenance,
} from "./phase2Contract.js";
import { makeFleetIdentity } from "./phase2Fleet.js";

export function buildStorageDependencyBundle(result, { workload } = {}) {
  const fleet = makeFleetIdentity({ totalGpus: result.inputs?.gpuCount, source: "storage-sizer" });
  const readGBps = result.throughput.requiredReadGBps ?? result.throughput.requiredReadGbps;
  const writeGBps = result.throughput.requiredWriteGBps ?? result.throughput.requiredWriteGbps;
  const aggregateGBps = result.throughput.aggregateGBps ?? result.throughput.aggregateGbps;
  const activeWorkingSetIsCustomer = result.assumptions?.activeWorkingSetSource === PHASE2_SOURCE.CUSTOMER;
  const throughputIsCustomer = result.assumptions?.throughputPerGpuSource === PHASE2_SOURCE.CUSTOMER;

  const assumptions = {
    activeWorkingSet: {
      source: activeWorkingSetIsCustomer ? PHASE2_SOURCE.CUSTOMER : PHASE2_SOURCE.EST,
      derivation: PHASE2_DERIVATION.CALCULATED,
      valuePct: result.inputs?.activeWorkingSetPct ?? null,
      explicitTb: result.inputs?.activeWorkingSetTb ?? null,
      note: activeWorkingSetIsCustomer
        ? "Explicit customer active-working-set capacity supplied."
        : "Planning assumption derived from the selected workload profile unless replaced by customer workload evidence.",
    },
    throughputPerGpu: {
      source: throughputIsCustomer ? PHASE2_SOURCE.CUSTOMER : PHASE2_SOURCE.EST,
      derivation: PHASE2_DERIVATION.CALCULATED,
      valueGBpsPerGpu: result.profile?.throughputGBpsPerGpu ?? result.profile?.throughputGbpsPerGpu ?? null,
      manualReadGBps: result.inputs?.manualThroughputGBps ?? null,
      note: throughputIsCustomer
        ? "Customer-supplied read-throughput requirement overrides the workload/GPU planning estimate."
        : "Workload planning estimate; manual customer throughput overrides it when supplied.",
    },
    rackDensity: {
      source: PHASE2_SOURCE.EST,
      derivation: PHASE2_DERIVATION.CALCULATED,
      fastTierTbPerRack: result.inputs?.fastTierTbPerRack ?? null,
      bulkTierTbPerRack: result.inputs?.bulkTierTbPerRack ?? null,
      note: "Provisional planning density pending OEM/BOM validation.",
    },
    rackPower: {
      source: PHASE2_SOURCE.EST,
      derivation: PHASE2_DERIVATION.CALCULATED,
      fastTierKwPerRack: result.inputs?.fastTierKwPerRack ?? null,
      bulkTierKwPerRack: result.inputs?.bulkTierKwPerRack ?? null,
      note: "Provisional planning power pending OEM/BOM validation.",
    },
  };

  const dependencies = {
    workload,
    fleet,
    capacity: result.capacity,
    throughput: { readGBps, writeGBps, aggregateGBps },
    racks: result.racks,
    estimatedPowerKw: result.estimatedPowerKw,
    assumptions,
  };
  const fingerprint = fingerprintInputs(dependencies);
  const acceptedAt = new Date().toISOString();

  const capacityOverride = createPhase2Override({
    id: "storage.capacity.raw.total",
    target: "tco.storage.rawCapacity.tb",
    value: Math.round(result.capacity.totalRawTb),
    unit: "TB",
    sourceTool: "storage-sizer",
    provenance: makeProvenance({
      source: PHASE2_SOURCE.EST,
      derivation: PHASE2_DERIVATION.CALCULATED,
      label: "Vendor-neutral raw capacity requirement derived from workload, growth, copies, active working set, checkpoint retention, reserve, and usable-efficiency assumptions",
    }),
    dependencies,
    referenceValue: null,
    createdAt: acceptedAt,
  });

  return {
    schemaVersion: 4,
    sourceTool: "storage-sizer",
    acceptedAt,
    fingerprint,
    workload,
    fleet,
    economicsScope: "REQUIREMENT-ONLY",
    pricingIncluded: false,
    overrides: [capacityOverride],
    assumptions,
    requirements: {
      fastUsableTb: result.capacity.fastUsableTb,
      bulkUsableTb: result.capacity.bulkUsableTb,
      totalRawTb: result.capacity.totalRawTb,
      readGBps,
      writeGBps,
      aggregateGBps,
      readGbps: readGBps,
      writeGbps: writeGBps,
      aggregateGbps: aggregateGBps,
      bandwidthUnit: "GB/s",
      storageRacks: result.racks.total,
      storagePowerKw: result.estimatedPowerKw,
      pricingStatus: "OUT-OF-SCOPE",
      pricingNote: "Storage Sizer produces a vendor-neutral capacity/performance/rack/power requirement. OEM selection, BOM design, and quoted storage economics remain an engineering/procurement follow-on and do not make the accepted sizing requirement unresolved.",
      flags: result.flags,
    },
  };
}
