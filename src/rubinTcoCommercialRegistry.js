// NVIDIA Rubin TCO commercial scaffold.
//
// This file records current commercial facts without activating Rubin in the
// live ONPREM_SYSTEMS TCO registry. Missing economics remain explicit nulls so
// the application cannot manufacture a loaded system cost or lifecycle result.
// Evidence basis: RubinEvidenceFoundation.md and NVIDIA NPN Public Price List
// 202609, verified 2026-09-08/2026-09-10.

export const RUBIN_TCO_COMMERCIAL_SCAFFOLD = Object.freeze({
  "DGX Rubin NVL8": Object.freeze({
    gpuClass: "Rubin NVL8",
    gpus: 8,
    vramGBPerGpu: 288,
    hardwareSku: "DGXR-G2304+P1CMI36",
    hardwareDescription: "DGX Rubin NVL8 8X 288GB with Std Support, 3 Years",
    hardwareListPrice: 995000,
    hardwarePriceAsOf: "2026-09-08",
    commercialStatus: "LISTED",
    moq: 1,
    includedHardwareSupportYears: 3,
    includedHardwareSupportLevel: "Business Standard",
    systemPowerKW: 24,
    systemPowerConfidence: "LISTED",
    systemPowerSource: "NVIDIA DGX Rubin NVL8 product page/datasheet (~24 kW system power)",
    mandatoryInstallSku: "718-DG70J8+P1CMI00",
    mandatoryInstallListPrice: 1,
    mandatoryInstallEconomicCost: null,
    mandatoryInstallNote: "Price-book $1 row is an ordering/configuration placeholder and is not treated as an economic installation cost.",
    optionalSoftware: Object.freeze({
      nvidiaAiEnterprise3Year: Object.freeze({ sku: "731-AI7003+P1CMI36", listPricePerGpu: 13500, systemListPrice: 108000, status: "OPTIONAL" }),
      nvidiaMissionControl3Year: Object.freeze({ sku: "744-SW7001+P1CMI36", listPricePerGpu: 12000, systemListPrice: 96000, status: "OPTIONAL" }),
    }),
    perSys: null,
    loadedAdders: null,
    sw: null,
    prof: null,
    fabricAndInfrastructure: null,
    rackCost: null,
    perRack: 8,
    rackArchitectureNote: "Rubin SuperPOD reference architecture supports up to eight DGX Rubin NVL8 systems per liquid-cooled DC-busbar rack; do not reuse B200/B300 two-system conventional-rack economics.",
    tcoEnabled: false,
    tcoBlockers: Object.freeze([
      "Rubin-specific fabric/infrastructure planning cost not yet defensible.",
      "Economic professional-services/mandatory-install cost not yet defensible.",
      "Rack/CDU/busbar economics not yet defensible.",
      "Optional NVIDIA AI Enterprise and Mission Control treatment must be an explicit modeling choice rather than silently assumed.",
    ]),
    pricingSource: "NVIDIA NPN Public Price List 202609; 3-year CM initial hardware kit",
  }),

  "DGX Vera Rubin NVL72": Object.freeze({
    gpuClass: "Vera Rubin NVL72",
    gpus: 72,
    vramGBPerGpu: 288,
    hardwareSkuFloorFeed: "DGXV-0072F+P1CMI36",
    hardwareSkuTopFeed: "DGXV-0072T+P1CMI36",
    hardwareDescription: "DGX Vera Rubin NVL72 with Std Support, 3 Years",
    hardwareListPrice: 10500000,
    hardwarePriceAsOf: "2026-09-08",
    commercialStatus: "QUOTE_ONLY",
    commercialStatusNote: "NVIDIA NPN T&C 100: quoting only.",
    moq: 2,
    moqEnforcedInTco: false,
    moqNote: "MOQ 2 is disclosed commercial metadata; no $21M minimum is imposed until TCO methodology explicitly decides how quote-only MOQ should affect planning scenarios.",
    includedHardwareSupportYears: 3,
    includedHardwareSupportLevel: "Business Standard",
    systemPowerKW: null,
    systemPowerConfidence: "UNRESOLVED",
    systemPowerSource: "No canonical first-party rated/design rack power has been established for TCO. NVIDIA MaxLPS 136 kW provisioned / 101 kW limited scenario is not promoted to canonical system power.",
    optionalSoftware: Object.freeze({
      nvidiaAiEnterprise3Year: Object.freeze({ sku: "731-AI7003+P1CMI36", listPricePerGpu: 13500, systemListPrice: 972000, status: "OPTIONAL" }),
      nvidiaMissionControl3Year: Object.freeze({ sku: "744-SW7001+P1CMI36", listPricePerGpu: 12000, systemListPrice: 864000, status: "OPTIONAL" }),
    }),
    perSys: null,
    loadedAdders: null,
    sw: null,
    prof: null,
    fabricAndInfrastructure: null,
    rackCost: null,
    perRack: 1,
    tcoEnabled: false,
    tcoBlockers: Object.freeze([
      "Canonical TCO system/rack power remains unresolved.",
      "Rubin-specific fabric/infrastructure planning cost not yet defensible.",
      "Economic professional-services/installation cost not yet defensible.",
      "Optional NVIDIA AI Enterprise and Mission Control treatment must be an explicit modeling choice rather than silently assumed.",
      "Quote-only + MOQ 2 treatment requires an explicit TCO planning policy.",
    ]),
    pricingSource: "NVIDIA NPN Public Price List 202609; 3-year CM initial hardware kit; T&C 100 quote-only",
  }),
});

export function getRubinTcoCommercialSystem(systemName) {
  return RUBIN_TCO_COMMERCIAL_SCAFFOLD[systemName] || null;
}

export function isRubinTcoEnabled(systemName) {
  return RUBIN_TCO_COMMERCIAL_SCAFFOLD[systemName]?.tcoEnabled === true;
}
