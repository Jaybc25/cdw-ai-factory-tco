# Managed API model and pricing automation

Status: daily catalog shadow check. The Inference Economics calculator still uses the dated, checked-in first-party snapshot in `src/managedApiPricingRegistry.js`.

## Current pipeline

`.github/workflows/managed-api-catalog-watch.yml` runs daily at 10:30 UTC, with manual dispatch available. It reads the public `https://models.dev/api.json` catalog and the LiteLLM model-cost map, compares exact provider and model IDs against the calculator's snapshot, and writes a Markdown report and JSON artifact. One rolling GitHub issue, **AI Factory: managed API catalog review**, shows the latest comparison. It receives a new comment when a comparison signal changes, including new model candidates and source failures. No API key or production data write is needed.

The watcher flags `PRICE_CHANGED`, `MISSING`, `INVALID`, or `SOURCE_ERROR` for tracked models, plus LiteLLM cross-check disagreements. It lists text-output models from the four existing first-party providers whose release dates fall in the last 30 days as **discovery candidates**, not approved choices. It compares the standard short-context input/output and cached-input rates; the report marks context-tier data for separate review. A catalog publication date is not a first-party price verification date. A missing LiteLLM mapping is not proof of a bad models.dev value.

## Source choices

| Feed | Role | Conditions and limitations |
| --- | --- | --- |
| [models.dev API](https://models.dev/api.json) | Preferred discovery and change signal for managed API model IDs and per-million-token rates | The [repository license](https://github.com/anomalyco/models.dev/blob/dev/LICENSE) is MIT; preserve its license notice if distributing substantial data or code. Community-maintained entries may lag, and a provider model must be matched to the correct first-party API endpoint and purchase basis. |
| [LiteLLM model-cost map](https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json) | Independent discrepancy signal | Normalize per-token costs to per-million; use provider-specific IDs to avoid comparing OpenRouter, Azure or Vertex routes with the first-party API. The non-enterprise files have an MIT license, but a missing/zero rate is not a real free offering. |
| [OpenRouter models endpoint](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties) | Possible future *OpenRouter-route* benchmark | Route pricing is not interchangeable with direct OpenAI, Anthropic, Google, or xAI pricing. Recheck API terms before embedding or republishing its data. |
| [Artificial Analysis Data API](https://artificialanalysis.ai/data-api) | Separate capability/performance feed subject to rights review | Free API is described as internal-use-only and for organizations under 150 employees; externally distributed usage and model selection may require an expressly scoped agreement. See [platform terms](https://artificialanalysiscdn.com/legal/ProDataPlatformTerms.pdf). Do not add this feed to the client-facing IE pricing source without a rights decision. |

## Path to production updates

1. Observe initial daily checks and reconcile every existing model, including exact model ID, route, standard input/output basis, cached input, long-context tier, promotional expiration, and provider retirement. Review the new-model candidate list to decide which models belong in the customer-facing comparison.
2. On an aggregator delta, fetch the corresponding first-party provider price page or supported first-party API and capture its effective date and terms. A discrepancy or a source failure creates a review task; it never resets the current verified date or overwrites a known-good rate.
3. Generate a reviewable registry PR containing the old/new rate, model identity, first-party source link, relevant exception notes, and representative IE comparison test. An approved PR deploys with the usual Vercel build. A Vercel cron alone cannot edit a compiled static React pricing snapshot; runtime updates would need a separately designed durable store and serving endpoint.
4. Replace the single whole-snapshot verification date with row-level source/verification metadata before allowing partial rate updates. Only consider unattended updates for narrowly mapped provider rates after a period of correct changed-price detection, first-party corroboration, schema checks, and regression coverage. Retain manual approval for new model admission, ambiguous tiers, promotional rates, and removals until explicit acceptance criteria are set.

**Shadow observations do not make the calculator live-priced.** The existing managed API freshness job continues to report aging first-party verification independently of nightly catalog checks.
