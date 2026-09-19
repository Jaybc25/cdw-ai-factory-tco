import { MANAGED_API_PRICING_SNAPSHOT } from "../src/managedApiPricingRegistry.js";
import { getManagedApiPricingRefreshStatus } from "../src/managedApiPricingRefresh.js";

const status = getManagedApiPricingRefreshStatus({
  snapshot: MANAGED_API_PRICING_SNAPSHOT,
  asOf: new Date(),
});

console.log(JSON.stringify(status, null, 2));

if (!status.ok) {
  console.error("Managed API pricing freshness could not be determined.");
  process.exit(1);
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const fs = await import("node:fs");
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    [
      "## Managed API pricing freshness",
      "",
      `- Snapshot: ${status.snapshotId}`,
      `- Verified: ${status.verifiedAt}`,
      `- Age: ${status.ageDays} days`,
      `- Threshold: ${status.staleAfterDays} days`,
      `- Rates: ${status.rateCount}`,
      `- State: **${status.state}**`,
      "",
      status.stale
        ? "Pricing is stale. Refresh from an approved source before relying on these defaults for customer-facing work."
        : "Pricing is within the configured freshness window.",
      "",
    ].join("\n")
  );
}

if (status.stale) {
  console.error(
    `Managed API pricing snapshot is ${status.ageDays} days old; threshold is ${status.staleAfterDays} days.`
  );
  process.exit(2);
}
