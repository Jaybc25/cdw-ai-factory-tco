// Single source of truth for "when was this pricing data last verified."
// The actual cloud GPU rates and NVIDIA/DGX loaded system economics live in
// pricingRegistry.js and are shared by TCO and GPU Sizing. GPU Sizing derives
// its loaded per-GPU planning prices from those same on-prem system records.
// Keep value changes in pricingRegistry.js and verification-date changes here
// so "what is the price?" and "when was it verified?" remain explicit and
// independently auditable.
//
// Cloud Pricing Refresh #1 completed 2026-09-01. AWS and Azure were checked
// against their machine-readable public price catalogs; GCP, OCI, and
// CoreWeave were checked against current provider pricing pages/price lists.
// Rows without dependable public On-Demand pricing remain explicitly marked
// as proxy/QUOTE in pricingRegistry.js rather than being presented as current
// list prices.
//
// On-prem Pricing Refresh #2 completed 2026-09-08 using the NVIDIA NPN Public
// Price List 202609. Current Blackwell DGX hardware-kit list prices were
// reconciled to the existing loaded-system TCO planning basis. H200 remains on
// the prior NVIDIA DGX TCO-tool basis because no current initial H200 hardware
// kit was identified in this price-book pass.

// ISO dates - update whenever the underlying rate card is actually
// re-verified against current sources, not just whenever this file is
// touched for an unrelated change.
export const CLOUD_RATES_VERIFIED_AT = "2026-09-01"; // Full provider-by-provider review of shared cloud pricing registry; public list/proxy/QUOTE status re-verified
export const ONPREM_PRICING_VERIFIED_AT = "2026-09-08"; // NVIDIA NPN Public Price List 202609 for current Blackwell DGX hardware; H200 retains prior TCO-tool basis

// current: no warning needed, just show the date. review: gently note it's
// aging. stale: a visible warning that this should be refreshed before
// being used in front of a client. Thresholds are a judgment call, not a
// hard SLA - tune them if actual usage suggests otherwise.
const REVIEW_DUE_DAYS = 45;
const STALE_DAYS = 90;

export function stalenessOf(isoDateStr) {
  const verified = new Date(isoDateStr + "T00:00:00Z");
  const now = new Date();
  const days = Math.floor((now.getTime() - verified.getTime()) / 86400000);
  const level = days > STALE_DAYS ? "stale" : days > REVIEW_DUE_DAYS ? "review" : "current";
  return { days, level };
}

export function fmtVerifiedDate(isoDateStr) {
  const d = new Date(isoDateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}
