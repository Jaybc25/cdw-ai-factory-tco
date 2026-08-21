// Single source of truth for "when was this pricing data last verified,"
// shared by TCO and GPU Sizing since both price against the same underlying
// research (TCO's RATES/SYSTEMS tables; GPU Sizing's GPU_PRICE_USD is
// explicitly derived from TCO's SYSTEMS registry, per its own source
// comments). This is deliberately the SMALL first step toward a shared
// pricing registry, centralizing just the provenance dates, not the full
// rate tables -- see the Aug 2026 pricing-architecture discussion for the
// fuller version (a real /data/pricing/ layer with per-record provenance,
// automated cloud-rate checks) if that's ever worth building. Verified
// against live market data at the time this was added: TCO's on-demand AWS
// H100 ($6.88) and B200 ($14.24) rates both matched current published
// on-demand pricing exactly -- the risk this module addresses is these
// numbers going stale over time, not that they're wrong today.

// ISO dates -- update whenever the underlying rate card is actually
// re-verified against current sources, not just whenever this file is
// touched for an unrelated change.
//
// Both dates below are sourced, not guessed: both the cloud RATES table and
// the on-prem SYSTEMS registry trace to the same Aug 6, 2026 rate-expansion
// spec (NVIDIA TCO tool screenshots Jay captured, cross-referenced against
// live market trackers), wired into the live engine Aug 7. The file's own
// comments confirm this ("Midpoints per rate-expansion spec Aug 2026" on
// RATES; "NVIDIA TCO tool loaded costs (Aug 2026 capture)" on SYSTEMS). An
// earlier version of this file guessed "Jul 1" for on-prem without checking
// project history first -- that was wrong, not just imprecise; correcting
// it here rather than leaving a plausible-looking but unverified date.
export const CLOUD_RATES_VERIFIED_AT = "2026-08-07"; // TCO's RATES table ($/GPU-hr, AWS/Azure/GCP/OCI/CoreWeave)
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
