// ROI Calculator engine — ported line-for-line from roi-calculator-model-v1.2.xlsx's
// Engine tab. This is the single source of truth: RoiCalculator.jsx and the Node
// cross-check script both import this file, so there is no second hand-copy of the
// formulas to drift out of sync. Cell references from the workbook are noted inline.

// Excel's ROUND() rounds half away from zero; JS Math.round rounds half up, which
// only differs from Excel for negative halves. Every value we ROUND() in the
// workbook (payback, FTE-equivalent) is non-negative in every real scenario, so
// Math.round is safe here — but we use this helper so that stays true by
// construction rather than by accident.
function excelRound(value, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.sign(value) * Math.round(Math.abs(value) * factor) / factor;
}

export const DEFAULT_INPUTS = {
  people: 250,
  tasksPerDay: 12,
  workingDays: 230,
  minutesPerTask: 20,
  loadedCost: 55,
  reductionPct: 0.40,
  adoptionPct: 0.80,
  realizationPct: 0.60,
  rampPct: 1.00,
  initialCost: 750000,
  recurringCost: 400000,
  upliftPerHr: 0,
  horizonYears: 3,
  hoursPerWorkday: 8,
};

export const BOUNDS = {
  people: { min: 0 },
  tasksPerDay: { min: 0 },
  workingDays: { min: 0, max: 366, integer: true },
  minutesPerTask: { min: 0, exclusiveMin: true },
  loadedCost: { min: 0 },
  reductionPct: { min: 0, max: 1 },
  adoptionPct: { min: 0, max: 1 },
  realizationPct: { min: 0, max: 1 },
  rampPct: { min: 0, max: 1 },
  initialCost: { min: 0 },
  recurringCost: { min: 0 },
  upliftPerHr: { min: 0 },
  horizonYears: { min: 1, max: 20, integer: true },
  hoursPerWorkday: { min: 0, max: 24, exclusiveMin: true },
};

/** Returns a field -> error-message map for any input outside its bound. Empty object = all valid. */
export function validateInputs(inputs) {
  const errors = {};
  for (const [key, bound] of Object.entries(BOUNDS)) {
    const v = inputs[key];
    if (v === "" || v === null || v === undefined || Number.isNaN(v)) {
      errors[key] = "Required.";
      continue;
    }
    if (bound.integer && !Number.isInteger(v)) {
      errors[key] = "Must be a whole number.";
      continue;
    }
    if (bound.exclusiveMin && v <= bound.min) {
      errors[key] = `Must be greater than ${bound.min}.`;
      continue;
    }
    if (!bound.exclusiveMin && bound.min !== undefined && v < bound.min) {
      errors[key] = `Must be at least ${bound.min}.`;
      continue;
    }
    if (bound.max !== undefined && v > bound.max) {
      errors[key] = `Must be at most ${bound.max}${bound.max <= 1 ? " (100%)" : ""}.`;
      continue;
    }
  }
  return errors;
}

/**
 * Computes the full engine chain. Mirrors Engine!B4:B25 exactly.
 * Returns null-guarded fields (horizonROI, payback, fteEquivalent) as
 * `null` when the workbook would show "N/A" text — the caller decides
 * how to render that.
 */
export function computeEngine(inputs) {
  const {
    people, tasksPerDay, workingDays, minutesPerTask, loadedCost,
    reductionPct, adoptionPct, realizationPct, rampPct,
    initialCost, recurringCost, upliftPerHr, horizonYears, hoursPerWorkday,
  } = inputs;

  // OPERATIONAL — CAPACITY (Engine!B4:B6)
  const baselineHours = people * tasksPerDay * workingDays * (minutesPerTask / 60);
  const grossCapacity = baselineHours * reductionPct * adoptionPct;
  const redeployableCapacity = grossCapacity * realizationPct;

  // FINANCIAL — VALUE (Engine!B9:B11)
  const steadyStateValue = redeployableCapacity * loadedCost;
  const year1Value = steadyStateValue * rampPct;
  const illustrativeUpside = redeployableCapacity * upliftPerHr;

  // INVESTMENT (Engine!B13:B25)
  const year1Cost = initialCost + recurringCost;
  const year1Net = year1Value - year1Cost;
  const steadyStateNet = steadyStateValue - recurringCost;
  const horizonValue = year1Value + steadyStateValue * (horizonYears - 1);
  const horizonCost = initialCost + recurringCost * horizonYears;
  const horizonNet = horizonValue - horizonCost;
  const horizonROI = horizonCost === 0 ? null : horizonNet / horizonCost;

  const monthlyValueY1 = year1Value / 12;
  const monthlyRecurring = recurringCost / 12;
  const monthlyNetY1 = monthlyValueY1 - monthlyRecurring;
  const payback = monthlyNetY1 <= 0 ? null : excelRound(initialCost / monthlyNetY1, 1);

  const fteDenominator = workingDays * hoursPerWorkday;
  const fteEquivalent = fteDenominator === 0 ? null : excelRound(redeployableCapacity / fteDenominator, 1);

  return {
    baselineHours, grossCapacity, redeployableCapacity,
    steadyStateValue, year1Value, illustrativeUpside,
    year1Cost, year1Net, steadyStateNet,
    horizonValue, horizonCost, horizonNet, horizonROI,
    monthlyValueY1, monthlyRecurring, monthlyNetY1,
    payback, fteEquivalent,
  };
}

export const PAYBACK_GUARD_TEXT = "N/A — costs exceed realized value";
export const NA_TEXT = "N/A";
