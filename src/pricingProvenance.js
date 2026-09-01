// Single source of truth for "when was this pricing data last verified,"
// shared by TCO and GPU Sizing since both price against the same underlying
// research (TCO's RATES/SYSTEMS tables; GPU Sizing's GPU_PRICE_USD is
// explicitly derived from TCO's SYSTEMS registry, per its own source
// comments). This is deliberately the SMALL first step toward a shared
// pricing registry, centralizing just the provenance dates, not the full
// rate tables -- see the Aug 2026 pricing-architecture discussion for the
// fuller version (a real /data/pricing/ layer with per-record provenance,
// automated cloud-rate checks) if that's ever worth building.
//
// Cloud Pricing Refresh #1 completed 2026-09-01. AWS and Azure were checked
// against their machine-readable public price catalogs; GCP, OCI, and
// CoreWeave were checked against current provider pricing pages/price lists.
// Rows without dependable public On-Demand pricing remain explicitly marked
// as proxy/QUOTE in TcoCalculator.jsx rather than being presented as current
// list prices.

// ISO dates -- update whenever the underlying rate card is actually
// re-verified against current sources, not just whenever this file is
// touched for an unrelated change.
//
// The on-prem date remains sourced to the Aug 2026 NVIDIA TCO tool capture.
// Update it only after the NVIDIA loaded system economics have actually been
// re-reviewed. The cloud date can advance after a complete provider-by-
// provider review even when some rows remain QUOTE, provided those rows'
// unavailable/quote status was itself re-verified and is disclosed.
export const CLOUD_RATES_VERIFIED_AT = "2026-09-01"; // Full provider-by-provider review of TCO RATES table; public list/proxy/QUOTE status re-verified
export const ONPREM_PRICING_VERIFIED_AT = "2026-08-07"; // TCO's SYSTEMS table + GPU Sizing's GPU_PRICE_USD (NVIDIA DGX TCO tool capture)

// current: no warning needed, just show the date. review: gently note it's
// aging. stale: a visible warning that this should be refreshed before
// being used in front of a client. Thresholds are a judgment call, not a
// hard SLA -- tune them if actual usage suggests otherwise.
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
