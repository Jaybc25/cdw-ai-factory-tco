// NVIDIA DGX SuperPOD Rubin NVL8 reference-architecture quantities.
// Source: NVIDIA DGX SuperPOD Rubin NVL8 Systems Reference Architecture,
// Major Components table for the representative eight-SU / 576-node design.
// These are topology/reference quantities only. No prices are assigned here.

export const RUBIN_NVL8_REFERENCE_BOM = Object.freeze({
  sourceDocument: "NVIDIA DGX SuperPOD Rubin NVL8 Systems: Next Generation Scalable Infrastructure for AI Leadership",
  documentNumber: "SP-12834-001 V01",
  publicationDate: "2026-04-20",
  designStatus: "REPRESENTATIVE_FINALIZE_PER_ACTUAL_DESIGN",
  scalableUnits: 8,
  dgxNodes: 576,
  gpus: 4608,

  computeAndRacks: Object.freeze({
    dgxRubinNvl8: Object.freeze({ count: 576, model: "DGXRUBIN NVL8" }),
    dgxApprovedComputeRacks: Object.freeze({ count: 144, model: "RK-C10-000-000" }),
    nonComputeMgxRacks: Object.freeze({ count: 46, model: "RK-C10-000-000" }),
    storageRacks: Object.freeze({ count: 2, model: "1A72AN500-600-G" }),
    computePowerShelves110kW: Object.freeze({ count: 288, model: "755-0250-003 (Delta)" }),
    nonComputePowerShelves33kW: Object.freeze({ count: 288, model: "755-0130-000 (Delta)" }),
    missionControlNodes: Object.freeze({ count: 10, model: "Dell-validated control plane nodes" }),
  }),

  computeFabric: Object.freeze({
    q3400ComputeLeafs: Object.freeze({ count: 64, model: "920-9B36F-00RX-8S0" }),
    q3400ComputeSpines: Object.freeze({ count: 36, model: "920-9B36F-00RX-8S0" }),
    dgxTransceivers: Object.freeze({ count: 4608, model: "980-9IAY0-00XM00" }),
    leafDgxTwinPortTransceivers: Object.freeze({ count: 2034, model: "980-9IAU0-00XM01" }),
    leafSpineTwinPortTransceivers: Object.freeze({ count: 4608, model: "980-9IAU0-00XM01" }),
    dgxLeafCables: Object.freeze({ count: 4608, model: "980-9I570-00N030" }),
    leafSpineCables: Object.freeze({ count: 4608, model: "980-9I570-00N030" }),
  }),

  ethernetStorageFabric: Object.freeze({
    storageLeafsDgxSide: Object.freeze({ count: 16, model: "920-9N42F-00RI-3C1" }),
    storageLeafsStorageSide: Object.freeze({ count: 4, model: "920-9N42F-00RI-3C1" }),
    storageSpines: Object.freeze({ count: 12, model: "920-9N42F-00RI-3C1" }),
    bf3240Transceivers400G: Object.freeze({ count: 1152, model: "980-9I693-F4NS00" }),
    controlPlaneTransceivers400G: Object.freeze({ count: 8, model: "980-9I693-F4NS00" }),
    leafSpineTwinPortTransceivers: Object.freeze({ count: 576, model: "980-9I510-F4NS00" }),
    dgxLeafCables: Object.freeze({ count: 1152, model: "980-9I570-00N030" }),
    leafSpineCables: Object.freeze({ count: 1120, model: "980-9I570-00N030" }),
  }),

  inbandFabric: Object.freeze({
    inbandLeafs: Object.freeze({ count: 6, model: "920-9N42F-00RI-3C1" }),
    inbandSpines: Object.freeze({ count: 2, model: "920-9N42F-00RI-3C1" }),
    bf4Transceivers400G: Object.freeze({ count: 576, model: "980-9I693-F4NS00 or 980-9I30G-F4NM00" }),
    controlPlaneTransceivers400G: Object.freeze({ count: 24, model: "980-9I51S-F4NS00" }),
    leafDgxMgmtTwinPortTransceivers: Object.freeze({ count: 148, model: "980-9I510-F4NS00" }),
    leafSpineTwinPortTransceivers: Object.freeze({ count: 48, model: "980-9I510-F4NS00" }),
    dgxMgmtLeafCables: Object.freeze({ count: 589, model: "980-9I557-00N030" }),
  }),
});

export function perNodeReferenceQuantity(count) {
  return count / RUBIN_NVL8_REFERENCE_BOM.dgxNodes;
}

export const RUBIN_NVL8_REFERENCE_ALLOCATIONS_PER_NODE = Object.freeze({
  computeLeafSwitches: perNodeReferenceQuantity(64),
  computeSpineSwitches: perNodeReferenceQuantity(36),
  computeDgxTransceivers: perNodeReferenceQuantity(4608),
  computeLeafDgxTwinPortTransceivers: perNodeReferenceQuantity(2034),
  computeLeafSpineTwinPortTransceivers: perNodeReferenceQuantity(4608),
  computeDgxLeafCables: perNodeReferenceQuantity(4608),
  computeLeafSpineCables: perNodeReferenceQuantity(4608),
  storageFabricSwitches: perNodeReferenceQuantity(16 + 4 + 12),
  inbandFabricSwitches: perNodeReferenceQuantity(6 + 2),
  computeRacksFromRepresentativeBom: perNodeReferenceQuantity(144),
  computePowerShelves110kW: perNodeReferenceQuantity(288),
});
