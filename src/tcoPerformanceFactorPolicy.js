// M6: conservative default policy for spend-mode operational performance factors.
//
// Scheduling/orchestration is modeled as utilization recovery, not raw GPU speed.
// Therefore its multiplier is bounded so baseline utilization × scheduling factor
// can never imply more than 100% useful utilization.
//
// NVAIE/NIM remains part of the commercial solution cost. Its default incremental
// multiplier is neutral because the GPU capability basis already uses an
// optimized NVIDIA software stack; customer-specific incremental benefit can
// still be modeled explicitly with the existing editable control.

export const TCO_PERFORMANCE_FACTOR_POLICY_VERSION = 1;
export const DEFAULT_SCHEDULING_FACTOR = 1.10;
export const DEFAULT_NVAIE_FACTOR = 1.00;
export const MAX_SCHEDULING_FACTOR_UI = 3.00;

export function maxSchedulingFactorForUtilization(utilization) {
  const u = Number(utilization);
  if (!Number.isFinite(u) || u <= 0) return 1;
  // Floor to 2 decimals so the displayed/control ceiling itself cannot round
  // above the physical 100% useful-utilization boundary.
  const bounded = Math.floor(((1 / u) + Number.EPSILON) * 100) / 100;
  return Math.max(1, Math.min(MAX_SCHEDULING_FACTOR_UI, bounded));
}

export function clampSchedulingFactor(factor, utilization) {
  const raw = Number(factor);
  const normalized = Number.isFinite(raw) ? Math.max(1, raw) : DEFAULT_SCHEDULING_FACTOR;
  return Math.min(normalized, maxSchedulingFactorForUtilization(utilization));
}

export function schedulingUtilizationIsValid(utilization, factor) {
  const u = Number(utilization);
  const f = Number(factor);
  return Number.isFinite(u) && Number.isFinite(f) && u > 0 && f >= 1 && (u * f) <= 1 + 1e-9;
}
