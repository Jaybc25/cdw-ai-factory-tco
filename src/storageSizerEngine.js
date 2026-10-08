export const STORAGE_WORKLOAD_PROFILES = Object.freeze({
  training: {
    label: "Training / fine-tuning",
    fastFraction: 0.65,
    checkpointFraction: 0.25,
    archiveFraction: 0.10,
    throughputGbpsPerGpu: 1.0,
    notes: "Highest fast-tier pressure. Checkpoints and active datasets dominate the performance tier.",
  },
  inference: {
    label: "Inference / serving",
    fastFraction: 0.35,
    checkpointFraction: 0.10,
    archiveFraction: 0.55,
    throughputGbpsPerGpu: 0.25,
    notes: "Lower sustained storage bandwidth than training, with more room for bulk retention and artifact history.",
  },
  rag: {
    label: "RAG / knowledge retrieval",
    fastFraction: 0.50,
    checkpointFraction: 0.05,
    archiveFraction: 0.45,
    throughputGbpsPerGpu: 0.40,
    notes: "Fast tier emphasizes active corpora, vector/index structures, and refresh workflows rather than checkpoints.",
  },
  multimodal: {
    label: "Vision / multimodal",
    fastFraction: 0.60,
    checkpointFraction: 0.10,
    archiveFraction: 0.30,
    throughputGbpsPerGpu: 0.75,
    notes: "Large source objects increase both usable capacity and ingest/scan bandwidth requirements.",
  },
});

function n(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

  if (!(baseDatasetTb > 0)) errors.push("Base dataset must be greater than 0 TB.");
  if (!(years >= 1 && years <= 7)) errors.push("Planning horizon must be between 1 and 7 years.");
  if (!(copies >= 1 && copies <= 5)) errors.push("Copies / replicas must be between 1 and 5.");
  if (!(usableEfficiency > 0 && usableEfficiency <= 1)) errors.push("Usable efficiency must be greater than 0 and no more than 1.0.");
  if (annualGrowthPct < 0 || annualGrowthPct > 300) errors.push("Annual growth must be between 0% and 300%.");
  if (gpuCount < 0) errors.push("GPU count cannot be negative.");

  if (gpuCount === 0) warnings.push("GPU count is 0, so throughput is workload-only and not GPU-scaled.");
  if (annualGrowthPct > 100) warnings.push("Annual growth above 100% materially dominates the horizon result; confirm this is intentional.");
  if (usableEfficiency > 0.9) warnings.push("Usable efficiency above 90% may be aggressive once protection, metadata, and reserve capacity are included.");

  return { valid: errors.length === 0, errors, warnings };
}

export function calculateStorageSizer(inputs) {
  const workloadKey = STORAGE_WORKLOAD_PROFILES[inputs.workload] ? inputs.workload : "training";
  const profile = STORAGE_WORKLOAD_PROFILES[workloadKey];
  const baseDatasetTb = Math.max(0, n(inputs.baseDatasetTb));
  const annualGrowthPct = clamp(n(inputs.annualGrowthPct), 0, 300);
  const years = Math.max(1, Math.round(n(inputs.years, 3)));
  const copies = Math.max(1, n(inputs.copies, 1));
  const checkpointMultiplier = Math.max(0, n(inputs.checkpointMultiplier, 0));
  const indexOverheadPct = Math.max(0, n(inputs.indexOverheadPct, 10));
  const usableEfficiency = clamp(n(inputs.usableEfficiency, 0.75), 0.01, 1);
  const reservePct = Math.max(0, n(inputs.reservePct, 20));
  const gpuCount = Math.max(0, Math.round(n(inputs.gpuCount)));
  const manualThroughputGbps = inputs.manualThroughputGbps === "" || inputs.manualThroughputGbps == null
    ? null
    : Math.max(0, n(inputs.manualThroughputGbps));
  const ingestGbps = Math.max(0, n(inputs.ingestGbps));
  const fastTierTbPerRack = Math.max(1, n(inputs.fastTierTbPerRack, 500));
  const bulkTierTbPerRack = Math.max(1, n(inputs.bulkTierTbPerRack, 1000));
  const fastTierKwPerRack = Math.max(0, n(inputs.fastTierKwPerRack, 6));
  const bulkTierKwPerRack = Math.max(0, n(inputs.bulkTierKwPerRack, 4));

  const horizonGrowthFactor = Math.pow(1 + annualGrowthPct / 100, Math.max(0, years - 1));
  const grownDatasetTb = baseDatasetTb * horizonGrowthFactor;
  const replicatedDatasetTb = grownDatasetTb * copies;
  const checkpointTb = baseDatasetTb * checkpointMultiplier;
  const indexOverheadTb = replicatedDatasetTb * (indexOverheadPct / 100);
  const logicalTotalTb = replicatedDatasetTb + checkpointTb + indexOverheadTb;

  const workloadFastTb = replicatedDatasetTb * profile.fastFraction;
  const workloadCheckpointTb = checkpointTb + replicatedDatasetTb * profile.checkpointFraction;
  const fastUsableTbBeforeReserve = workloadFastTb + workloadCheckpointTb + indexOverheadTb;
  const bulkUsableTbBeforeReserve = Math.max(0, logicalTotalTb - fastUsableTbBeforeReserve);

  const reserveFactor = 1 + reservePct / 100;
  const fastUsableTb = fastUsableTbBeforeReserve * reserveFactor;
  const bulkUsableTb = bulkUsableTbBeforeReserve * reserveFactor;
  const totalUsableTb = fastUsableTb + bulkUsableTb;

  const fastRawTb = fastUsableTb / usableEfficiency;
  const bulkRawTb = bulkUsableTb / usableEfficiency;
  const totalRawTb = fastRawTb + bulkRawTb;

  const gpuDrivenGbps = gpuCount * profile.throughputGbpsPerGpu;
  const requiredReadGbps = manualThroughputGbps == null ? Math.max(gpuDrivenGbps, ingestGbps) : manualThroughputGbps;
  const requiredWriteGbps = Math.max(ingestGbps, requiredReadGbps * 0.35);
  const aggregateGbps = requiredReadGbps + requiredWriteGbps;

  const fastRacks = Math.ceil(fastRawTb / fastTierTbPerRack);
  const bulkRacks = Math.ceil(bulkRawTb / bulkTierTbPerRack);
  const totalRacks = fastRacks + bulkRacks;
  const estimatedPowerKw = fastRacks * fastTierKwPerRack + bulkRacks * bulkTierKwPerRack;

  const tiering = totalUsableTb > 0 ? {
    fastPct: (fastUsableTb / totalUsableTb) * 100,
    bulkPct: (bulkUsableTb / totalUsableTb) * 100,
  } : { fastPct: 0, bulkPct: 0 };

  const flags = [];
  if (fastUsableTb > bulkUsableTb * 2) flags.push("Fast-tier requirement dominates the design; validate checkpoint retention and active-working-set assumptions.");
  if (aggregateGbps >= 50) flags.push("Aggregate storage bandwidth is high enough that Fabric design will be a primary dependency.");
  if (reservePct < 10) flags.push("Reserve capacity below 10% leaves little operational headroom.");
  if (copies > 2) flags.push("More than two copies materially increase capacity; confirm whether protection is already included in the usable-efficiency assumption.");

  return {
    workload: workloadKey,
    profile,
    inputs: {
      baseDatasetTb,
      annualGrowthPct,
      years,
      copies,
      checkpointMultiplier,
      indexOverheadPct,
      usableEfficiency,
      reservePct,
      gpuCount,
      manualThroughputGbps,
      ingestGbps,
      fastTierTbPerRack,
      bulkTierTbPerRack,
      fastTierKwPerRack,
      bulkTierKwPerRack,
    },
    capacity: {
      grownDatasetTb,
      replicatedDatasetTb,
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
      gpuDrivenGbps,
      requiredReadGbps,
      requiredWriteGbps,
      aggregateGbps,
    },
    racks: { fast: fastRacks, bulk: bulkRacks, total: totalRacks },
    estimatedPowerKw,
    tiering,
    flags,
    methodology: {
      horizonGrowth: "base dataset × (1 + annual growth)^(years - 1)",
      usableCapacity: "workload tier split + checkpoint/index overhead + reserve",
      rawCapacity: "usable capacity ÷ usable-efficiency assumption",
      throughput: manualThroughputGbps == null
        ? "max(GPU-scaled workload throughput, ingest throughput), plus write allowance"
        : "customer-supplied read throughput, plus write allowance",
      power: "planning rack count × provisional kW/rack; replaced later by vendor/BOM detail",
    },
  };
}
