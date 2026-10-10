import { RTX_PRO_CLOUD_HOURS_PER_MONTH, RTX_PRO_CLOUD_PROVIDERS, getRtxProCloudComparisonPlan } from "./rtxProCloudRegistry.js";

export const RTX_PRO_CLOUD_COMPARISON_VERSION = "2026-10-10.v1";

function finite(value) {
  return Number.isFinite(Number(value));
}

function normalizeActiveHours(value) {
  if (value === null || value === undefined || value === "") return RTX_PRO_CLOUD_HOURS_PER_MONTH;
  const hours