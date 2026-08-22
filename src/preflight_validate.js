// preflight_validate.js
// Usage: node preflight_validate.js <data.json>
//
// Schema/sanity checks for a Client Summary data file, run BEFORE handing
// it to generate_client_summary_full.js. Catches structural problems (a
// tool marked included:true with no headlineStat, an array/object value
// where a scalar is expected, a Readiness status using the wrong
// vocabulary) and flags the known "field doesn't match its label" bug
// class documented in AiFactoryClientSummaryInstructions.md's Data
// Integrity Notes -- e.g. a "*Count" field holding a dollar-looking value,
// or an ROI-like field whose magnitude suggests it's actually a raw ratio
// mislabeled as a count, or vice versa.
//
// Exit code 0 = clean (or warnings only). Exit code 1 = at least one
// ERROR. Never silently "fixes" anything -- same principle as the
// generator itself: flag it, don't guess a replacement.

const fs = require("fs");

const dataPath = process.argv[2];
if (!dataPath) {
  console.error("Usage: node preflight_validate.js <data.json>");
  process.exit(1);
}

let data;
try {
  data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
} catch (e) {
  console.error(`FAIL: could not parse ${dataPath} as JSON -- ${e.message}`);
  process.exit(1);
}

const errors = [];
const warnings = [];

function err(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

// ---------- top-level ----------
if (!data.clientName || typeof data.clientName !== "string") err("clientName missing or not a string");
if (!data.date || typeof data.date !== "string") err("date missing or not a string");
if (data.clientLogoPath !== null && data.clientLogoPath !== undefined && typeof data.clientLogoPath !== "string") {
  err("clientLogoPath must be null or a string path");
}

const KNOWN_TOOLS = ["tco", "roi", "gpuSizing", "modelAdvisor", "readiness"];
const tools = data.tools || {};
Object.keys(tools).forEach((key) => {
  if (!KNOWN_TOOLS.includes(key)) warn(`tools.${key} is not a recognized tool key (${KNOWN_TOOLS.join(", ")}) -- will render via fallback if at all`);
});

// ---------- per-tool structural checks ----------
["tco", "roi", "gpuSizing", "modelAdvisor"].forEach((key) => {
  const t = tools[key];
  if (!t || !t.included) return;
  if (!t.headlineStat) err(`tools.${key}.included=true but headlineStat is missing`);
  if (!t.headlineLabel) err(`tools.${key}.included=true but headlineLabel is missing`);
  if (!Array.isArray(t.bullets) || t.bullets.length === 0) warn(`tools.${key}.bullets is missing or empty -- page 2 recap will be sparse`);
  if (t.detail && typeof t.detail !== "object") { err(`tools.${key}.detail must be an object`); return; }
  if (t.detail) {
    Object.entries(t.detail).forEach(([field, value]) => {
      if (Array.isArray(value)) {
        // Only cumulativeByYear (TCO) is a known, intentionally-charted array.
        // Any other array field is presentation-untested -- detailGroups()
        // does filter arrays/objects out of the leftover-fields fallback, so
        // this won't crash or print [object Object], but flag it anyway
        // since an unrecognized array silently vanishing from the page is
        // still worth a human's attention.
        if (!(key === "tco" && field === "cumulativeByYear")) {
          warn(`tools.${key}.detail.${field} is an array outside the known cumulativeByYear case -- will be silently dropped by the detail-page renderer, not shown as an error`);
        }
      } else if (value !== null && typeof value === "object") {
        warn(`tools.${key}.detail.${field} is an object -- will be silently dropped by the detail-page renderer (same filter as arrays)`);
      }
    });
  }
  // headlineLabel vs. detail.horizonYears consistency -- a deck that
  // narrates a 5-year horizon while its own headline still says "3-Yr" is
  // exactly the kind of polished-looking internal contradiction this
  // preflight layer exists to catch, not just missing/malformed fields.
  if ((key === "tco" || key === "roi") && t.detail && typeof t.detail.horizonYears === "number" && t.headlineLabel) {
    const stated = t.detail.horizonYears;
    const labelMatch = t.headlineLabel.match(/(\d+)-Yr/i);
    if (labelMatch && Number(labelMatch[1]) !== stated) {
      err(`tools.${key}.headlineLabel says "${labelMatch[1]}-Yr" but tools.${key}.detail.horizonYears is ${stated} -- these must match`);
    }
  }
});

// ---------- readiness ----------
const REAL_STATUSES = ["Gaps to investigate", "Mostly ready", "Ready"];
const REAL_CATEGORIES = ["Data", "Security & Governance", "Infrastructure", "People & Operations", "Business & Use Case"];
if (tools.readiness && tools.readiness.included) {
  const statuses = tools.readiness.statuses;
  if (!Array.isArray(statuses) || statuses.length === 0) {
    err("tools.readiness.included=true but statuses is missing or empty");
  } else {
    statuses.forEach((s, i) => {
      if (!s.category || !s.status) { err(`tools.readiness.statuses[${i}] missing category or status`); return; }
      if (!REAL_CATEGORIES.includes(s.category)) warn(`tools.readiness.statuses[${i}].category "${s.category}" doesn't match a known category name (${REAL_CATEGORIES.join(", ")}) -- check for the old "Data Readiness"-style naming`);
      if (!REAL_STATUSES.includes(s.status)) warn(`tools.readiness.statuses[${i}].status "${s.status}" doesn't match a known status string (${REAL_STATUSES.join(", ")}) -- the flag/ready-count logic matches substrings, so an unrecognized string may silently fall through both checks`);
    });
  }
}

// ---------- the "field doesn't match its label" bug class from
// AiFactoryClientSummaryInstructions.md's Data Integrity Notes ----------
// Heuristic only -- flags for human review, never auto-corrects.
// Mirrors generate_client_summary_full_v2.js's FIELD_FORMAT map -- a field
// listed here is safely curated and exempt from the percent-magnitude
// warning below, since fmtValue's curated branch handles it correctly
// regardless of magnitude. Keep this in sync if FIELD_FORMAT changes.
const CURATED_FIELDS = new Set([
  "savings", "floorCaseSavings", "cloudCost", "onPremCost", "capexPlusOneTime",
  "monthlyOpex", "residualCredit", "monthlyBill", "cloudYear1", "onPremYear1Capital",
  "onPremYear1Operating", "paybackMonths", "budget", "lowerCostCount", "higherGrowthCount",
  "minTechnical", "recommended", "utilizationPct", "topModelParams", "eligibleCount",
  "totalCount", "otherEligibleCount", "verificationCandidateCount", "grossCapacity",
  "redeployableCapacity", "fteEquivalent", "steadyStateValue", "year1Value", "year1Net",
  "horizonNet", "horizonROI", "horizonYears", "payback", "doorsComplete", "doorsTotal",
  "suggestedStepCount",
]);

function checkFieldLabelConsistency(toolKey, detail) {
  if (!detail) return;
  Object.entries(detail).forEach(([field, value]) => {
    if (typeof value !== "number") return;
    const f = field.toLowerCase();
    // A "*Count" field should be a small-ish whole number, not something
    // that looks like it came out formatted as currency (this can't detect
    // that from the raw JSON number itself, so instead flag anything
    // suspiciously large or non-integer for a field named like a count).
    if (/count$/i.test(field) && !Number.isInteger(value)) {
      warn(`${toolKey}.detail.${field} is named like a count but has a non-integer value (${value}) -- check against the source export per the Data Integrity Notes ("Lower Cost Count" has shown a dollar figure before)`);
    }
    if (/count$/i.test(field) && Number.isInteger(value) && Math.abs(value) >= 100000) {
      warn(`${toolKey}.detail.${field} is named like a count but is >= 100,000 (${value}) -- unusually large for a GPU/model/door count, double-check it isn't actually a dollar value`);
    }
    // A percent/ROI-like field name whose value is a large ratio (e.g. 12.5
    // for "1250%") is exactly the ambiguity that has previously caused a
    // magnitude-based currency-vs-percent misformat elsewhere in this
    // project (Model Advisor's audit trail had the identical bug class).
    // Only relevant for UNCURATED fields -- a curated field (FIELD_FORMAT
    // has an explicit entry) is formatted correctly regardless of
    // magnitude, so warning on those would just be noise.
    if (!CURATED_FIELDS.has(field) && (f.includes("roi") || f.includes("pct") || f.includes("percent"))) {
      warn(`${toolKey}.detail.${field} is an uncurated percentage-like field (value ${value}); formatting is inferred from the field name rather than FIELD_FORMAT. Currently renders correctly, but a field name that doesn't happen to contain "pct"/"roi"/"percent" would fall through incorrectly -- consider adding it to the explicit field map for real safety against a future rename.`);
    }
  });
}
["tco", "roi", "gpuSizing", "modelAdvisor"].forEach((key) => {
  if (tools[key]?.included) checkFieldLabelConsistency(key, tools[key].detail);
});

// ---------- report ----------
console.log(`Preflight: ${dataPath}`);
if (errors.length === 0 && warnings.length === 0) {
  console.log("  Clean -- no errors or warnings.");
} else {
  errors.forEach((e) => console.log(`  ERROR:   ${e}`));
  warnings.forEach((w) => console.log(`  WARNING: ${w}`));
}
console.log(`  ${errors.length} error(s), ${warnings.length} warning(s).`);
process.exit(errors.length > 0 ? 1 : 0);
