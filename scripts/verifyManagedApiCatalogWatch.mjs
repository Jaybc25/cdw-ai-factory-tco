import assert from "node:assert/strict";
import { collect, compareCatalogs, normalizeLiteLLM, renderReport } from "./managedApiCatalogWatch.mjs";

const snapshot = { verifiedAt: "2026-09-18", rates: [{
  provider: "OpenAI", modelId: "test-frontier", inputUsdPerMillion: 2,
  outputUsdPerMillion: 10, cachedInputUsdPerMillion: 0.2, sourceUrl: "https://example.test/provider",
}] };
const catalog = { openai: { models: {
  "test-frontier": { name: "Test Frontier", cost: { input: 2, output: 10, cache_read: 0.2,
    tiers: [{ tier: { type: "context", size: 200000 }, input: 4, output: 20 }] } },
  "test-new": { name: "New candidate", cost: { input: 3, output: 12 },
    release_date: "2026-09-21", modalities: { output: ["text"] } },
} } };
const crosscheck = { "test-frontier": {
  litellm_provider: "openai", input_cost_per_token: 0.000002, output_cost_per_token: 0.00001,
} };
const asOf = new Date("2026-09-23T12:00:00Z");
const compare = (modelsDev = catalog, liteLLM = crosscheck) =>
  compareCatalogs({ modelsDev, liteLLM, snapshot, asOf });
assert.equal(compare().rows[0].state, "MATCHED");
assert.equal(compare().rows[0].crosscheckState, "MATCHED");
assert.equal(compare().rows[0].modelsDev.tiered, true);
assert.equal(compare().discoveries[0].modelId, "test-new");
assert.match(renderReport(compare()), /No calculator prices, models, or verification dates changed/);
assert.equal(compare({ openai: { models: { "test-frontier": { cost: { input: 4, output: 10 } } } } }).rows[0].state, "PRICE_CHANGED");
assert.equal(compare({ openai: { models: {} } }).rows[0].state, "MISSING");
assert.equal(compare({ openai: { models: { "test-frontier": { cost: { input: 0, output: 10 } } } } }).rows[0].state, "INVALID");
assert.equal(compare(null).rows[0].state, "SOURCE_ERROR");
assert.equal(compare(catalog, { "test-frontier": { ...crosscheck["test-frontier"], output_cost_per_token: 0.00002 } }).rows[0].crosscheckState, "DISAGREEMENT");
assert.equal(normalizeLiteLLM({ "test-frontier": { ...crosscheck["test-frontier"], litellm_provider: "azure" } }, snapshot.rates[0]), null);

const failed = await collect(async (url) => url.includes("models.dev")
  ? { ok: false, status: 503 } : { ok: true, json: async () => crosscheck });
assert.equal(failed.rows.every((row) => row.state === "SOURCE_ERROR"), true);
assert.equal(failed.sourceErrors.length, 1);
console.log("Managed API catalog shadow collector verified.");
