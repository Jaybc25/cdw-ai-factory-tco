import { RTX_PRO_CLOUD_HOURS_PER_MONTH, RTX_PRO_CLOUD_PROVIDERS, getRtxProCloudComparisonPlan } from "./rtxProCloudRegistry.js";

export const RTX_PRO_CLOUD_COMPARISON_VERSION = "2026-10-10.v1";

function finite(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

function normalizeActiveHours(value) {
  if (!finite(value)) return RTX_PRO_CLOUD_HOURS_PER_MONTH;
  return Math.max(0, Math.min(RTX_PRO_CLOUD_HOURS_PER_MONTH, Number(value)));
}

function onPremMonthlyRecurring(lifecycle) {
  if (!lifecycle || !finite(lifecycle.recurring