// Right-Sized Private AI: RTX PRO 6000 Blackwell Server Edition planning registry.
//
// This file is intentionally NOT merged into ONPREM_SYSTEMS yet. It establishes
// auditable product/economic evidence before GPU Sizing or TCO is allowed to
// recommend or price the platform. Client-facing activation belongs to later
// PRs after the evidence and regression gates in issue #198 are satisfied.
//
// Provenance rules:
// - LISTED = public configured-system price observed directly from an OEM page.
// - QUOTE = valid architecture/configuration class, but no defensible public
//   configured-system price is currently admitted.
// - DIRECT = the field comes directly from the cited first-party/OEM source.
// - DERIVED values are not admitted in v1 pricing records; we do not build an
//   8-GPU configured-system price by adding retail GPUs to a barebones chassis.

export const RTX_PRO_SERVER_REGISTRY_VERSION = "2026-10-08.v1";
export const RTX_PRO_SERVER_PRICING_VERIFIED_AT = "2026-10-08";
export const RTX_PRO_SERVER_SPECS_VERIFIED_AT = "2026-10-08";
export const RTX_PRO_SERVER_REVIEW_DAYS = 30;
export const RTX_PRO_SERVER_STALE_DAYS = 60;

export const RTX_PRO_6000_GPU_SPEC = Object.freeze({
  id: "RTX PRO 6000 Blackwell Server Edition",
  architecture: "Blackwell",
  vramGB: 96,
  memoryType: "GDDR7 ECC",
  memoryBandwidthGBps: 1597,
  pcie: "PCIe Gen 5 x16",
  powerMinW: 400,
  powerMaxW: 600,
  formFactor: "Dual-slot, passive server edition",
  source: "NVIDIA",
  sourceUrl: "https://www.nvidia.com/en-us/data-center/rtx-pro-6000-blackwell-server-edition/",
  provenance: "LISTED",
  derivation: "DIRECT",
  asOf: RTX_PRO_SERVER_SPECS_VERIFIED_AT,
});

export const RTX_PRO_SERVER_CONFIGURATION_POLICY = Object.freeze({
  supportedGpuCounts: Object.freeze([2, 4, 8]),
  oneGpuProductionRecommended: false,
  oneGpuReason: "No OEM/CDW production reference configuration has been admitted for v1.",
  multiGpuModelParallelAutonomous: false,
  multiGpuModelParallelReason: "Model splitting across RTX PRO GPUs remains engineering-validation-only until model/topology/framework-specific evidence is admitted.",
  replicaSizingAutonomous: true,
  replicaSizingBoundary: "Model must fit comfortably on one 96 GB GPU; scale serving demand through independent replicas, then round to a validated 2/4/8-GPU server configuration.",
  source: "NVIDIA Enterprise Reference Architecture for RTX PRO Servers",
  sourceUrl: "https://docs.nvidia.com/enterprise-reference-architectures/whitepaper/rtx-pro-ai-factory.pdf",
  provenance: "LISTED",
  derivation: "DIRECT",
  asOf: RTX_PRO_SERVER_SPECS_VERIFIED_AT,
});

export const RTX_PRO_SERVER_CONFIGS = Object.freeze({
  "RTX PRO 6000 Server 2-GPU": Object.freeze({
    id: "RTX PRO 6000 Server 2-GPU",
    platformClass: "RTX_PRO_SERVER",
    vendorClassLabel: "RTX PRO 6000 server (OEM class)",
    gpuModel: RTX_PRO_6000_GPU_SPEC.id,
    gpus: 2,
    aggregateVramGB: 192,
    chassisRU: 2,
    configuredSystemSku: "SYS-212GB-FNR-01-G2",
    configuredSystemPriceUSD: 66680.45,
    priceProvenance: "LISTED",
    priceDerivation: "DIRECT",
    priceAsOf: RTX_PRO_SERVER_PRICING_VERIFIED_AT,
    pricingSource: "Supermicro public US eStore configured Gold Series server",
    pricingSourceUrl: "https://store.supermicro.com/us_en/systems/gpu.html?cat=155&system_max_processor=952",
    configuredCpu: "1 × Intel Xeon 6731P (32-core)",
    configuredMemoryGB: 512,
    configuredNetwork: "2 × 10GbE RJ45",
    configuredStorage: "960GB M.2 NVMe + 2 × 3.84TB E1.S NVMe",
    serverPowerKW: null,
    serverPowerStatus: "PENDING_OEM_VALIDATION",
    supportTerm: null,
    supportStatus: "QUOTE_REQUIRED",
    nvidiaSoftwareUSD: null,
    nvidiaSoftwareStatus: "QUOTE_REQUIRED",
    clientFacingReady: false,
  }),

  "RTX PRO 6000 Server 4-GPU": Object.freeze({
    id: "RTX PRO 6000 Server 4-GPU",
    platformClass: "RTX_PRO_SERVER",
    vendorClassLabel: "RTX PRO 6000 server (OEM class)",
    gpuModel: RTX_PRO_6000_GPU_SPEC.id,
    gpus: 4,
    aggregateVramGB: 384,
    chassisRU: 4,
    configuredSystemSku: "SYS-422GA-NRT-01-G2",
    configuredSystemPriceUSD: 127673.00,
    priceProvenance: "LISTED",
    priceDerivation: "DIRECT",
    priceAsOf: RTX_PRO_SERVER_PRICING_VERIFIED_AT,
    pricingSource: "Supermicro public US eStore configured Gold Series server",
    pricingSourceUrl: "https://store.supermicro.com/us_en/systems/gpu.html?system_gpu_model=1907",
    configuredCpu: "2 × Intel Xeon 6960P (72-core)",
    configuredMemoryGB: 1024,
    configuredNetwork: "2 × 10GbE RJ45",
    configuredStorage: "960GB M.2 NVMe + 3.8TB U.2 NVMe",
    serverPowerKW: null,
    serverPowerStatus: "PENDING_OEM_VALIDATION",
    supportTerm: null,
    supportStatus: "QUOTE_REQUIRED",
    nvidiaSoftwareUSD: null,
    nvidiaSoftwareStatus: "QUOTE_REQUIRED",
    clientFacingReady: false,
  }),

  "RTX PRO 6000 Server 8-GPU": Object.freeze({
    id: "RTX PRO 6000 Server 8-GPU",
    platformClass: "RTX_PRO_SERVER",
    vendorClassLabel: "RTX PRO 6000 server (OEM class)",
    gpuModel: RTX_PRO_6000_GPU_SPEC.id,
    gpus: 8,
    aggregateVramGB: 768,
    chassisRU: null,
    configuredSystemSku: null,
    configuredSystemPriceUSD: null,
    priceProvenance: "QUOTE",
    priceDerivation: "DIRECT_CONFIG_REQUIRED",
    priceAsOf: RTX_PRO_SERVER_PRICING_VERIFIED_AT,
    pricingSource: "NVIDIA validates the 8-GPU RTX PRO server configuration class; no configured public OEM price is admitted in v1.",
    pricingSourceUrl: "https://docs.nvidia.com/enterprise-reference-architectures/whitepaper/rtx-pro-ai-factory.pdf",
    configuredCpu: null,
    configuredMemoryGB: null,
    configuredNetwork: null,
    configuredStorage: null,
    serverPowerKW: null,
    serverPowerStatus: "PENDING_OEM_VALIDATION",
    supportTerm: null,
    supportStatus: "QUOTE_REQUIRED",
    nvidiaSoftwareUSD: null,
    nvidiaSoftwareStatus: "QUOTE_REQUIRED",
    clientFacingReady: false,
  }),
});

// Public cloud comparator evidence is stored separately from on-prem server
// economics. Cloud Run bills GPU, CPU, and memory independently, so the GPU
// component MUST NOT be used by itself as the total hourly comparator.
export const RTX_PRO_CLOUD_COMPARATOR = Object.freeze({
  provider: "Google Cloud Run",
  gpuModel: "NVIDIA RTX PRO 6000 Blackwell",
  gpuCountPerInstance: 1,
  gpuRatePerSecondUSD: 0.00036522,
  gpuRatePerHourUSD: 1.314792,
  zonalRedundancy: false,
  minimumVcpu: 20,
  minimumMemoryGiB: 80,
  cpuRatePerVcpuSecondUSD: 0.000018,
  memoryRatePerGiBSecondUSD: 0.000002,
  minimumInstanceRatePerHourUSD: 3.186792,
  priceProvenance: "LISTED",
  priceDerivation: "CALCULATED_FROM_LISTED_COMPONENTS",
  asOf: "2026-10-08",
  pricingSource: "Google Cloud Run public pricing and GPU configuration documentation",
  pricingSourceUrl: "https://cloud.google.com/run/pricing",
  configurationSourceUrl: "https://docs.cloud.google.com/run/docs/configuring/services/gpu",
  note: "Minimum hourly floor = RTX PRO GPU + mandatory 20 vCPU + 80 GiB memory, before networking/storage/other service charges. Cloud Run can scale to zero; actual spend is usage-dependent.",
});

export function rtxProRegistryStaleness(isoDateStr, now = new Date()) {
  const verified = new Date(`${isoDateStr}T00:00:00Z`);
  const days = Math.floor((now.getTime() - verified.getTime()) / 86400000);
  const level = days > RTX_PRO_SERVER_STALE_DAYS ? "stale" : days > RTX_PRO_SERVER_REVIEW_DAYS ? "review" : "current";
  return { days, level };
}

export function getRtxProServerConfigByGpuCount(gpuCount) {
  return Object.values(RTX_PRO_SERVER_CONFIGS).find((row) => row.gpus === Number(gpuCount)) || null;
}
