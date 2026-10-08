import { PHASE2_STATE, phase2OverrideCanWriteBack } from "./phase2Contract.js";

function money(value) {
  return Math.round(Number(value || 0));
}

function currentOverrides(bundle) {
  return (bundle?.overrides || []).filter(phase2OverrideCanWriteBack);
}

export function buildPodBrief({ storageBundle, fabricBundle, powerBundle, softwareBundle }) {
  const storage = storageBundle?.requirements || null;
  const fabric = fabricBundle?.requirements || null;
  const power = powerBundle?.requirements || null;
  const software = softwareBundle?.requirements || null;

  const powerOverrides = currentOverrides(powerBundle);
  const softwareOverrides = currentOverrides(softwareBundle);
  const fabricOverrides = currentOverrides(fabricBundle);

  const powerMonthly = powerOverrides
    .filter((item) => item.unit === "USD/month")
    .reduce((sum, item) => sum + Number(item.value || 0), 0);

  const softwareByYear = softwareOverrides.reduce((acc, item) => {
    const match = String(item.id || "").match(/year-(\d+)/);
    if (!match) return acc;
    acc[Number(match[1])] = (acc[Number(match[1])] || 0) + Number(item.value || 0);
    return acc;
  }, {});

  const networkCapex = fabricOverrides
    .filter((item) => item.unit === "USD")
    .reduce((sum, item) => sum + Number(item.value || 0), 0);

  const unresolved = [];
  if (!storageBundle) unresolved.push("Storage requirement has not been accepted.");
  if (!fabricBundle) unresolved.push("Network Fabric requirement has not been accepted.");
  if (!powerBundle) unresolved.push("Power requirement has not been accepted.");
  if (!softwareBundle) unresolved.push("Software Stack requirement has not been accepted.");
  if (storageBundle && !storageBundle.costResolved) unresolved.push("Storage OEM/BOM pricing is unresolved and remains QUOTE scope.");
  if (fabricBundle && fabricBundle.costResolved === false) unresolved.push("Fabric switch/cable/transceiver pricing is unresolved and remains QUOTE scope.");

  const stale = [];
  [
    ["Power", powerBundle],
    ["Software", softwareBundle],
    ["Fabric", fabricBundle],
  ].forEach(([label, bundle]) => {
    if ((bundle?.overrides || []).some((item) => item.state === PHASE2_STATE.STALE)) stale.push(`${label} contains stale accepted values and must be recomputed before client use.`);
  });

  const allRequiredAccepted = Boolean(storageBundle && fabricBundle && powerBundle && softwareBundle);
  const clientReady = allRequiredAccepted && stale.length === 0;

  return {
    generatedAt: new Date().toISOString(),
    status: clientReady ? "PRE-ARCHITECTURE READY" : "INCOMPLETE / REVIEW REQUIRED",
    clientReady,
    compute: {
      systemName: power?.systemName || null,
      racks: power?.racks?.compute ?? null,
      totalRacks: power?.racks?.total ?? null,
    },
    storage: storage ? {
      fastUsableTb: storage.fastUsableTb,
      bulkUsableTb: storage.bulkUsableTb,
      totalRawTb: storage.totalRawTb,
      storageRacks: storage.storageRacks,
      storagePowerKw: storage.storagePowerKw,
      aggregateGbps: storage.aggregateGbps,
    } : null,
    fabric: fabric ? {
      technology: fabric.technology,
      linkGbps: fabric.linkGbps,
      topology: fabric.topology,
      switches: fabric.switches,
      endpointPorts: fabric.ports?.endpointPorts,
      totalLinks: fabric.ports?.totalLinks,
      switchPowerKw: fabric.switchPowerKw,
      currentFleetSystems: fabric.currentFleetSystems,
      fleetStepSchedule: fabric.fleetStepSchedule || [],
    } : null,
    facility: power ? {
      verdict: power.verdict,
      designItKw: power.power?.designItKw,
      facilityDesignKw: power.power?.facilityDesignKw,
      coolingTons: power.cooling?.coolingTons,
      racks: power.racks,
    } : null,
    software: software ? {
      horizonYears: software.horizonYears,
      components: software.rows?.map((row) => ({ name: row.name, mode: row.mode, priceSource: row.priceSource, unit: row.unit, quantity: row.quantity })) || [],
      totals: software.totals,
    } : null,
    economics: {
      powerMonthly: money(powerMonthly),
      powerAnnualized: money(powerMonthly * 12),
      networkCapex: money(networkCapex),
      softwareByYear: Object.fromEntries(Object.entries(softwareByYear).map(([year, value]) => [year, money(value)])),
      note: "Phase 2 planning envelope only. Storage cost may remain unresolved; this is not yet a replacement for production TCO math.",
    },
    unresolved,
    stale,
    engineeringHandoff: [
      "Validate site electrical distribution, rack density, cooling method, floor loading and facility constraints.",
      "Validate storage OEM, protection model, filesystem/data path, performance design and final BOM.",
      "Validate fabric topology, routing/QoS/congestion-control design, optics/cabling and final BOM.",
      "Validate software editions, entitlement terms, support levels, deployment architecture and operational ownership.",
    ],
  };
}
