// RTX PRO 6000 Blackwell Server Edition cloud comparison evidence.
//
// Phase 4A established normalized 2/4/8-GPU provider shapes. Phase 4B admits only
// first-party, region-normalized public rates into customer-facing recommendation math.
// Secondary public-rate snapshots remain engineering-only until the provider's own
// price API/page is independently verified on the exact same commercial basis.

export const RTX_PRO_CLOUD_EVIDENCE_AS_OF = "2026-10-10";
export const RTX_PRO_CLOUD_HOURS_PER_MONTH = 730;

const freezeShape = (shape) => Object.freeze(shape);

export const RTX_PRO_CLOUD_PROVIDERS = Object.freeze({
  AWS: Object.freeze({
    displayName: "AWS",
    productFamily: "EC2 G7e",
    gpuModel: "NVIDIA RTX PRO 6000 Blackwell Server Edition",
    availableGpuCounts: Object.freeze([1, 2, 4, 8]),
    normalizedRegion: "us-east-1",
    normalizedRegionLabel: "US East (N. Virginia)",
    normalizedOs: "Linux",
    normalizedPurchaseOption: "On-Demand",
    billingBasis: "WHOLE_VM_PER_HOUR",
    customerFacingRateReady: false,
    engineeringComparisonReady: true,
    confidence: "FIRST_PARTY_SHAPE / SECONDARY_RATE_SNAPSHOT",
    shapeSource: "AWS EC2 G7e product and instance-type pages",
    shapeSourceUrl: "https://aws.amazon.com/ec2/instance-types/g7e/",
    rateSource: "Public EC2 pricing catalogs cross-checking AWS us-east-1 Linux On-Demand",
    rateSourceUrl: "https://aws-pricing.com/g7e.2xlarge.html",
    rateAsOf: "2026-10-10",
    activationBlocker: "Re-verify exact us-east-1 Linux On-Demand rates against AWS Price List API before customer-facing activation.",
    note: "Direct 1/2/4/8 RTX PRO shapes are first-party verified. Current rates are engineering-only until AWS first-party price verification is completed.",
    shapes: Object.freeze({
      1: freezeShape({ sku: "g7e.2xlarge", gpuCount: 1, hourlyUsd: 3.3631, rateEvidence: "SECONDARY_RATE_SNAPSHOT" }),
      2: freezeShape({ sku: "g7e.12xlarge", gpuCount: 2, hourlyUsd: 8.2861, rateEvidence: "SECONDARY_RATE_SNAPSHOT" }),
      4: freezeShape({ sku: "g7e.24xlarge", gpuCount: 4, hourlyUsd: 16.5722, rateEvidence: "SECONDARY_RATE_SNAPSHOT" }),
      8: freezeShape({ sku: "g7e.48xlarge", gpuCount: 8, hourlyUsd: 33.1443, rateEvidence: "SECONDARY_RATE_SNAPSHOT" }),
    }),
  }),

  Azure: Object.freeze({
    displayName: "Azure",
    productFamily: "NC RTX PRO 6000 BSE v6",
    gpuModel: "NVIDIA RTX PRO 6000 Blackwell Server Edition",
    availableGpuCounts: Object.freeze([0.25, 0.5, 1, 2]),
    normalizedRegion: "eastus",
    normalizedRegionLabel: "East US",
    normalizedOs: "Linux",
    normalizedPurchaseOption: "Pay-As-You-Go",
    billingBasis: "WHOLE_VM_PER_HOUR",
    customerFacingRateReady: false,
    engineeringComparisonReady: true,
    confidence: "FIRST_PARTY_SHAPE / SECONDARY_RATE_SNAPSHOT",
    shapeSource: "Microsoft Learn NC_RTXPRO6000BSE_v6 size-series documentation",
    shapeSourceUrl: "https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nc-rtxpro6000-bse-v6-series",
    rateSource: "Public Azure pricing catalogs cross-checking East US Linux Pay-As-You-Go",
    rateSourceUrl: "https://www.azurespeed.com/AzureVmPricing/Standard_NC144ds_xl_RTXPRO6000BSE_v6",
    rateAsOf: "2026-10-10",
    activationBlocker: "Re-verify exact East US Linux Pay-As-You-Go rates against Azure Retail Prices API before customer-facing activation.",
    note: "Azure has direct 1/2-GPU shapes. The 4/8-GPU engineering comparison composes two/four 2-GPU VMs and never presents them as one scale-up node.",
    shapes: Object.freeze({
      1: freezeShape({ sku: "Standard_NC144ds_xl_RTXPRO6000BSE_v6", gpuCount: 1, hourlyUsd: 6.38, rateEvidence: "SECONDARY_RATE_SNAPSHOT" }),
      2: freezeShape({ sku: "Standard_NC288ds_xl_RTXPRO6000BSE_v6", gpuCount: 2, hourlyUsd: 11.0, rateEvidence: "SECONDARY_RATE_SNAPSHOT" }),
    }),
  }),

  "Google Cloud": Object.freeze({
    displayName: "Google Cloud",
    productFamily: "G4 Standard",
    gpuModel: "NVIDIA RTX PRO 6000 Blackwell Server Edition",
    availableGpuCounts: Object.freeze([1, 2, 4, 8]),
    normalizedRegion: "us-central1",
    normalizedRegionLabel: "Iowa",
    normalizedOs: "Linux / no paid OS license",
    normalizedPurchaseOption: "On-Demand",
    billingBasis: "WHOLE_VM_PER_HOUR",
    customerFacingRateReady: true,
    engineeringComparisonReady: true,
    confidence: "FIRST_PARTY_SHAPE / FIRST_PARTY_RATE",
    shapeSource: "Google Cloud G4 machine-series documentation and accelerator-optimized pricing",
    shapeSourceUrl: "https://cloud.google.com/products/compute/pricing/accelerator-optimized",
    rateSource: "Google Cloud accelerator-optimized VM pricing",
    rateSourceUrl: "https://cloud.google.com/products/compute/pricing/accelerator-optimized",
    rateAsOf: "2026-10-10",
    activationBlocker: null,
    note: "Google publishes direct 1/2/4/8-GPU G4 Standard whole-VM default rates in USD for Iowa (us-central1); this is admitted to customer-facing comparison math.",
    shapes: Object.freeze({
      1: freezeShape({ sku: "g4-standard-48", gpuCount: 1, hourlyUsd: 4.49993, rateEvidence: "FIRST_PARTY_RATE" }),
      2: freezeShape({ sku: "g4-standard-96", gpuCount: 2, hourlyUsd: 8.99986, rateEvidence: "FIRST_PARTY_RATE" }),
      4: freezeShape({ sku: "g4-standard-192", gpuCount: 4, hourlyUsd: 17.99972, rateEvidence: "FIRST_PARTY_RATE" }),
      8: freezeShape({ sku: "g4-standard-384", gpuCount: 8, hourlyUsd: 35.99944, rateEvidence: "FIRST_PARTY_RATE" }),
    }),
  }),

  "Oracle Cloud": Object.freeze({
    displayName: "Oracle Cloud",
    productFamily: "BM.GPU.RTXPro.8",
    gpuModel: "NVIDIA RTX PRO 6000 Blackwell Server Edition",
    availableGpuCounts: Object.freeze([8]),
    normalizedRegion: "public-price-list",
    normalizedRegionLabel: "Oracle public price list",
    normalizedOs: "Linux / base compute",
    normalizedPurchaseOption: "On-Demand",
    billingBasis: "GPU_PER_HOUR_X_GPU_COUNT",
    customerFacingRateReady: false,
    engineeringComparisonReady: true,
    confidence: "FIRST_PARTY_SHAPE / FIRST_PARTY_RATE / REGION-CURRENCY-CONFIRMATION-PENDING",
    shapeSource: "Oracle Cloud public price list",
    shapeSourceUrl: "https://www.oracle.com/cloud/price-list/",
    rateSource: "Oracle Cloud public price list",
    rateSourceUrl: "https://www.oracle.com/cloud/price-list/",
    rateAsOf: "2026-10-10",
    activationBlocker: "Oracle first-party evidence resolves the billing formula ($5.8977 per GPU-hour × 8 GPUs = $47.1816/server-hour), but exact U.S. region/currency normalization must be confirmed before customer-facing activation.",
    note: "Oracle's own price-list footnote states that server price per hour equals GPU price per hour multiplied by GPU count. The 8-GPU shape is therefore admitted for engineering comparison at $47.1816/hour, but remains customer-facing blocked pending U.S. region/currency normalization.",
    shapes: Object.freeze({
      8: freezeShape({ sku: "BM.GPU.RTXPro.8", gpuCount: 8, hourlyUsd: 47.1816, perGpuHourlyUsd: 5.8977, rateEvidence: "FIRST_PARTY_RATE" }),
    }),
  }),
});

export function getRtxProCloudShape(provider, gpuCount) {
  return RTX_PRO_CLOUD_PROVIDERS[provider]?.shapes?.[gpuCount] || null;
}

export function getRtxProCloudComparisonPlan(providerName, gpuCount) {
  const provider = RTX_PRO_CLOUD_PROVIDERS[providerName];
  const target = Number(gpuCount);
  if (!provider || ![2, 4, 8].includes(target)) return null;
  if (!provider.engineeringComparisonReady) {
    return { provider: providerName, gpuCount: target, status: "RATE_NOT_READY", reason: provider.activationBlocker, customerFacingRateReady: false };
  }

  let shape = provider.shapes?.[target] || null;
  let quantity = 1;
  let composition = "DIRECT_SHAPE";

  if (!shape && providerName === "Azure") {
    shape = provider.shapes?.[2] || null;
    if (!shape || target % 2 !== 0) return null;
    quantity = target / 2;
    composition = quantity === 1 ? "DIRECT_SHAPE" : "MULTI_VM_COMPOSITION";
  }

  if (!shape || !Number.isFinite(shape.hourlyUsd)) {
    return { provider: providerName, gpuCount: target, status: "RATE_NOT_READY", reason: provider.activationBlocker, customerFacingRateReady: false };
  }

  const hourlyUsd = shape.hourlyUsd * quantity;
  return Object.freeze({
    provider: providerName,
    productFamily: provider.productFamily,
    region: provider.normalizedRegion,
    regionLabel: provider.normalizedRegionLabel,
    os: provider.normalizedOs,
    purchaseOption: provider.normalizedPurchaseOption,
    billingBasis: provider.billingBasis,
    gpuCount: target,
    sku: shape.sku,
    vmQuantity: quantity,
    gpusPerVm: shape.gpuCount,
    composition,
    hourlyUsd,
    monthlyUsd: hourlyUsd * RTX_PRO_CLOUD_HOURS_PER_MONTH,
    rateEvidence: shape.rateEvidence,
    confidence: provider.confidence,
    customerFacingRateReady: provider.customerFacingRateReady,
    status: "READY_FOR_ENGINEERING_COMPARISON",
    activationBlocker: provider.activationBlocker,
  });
}

export function getRtxProCloudCoverage(gpuCount) {
  return Object.entries(RTX_PRO_CLOUD_PROVIDERS).map(([providerName, provider]) => ({
    provider: provider.displayName,
    productFamily: provider.productFamily,
    directShape: provider.availableGpuCounts.includes(Number(gpuCount)),
    shape: provider.shapes?.[gpuCount] || null,
    normalizedPlan: getRtxProCloudComparisonPlan(providerName, gpuCount),
    engineeringComparisonReady: provider.engineeringComparisonReady,
    customerFacingRateReady: provider.customerFacingRateReady,
    confidence: provider.confidence,
  }));
}
