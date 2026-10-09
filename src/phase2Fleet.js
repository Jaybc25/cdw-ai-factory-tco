export const GPUS_PER_SYSTEM = Object.freeze({
  "DGX H200": 8,
  "DGX B200": 8,
  "DGX B300": 8,
  "DGX GB200 NVL-72": 72,
  "DGX GB300 NVL-72": 72,
  "DGX Rubin NVL8": 8,
  "DGX Vera Rubin NVL72": 72,
});

function positiveInt(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

export function makeFleetIdentity({ systemClass = null, systemCount = null, gpusPerSystem = null, totalGpus = null, source = null } = {}) {
  const normalizedSystemCount = positiveInt(systemCount);
  const mappedGpus = systemClass ? GPUS_PER_SYSTEM[systemClass] || null : null;
  const normalizedGpusPerSystem = positiveInt(gpusPerSystem) || mappedGpus;
  const explicitTotal = positiveInt(totalGpus);
  const calculatedTotal = normalizedSystemCount && normalizedGpusPerSystem ? normalizedSystemCount * normalizedGpusPerSystem : null;
  return {
    systemClass: systemClass || null,
    systemCount: normalizedSystemCount,
    gpusPerSystem: normalizedGpusPerSystem,
    totalGpus: explicitTotal || calculatedTotal,
    source: source || null,
  };
}

export function fleetFromPhase1Snapshot(snapshot) {
  if (!snapshot) return null;
  const summaryFleet = String(snapshot.summary?.recommendedFleet || snapshot.summary?.gpuSizingFleet || "").trim();
  const match = summaryFleet.match(/^\s*(\d+)\s*x\s*(.+?)\s*$/i);
  const systemClass = match?.[2] || snapshot.inputs?.ownSys || null;
  const systemCount = match?.[1] || snapshot.inputs?.gpuSizingCount || null;
  const fleet = makeFleetIdentity({ systemClass, systemCount, source: "phase1-tco" });
  return fleet.systemClass || fleet.systemCount || fleet.totalGpus ? fleet : null;
}

export function compareFleetIdentity(canonical, observed, label) {
  if (!canonical || !observed) return [];
  const issues = [];
  const checks = [
    ["systemClass", "system class"],
    ["systemCount", "system count"],
    ["gpusPerSystem", "GPUs/system"],
    ["totalGpus", "total GPUs"],
  ];
  checks.forEach(([key, text]) => {
    if (canonical[key] != null && observed[key] != null && canonical[key] !== observed[key]) {
      issues.push(`${label} fleet mismatch: ${text} is ${observed[key]} but the canonical Phase 1 fleet is ${canonical[key]}.`);
    }
  });
  return issues;
}
