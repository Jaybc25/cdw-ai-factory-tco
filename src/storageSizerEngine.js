export const STORAGE_WORKLOAD_PROFILES = Object.freeze({
  training: {
    label: "Training / fine-tuning",
    suggestedActiveWorkingSetPct: 35,
    archiveFraction: 0.65,
    throughputGBpsPerGpu: 1.0,
    throughputGbpsPerGpu: 1.0,
    notes: "Training usually needs a performance tier for the active working set and checkpoints, while the broader dataset can remain on bulk capacity. The working-set percentage is a starting suggestion, not a vendor rule.",
  },
  inference: {
    label: "Inference / serving",
    suggestedActiveWorkingSetPct: 20,
    archiveFraction: 0.80,
    throughputGBpsPerGpu: 0.25,
    throughputGbpsPerGpu: 0.25,
    notes: "Inference generally needs a smaller active artifact/model set on fast storage, with more historical artifacts and retained data on bulk capacity.",
  },
  rag: {
    label: "RAG / knowledge retrieval",
    suggestedActiveWorkingSetPct: 30,
    archiveFraction: 0.70,
    throughputGBpsPerGpu: 0.40,
    throughputGbpsPerGpu: 0.40,
    notes: "RAG fast-tier demand is driven by the active corpus plus index/embedding structures. The working-set percentage is only a planning starting point.",
  },
  multimodal: {
    label: "Vision / multimodal",
    suggestedActiveWorkingSetPct: 40,
    archiveFraction: 0.60,
    throughputGBpsPerGpu: 0.75,
    throughputGbpsPerGpu: 0.75,
    notes: "Large source objects can increase both active working-set capacity and ingest/scan bandwidth. The suggested working-set percentage should be replaced with customer evidence when available.",
  },
});

function n(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalNumber(value) {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function validateStorageSizerInputs(inputs) {
  const errors = [];
  const warnings = [];
  const baseDatasetTb = n(inputs.baseDatasetTb);
  const annualGrowthPct = n(inputs.annualGrowthPct);
  const years = n(inputs.years, 3);
  const copies = n(inputs.copies, 1);
  const usableEfficiency = n(inputs.usableEfficiency, 0.75);
  const gpuCount = n(inputs.gpuCount);
  const modelParamsBillions = n(inputs.modelParamsBillions, 0);
  const checkpointBytesPerParam = n(inputs.checkpointBytesPerParam, 16);
  const checkpointsRetained = n(inputs.checkpointsRetained, 0);
  const activeWorkingSetPct = n(inputs.activeWorkingSetPct, 0);
  const activeWorkingSetTb = optionalNumber(inputs.activeWorkingSetTb);

  if (!(baseDatasetTb > 0)) errors.push("Base dataset must be greater than 0 TB.");
  if (!(years >= 1 && years <= 7)) errors.push("Planning horizon must be between 1 and 7 years.");
  if (!(copies >= 1 && copies <= 5)) errors.push("Copies / replicas must be between 1 and 5.");
  if (!(usableEfficiency > 0 && usableEfficiency <= 1)) errors.push("Usable efficiency must be greater than 0 and no more than 1.0.");
  if (annualGrowthPct < 0 || annualGrowthPct > 300) errors.push("Annual growth must be between 0% and 300%.");
  if (gpuCount < 0) errors.push("GPU count cannot be negative.");
  if (modelParamsBillions < 0) errors.push("Model parameters cannot be negative.");
  if (checkpointBytesPerParam < 0 || checkpointBytesPerParam > 64) errors.push("Checkpoint bytes per parameter must be between 0 and 64.");
  if (checkpointsRetained < 0 || checkpointsRetained > 100) errors.push("Checkpoints retained must be between 0 and 100.");
  if (activeWorkingSetPct < 0 || activeWorkingSetPct > 100) errors.push("Active working-set percentage must be between 0% and 100%.");
  if (activeWorkingSetTb != null && activeWorkingSetTb < 0) errors.push("Active working-set TB cannot be negative.");

  if (gpuCount === 0) warnings.push("GPU count is 0, so throughput is workload-only and not GPU-scaled.");
  if (annualGrowthPct > 100) warnings.push("Annual growth above 100% materially dominates the horizon result; confirm this is intentional.");
  if (usableEfficiency > 0.9) warnings.push("Usable efficiency above 90% may be aggressive once protection, metadata, and reserve capacity are included.");
  if (checkpointsRetained > 0 && modelParamsBillions === 0) warnings.push("Checkpoint retention is non-zero but model parameters are 0, so checkpoint capacity will be 0 TB.");
  if (activeWorkingSetTb != null) warnings.push("Explicit active working-set TB overrides the working-set percentage.");

  return { valid: errors.length === 0, errors, warnings };
}

export function calculateStorageSizer(inputs) {
  const workloadKey = STORAGE_WORKLOAD_PROFILES[inputs.workload] ? inputs.workload : "training";
  const profile = STORAGE_WORKLOAD_PROFILES[workloadKey];
  const baseDatasetTb = Math.max(0, n(inputs.baseDatasetTb));
  const annualGrowthPct = clamp(n(inputs.annualGrowthPct), 0, 300);
  const years = Math.max(1, Math.round(n(inputs.years, 3)));
  const copies = Math.max(1, n(inputs.copies, 1));
  const modelParamsBillions = Math.max(0, n(inputs.modelParamsBillions));
  const checkpointBytesPerParam = clamp(n(inputs.checkpointBytesPerParam, 16), 0, 64);
  const checkpointsRetained = Math.max(0, Math.round(n(inputs.checkpointsRetained)));
  const activeWorkingSetPct = clamp(n(inputs.activeWorkingSetPct, profile.suggestedActiveWorkingSetPct), 0, 100);
  const explicitActiveWorkingSetValue = optionalNumber(inputs.activeWorkingSetTb);
  const explicitActiveWorkingSetTb = explicitActiveWorkingSetValue == null ? null : Math.max(0, explicitActiveWorkingSetValue);
  const indexOverheadPct = Math.max(0, n(inputs.indexOverheadPct, 10));
  const usableEfficiency = clamp(n(inputs.usableEfficiency, 0.75), 0.01, 1);
  const reservePct = Math.max(0, n(inputs.reservePct, 20));
  const gpuCount = Math.max(0, Math.round(n(inputs.gpuCount)));
  const manualThroughputPrimary = optionalNumber(inputs.manualThroughputGBps);
  const manualThroughputLegacy = optionalNumber(inputs.manualThroughputGbps);
  const manualThroughputGBps = manualThroughputPrimary == null
    ? (manualThroughputLegacy == null ? null : Math.max(0, manualThroughputLegacy))
    : Math.max(0, manualThroughputPrimary);
  const ingestPrimary = optionalNumber(inputs.ingestGBps);
  const ingestLegacy = optionalNumber(inputs.ingestGbps);
  const ingestGBps = Math.max(0, ingestPrimary ?? ingestLegacy ?? 0);
  const fastTierTbPerRack = Math.max(1, n(inputs.fastTierTbPerRack, 500));
  const bulkTierTbPerRack = Math.max(1, n(inputs.bulkTierTbPerRack, 1000));
  const fastTierKwPerRack = Math.max(0, n(inputs.fastTierKwPerRack, 6));
  const bulkTierKwPerRack = Math.max(0, n(inputs.bulkTierKwPerRack, 4));

  const horizonGrowthFactor = Math.pow(1 + annualGrowthPct / 100, Math.max(0, years - 1));
  const grownDatasetTb = baseDatasetTb * horizonGrowthFactor;
  const replicatedDatasetTb = grownDatasetTb * copies;

  // Decimal TB: 1B parameters × N bytes/parameter = N GB = N/1000 TB.
  const checkpointTb = (modelParamsBillions * checkpointBytesPerParam * checkpointsRetained) / 1000;
  const indexOverheadTb = replicatedDatasetTb * (indexOverheadPct / 100);
  const logicalTotalTb = replicatedDatasetTb + checkpointTb + indexOverheadTb;

  const suggestedWorkingSetTb = replicatedDatasetTb * (activeWorkingSetPct / 100);
  const activeWorkingSetTb = Math.min(replicatedDatasetTb, explicitActiveWorkingSetTb ?? suggestedWorkingSetTb);
  const fastUsableTbBeforeReserve = activeWorkingSetTb + checkpointTb + indexOverheadTb;
  const bulkUsableTbBeforeReserve = Math.max(0, replicatedDatasetTb - activeWorkingSetTb);

  const reserveFactor = 1 + reservePct / 100;
  const fastUsableTb = fastUsableTbBeforeReserve * reserveFactor;
  const bulkUsableTb = bulkUsableTbBeforeReserve * reserveFactor;
  const totalUsableTb = fastUsableTb + bulkUsableTb;

  const fastRawTb = fastUsableTb / usableEfficiency;
  const bulkRawTb = bulkUsableTb / usableEfficiency;
  const totalRawTb = fastRawTb + bulkRawTb;

  const gpuDrivenGBps = gpuCount * profile.throughputGBpsPerGpu;
  const requiredReadGBps = manualThroughputGBps == null ? Math.max(gpuDrivenGBps, ingestGBps) : manualThroughputGBps;
  const requiredWriteGBps = Math.max(ingestGBps, requiredReadGBps * 0.35);
  const aggregateGBps = requiredReadGBps + requiredWriteGBps;

  const fastRacks = Math.ceil(fastRawTb / fastTierTbPerRack);
  const bulkRacks = Math.ceil(bulkRawTb / bulkTierTbPerRack);
  const totalRacks = fastRacks + bulkRacks;
  const estimatedPowerKw = fastRacks * fastTierKwPerRack + bulkRacks * bulkTierKwPerRack;

  const tiering = totalUsableTb > 0 ? {
    fastPct: (fastUsableTb / totalUsableTb) * 100,
    bulkPct: (bulkUsableTb / totalUsableTb) * 100,
  } : { fastPct: 0, bulkPct: 0 };

  const flags = [];
  if (fastUsableTb > bulkUsableTb * 2) flags.push("Fast-tier requirement dominates the design; validate active-working-set, checkpoint-retention, and index assumptions.");
  if (aggregateGBps >= 50) flags.push("Aggregate storage bandwidth is high enough that Fabric design will be a primary dependency.");
  if (reservePct < 10) flags.push("Reserve capacity below 10% leaves little operational headroom.");
  if (copies > 2) flags.push("More than two copies materially increase capacity; confirm whether protection is already included in the usable-efficiency assumption.");
  if (explicitActiveWorkingSetTb != null && explicitActiveWorkingSetTb > replicatedDatasetTb) flags.push("Explicit active working-set TB exceeds the replicated dataset and has been capped at the replicated dataset size.");
  if (checkpointTb > activeWorkingSetTb && checkpointsRetained > 0) flags.push("Checkpoint retention is larger than the active dataset working set; validate model size, bytes/parameter, and retention count.");

  return {
    workload: workloadKey,
    profile,
    inputs: {
      baseDatasetTb,
      annualGrowthPct,
      years,
      copies,
      modelParamsBillions,
      checkpointBytesPerParam,
      checkpointsRetained,
      activeWorkingSetPct,
      activeWorkingSetTb: explicitActiveWorkingSetTb,
      indexOverheadPct,
      usableEfficiency,
      reservePct,
      gpuCount,
      manualThroughputGBps,
      manualThroughputGbps: manualThroughputGBps,
      ingestGBps,
      ingestGbps: ingestGBps,
      fastTierTbPerRack,
      bulkTierTbPerRack,
      fastTierKwPerRack,
      bulkTierKwPerRack,
    },
    capacity: {
      grownDatasetTb,
      replicatedDatasetTb,
      activeWorkingSetTb,
      checkpointTb,
      indexOverheadTb,
      logicalTotalTb,
      fastUsableTb,
      bulkUsableTb,
      totalUsableTb,
      fastRawTb,
      bulkRawTb,
      totalRawTb,
    },
    throughput: {
      gpuDrivenGBps,
      requiredReadGBps,
      requiredWriteGBps,
      aggregateGBps,
      // Backward-compatible aliases retained during preview migration. Values are GB/s, not Gbps.
      gpuDrivenGbps: gpuDrivenGBps,
      requiredReadGbps: requiredReadGBps,
      requiredWriteGbps: requiredWriteGBps,
      aggregateGbps: aggregateGBps,
      unit: "GB/s",
    },
    racks: { fast: fastRacks, bulk: bulkRacks, total: totalRacks },
    estimatedPowerKw,
    tiering,
    flags,
    assumptions: {
      throughputPerGpuSource: manualThroughputGBps == null ? "EST" : "CUSTOMER",
      rackDensitySource: "EST",
      rackPowerSource: "EST",
      activeWorkingSetSource: explicitActiveWorkingSetTb == null ? "EST" : "CUSTOMER",
    },
    methodology: {
      horizonGrowth: "base dataset × (1 + annual growth)^(years - 1); sizes capacity at the start of the final planning year",
      activeWorkingSet: explicitActiveWorkingSetTb == null
        ? `replicated dataset × ${activeWorkingSetPct}% active-working-set assumption`
        : "customer-supplied active working-set TB (capped at replicated dataset size)",
      checkpoints: "model parameters (billions) × checkpoint bytes/parameter × retained checkpoints ÷ 1,000 = decimal TB",
      usableCapacity: "active working set + checkpoints + index/metadata overhead on fast tier; remaining replicated dataset on bulk tier; then operational reserve",
      rawCapacity: "usable capacity ÷ usable-efficiency assumption",
      throughput: manualThroughputGBps == null
        ? "max(EST GPU-scaled workload throughput, ingest throughput), plus conservative write allowance = max(ingest, 35% of read)"
        : "customer-supplied read throughput, plus conservative write allowance = max(ingest, 35% of read)",
      rackDensity: "EST planning TB/rack assumptions pending OEM/BOM validation",
      power: "EST planning rack count × provisional kW/rack; replaced later by vendor/BOM detail",
    },
  };
}
