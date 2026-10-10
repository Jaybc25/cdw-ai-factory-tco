import { getRtxProServerConfigByGpuCount } from "./rtxProServerRegistry.js";

export const RTX_PRO_TCO_DEFAULTS_VERSION = "2026-10-09.v1";

const NVIDIA_AI_ENTERPRISE_PER_GPU_ANNUAL_USD = 4500;
const US_COMMERCIAL_ELECTRICITY_USD_PER_KWH = 0.1453;
const INDUSTRY_AVERAGE_PUE = 1.52;
const COLO_PLANNING_USD_PER_KW_MONTH = 300;
const ADMIN_PLANNING_ANNUAL_USD = 15000;

const SERVER_POWER_PLANNING_KW = Object.freeze({
  2: 1.8,
  4: 3.4,
  8: 6.2,
});

function rounded(value) {
  return Math.round(Number(value) || 0);
}

export function buildRtxProTcoPlanningDefaults(gpuCount) {
  const count = Number(gpuCount);
  const config = getRtxProServerConfigByGpuCount(count);
  const hardware = Number.isFinite(config?.configuredSystemPriceUSD) ? config.configuredSystemPriceUSD : null;

  return Object.freeze({
    nvidiaSoftwareUSD: NVIDIA_AI_ENTERPRISE_PER_GPU_ANNUAL_USD * count,
    supportUSD: hardware == null ? null : rounded(hardware * 0.10),
    professionalServicesUSD: hardware == null ? null : rounded(hardware * 0.10),
    storageUSD: 0,
    adminFteAnnualUSD: ADMIN_PLANNING_ANNUAL_USD,
    serverPowerKW: SERVER_POWER_PLANNING_KW[count] ?? null,
    facilityMode: "owned-dc",
    electricityRatePerKwh: US_COMMERCIAL_ELECTRICITY_USD_PER_KWH,
    pue: INDUSTRY_AVERAGE_PUE,
    coloRatePerKwMonth: COLO_PLANNING_USD_PER_KW_MONTH,
    provenance: Object.freeze({
      nvidiaSoftwareUSD: Object.freeze({
        source: "LISTED",
        derivation: "DIRECT",
        label: "NVIDIA public list",
        basis: "$4,500/GPU/year self-managed NVIDIA AI Enterprise subscription, Business Standard support included.",
        sourceUrl: "https://docs.nvidia.com/ai-enterprise/planning-resource/licensing-guide/latest/pricing.html",
        asOf: "2026-10-09",
      }),
      supportUSD: Object.freeze({
        source: "EST",
        derivation: "PLANNING_ALLOWANCE",
        label: "10% annual hardware allowance",
        basis: "Planning placeholder only; replace with OEM/CDW support quote when available.",
      }),
      professionalServicesUSD: Object.freeze({
        source: "EST",
        derivation: "PLANNING_ALLOWANCE",
        label: "10% one-time hardware allowance",
        basis: "Planning placeholder only; replace with scoped implementation services quote when available.",
      }),
      storageUSD: Object.freeze({
        source: "EST",
        derivation: "PLANNING_ALLOWANCE",
        label: "Incremental external storage $0",
        basis: "Configured server local NVMe is assumed sufficient for the initial planning case. Add workload-specific external storage for RAG corpora, checkpoints, retention, or shared data requirements.",
      }),
      adminFteAnnualUSD: Object.freeze({
        source: "EST",
        derivation: "PLANNING_ALLOWANCE",
        label: "$15K/year operations allowance",
        basis: "Directional shared-administration allowance; replace with customer labor allocation when known.",
      }),
      serverPowerKW: Object.freeze({
        source: "EST",
        derivation: "CALCULATED_PLANNING_ENVELOPE",
        label: "Conservative configured-server envelope",
        basis: "Uses NVIDIA 600W/GPU maximum board power plus a server-platform allowance. Not an OEM measured wall-power value; replace when a configured-system value is available.",
        sourceUrl: "https://www.nvidia.com/en-us/data-center/rtx-pro-6000-blackwell-server-edition/",
        asOf: "2026-10-09",
      }),
      electricityRatePerKwh: Object.freeze({
        source: "LISTED",
        derivation: "DIRECT",
        label: "U.S. commercial electricity average",
        basis: "$0.1453/kWh, EIA July 2026 U.S. commercial average.",
        sourceUrl: "https://www.eia.gov/electricity/monthly/update/end-use.php",
        asOf: "2026-09-24",
      }),
      pue: Object.freeze({
        source: "LISTED",
        derivation: "DIRECT",
        label: "Industry-average PUE",
        basis: "1.52 average annual PUE from Uptime Institute Global Data Center Survey 2026.",
        sourceUrl: "https://intelligence.uptimeinstitute.com/resource/growing-pue-advantage-larger-data-centers",
        asOf: "2026-08-06",
      }),
      coloRatePerKwMonth: Object.freeze({
        source: "EST",
        derivation: "PLANNING_ALLOWANCE",
        label: "$300/kW-month colo allowance",
        basis: "Directional planning allowance only; replace with an actual colocation quote. This is not a utility electricity rate.",
      }),
    }),
  });
}

export function effectiveFacilityRatePerKwMonth({ facilityMode, electricityRatePerKwh, pue, coloRatePerKwMonth }) {
  if (facilityMode === "colocation") return Number(coloRatePerKwMonth);
  if (facilityMode === "owned-dc") return Number(electricityRatePerKwh) * 730 * Number(pue);
  return NaN;
}
