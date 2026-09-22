import assert from "node:assert/strict";
import { assessAzureResponse, ageDays, azureReview, buildReport, buildShadowObservation, reviewState } from "./maintenanceWatch.mjs";

const target = { sku: "Standard_ND96isr_H100_v5", region: "eastus", gpus: 8 };
const base = {
  armSkuName: target.sku,
  armRegionName: target.region,
  type: "Consumption",
  unitOfMeasure: "1 Hour",
  currencyCode: "USD",
  meterName: "H100 Linux Compute",
  productName: "Virtual Machines",
  retailPrice: 104,
};
assert.equal(assessAzureResponse([base], target, 12.29).state, "REVIEW_CHANGE");
assert.equal(assessAzureResponse([base, { ...base, meterName: "H100 Spot" }], target, 12.29).count, 1);
assert.equal(assessAzureResponse([base, { ...base, meterName: "Second meter" }], target, 12.29).state, "AMBIGUOUS");
assert.equal(assessAzureResponse([], target, 12.29).state, "NO_MATCH");
assert.equal(assessAzureResponse([{ ...base, currencyCode: "EUR" }], target, 12.29).state, "NO_MATCH");
for (const field of [
  { type: "Reservation" },
  { productName: "Virtual Machines Windows" },
  { meterName: "H100 Spot" },
  { unitOfMeasure: "100 Hours" },
  { productName: "Managed GPU Service" },
  { armRegionName: "westus3" },
]) {
  assert.equal(assessAzureResponse([{ ...base, ...field }], target, 12.29).state, "NO_MATCH");
}
assert.throws(() => assessAzureResponse([base], target, undefined), /baseline rate/);
assert.equal(ageDays("2026-09-18", new Date("2026-10-04T00:00:00Z")), 16);
assert.equal(reviewState(91, 45, 90), "STALE");

const fixtureFetch = async (url) => ({
  ok: true,
  json: async () => ({ Items: [{ ...base, armSkuName: new URL(url).searchParams.get("$filter").match(/armSkuName eq '([^']+)'/)[1] }], NextPageLink: null }),
});
const candidates = await azureReview(fixtureFetch);
const failures = await azureReview(async () => ({ ok: false, status: 503 }));
assert.ok(failures.every((row) => row.state === "SOURCE_ERROR"));
assert.equal(candidates.length, 4);
assert.ok(candidates.every((x) => ["NO_MATCH", "REVIEW_CHANGE", "CHECKED_CANDIDATE"].includes(x.state)));
const report = buildReport({ asOf: new Date("2026-10-04T00:00:00Z"), azure: candidates });
const observation = buildShadowObservation({ asOf: new Date("2026-10-04T00:00:00Z"), azure: candidates });
assert.equal(observation.expectedRows, 4);
assert.equal(observation.checkedRows, 4);
assert.equal(Object.values(observation.counts).reduce((total, count) => total + count, 0), 4);
assert.equal(observation.rows[0].sku, "Standard_ND96amsr_A100_v4");
assert.equal(observation.mode, "shadow-candidates-only");
assert.match(report.markdown, /Managed API pricing \| 2026-09-18 \| 16 days \| \*\*STALE\*\*/);
assert.match(report.markdown, /no prices, dates, or models were changed/i);
console.log("Weekly maintenance evidence report verified.");
