// Cross-checks src/engine.js against the same hand-worked expected values as
// roi-calculator-model-v1.2.xlsx's Validation tab (scenarios A-F). If this
// script and the workbook ever disagree, the JS engine has drifted from the
// frozen spreadsheet spec and must not ship.
import { computeEngine } from "./src/engine.js";

let total = 0;
let passed = 0;
const fails = [];

function check(scenario, label, actual, expected, tolerance = 1) {
  total++;
  const isText = typeof expected === "string";
  const ok = isText ? actual === expected : Math.abs(actual - expected) <= tolerance;
  if (ok) {
    passed++;
  } else {
    fails.push(`[${scenario}] ${label}: got ${actual}, expected ${expected} (tol ${tolerance})`);
  }
}

const base = {
  people: 250, tasksPerDay: 12, workingDays: 230, minutesPerTask: 20, loadedCost: 55,
  reductionPct: 0.40, adoptionPct: 0.80, realizationPct: 0.60, rampPct: 1.00,
  initialCost: 750000, recurringCost: 400000, upliftPerHr: 20, horizonYears: 3, hoursPerWorkday: 8,
};

// ---- Scenario A: base case ----
{
  const e = computeEngine(base);
  check("A", "Baseline Task Hours/yr", e.baselineHours, 230000);
  check("A", "Gross Capacity Created", e.grossCapacity, 73600);
  check("A", "Redeployable Capacity", e.redeployableCapacity, 44160);
  check("A", "Steady-State Economic Value", e.steadyStateValue, 2428800);
  check("A", "Year 1 Realized Value", e.year1Value, 2428800);
  check("A", "Illustrative Upside", e.illustrativeUpside, 883200);
  check("A", "Year 1 AI Cost", e.year1Cost, 1150000);
  check("A", "Year 1 Net Benefit", e.year1Net, 1278800);
  check("A", "Horizon Cumulative Realized Value", e.horizonValue, 7286400);
  check("A", "Horizon Cumulative AI Cost", e.horizonCost, 1950000);
  check("A", "Horizon Net Benefit", e.horizonNet, 5336400);
  check("A", "Horizon ROI", e.horizonROI, 5336400 / 1950000, 0.001);
  check("A", "Monthly Realized Value Y1", e.monthlyValueY1, 202400);
  check("A", "Monthly Recurring Cost", e.monthlyRecurring, 33333.33);
  check("A", "Monthly Net Y1", e.monthlyNetY1, 169066.67);
  check("A", "Estimated Payback (months)", e.payback, 4.4, 0.05);
  check("A", "FTE Equivalent", e.fteEquivalent, 24.0, 0.05);
}

// ---- Scenario B: zero adoption (payback guard) ----
{
  const e = computeEngine({ ...base, adoptionPct: 0 });
  check("B", "Gross Capacity Created", e.grossCapacity, 0, 0.01);
  check("B", "Year 1 Realized Value", e.year1Value, 0, 0.01);
  check("B", "Monthly Net Y1", e.monthlyNetY1, -33333.33);
  total++;
  if (e.payback === null) passed++; else fails.push(`[B] Payback should be null (guard), got ${e.payback}`);
}

// ---- Scenario C: zero working days (FTE guard) ----
{
  const e = computeEngine({ ...base, workingDays: 0 });
  check("C", "Baseline Task Hours/yr", e.baselineHours, 0, 0.01);
  check("C", "Redeployable Capacity", e.redeployableCapacity, 0, 0.01);
  total++;
  if (e.fteEquivalent === null) passed++; else fails.push(`[C] FTE should be null (guard), got ${e.fteEquivalent}`);
}

// ---- Scenario D: 50% ramp (payback should lengthen) ----
{
  const e = computeEngine({ ...base, rampPct: 0.5 });
  check("D", "Year 1 Realized Value, ramped", e.year1Value, 1214400);
  check("D", "Year 1 Net Benefit", e.year1Net, 64400);
  check("D", "Horizon Cumulative Realized Value", e.horizonValue, 6072000);
  check("D", "Horizon Net Benefit", e.horizonNet, 4122000);
  check("D", "Horizon ROI", e.horizonROI, 4122000 / 1950000, 0.001);
  check("D", "Monthly Net Y1", e.monthlyNetY1, 67866.67);
  check("D", "Estimated Payback (months)", e.payback, 11.1, 0.1);
}

// ---- Scenario E: max capacity (100/100/100) ----
{
  const e = computeEngine({ ...base, reductionPct: 1, adoptionPct: 1, realizationPct: 1 });
  check("E", "Gross Capacity Created", e.grossCapacity, 230000);
  check("E", "Redeployable Capacity", e.redeployableCapacity, 230000);
  check("E", "Steady-State Economic Value", e.steadyStateValue, 12650000);
  check("E", "Year 1 Net Benefit", e.year1Net, 11500000);
  check("E", "Horizon Cumulative Realized Value", e.horizonValue, 37950000);
  check("E", "Horizon Net Benefit", e.horizonNet, 36000000);
  check("E", "Horizon ROI", e.horizonROI, 36000000 / 1950000, 0.001);
  check("E", "Estimated Payback (months)", e.payback, 0.7, 0.05);
  check("E", "FTE Equivalent", e.fteEquivalent, 125.0, 0.05);
}

// ---- Scenario F: zero AI cost (Horizon ROI guard + immediate payback) ----
{
  const e = computeEngine({ ...base, initialCost: 0, recurringCost: 0 });
  check("F", "Year 1 Net Benefit", e.year1Net, 2428800);
  check("F", "Horizon Cumulative AI Cost", e.horizonCost, 0, 0.01);
  total++;
  if (e.horizonROI === null) passed++; else fails.push(`[F] Horizon ROI should be null (guard), got ${e.horizonROI}`);
  check("F", "Monthly Net Y1", e.monthlyNetY1, 202400);
  check("F", "Estimated Payback (months) — immediate", e.payback, 0.0, 0.01);
}

console.log(`${passed}/${total} checks passed`);
if (fails.length) {
  console.log("\nFAILURES:");
  fails.forEach((f) => console.log(" - " + f));
  process.exit(1);
} else {
  console.log("All checks match the spreadsheet's Validation tab. Engine is in parity.");
}
