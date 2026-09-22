/**
 * Read-only weekly maintenance report. No source response is written to a
 * production registry and no verification date is advanced automatically.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CLOUD_GPU_RATES, ONPREM_SYSTEMS } from "../src/pricingRegistry.js";
import { CLOUD_RATES_VERIFIED_AT, ONPREM_PRICING_VERIFIED_AT } from "../src/pricingProvenance.js";
import { MANAGED_API_PRICING_SNAPSHOT } from "../src/managedApiPricingRegistry.js";
import { getManagedApiPricingRefreshStatus } from "../src/managedApiPricingRefresh.js";
import { INFERENCE_ECONOMICS_EVIDENCE } from "../src/inferenceEconomicsEvidence.js";

const HF_SNAPSHOT = JSON.parse(fs.readFileSync(new URL("../data/model_specs.json", import.meta.url), "utf8"));
const AA_SNAPSHOT = JSON.parse(fs.readFileSync(new URL("../data/model_capability_db.json", import.meta.url), "utf8"));
const AA_DISCOVERY = JSON.parse(fs.readFileSync(new URL("../data/aa_discovery_candidates.json", import.meta.url), "utf8"));

const AZURE_CANONICAL = Object.freeze([
  { gpu: "A100", sku: "Standard_ND96amsr_A100_v4", region: "eastus", gpus: 8 },
  { gpu: "H100", sku: "Standard_ND96isr_H100_v5", region: "eastus", gpus: 8 },
  { gpu: "H200", sku: "Standard_ND96isr_H200_v5", region: "westus3", gpus: 8 },
  { gpu: "GB200", sku: "Standard_ND128isr_NDR_GB200_v6", region: "eastus", gpus: 4 },
]);

export function ageDays(date, asOf = new Date()) {
  const parsed = new Date(date.length === 10 ? `${date}T00:00:00Z` : date);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid verification date: ${date}`);
  return Math.max(0, Math.floor((asOf.getTime() - parsed.getTime()) / 86_400_000));
}

export function reviewState(age, due, stale) {
  return age > stale ? "STALE" : age > due ? "REVIEW" : "CURRENT";
}

function escapeCell(value) {
  return String(value ?? "—").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function normalizeAzureItem(item, target) {
  const meter = String(item.meterName || "");
  const product = String(item.productName || "");
  const sku = String(item.armSkuName || "");
  const region = String(item.armRegionName || "");
  const unit = String(item.unitOfMeasure || "");
  const price = Number(item.retailPrice);
  // Reject apparent Spot/Low Priority/Windows/reservation meters. A remaining
  // row is still only a candidate until a reviewer verifies purchase basis.
  const excluded = /spot|low priority|windows|reservation|savings plan/i.test(`${meter} ${product} ${item.skuName || ""}`);
  return !excluded && sku.toLowerCase() === target.sku.toLowerCase() &&
    region.toLowerCase() === target.region && item.type === "Consumption" &&
    item.currencyCode === "USD" &&
    /hour/i.test(unit) && Number.isFinite(price) && price > 0;
}

export function assessAzureResponse(items, target, currentRate) {
  const matches = items.filter((item) => normalizeAzureItem(item, target));
  if (matches.length !== 1) {
    return { state: matches.length ? "AMBIGUOUS" : "NO_MATCH", count: matches.length };
  }
  const item = matches[0];
  const perGpu = item.retailPrice / target.gpus;
  const changePct = ((perGpu / currentRate) - 1) * 100;
  return {
    state: Math.abs(changePct) >= 0.5 ? "REVIEW_CHANGE" : "CHECKED_CANDIDATE",
    count: 1,
    candidatePerGpu: perGpu,
    changePct,
    meter: item.meterName,
    currency: item.currencyCode,
    effectiveStartDate: item.effectiveStartDate,
  };
}

export function azureCatalogUrl(target) {
  const filter = `armSkuName eq '${target.sku}' and armRegionName eq '${target.region}'`;
  return `https://prices.azure.com/api/retail/prices?api-version=2023-01-01-preview&$filter=${encodeURIComponent(filter)}`;
}

export async function fetchAzureCandidate(target, fetchImpl = fetch) {
  let url = azureCatalogUrl(target);
  const items = [];
  const seen = new Set();
  for (let page = 0; url && page < 20; page++) {
    if (!url.startsWith("https://prices.azure.com/api/retail/prices?" ) || seen.has(url)) {
      throw new Error("Unexpected or repeated Azure pagination URL");
    }
    seen.add(url);
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Azure HTTP ${response.status}`);
    const body = await response.json();
    if (!Array.isArray(body.Items)) throw new Error("Azure response has no Items array");
    items.push(...body.Items);
    url = body.NextPageLink || "";
  }
  if (url) throw new Error("Azure pagination limit exceeded");
  return items;
}

export async function azureReview(fetchImpl = fetch) {
  const rows = [];
  for (const target of AZURE_CANONICAL) {
    const currentRate = CLOUD_GPU_RATES.Azure[target.gpu]?.od;
    try {
      const items = await fetchAzureCandidate(target, fetchImpl);
      rows.push({ ...target, currentRate, ...assessAzureResponse(items, target, currentRate) });
    } catch (error) {
      rows.push({ ...target, currentRate, state: "SOURCE_ERROR", detail: String(error.message).slice(0, 180) });
    }
  }
  return rows;
}

export function buildReport({ asOf = new Date(), azure = [] } = {}) {
  const cloudAge = ageDays(CLOUD_RATES_VERIFIED_AT, asOf);
  const onpremAge = ageDays(ONPREM_PRICING_VERIFIED_AT, asOf);
  const api = getManagedApiPricingRefreshStatus({ snapshot: MANAGED_API_PRICING_SNAPSHOT, asOf });
  const priceStates = [
    ["Cloud GPU pricing", CLOUD_RATES_VERIFIED_AT, cloudAge, reviewState(cloudAge, 45, 90), "src/pricingRegistry.js"],
    ["On-prem system pricing", ONPREM_PRICING_VERIFIED_AT, onpremAge, reviewState(onpremAge, 45, 90), "src/pricingRegistry.js"],
    ["Managed API pricing", api.verifiedAt, api.ageDays, api.state, "src/managedApiPricingRegistry.js"],
  ];
  const hfAge = ageDays(HF_SNAPSHOT.synced_at, asOf);
  const aaAge = ageDays(AA_SNAPSHOT.synced_at, asOf);
  const quote = Object.entries(CLOUD_GPU_RATES).flatMap(([provider, rates]) =>
    Object.entries(rates).filter(([, record]) => record.conf !== "LISTED").map(([gpu, record]) =>
      `${provider} ${gpu}: ${record.conf}`));
  const line = [
    "# AI Factory weekly maintenance review",
    `Generated: ${asOf.toISOString().slice(0, 10)} UTC. **Evidence queue only; no prices, dates, or models were changed.**`,
    "",
    "## Pricing review dates",
    "| Area | Verified | Age | State | Source file |",
    "| --- | --- | ---: | --- | --- |",
    ...priceStates.map(([name, date, age, state, file]) => `| ${name} | ${date} | ${age} days | **${state}** | \`${file}\` |`),
    "",
    "## Automated model snapshots",
    "| Feed | Last sync | Age | State |",
    "| --- | --- | ---: | --- |",
    `| Hugging Face specifications | ${HF_SNAPSHOT.synced_at.slice(0, 10)} | ${hfAge} days | **${hfAge > 40 ? "REVIEW_SYNC" : "CURRENT"}** |`,
    `| Artificial Analysis capability | ${AA_SNAPSHOT.synced_at.slice(0, 10)} | ${aaAge} days | **${aaAge > 10 ? "REVIEW_SYNC" : "CURRENT"}** |`,
    `AA discovery has ${AA_DISCOVERY.unresolved_aa_slugs?.length || 0} unmapped candidates, including proprietary models; this is not an open-weight shortlist.`,
    "",
    "## Azure retail catalog candidates",
    "Exact SKU and region lookup; Linux/standard On-Demand purchase basis and meter identity require review before changing rates. Missing or ambiguous rows do not overwrite a planning value.",
    "| GPU | SKU / region | Current $/GPU-hour | Catalog candidate | State | Detail |",
    "| --- | --- | ---: | ---: | --- | --- |",
    ...azure.map((row) => `| ${row.gpu} | [${row.sku} / ${row.region}](${azureCatalogUrl(row)}) | ${row.currentRate.toFixed(2)} | ${row.candidatePerGpu?.toFixed(4) ?? "—"} | **${row.state}** | ${escapeCell(row.detail || (row.changePct == null ? `${row.count ?? 0} matching meters` : `${row.changePct.toFixed(1)}% · ${row.meter || "meter unspecified"} · ${row.currency || "currency unspecified"}`))} |`),
    ...(azure.length ? [] : ["| — | Live comparison not run | — | — | OFFLINE | Schedule runs with `--live` |"]),
    "",
    "## Known proxies and quote placeholders",
    `${quote.length} cloud registry rows are not directly listed public prices. Review each against its canonical purchase basis; never treat a numeric QUOTE placeholder as a verified price.`,
    ...quote.map((item) => `- ${item}`),
    "",
    "## Managed API first-party rate review",
    "The checked-in rates below are not refreshed by this report. Verify special context/cache/promotional terms on each linked first-party page before advancing the snapshot date.",
    "| Provider / model | Input / output $ per 1M | Cached input | First-party source |",
    "| --- | ---: | ---: | --- |",
    ...MANAGED_API_PRICING_SNAPSHOT.rates.map((rate) => `| ${escapeCell(rate.provider)} / ${escapeCell(rate.modelLabel)} | ${rate.inputUsdPerMillion} / ${rate.outputUsdPerMillion} | ${rate.cachedInputUsdPerMillion ?? "—"} | [Source](${rate.sourceUrl}) |`),
    "",
    "## Evidence and governance requiring human review",
    `- IE has ${Object.keys(INFERENCE_ECONOMICS_EVIDENCE).length} benchmark hardware anchors; recheck model, precision, workload scenario, GPU count, and replica eligibility after new MLPerf/NVIDIA releases. Current Offline evidence must not be relabeled as production-serving measurement.`,
    `- On-prem system registry has ${Object.keys(ONPREM_SYSTEMS).length} systems. Compare NVIDIA/CDW price book, support term, optional software, installation, power/cooling, and loaded adders before changing economics.`,
    "- Check Artificial Analysis discovery candidates and Hugging Face changes; do not automatically admit models to the customer-facing catalog.",
    "- Check managed API first-party price pages for input/output/cache, context-tier and promotional terms. The scheduled freshness action does not retrieve prices; BenchLM remains disconnected.",
    "- Check NIM compatibility manually until a supported endpoint is validated. Review Readiness/governance sources quarterly, service health/billing quarterly, and documentation after meaningful changes.",
    "- After customer-facing changes, run the full quality gate and relevant live auth, handoff, report/PDF, download event, and notification checks.",
    "",
  ];
  return { markdown: line.join("\n"), states: priceStates.map(([name, , , state]) => ({ name, state })), azure };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const live = process.argv.includes("--live");
  const report = buildReport({ azure: live ? await azureReview() : [] });
  const output = process.env.MAINTENANCE_REPORT_PATH || "maintenance-review.md";
  fs.writeFileSync(output, report.markdown);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report.markdown);
  console.log(`Wrote ${output}; ${report.states.map((x) => `${x.name}: ${x.state}`).join(", ")}`);
}
