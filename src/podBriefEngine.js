import { PHASE2_STATE, phase2OverrideCanWriteBack } from "./phase2Contract.js";
import { compareFleetIdentity, fleetFromPhase1Snapshot } from "./phase2Fleet.js";

function money(value) {
  return Math.round(Number(value || 0));
}

function currentOverrides(bundle) {
  return (bundle?.overrides || []).filter(phase2OverrideCanWriteBack);
}

function phase1Comparison(phase1Snapshot, { powerAnnualized, networkCapex, softwareByYear }) {
  const summary = phase1Snapshot?.summary || null;
  if (!summary || !Number.isFinite(Number(summary.onPremCost))) return null;

  const horizonYears = Math.max(1, Number(summary.horizonYears || 3));
  let softwareHorizon = 0;
  for (let year = 1; year <= horizonYears; year += 1) softwareHorizon += Number(softwareByYear[year] || 0);

  return {
    available: true,
    horizonYears,
    baselineOnPrem: money(summary.onPremCost),
    baselineCloud: Number.isFinite(Number(summary.cloudCost)) ? money(summary.cloudCost) : null,
    phase2RefinedLines: {
      powerFacilityAnnualized: money(powerAnnualized),
      powerFacilityHorizon: money(Number(powerAnnualized || 0) * horizonYears),
      networkCapex: money(networkCapex),
      softwareHorizon: money(softwareHorizon),
    },
    additiveTotalSuppressed: true,
    note: "Phase 1 already contains power, networking, software, and storage economics. Phase 2 values refine or replace those assumptions and are not additive. Adjusted on-prem cost and savings are intentionally suppressed until explicit Phase 1 line-item replacement mapping is implemented.",
  };
}

function dependencyFreshnessIssues({ storageBundle, fabricBundle, powerBundle }) {
  const issues = [];
  if (storageBundle && fabricBundle && fabricBundle.upstreamStorageFingerprint !== storageBundle.fingerprint) {
    issues.push("Network Fabric is stale: it was accepted against a different Storage requirement.");
  }
  if (storageBundle && powerBundle?.requirements?.upstreamStorageFingerprint !== storageBundle.fingerprint) {
    issues.push("Power is stale: it was accepted against a different Storage requirement.");
  }
  if (fabricBundle && powerBundle?.requirements?.upstreamNetworkFingerprint !== fabricBundle.fingerprint) {
    issues.push("Power is stale: it was accepted against a different Network Fabric requirement.");
  }
  return issues;
}

function fleetConsistencyIssues({ canonicalFleet, storageBundle, fabricBundle, powerBundle, softwareBundle }) {
  if (!canonicalFleet) return ["Canonical fleet identity is unavailable. Save a Phase 1 TCO snapshot with a recommended fleet before treating the Pod Brief as ready."];
  const issues = [];
  issues.push(...compareFleetIdentity(canonicalFleet, storageBundle?.fleet, "Storage"));
  issues.push(...compareFleetIdentity(canonicalFleet, fabricBundle?.fleet, "Network Fabric"));
  issues.push(...compareFleetIdentity(canonicalFleet, powerBundle?.fleet || powerBundle?.requirements?.fleet, "Power"));
  issues.push(...compareFleetIdentity(canonicalFleet, softwareBundle?.fleet, "Software"));
  return issues;
}

export function buildPodBrief({ storageBundle, fabricBundle, powerBundle, softwareBundle, phase1Snapshot = null }) {
  const storage = storageBundle?.requirements || null;
  const fabric = fabricBundle?.requirements || null;
  const power = powerBundle?.requirements || null;
  const software = softwareBundle?.requirements || null;
  const canonicalFleet = fleetFromPhase1Snapshot(phase1Snapshot);

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
  if (softwareBundle && softwareBundle.costResolved === false) unresolved.push(`Commercial software pricing is unresolved for ${softwareBundle.unresolvedCommercialComponents?.join(", ") || "one or more components"}; software TCO overrides remain ineligible.`);
  if (!phase1Snapshot) unresolved.push("No saved Phase 1 TCO account snapshot is available for Phase 1 comparison context.");

  const stale = [];
  [
    ["Storage", storageBundle],
    ["Power", powerBundle],
    ["Software", softwareBundle],
    ["Fabric", fabricBundle],
  ].forEach(([label, bundle]) => {
    if ((bundle?.overrides || []).some((item) => item.state === PHASE2_STATE.STALE)) stale.push(`${label} contains stale accepted values and must be recomputed before client use.`);
  });
  stale.push(...dependencyFreshnessIssues({ storageBundle, fabricBundle, powerBundle }));

  const fleetIssues = fleetConsistencyIssues({ canonicalFleet, storageBundle, fabricBundle, powerBundle, softwareBundle });
  const allRequiredAccepted = Boolean(storageBundle && fabricBundle && powerBundle && softwareBundle);
  const clientReady = allRequiredAccepted && stale.length === 0 && fleetIssues.length === 0;

  const economics = {
    powerMonthly: money(powerMonthly),
    powerAnnualized: money(powerMonthly * 12),
    networkCapex: money(networkCapex),
    softwareByYear: Object.fromEntries(Object.entries(softwareByYear).map(([year, value]) => [year, money(value)])),
    note: "Phase 2 planning envelope only. These lines refine assumptions already present in Phase 1 TCO and must not be added to the Phase 1 total without explicit replacement mapping. Unresolved pricing is excluded rather than represented as $0.",
  };
  const comparison = phase1Comparison(phase1Snapshot, economics);

  return {
    generatedAt: new Date().toISOString(),
    status: clientReady ? "PRE-ARCHITECTURE READY" : "INCOMPLETE / REVIEW REQUIRED",
    clientReady,
    canonicalFleet,
    fleetIssues,
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
      costResolved: softwareBundle?.costResolved ?? null,
    } : null,
    economics,
    phase1Comparison: comparison,
    phase1Delta: null,
    phase1: phase1Snapshot ? {
      updatedAt: phase1Snapshot.updated_at || null,
      planningBasis: phase1Snapshot.summary?.planningBasis || null,
      horizonYears: phase1Snapshot.summary?.horizonYears || null,
      onPremCost: phase1Snapshot.summary?.onPremCost ?? null,
      cloudCost: phase1Snapshot.summary?.cloudCost ?? null,
      savings: phase1Snapshot.summary?.savings ?? null,
      recommendedFleet: phase1Snapshot.summary?.recommendedFleet || phase1Snapshot.summary?.gpuSizingFleet || null,
    } : null,
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
