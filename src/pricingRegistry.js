// Commercial/customer-facing eligibility for GPUaaS providers.
// Keep this separate from rate availability: a provider can remain fully modeled
// for existing-state TCO calculations while being hidden from customer-facing
// selection and recommendation surfaces. This makes commercial enablement a
// config change and provides a clean path for future providers (for example
// Nebius) to be modeled before activation.
export const GPUAAS_PROVIDER_CONFIG = Object.freeze({
  AWS: Object.freeze({ customerFacingEnabled: true, bestValueEnabled: true, status: "active" }),
  Azure: Object.freeze({ customerFacingEnabled: true, bestValueEnabled: true, status: "active" }),
  GCP: Object.freeze({ customerFacingEnabled: true, bestValueEnabled: true, status: "active" }),
  OCI: Object.freeze({ customerFacingEnabled: true, bestValueEnabled: true, status: "active" }),
  CoreWeave: Object.freeze({ customerFacingEnabled: false, bestValueEnabled: false, status: "pending-commercial-enablement" }),
});

const ALL_CLOUD_GPU_RATES = {
  AWS: {
    A100: { od: 3.43, conf: "LISTED", note: "A100 80GB: p4de.24xlarge $27.44705/8, AWS EC2 public price catalog, us-east-1" },
    H100: { od: 6.88, conf: "LISTED", note: "p5.48xlarge $55.04/8, AWS EC2 public price catalog, us-east-1" },
    H200: { od: 7.91, conf: "LISTED", note: "p5en.48xlarge $63.296/8, AWS EC2 public price catalog, us-east-1; p5e had no standard On-Demand catalog row" },
    "B200-class": { od: 14.24, res: 8.545, conf: "LISTED", note: "p6-b200.48xlarge $113.9328/8 On-Demand; reserved snapshot $68.36/8 GPUs" },
    B300: { od: 17.80, conf: "LISTED", note: "p6-b300.48xlarge $142.416/8, AWS EC2 public price catalog, us-east-1" },
    GB200: { od: 27.50, conf: "QUOTE", note: "No standard p6e-gb200 On-Demand catalog row found in 2026-09-01 AWS audit; retain planning placeholder pending quote" },
    GB300: { od: 30.00, conf: "QUOTE", note: "No canonical standard On-Demand GB300 catalog row verified 2026-09-01; retain planning placeholder pending quote" },
  },
  Azure: {
    A100: { od: 4.10, conf: "LISTED", note: "Standard_ND96amsr_A100_v4 Linux $32.77/8, Azure Retail Prices API, East US" },
    H100: { od: 12.29, conf: "LISTED", note: "Standard_ND96isr_H100_v5 Linux $98.32/8, Azure Retail Prices API, East US" },
    H200: { od: 10.60, conf: "LISTED", note: "Standard_ND96isr_H200_v5 Linux $84.80/8, Azure Retail Prices API, West US 3" },
    "B200-class": { od: 27.04, conf: "QUOTE", note: "No direct canonical Azure B200 retail SKU verified 2026-09-01; numeric placeholder retained, verify quote" },
    B300: { od: 15.00, conf: "QUOTE", note: "No canonical Azure B300 Pay-As-You-Go retail SKU verified 2026-09-01; retain planning placeholder pending quote" },
    GB200: { od: 27.04, conf: "LISTED", note: "Standard_ND128isr_NDR_GB200_v6 Linux $108.16/4, Azure Retail Prices API, East US/West US 3" },
    GB300: { od: 40.00, conf: "QUOTE", note: "No canonical Azure GB300 Pay-As-You-Go retail SKU verified 2026-09-01; retain planning placeholder pending quote" },
  },
  GCP: {
    A100: { od: 5.07, conf: "LISTED", note: "A100 80GB: a2-ultragpu-1g On-Demand $5.06879789, Iowa/us-central1" },
    H100: { od: 11.06, conf: "LISTED", note: "a3-highgpu-8g On-Demand $88.490000119/8, Iowa/us-central1" },
    H200: { od: 10.60, conf: "LISTED", note: "a3-ultragpu-8g On-Demand $84.806908493/8, Iowa/us-central1" },
    "B200-class": { od: 11.28, conf: "NODE-NORM", note: "Standard On-Demand is N/A; DWS Calendar Mode public proxy $90.22/8, Iowa/us-central1" },
    B300: { od: 15.00, conf: "QUOTE", note: "No canonical public GCP B300 On-Demand SKU verified 2026-09-01; retain planning placeholder pending quote" },
    GB200: { od: 27.50, conf: "QUOTE", note: "No canonical public GCP GB200 On-Demand SKU verified 2026-09-01; retain planning placeholder pending quote" },
    GB300: { od: 30.00, conf: "QUOTE", note: "No canonical public GCP GB300 On-Demand SKU verified 2026-09-01; retain planning placeholder pending quote" },
  },
  OCI: {
    A100: { od: 4.00, conf: "LISTED", note: "A100-v2 80GB Pay As You Go, Oracle Global Price List, GPU per hour" },
    H100: { od: 10.00, conf: "LISTED", note: "Oracle Global Price List, GPU per hour" },
    H200: { od: 10.00, conf: "LISTED", note: "Oracle Global Price List, GPU per hour" },
    "B200-class": { od: 14.00, conf: "LISTED", note: "Oracle Global Price List, GPU per hour" },
    B300: { od: 15.00, conf: "LISTED", note: "Oracle Global Price List, GPU per hour" },
    GB200: { od: 16.00, conf: "LISTED", note: "Oracle Global Price List, GPU per hour" },
    GB300: { od: 18.00, conf: "LISTED", note: "Oracle Global Price List, GPU per hour" },
  },
  CoreWeave: {
    A100: { od: 2.70, conf: "LISTED", note: "North America On-Demand $21.60/8" },
    H100: { od: 6.16, conf: "LISTED", note: "North America On-Demand $49.24/8 = $6.155" },
    H200: { od: 6.31, conf: "LISTED", note: "North America On-Demand $50.44/8 = $6.305" },
    "B200-class": { od: 8.60, conf: "LISTED", note: "North America On-Demand $68.80/8" },
    B300: { od: 8.00, conf: "QUOTE", note: "CoreWeave public On-Demand price is Contact sales; retain prior planning placeholder, verify quote" },
    GB200: { od: 10.50, conf: "LISTED", note: "North America On-Demand $42.00/4" },
    GB300: { od: 12.00, conf: "QUOTE", note: "CoreWeave public On-Demand price is Contact sales; retain prior planning placeholder, verify quote" },
  },
};

// TCO intentionally uses Object.keys(CLOUD_GPU_RATES) to build the visible
// provider selector. Commercially inactive providers are therefore defined as
// non-enumerable: their historical/modeling data remains addressable by name
// (protecting old saved scenarios), while they disappear from new customer-facing
// provider choices and from Best-Value candidate enumeration.
export const CLOUD_GPU_RATES = {};
for (const [provider, rates] of Object.entries(ALL_CLOUD_GPU_RATES)) {
  Object.defineProperty(CLOUD_GPU_RATES, provider, {
    value: rates,
    enumerable: GPUAAS_PROVIDER_CONFIG[provider]?.customerFacingEnabled !== false,
    writable: false,
    configurable: false,
  });
}
Object.freeze(CLOUD_GPU_RATES);

export const ONPREM_SYSTEMS = {
  "DGX H200": { gpus: 8, perSys: 549764, kW: 10.2, perRack: 2, rackCost: 15000, vram: 141, prof: 25000, sw: 99000 },
  "DGX B200": { gpus: 8, perSys: 744793, kW: 14.4, perRack: 2, rackCost: 15000, vram: 192, prof: 25000, sw: 142800 },
  "DGX B300": { gpus: 8, perSys: 846885, kW: 14.4, perRack: 2, rackCost: 15000, vram: 288, prof: 25000, sw: 142800 },
  "DGX GB200 NVL-72": { gpus: 72, perSys: 7841432, kW: 120, perRack: 1, rackCost: 0, vram: 186, prof: 55558, sw: 1468800 },
  "DGX GB300 NVL-72": { gpus: 72, perSys: 8741432, kW: 120, perRack: 1, rackCost: 0, vram: 288, prof: 55558, sw: 1468800 },
};

export const GPU_SIZING_SYSTEM_MAP = {
  H200: "DGX H200",
  B200: "DGX B200",
  "GB200 NVL72": "DGX GB200 NVL-72",
  B300: "DGX B300",
};

export const GPU_SIZING_PRICE_USD = Object.fromEntries(
  Object.entries(GPU_SIZING_SYSTEM_MAP).map(([gpuClass, systemName]) => {
    const system = ONPREM_SYSTEMS[systemName];
    return [gpuClass, {
      amount: Math.round(system.perSys / system.gpus),
      confidence: "LISTED",
      source: `Shared ONPREM_SYSTEMS registry: ${systemName} $${system.perSys.toLocaleString("en-US")} / ${system.gpus} GPUs (NVIDIA DGX TCO tool capture)`,
    }];
  })
);