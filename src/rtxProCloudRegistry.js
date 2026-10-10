// RTX PRO 6000 Blackwell Server Edition cloud comparison evidence.
//
// Phase 4A establishes normalized, auditable provider shapes and public-rate snapshots
// for engineering comparison. It still does NOT wire these values into customer-facing
// TCO recommendation math. Phase 4B must explicitly activate only providers whose
// region / OS / purchase-option / billing basis is acceptable for client-facing use.
//
// Normalization baseline:
// - Currency: USD
// - Purchase option: public On-Demand / Pay-As-You-Go
// - OS: Linux / no paid OS license where applicable
// - Hours/month convention: 730
// - Target deployment: match the selected 2/4/8 RTX PRO GPU count. Multi-VM composition
//   is allowed only when the provider does not publish a single shape at the target count.
//
// Evidence policy:
// - FIRST_PARTY_SHAPE: GPU count / SKU comes from the provider's own documentation.
// - FIRST_PARTY_RATE: hourly rate comes directly from a provider pricing page/list.
// - SECONDARY_RATE_SNAPSHOT: current public rate was independently cross-checked on a
//   pricing catalog that tracks provider public pricing, but must still be re-verified
//   against the provider before customer-facing activation.
// - RATE_CONFLICT: current public sources disagree materially; no normalized rate is
//   admitted until the provider billing basis is resolved.

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
    activationBlocker: "Re-verify exact us-east-1 Linux On-Demand rates against AWS Price List API before client-facing activation.",
    note: "G7e is GA and publishes direct 1/2/4/8 RTX PRO 6000 shapes. Current public rate catalogs agree on the normalized us-east-1 Linux On-Demand rates below. These rates are admitted for engineering comparison only until first-party AWS price-list verification is completed.",
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
    activationBlocker: "Re-verify exact East US Linux Pay-As-You-Go rates against Azure Retail Prices API before client-facing activation.",
    note: "Azure publishes 1-GPU and 2-GPU GA shapes in the NC RTX PRO 6000 BSE v6 series. The normalized 2/4/8 comparison uses the 2-GPU VM as the building block: one VM for 2 GPUs, two VMs for 4 GPUs, and four VMs for 8 GPUs. Multi-VM composition is explicit and must not be presented as a single Azure scale-up node.",
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
    customerFacingRateReady: false,
    engineeringComparisonReady: true,
    confidence: "FIRST_PARTY_SHAPE / FIRST_PARTY_RATE",
    shapeSource: "Google Cloud G4 machine-series documentation and accelerator-optimized pricing",
    shapeSourceUrl: "https://cloud.google.com/products/compute/pricing/accelerator-optimized",
    rateSource: "Google Cloud accelerator-optimized VM pricing",
    rateSourceUrl: "https://cloud.google.com/products/compute/pricing/accelerator-optimized",
    rateAsOf: "2026-10-10",
    activationBlocker: "Confirm the production comparison will use us-central1 and the same Linux/no-paid-license basis before client-facing activation.",
    note: "Google publishes direct whole-VM On-Demand prices for 1/2/4/8-GPU G4 Standard shapes. These are the strongest rate records in Phase 4A because both the shape and rate are first-party evidence.",
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
    normalizedRegion: "us-ashburn-1",
    normalizedRegionLabel: "Ashburn",
    normalizedOs: "Linux / base compute",
    normalizedPurchaseOption: "On-Demand",
    billingBasis: "UNRESOLVED",
    customerFacingRateReady: false,
    engineeringComparisonReady: false,
    confidence: "FIRST_PARTY_SHAPE / RATE_CONFLICT",
    shapeSource: "Oracle Cloud public compute shape and price-list materials",
    shapeSourceUrl: "https://www.oracle.com/cloud/price-list/",
    rateSource: "Conflicting public Oracle price-list interpretation vs current public pricing catalogs",
    rateSourceUrl: "https://www.oracle.com/cloud/price-list/",
    rateAsOf: "2026-10-10",
    activationBlocker: "Resolve the current BM.GPU.RTXPro.8 billing basis and authoritative hourly total. Prior evidence implied $5.8977/GPU-hour ($47.1816/8-GPU shape), while current public pricing catalogs report $36.00/hour for the 8-GPU shape. Do not compare until reconciled.",
    note: "Oracle remains intentionally excluded from normalized comparison math because the current public evidence conflicts materially on billing basis / effective whole-shape rate.",
    shapes: Object.freeze({
      8: freezeShape({ sku: "BM.GPU.RTXPro.8", gpuCount: 8, hourlyUsd: null, rateEvidence: "RATE_CONFLICT", priorPerGpuHourlyUsd: 5.8977, priorDerivedShapeHourlyUsd: 47.1816, observedPublicCatalogShapeHourlyUsd: 36.0 }),
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
    return {
      provider: providerName,
      gpuCount: target,
      status: "RATE_NOT_READY",
      reason: provider.activationBlocker,
      customerFacingRateReady: false,
    };
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
    return {
      provider: providerName,
      gpuCount: target,
      status: "RATE_NOT_READY",
      reason: provider.activationBlocker,
      customerFacingRateReady: false,
    };
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
  return Object.entries(RTX_PRO_CLOUD_PROVIDERS).map(([providerName, provider]) => {
    const plan = getRtxProCloudComparisonPlan(providerName, gpuCount);
    return {
      provider: provider.displayName,
      productFamily: provider.productFamily,
      directShape: provider.availableGpuCounts.includes(Number(gpuCount)),
      shape: provider.shapes?.[gpuCount] || null,
      normalizedPlan: plan,
      engineeringComparisonReady: provider.engineeringComparisonReady,
      customerFacingRateReady: provider.customerFacingRateReady,
      confidence: provider.confidence,
    };
  });
}
