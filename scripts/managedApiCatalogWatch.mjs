/**
 * Read-only provider catalog comparison. Aggregator observations are discovery
 * signals; neither source is a first-party verification of a public API rate.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MANAGED_API_PRICING_SNAPSHOT } from "../src/managedApiPricingRegistry.js";

const MODELS_URL = "https://models.dev/api.json";
const LITELLM_URL = "https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json";
const PROVIDERS = Object.freeze({ OpenAI: "openai", Anthropic: "anthropic", Google: "google", xAI: "xai" });
const LITELLM_KEYS = Object.freeze({
  OpenAI: (id) => [id],
  Anthropic: (id) => [id, `anthropic/${id}`],
  Google: (id) => [`gemini/${id}`],
  xAI: (id) => [`xai/${id}`],
});
const LITELLM_PROVIDERS = Object.freeze({
  OpenAI: ["openai"], Anthropic: ["anthropic"], Google: ["gemini"], xAI: ["xai"],
});

function price(value) {
  const n = Number(value);
  return value != null && Number.isFinite(n) && n > 0 ? n : null;
}

function differs(a, b) {
  return price(a) != null && price(b) != null && Math.abs(a - b) >= Math.max(0.01, b * 0.005);
}

export function normalizeModelsDev(catalog, row) {
  const model = catalog?.[PROVIDERS[row.provider]]?.models?.[row.modelId];
  if (!model) return null;
  return {
    input: price(model.cost?.input), output: price(model.cost?.output),
    cacheRead: model.cost?.cache_read == null ? null : Number(model.cost.cache_read),
    tiered: Boolean(model.cost?.tiers?.length || model.cost?.context_over_200k),
    label: model.name,
  };
}

export function normalizeLiteLLM(catalog, row) {
  const entries = LITELLM_KEYS[row.provider]?.(row.modelId) || [];
  for (const key of entries) {
    const model = catalog?.[key];
    if (!LITELLM_PROVIDERS[row.provider].includes(model?.litellm_provider)) continue;
    const input = price(model.input_cost_per_token);
    const output = price(model.output_cost_per_token);
    if (!input || !output) continue;
    return { input: input * 1_000_000, output: output * 1_000_000, key };
  }
  return null;
}

export function compareCatalogs({ modelsDev, liteLLM, snapshot = MANAGED_API_PRICING_SNAPSHOT, asOf = new Date() }) {
  const rows = snapshot.rates.map((row) => {
    const candidate = normalizeModelsDev(modelsDev, row);
    const crosscheck = normalizeLiteLLM(liteLLM, row);
    const state = !modelsDev ? "SOURCE_ERROR" : !candidate ? "MISSING" :
      !candidate.input || !candidate.output ? "INVALID" :
      differs(candidate.input, row.inputUsdPerMillion) || differs(candidate.output, row.outputUsdPerMillion) ||
      (candidate.cacheRead != null && row.cachedInputUsdPerMillion != null &&
        differs(candidate.cacheRead, row.cachedInputUsdPerMillion)) ? "PRICE_CHANGED" : "MATCHED";
    const crosscheckState = !liteLLM ? "SOURCE_ERROR" : !crosscheck ? "NO_MATCH" :
      !candidate?.input || !candidate?.output ? "UNAVAILABLE" :
      differs(crosscheck.input, candidate.input) || differs(crosscheck.output, candidate.output) ? "DISAGREEMENT" : "MATCHED";
    return {
      provider: row.provider, modelId: row.modelId, state, crosscheckState,
      published: { input: row.inputUsdPerMillion, output: row.outputUsdPerMillion, cacheRead: row.cachedInputUsdPerMillion },
      modelsDev: candidate, liteLLM: crosscheck,
      sourceUrl: row.sourceUrl,
    };
  });
  const tracked = new Set(snapshot.rates.map((row) => `${PROVIDERS[row.provider]}/${row.modelId}`));
  const minDate = new Date(asOf.getTime() - 30 * 86_400_000).toISOString().slice(0, 10);
  const discoveries = Object.entries(PROVIDERS).flatMap(([provider, key]) =>
    Object.entries(modelsDev?.[key]?.models || {}).filter(([id, model]) =>
      !tracked.has(`${key}/${id}`) && price(model.cost?.input) && price(model.cost?.output) &&
      model.modalities?.output?.includes("text") &&
      /^\d{4}-\d{2}-\d{2}$/.test(model.release_date || "") && model.release_date >= minDate)
      .map(([id, model]) => ({ provider, modelId: id, label: model.name, releaseDate: model.release_date,
        input: model.cost.input, output: model.cost.output })))
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate) || a.modelId.localeCompare(b.modelId));
  return { observedAt: asOf.toISOString(), snapshotVerifiedAt: snapshot.verifiedAt,
    sourceUrls: { modelsDev: MODELS_URL, liteLLM: LITELLM_URL },
    rows, discoveries, sourceErrors: [], mode: "shadow-only" };
}

export function renderReport(result) {
  const fmt = (n) => Number.isFinite(n) ? `$${n.toFixed(4)}` : "—";
  const lines = ["# Managed API catalog shadow comparison",
    `Observed: ${result.observedAt}. Production first-party snapshot verified: ${result.snapshotVerifiedAt}. **No calculator prices, models, or verification dates changed.**`,
    "", "models.dev and LiteLLM are community catalogs, not first-party rate certification. Model additions require identity, lifecycle, modality, and purchase-basis review. Short-context standard input/output prices are compared; context tiers and promotional terms require separate validation.",
    "", `Sources: [models.dev](${MODELS_URL}) · [LiteLLM](${LITELLM_URL})`,
    "models.dev data: © 2025 models.dev, [MIT license](https://github.com/anomalyco/models.dev/blob/dev/LICENSE).", "",
    "| Provider / model | Published input / output per 1M | models.dev input / output | State | LiteLLM cross-check |",
    "| --- | ---: | ---: | --- | --- |",
    ...result.rows.map((r) => `| ${r.provider} / ${r.modelId} | ${fmt(r.published.input)} / ${fmt(r.published.output)} | ${fmt(r.modelsDev?.input)} / ${fmt(r.modelsDev?.output)} | **${r.state}**${r.modelsDev?.tiered ? " · context tiers" : ""} | ${r.crosscheckState} |`),
    "", `## New model candidates (${result.discoveries.length} in the last 30 days)`,
    "Candidates are not automatically added to the calculator; new releases can have missing or promotional price terms.",
    ...result.discoveries.slice(0, 30).map((r) => `- ${r.provider} / ${r.modelId} (${r.releaseDate}): ${fmt(r.input)} input, ${fmt(r.output)} output per 1M`),
    ...(result.discoveries.length > 30 ? [`- ${result.discoveries.length - 30} additional candidates in JSON artifact`] : []),
    ...(result.sourceErrors.length ? ["", "## Source failures", ...result.sourceErrors.map((x) => `- ${x}`)] : []),
    "", "A successful catalog read does not advance the first-party verification date. Confirm changed rates against provider documentation before a pricing PR.", ""];
  return lines.join("\n");
}

async function fetchCatalog(url, fetchImpl) {
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(25_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Unexpected catalog shape");
  return data;
}

export async function collect(fetchImpl = fetch) {
  const urls = [MODELS_URL, LITELLM_URL];
  const fetched = await Promise.allSettled(urls.map((url) => fetchCatalog(url, fetchImpl)));
  const result = compareCatalogs({
    modelsDev: fetched[0].status === "fulfilled" ? fetched[0].value : null,
    liteLLM: fetched[1].status === "fulfilled" ? fetched[1].value : null,
  });
  result.sourceErrors = fetched.flatMap((entry, i) => entry.status === "rejected"
    ? [`${urls[i]}: ${String(entry.reason?.message || entry.reason).slice(0, 160)}`] : []);
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await collect();
  fs.writeFileSync(process.env.MANAGED_CATALOG_REPORT_PATH || "managed-api-catalog-review.md", renderReport(result));
  fs.writeFileSync(process.env.MANAGED_CATALOG_JSON_PATH || "managed-api-catalog-review.json", `${JSON.stringify(result, null, 2)}\n`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, renderReport(result));
  console.log(`Compared ${result.rows.length} managed API rows; ${result.rows.filter((r) => r.state !== "MATCHED").length} need review; ${result.discoveries.length} new candidates.`);
}
