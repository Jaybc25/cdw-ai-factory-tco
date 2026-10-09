// RTX PRO 6000 Blackwell Server Edition cloud comparison evidence.
//
// Phase 1 only: this registry is intentionally NOT wired into customer-facing TCO math yet.
// The purpose is to separate public product/rate evidence from UI activation so we can
// converge RTX TCO with the main TCO without silently inventing comparable cloud shapes.
//
// Evidence researched 2026-10-09 from official provider sources. Before client-facing
// activation, exact region / OS / purchase-option normalization must be re-verified for
// every numeric rate and the comparison must choose the smallest provider shape that
// satisfies the selected 2/4/8-GPU RTX deployment.

export const RTX_PRO_CLOUD_EVIDENCE_AS_OF = "2026-10-09";

export const RTX_PRO_CLOUD_PROVIDERS = Object.freeze({
  AWS: Object.freeze({
    displayName: "AWS",
    productFamily: "EC2 G7e",
    gpuModel: "NVIDIA RTX PRO 6000 Blackwell Server Edition",
    availableGpuCounts: Object.freeze([1, 2, 4, 8]),
    customerFacingRateReady: false,
    confidence: "LISTED-SHAPE / RATE-PENDING",
    source: "AWS EC2 G7e product and instance-type pages",
    sourceUrl: "https://aws.amazon.com/ec2/instance-types/g7e/",
    note: "G7e is GA and supports 1/2/4/8 RTX PRO 6000 GPUs. Exact EC2 On-Demand rate normalization is still required before client-facing comparison activation. Do not substitute the SageMaker endpoint rate for EC2 TCO.",
    shapes: Object.freeze({
      1: Object.freeze({ sku: "g7e.2xlarge", hourlyUsd: null }),
      2: Object.freeze({ sku: "g7e.12xlarge", hourlyUsd: null }),
      4: Object.freeze({ sku: "g7e.24xlarge", hourlyUsd: null }),
      8: Object.freeze({ sku: "g7e.48xlarge", hourlyUsd: null }),
    }),
  }),

  Azure: Object.freeze({
    displayName: "Azure",
    productFamily: "NC RTX PRO 6000 BSE v6",
    gpuModel: "NVIDIA RTX PRO 6000 Blackwell Server Edition",
    availableGpuCounts: Object.freeze([0.25, 0.5, 1, 2]),
    customerFacingRateReady: false,
    confidence: "LISTED-SHAPE / RATE-PENDING",
    source: "Microsoft Learn NC_RTXPRO6000BSE_v6 size-series documentation",
    sourceUrl: "https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/gpu-accelerated/nc-rtxpro6000-bse-v6-series",
    note: "Azure publicly documents fractional, 1-GPU, and 2-GPU RTX PRO 6000 BSE v6 VM sizes. Exact GA Pay-As-You-Go rate normalization is still required. A 4/8-GPU private deployment would require multiple Azure VMs rather than a single same-shape VM under the currently documented series.",
    shapes: Object.freeze({
      1: Object.freeze({ sku: "Standard_NC144ds_xl_RTXPRO6000BSE_v6", hourlyUsd: null }),
      2: Object.freeze({ sku: "Standard_NC288ds_xl_RTXPRO6000BSE_v6", hourlyUsd: null }),
    }),
  }),

  "Google Cloud": Object.freeze({
    displayName: "Google Cloud",
    productFamily: "G4 Standard",
    gpuModel: "NVIDIA RTX PRO 6000 Blackwell Server Edition",
    availableGpuCounts: Object.freeze([1, 2, 4, 8]),
    customerFacingRateReady: false,
    confidence: "LISTED / REGION-NORMALIZATION-PENDING",
    source: "Google Cloud accelerator-optimized VM pricing",
    sourceUrl: "https://cloud.google.com/products/compute/pricing/accelerator-optimized",
    note: "Official pricing page publishes whole-VM On-Demand rates for 1/2/4/8-GPU G4 Standard shapes. Keep staged until the same region/currency basis used by the main TCO registry is explicitly normalized and regression-tested.",
    shapes: Object.freeze({
      1: Object.freeze({ sku: "g4-standard-48", hourlyUsd: 4.49993 }),
      2: Object.freeze({ sku: "g4-standard-96", hourlyUsd: 8.99986 }),
      4: Object.freeze({ sku: "g4-standard-192", hourlyUsd: 17.99972 }),
      8: Object.freeze({ sku: "g4-standard-384", hourlyUsd: 35.99944 }),
    }),
  }),

  "Oracle Cloud": Object.freeze({
    displayName: "Oracle Cloud",
    productFamily: "BM.GPU.RTXPro.8",
    gpuModel: "NVIDIA RTX PRO 6000 Blackwell Server Edition",
    availableGpuCounts: Object.freeze([8]),
    customerFacingRateReady: false,
    confidence: "LISTED / BILLING-BASIS-VALIDATION-PENDING",
    source: "Oracle Cloud global/public price list",
    sourceUrl: "https://www.oracle.com/cloud/price-list/",
    note: "Oracle publicly lists BM.GPU.RTXPro.8 with 8 RTX PRO 6000 GPUs and a published GPU-price-per-hour figure of $5.8977. Before activation, validate whether the TCO comparison should store the per-GPU rate ($5.8977) or the derived 8-GPU shape total ($47.1816) and normalize the same regional/commercial basis as the main registry.",
    shapes: Object.freeze({
      8: Object.freeze({ sku: "BM.GPU.RTXPro.8", perGpuHourlyUsd: 5.8977, derivedShapeHourlyUsd: 47.1816 }),
    }),
  }),
});

export function getRtxProCloudShape(provider, gpuCount) {
  return RTX_PRO_CLOUD_PROVIDERS[provider]?.shapes?.[gpuCount] || null;
}

export function getRtxProCloudCoverage(gpuCount) {
  return Object.values(RTX_PRO_CLOUD_PROVIDERS).map((provider) => ({
    provider: provider.displayName,
    productFamily: provider.productFamily,
    directShape: provider.availableGpuCounts.includes(Number(gpuCount)),
    shape: provider.shapes?.[gpuCount] || null,
    customerFacingRateReady: provider.customerFacingRateReady,
    confidence: provider.confidence,
  }));
}
