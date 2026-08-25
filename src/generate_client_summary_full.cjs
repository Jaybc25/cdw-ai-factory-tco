// generate_client_summary_full.js
// Usage: node generate_client_summary_full.js <data.json> <output.pptx>
//
// Builds a longer, multi-page, portrait, CDW-branded "Full AI Factory
// Assessment" deliverable -- a sibling to generate_client_summary.js (the
// 2-page quick brief), for when a client wants the detailed follow-up
// document instead of the headline summary. Same branding, same data
// domain, different depth.
//
// Structure: cover -> executive summary (reuses the 2-pager's exact
// stat-card grid) -> one detail page per included tool (full field-by-field
// breakdown) -> readiness detail (reuses the 2-pager's table + next-steps
// logic verbatim) -> closing/CTA. Only tools marked included:true render;
// page count and numbering adapt automatically.
//
// Data shape: same top-level fields as the 2-pager (clientName, date,
// accountExec, clientLogoPath, tools.*.included/headlineStat/headlineLabel/
// label/bullets), PLUS a `detail` object per tool. `detail`'s keys are
// meant to be the SAME field names as that tool's live My Summary snapshot
// (e.g. TCO's savings/cloudCost/onPremCost/...), not a separate vocabulary --
// this script formats them with the exact same FIELD_FORMAT rules already
// verified in CombinedSummary.jsx, so a number renders identically whether
// a client sees it in My Summary or in this deck. If My Summary's snapshot
// shape ever gains a field this script doesn't recognize, it still renders
// (falls through to a hardened heuristic), it just won't have a curated
// position in DETAIL_FIELD_ORDER until that's added below.

const pptxgen = require("pptxgenjs");
const fs = require("fs");

const RED = "CC0000";
const BODY = "1A1A1A";
const CHARCOAL = "2B2B2B";
const LIGHTGRAY = "F5F5F5";
const MIDGRAY = "6E6E6E";
const WHITE = "FFFFFF";

const FONT = "Calibri";

const dataPath = process.argv[2];
const outPath = process.argv[3];
if (!dataPath || !outPath) {
  console.error("Usage: node generate_client_summary_full.js <data.json> <output.pptx>");
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

const pres = new pptxgen();
pres.defineLayout({ name: "PORTRAIT_LETTER", width: 8.5, height: 11 });
pres.layout = "PORTRAIT_LETTER";

const MX = 0.5;
const PAGE_W = 8.5;
const CONTENT_W = PAGE_W - MX * 2;

// ---------- helpers (verbatim from generate_client_summary.js) ----------

function logoBox(slide, x, y, w, h, label) {
  slide.addShape("rect", {
    x, y, w, h,
    fill: { color: WHITE },
    line: { color: "AAAAAA", width: 1, dashType: "dash" },
  });
  slide.addText(label, {
    x, y, w, h,
    align: "center",
    valign: "middle",
    fontFace: FONT,
    fontSize: 9,
    color: MIDGRAY,
    bold: true,
  });
}

const TOOL_ORDER = ["tco", "roi", "gpuSizing", "modelAdvisor"];

const TOOL_LABEL_FALLBACK = {
  tco: "Cloud vs. On-Prem TCO",
  roi: "AI Use Case ROI",
  gpuSizing: "GPU Sizing",
  modelAdvisor: "Open-Weight Model Advisor",
};

const SERVICE_MAP = {
  "Data": { primary: "AI Readiness Data Quality Assessment" },
  "Security & Governance": { primary: "AI Risk Assessments (NIST & ISO 42001 Frameworks)" },
  "Infrastructure": { primary: "Infrastructure Readiness Assessment" },
  "People & Operations": { primary: "CDW Applied AI Academy" },
  "Business & Use Case": { primary: "Private AI Launch Workshop" },
};

// Category names are hand-typed into the client data file (this pipeline's
// biggest reliability risk, flagged earlier), so an exact-match lookup is
// fragile against real-world variance -- e.g. "Data Readiness" vs the live
// tool's actual "Data". Try exact first, then a normalized match (strip a
// trailing "Readiness", trim, case-insensitive) before giving up.
function serviceFor(category) {
  if (SERVICE_MAP[category]) return SERVICE_MAP[category];
  const normalized = category.replace(/\s*readiness\s*$/i, "").trim().toLowerCase();
  const key = Object.keys(SERVICE_MAP).find((k) => k.toLowerCase() === normalized);
  return key ? SERVICE_MAP[key] : null;
}

function readinessReadyCount(readiness) {
  if (!readiness || !readiness.included) return null;
  const total = readiness.statuses.length;
  const ready = readiness.statuses.filter((s) => s.status === "Ready").length;
  return { ready, total };
}

function isFlaggedStatus(status) {
  return /gap|attention|not started/i.test(status);
}

// Three-tier color, matching the live tool's actual scheme confirmed from
// real PDF exports: green for Ready-ish, amber for Gaps-to-investigate-ish,
// red reserved for the more severe "Needs Attention"/question-level flags.
// Not a red-vs-black binary, which is what an earlier version of this
// script (and the 2-pager) used before checking against real output.
const GREEN = "1E7A3D";
const AMBER = "B45309";
function statusColor(status) {
  if (/needs attention/i.test(status)) return RED;
  if (isFlaggedStatus(status)) return AMBER;
  return GREEN;
}

// Gray, bold, uppercase, letter-spaced mini-header -- matches the real
// tools' section-header style ("ASSUMPTIONS USED", "CAPACITY CREATED"),
// confirmed from live PDF exports, rather than a plain black bold label.
function sectionLabel(slide, text, x, y, w) {
  slide.addText(text.toUpperCase(), {
    x, y, w, h: 0.26,
    fontFace: FONT, fontSize: 11.5, bold: true, color: MIDGRAY, charSpacing: 1.2,
  });
}

// Horizontal bar chart -- matches the orientation the live TCO/ROI tools
// themselves use for their own cost/capacity comparisons (confirmed from
// live PDF exports), rather than an arbitrary vertical column chart.
// formatCode: "#,##0" for counts, '"$"#,##0' for money.
function addBarChart(slide, x, y, w, h, title, categories, values, formatCode, colors) {
  slide.addChart("bar", [{ name: title, labels: categories, values }], {
    x, y, w, h,
    barDir: "bar",
    showTitle: true, title, titleFontFace: FONT, titleFontSize: 11, titleColor: BODY, titleBold: true,
    showValue: true, dataLabelPosition: "outEnd",
    dataLabelFontFace: FONT, dataLabelFontSize: 9, dataLabelColor: BODY,
    dataLabelFormatCode: formatCode,
    chartColors: colors || [RED, CHARCOAL, "999999", "CCCCCC"],
    showLegend: false,
    catAxisLabelColor: BODY, catAxisLabelFontFace: FONT, catAxisLabelFontSize: 9.5,
    valAxisHidden: true,
    valGridLine: { style: "none" },
    catGridLine: { style: "none" },
    plotArea: { fill: { color: WHITE } },
  });
}

// Cumulative crossover line chart -- two series, native pptxgenjs "line"
// type. Deliberately no per-point data labels here (line-series label
// positioning is a less-verified part of the pptxgenjs API than the bar
// charts above, and this can't be visually confirmed in this environment);
// a visible value axis plus gridlines carries the magnitude instead.
function addLineChart(slide, x, y, w, h, categories, cloudValues, onPremValues) {
  slide.addChart("line", [
    { name: "Stay in Cloud", labels: categories, values: cloudValues },
    { name: "Own It", labels: categories, values: onPremValues },
  ], {
    x, y, w, h,
    showTitle: true, title: "Cumulative Spend by Year", titleFontFace: FONT, titleFontSize: 11, titleColor: BODY, titleBold: true,
    chartColors: [CHARCOAL, RED],
    lineSize: 2.5, lineDataSymbol: "circle", lineDataSymbolSize: 6,
    showLegend: true, legendPos: "b", legendFontFace: FONT, legendFontSize: 9, legendColor: MIDGRAY,
    catAxisLabelColor: BODY, catAxisLabelFontFace: FONT, catAxisLabelFontSize: 9.5,
    valAxisLabelColor: MIDGRAY, valAxisLabelFontFace: FONT, valAxisLabelFontSize: 9, valAxisLabelFormatCode: '"$"#,##0,,"M"',
    valGridLine: { color: "EEEEEE", size: 0.75 },
    catGridLine: { style: "none" },
    plotArea: { fill: { color: WHITE } },
  });
}

// Bold highlight card -- matches the reference deck's "3-YEAR SAVINGS" style:
// dark rounded card, small light caption, a big serif number, short context
// line underneath. Reserved for tools with a genuine single "big number"
// result (TCO's savings, ROI's net benefit); not force-fit onto every page.
function highlightCard(slide, x, y, w, h, label, stat, context) {
  slide.addShape("roundRect", { x, y, w, h, rectRadius: 0.1, fill: { color: CHARCOAL }, line: { type: "none" } });
  slide.addText(label.toUpperCase(), {
    x: x + 0.22, y: y + 0.24, w: w - 0.44, h: 0.26,
    fontFace: FONT, fontSize: 10, bold: true, color: "CCCCCC", charSpacing: 1.5, align: "center",
  });
  slide.addText(stat, {
    x: x + 0.15, y: y + 0.52, w: w - 0.3, h: h * 0.42,
    fontFace: DISPLAY_FONT, fontSize: 30, bold: true, color: WHITE, align: "center", valign: "middle",
    fit: "shrink",
  });
  if (context) {
    slide.addText(context, {
      x: x + 0.22, y: y + h - 0.62, w: w - 0.44, h: 0.5,
      fontFace: FONT, fontSize: 9.5, color: "DDDDDD", align: "center", valign: "top", lineSpacingMultiple: 1.15,
    });
  }
}

// ---------- field formatting (ported verbatim from CombinedSummary.jsx --
// same source of truth a client would see in My Summary, not a second
// hand-maintained formatter that could drift from it) ----------

const FIELD_FORMAT = {
  // TCO
  savings: "money", floorCaseSavings: "money", cloudCost: "money", onPremCost: "money",
  capexPlusOneTime: "money", monthlyOpex: "money", residualCredit: "money", monthlyBill: "money",
  cloudYear1: "money", onPremYear1Capital: "money", onPremYear1Operating: "money",
  paybackMonths: "months",
  // GPU Sizing
  budget: "money", lowerCostCount: "count", higherGrowthCount: "count", minTechnical: "count",
  recommended: "count", utilizationPct: "percent",
  // Model Advisor
  topModelParams: "count", eligibleCount: "count", totalCount: "count",
  otherEligibleCount: "count", verificationCandidateCount: "count",
  // ROI
  grossCapacity: "count", redeployableCapacity: "count", fteEquivalent: "count",
  steadyStateValue: "money", year1Value: "money", year1Net: "money", horizonNet: "money",
  horizonROI: "percent", horizonYears: "count", payback: "months",
  // Readiness
  doorsComplete: "count", doorsTotal: "count", suggestedStepCount: "count",
};

const ACRONYMS = ["GPU", "ROI", "AI", "TCO", "FTE"];

function labelize(key) {
  const spaced = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
  return spaced.split(" ").map((word) => (ACRONYMS.includes(word.toUpperCase()) ? word.toUpperCase() : word)).join(" ");
}

// Shared by both the curated "money" branch and the uncurated MONEY_WORDS
// fallback below, so a negative-value fix can't drift between the two call
// sites the way the bug that prompted this originally could have.
function fmtMoney(value) {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}$${Math.abs(rounded).toLocaleString()}`;
}

function fmtValue(key, value) {
  if (value == null) return "\u2014";
  if (typeof value === "number") {
    const known = FIELD_FORMAT[key];
    if (known === "months") return `${value.toFixed(1)} months`;
    if (known === "percent") return `${(value * 100).toFixed(1)}%`;
    if (known === "money") return fmtMoney(value);
    if (known === "count") return value.toLocaleString();
    const k = key.toLowerCase();
    const isCountLike = /count|class|years?$/i.test(key);
    if (!isCountLike) {
      if (k.includes("payback")) return `${value.toFixed(1)} months`;
      // No magnitude gate here -- every percent/ROI-like field in this
      // codebase's convention stores a decimal ratio (0.45 = 45%, 18.4 =
      // 1840%), same as the curated fields above. A value over 5 is just a
      // legitimately large percentage, not evidence the field isn't one;
      // fixture testing confirmed the old |value| <= 5 gate silently
      // dropped an uncurated field's percent formatting entirely above
      // that threshold.
      if (k.includes("pct") || k.includes("roi") || k.includes("percent")) return `${(value * 100).toFixed(1)}%`;
      const MONEY_WORDS = ["cost", "savings", "value", "budget", "net", "bill", "opex", "capex", "credit", "spend", "price", "amount"];
      if (MONEY_WORDS.some((w) => k.includes(w))) return fmtMoney(value);
    }
    return value.toLocaleString();
  }
  return String(value);
}

// Curated field order + label overrides per tool, for a page that reads
// top-to-bottom sensibly rather than in whatever order the snapshot happens
// to list keys. Any field present in the data but NOT listed here still
// renders -- appended at the end via the fallback pass in detailRows() --
// so a newly added snapshot field is never silently dropped, just unordered
// until this list is updated.
const DETAIL_FIELD_ORDER = {
  tco: [
    { group: "Comparison", fields: [
      ["planningBasis", "Planning Basis"], ["recommendedFleet", "Recommended Fleet"],
      ["gpuSizingFleet", "GPU Sizing Fleet"], ["savings", "Savings (Adjusted)"],
      ["floorCaseSavings", "Savings (Floor Case)"], ["cloudCost", "Cloud Cost"], ["onPremCost", "On-Prem Cost"],
    ] },
    { group: "Investment", fields: [
      ["capexPlusOneTime", "Capex + One-Time"], ["monthlyOpex", "Monthly Opex"],
      ["residualCredit", "Residual Credit"], ["paybackMonths", "Payback"], ["horizonYears", "Horizon"],
      ["cloudYear1", "Cloud (Year 1)"], ["onPremYear1Capital", "On-Prem Upfront (Year 1)"],
      ["onPremYear1Operating", "On-Prem Operating (Year 1)"],
    ] },
    { group: "Configuration", fields: [
      ["facility", "Facility"], ["provider", "Cloud Provider"], ["gpuClass", "Cloud GPU Class"],
      ["monthlyBill", "Reported Monthly Bill"], ["confidence", "Confidence"],
    ] },
  ],
  gpuSizing: [
    { group: "Recommendation", fields: [
      ["model", "Model"], ["mode", "Mode"], ["gpuClass", "Recommended GPU Class"],
      ["minTechnical", "Minimum Technical (GPUs)"], ["recommended", "Recommended (GPUs)"], ["confidence", "Confidence"],
    ] },
    { group: "Alternatives & Budget", fields: [
      ["lowerCostClass", "Lower-Cost Alternative Class"], ["lowerCostCount", "Lower-Cost Alternative (GPUs)"],
      ["higherGrowthClass", "Higher-Growth Alternative Class"], ["higherGrowthCount", "Higher-Growth Alternative (GPUs)"],
      ["utilizationPct", "Utilization"], ["budget", "Estimated Budget"],
    ] },
  ],
  modelAdvisor: [
    { group: "Model", fields: [
      ["topModel", "Recommended Model"], ["topModelLicense", "License"],
      ["topModelParams", "Parameters (B)"], ["topModelConfidence", "Confidence"], ["primaryWorkload", "Primary Workload"],
    ] },
    { group: "Evaluation", fields: [
      ["qualityPriority", "Quality Priority"], ["optimizationPriority", "Optimization Priority"],
      ["eligibleCount", "Eligible Models"], ["otherEligibleCount", "Other Eligible Models"],
      ["verificationCandidateCount", "Verification Candidates"], ["totalCount", "Total Models Evaluated"],
    ] },
  ],
  roi: [
    { group: "Investment", fields: [
      ["costSource", "AI Cost Source"], ["horizonYears", "Horizon"], ["payback", "Payback"],
    ] },
    { group: "Value Created", fields: [
      ["grossCapacity", "Gross Capacity (hrs/yr)"], ["redeployableCapacity", "Redeployable Capacity (hrs/yr)"],
      ["fteEquivalent", "FTE-Equivalent"], ["steadyStateValue", "Steady-State Value"], ["year1Value", "Year 1 Value"],
      ["year1Net", "Year 1 Net"], ["horizonNet", "Horizon Net"], ["horizonROI", "Horizon ROI"],
    ] },
  ],
};

// Which fields get charted per tool, and how. Deliberately NOT every tool:
// Model Advisor's countable fields (eligible/other-eligible/verification)
// are nested subsets of each other, not independent parallel categories --
// charting them side by side would visually imply a comparison that isn't
// real, so it gets a badge treatment instead (see below).
const CHART_SPEC = {
  tco: { title: "Cloud vs. On-Prem (3-Yr)", formatCode: '"$"#,##0,,"M"', fields: [["onPremCost", "Own It"], ["cloudCost", "Stay in Cloud"]] },
  roi: { title: "Capacity Created (hrs/yr)", formatCode: "#,##0", fields: [["grossCapacity", "Gross Capacity"], ["redeployableCapacity", "Redeployable"]] },
  gpuSizing: { title: "GPU Configuration Options", formatCode: "#,##0", fields: [["minTechnical", "Minimum Technical"], ["recommended", "Recommended"], ["lowerCostCount", "Lower-Cost Alt"], ["higherGrowthCount", "Higher-Growth Alt"]] },
};

function chartDataFor(toolKey, detail) {
  const spec = CHART_SPEC[toolKey];
  if (!spec || !detail) return null;
  const categories = [], values = [];
  spec.fields.forEach(([key, label]) => {
    if (typeof detail[key] === "number") { categories.push(label); values.push(detail[key]); }
  });
  if (categories.length < 2) return null; // a chart needs at least 2 bars to mean anything
  return { title: spec.title, formatCode: spec.formatCode, categories, values };
}

// TCO's cumulative crossover trajectory -- only TCO's detail schema has
// this field, and only when the source PDF included the (newly added)
// "Cumulative Spend" chart with its per-point values printed as text.
// Validates shape before charting rather than trusting whatever's there,
// since this came from an LLM reading a PDF, not a guaranteed-clean API.
function cumulativeChartDataFor(detail) {
  if (!detail || !Array.isArray(detail.cumulativeByYear)) return null;
  const pts = detail.cumulativeByYear.filter(
    (p) => p && typeof p.year === "number" && typeof p.cloud === "number" && typeof p.onPrem === "number"
  );
  if (pts.length < 2) return null; // a line needs at least 2 points to mean anything
  pts.sort((a, b) => a.year - b.year);
  return {
    categories: pts.map((p) => `Yr ${p.year}`),
    cloudValues: pts.map((p) => p.cloud),
    onPremValues: pts.map((p) => p.onPrem),
  };
}

// Which tools get the bold highlight-card treatment (a genuine single "big
// number" result exists) vs. the plain bullets recap. Only built from data
// already in the schema -- no itemized breakdowns or year-by-year figures
// that aren't actually present.
const HIGHLIGHT_SPEC = {
  tco: (t) => (typeof t.detail?.savings === "number") ? {
    label: `${t.detail.horizonYears || 3}-Year Savings`,
    stat: fmtValue("savings", t.detail.savings),
    context: typeof t.detail.cloudCost === "number" ? `vs. ${fmtValue("cloudCost", t.detail.cloudCost)} staying in cloud` : null,
  } : null,
  roi: (t) => (typeof t.detail?.horizonNet === "number") ? {
    label: `${t.detail.horizonYears || 3}-Year Net Benefit`,
    stat: fmtValue("horizonNet", t.detail.horizonNet),
    context: [
      typeof t.detail.horizonROI === "number" ? `${(t.detail.horizonROI * 100).toFixed(1)}% ROI` : null,
      typeof t.detail.payback === "number" ? `${t.detail.payback.toFixed(1)}mo payback` : null,
    ].filter(Boolean).join(" \u00b7 "),
  } : null,
};

// Detail-card rows assume a single-line value at LAYOUT.rowH. Long values
// (e.g. "TCO Calculator (Workload Requirement)", "Apache 2.0, commercial
// use permitted") wrap inside the value column and collide with the row
// below at the fixed row height. CHARS_PER_LINE is a rough estimate for
// 9.5pt Calibri bold in this card's value-column width (~1.4in) -- not
// exact text measurement, but enough to add headroom before it wraps.
const CHARS_PER_LINE = 15;
const EXTRA_LINE_H = 0.18;

function valueLineCount(value) {
  const len = String(value).length;
  return Math.max(1, Math.ceil(len / CHARS_PER_LINE));
}

function rowHeightFor(value) {
  return LAYOUT.rowH + (valueLineCount(value) - 1) * EXTRA_LINE_H;
}

function cardHeightFor(rows) {
  return rows.reduce((sum, [, value]) => sum + rowHeightFor(value), 0) + LAYOUT.cardPad * 2;
}

// Builds the ordered [label, formattedValue] rows for a tool's detail page:
// curated order first, then anything present in the data but not curated
// (so nothing from a schema change silently disappears).
function detailGroups(toolKey, detail) {
  if (!detail) return [];
  const order = DETAIL_FIELD_ORDER[toolKey] || [];
  const seen = new Set();
  const groups = order.map(({ group, fields }) => {
    const rows = [];
    fields.forEach(([key, label]) => {
      if (detail[key] === undefined) return;
      rows.push([label, fmtValue(key, detail[key])]);
      seen.add(key);
    });
    return { group, rows };
  }).filter((g) => g.rows.length > 0);
  // Array/object-typed fields (e.g. TCO's cumulativeByYear) are chart-source
  // data, not label/value rows -- without this filter they'd render as
  // literal "[object Object]" text, the same class of bug already fixed
  // once in CombinedSummary.jsx's generic snapshot renderer.
  const leftover = Object.keys(detail).filter((key) => !seen.has(key) && (detail[key] === null || typeof detail[key] !== "object"));
  if (leftover.length) {
    groups.push({ group: "Other", rows: leftover.map((key) => [labelize(key), fmtValue(key, detail[key])]) });
  }
  return groups;
}

// ---------- page chrome: header + footer, drawn identically on every
// content page so a multi-page deck doesn't drift slide to slide ----------

let pageCursor = 0; // set once total is known, incremented per addContentPage call
let TOTAL_PAGES = 0;
const CONTENT_TOP = 1.65;
const FOOTER_TOP = 10.15; // buffered below the visual footer (10.35) -- confirmed by an actual page-count mismatch that a razor-thin margin here drifts from real rendered heights
const DISPLAY_FONT = "Cambria"; // safe-list serif for headlines/titles -- paired with Calibri body for real typographic contrast

// Shared with the estimator below -- both must agree, or the precomputed
// page count (used for "X of Y" footers) drifts from what actually renders.
const LAYOUT = { headline: 1.05, bulletLine: 0.24, bulletPad: 0.35, chart: 2.3, badge: 0.65, label: 0.3, rowH: 0.27, cardPad: 0.14, cardGap: 0.22 };

function addContentPage(eyebrow, title) {
  const slide = pres.addSlide();
  slide.background = { color: WHITE };
  pageCursor += 1;

  // Repeated motif: a small solid red circle beside the eyebrow, instead of
  // the flagged accent-stripe/underline pattern -- carried on every page.
  slide.addShape("ellipse", { x: MX, y: 0.62, w: 0.16, h: 0.16, fill: { color: RED }, line: { type: "none" } });
  slide.addText(eyebrow.toUpperCase(), {
    x: MX + 0.26, y: 0.55, w: CONTENT_W - 1.8, h: 0.3,
    fontFace: FONT, fontSize: 10.5, bold: true, color: RED, charSpacing: 2,
  });
  slide.addText(title, {
    x: MX, y: 0.92, w: CONTENT_W, h: 0.6,
    fontFace: DISPLAY_FONT, fontSize: 30, bold: true, color: CHARCOAL,
  });
  logoBox(slide, PAGE_W - MX - 1.3, 0.55, 1.3, 0.36, "CDW");

  slide.addText("CDW AI Factory", {
    x: MX, y: 10.68, w: 3, h: 0.22,
    fontFace: FONT, fontSize: 8.5, color: MIDGRAY,
  });
  slide.addText(`${pageCursor} of ${TOTAL_PAGES}`, {
    x: PAGE_W - MX - 1, y: 10.68, w: 1, h: 0.22,
    fontFace: FONT, fontSize: 8.5, color: MIDGRAY, align: "right",
  });

  return { slide, contentTop: CONTENT_TOP };
}

// Walks the exact same layout math the real renderer uses below (sharing
// the LAYOUT constants) to predict how many pages a tool's detail content
// will actually take, so TOTAL_PAGES -- and every "X of Y" footer printed
// before this tool renders -- is correct from the first slide, instead of
// assuming one page per tool and letting overflow silently break the count.
function estimateToolPageCount(t, key) {
  let y = CONTENT_TOP + 0.1;
  let pages = 1;
  if (t.headlineStat) y += LAYOUT.headline;

  const highlight = HIGHLIGHT_SPEC[key] ? HIGHLIGHT_SPEC[key](t) : null;
  if (highlight) {
    y += LAYOUT.chart + 0.15;
    if (t.bullets && t.bullets.length) y += 0.45;
    if (key === "tco" && cumulativeChartDataFor(t.detail)) y += LAYOUT.chart + 0.15;
  } else {
    let leftBottom = y, rightBottom = y;
    if (t.bullets && t.bullets.length) leftBottom = y + LAYOUT.bulletLine * t.bullets.length + LAYOUT.bulletPad;
    const chart = chartDataFor(key, t.detail);
    if (chart) rightBottom = y + LAYOUT.chart;
    else if (key === "modelAdvisor" && t.detail && t.detail.topModelConfidence) rightBottom = y + LAYOUT.badge;
    y = Math.max(leftBottom, rightBottom) + 0.15;
  }

  const groups = detailGroups(key, t.detail);
  for (let i = 0; i < groups.length; i += 2) {
    const pair = [groups[i], groups[i + 1]].filter(Boolean);
    const pairMaxCardH = Math.max(...pair.map((g) => cardHeightFor(g.rows)));
    const neededH = LAYOUT.label + pairMaxCardH;
    if (y + neededH > FOOTER_TOP) {
      pages += 1;
      y = CONTENT_TOP + 0.15;
    }
    y += neededH + LAYOUT.cardGap;
  }
  return pages;
}



// ---------- compute page plan up front, so header/footer page numbers are
// correct on every page without a second pass ----------

const includedTools = TOOL_ORDER.filter((k) => data.tools[k] && data.tools[k].included);
const readinessIncluded = !!(data.tools.readiness && data.tools.readiness.included);
const toolPageCounts = includedTools.map((k) => estimateToolPageCount(data.tools[k], k));
TOTAL_PAGES = 1 /* cover */ + 1 /* exec summary */ + toolPageCounts.reduce((a, b) => a + b, 0) + (readinessIncluded ? 1 : 0) + 1 /* closing */;

// ---------- Page 1: Cover ----------

const cover = pres.addSlide();
cover.background = { color: WHITE };
pageCursor = 1;

logoBox(cover, MX, 0.6, 2.0, 0.55, "CDW LOGO");
if (data.clientLogoPath) {
  cover.addImage({ path: data.clientLogoPath, x: PAGE_W - MX - 2.0, y: 0.6, w: 2.0, h: 0.55, sizing: { type: "contain", w: 2.0, h: 0.55 } });
} else {
  logoBox(cover, PAGE_W - MX - 2.0, 0.6, 2.0, 0.55, "CLIENT LOGO");
}

cover.addText("AI FACTORY FULL ASSESSMENT", {
  x: MX, y: 3.6, w: CONTENT_W, h: 0.3,
  fontFace: FONT, fontSize: 11, bold: true, color: RED, charSpacing: 2,
});
cover.addText("Comprehensive AI Infrastructure\nAssessment & Recommendation", {
  x: MX, y: 3.95, w: CONTENT_W, h: 1.5,
  fontFace: FONT, fontSize: 30, bold: true, color: RED, lineSpacingMultiple: 1.05,
});
cover.addText(`Prepared for ${data.clientName}`, {
  x: MX, y: 5.6, w: CONTENT_W, h: 0.35,
  fontFace: FONT, fontSize: 15, bold: true, color: BODY,
});
cover.addText(data.date, {
  x: MX, y: 5.95, w: CONTENT_W, h: 0.3,
  fontFace: FONT, fontSize: 12, color: MIDGRAY,
});

cover.addShape("rect", { x: MX, y: 6.5, w: 0.6, h: 0.04, fill: { color: RED }, line: { type: "none" } });
cover.addText(
  "This document provides a comprehensive, detailed breakdown of the AI infrastructure assessment " +
  "conducted using CDW's AI Factory tools -- covering technical sizing, cost economics, model " +
  "selection, and organizational readiness. Figures throughout reflect the assumptions provided " +
  "during your working session and are directional planning estimates, not a final quote.",
  {
    x: MX, y: 6.75, w: CONTENT_W, h: 1.3,
    fontFace: FONT, fontSize: 11.5, color: BODY, valign: "top", lineSpacingMultiple: 1.2,
  }
);

const coverIncludedNames = includedTools.map((k) => (data.tools[k].label || TOOL_LABEL_FALLBACK[k]));
if (readinessIncluded) coverIncludedNames.push("AI Readiness Checklists");
cover.addText(`Covering: ${coverIncludedNames.join("  \u2022  ")}`, {
  x: MX, y: 9.9, w: CONTENT_W, h: 0.5,
  fontFace: FONT, fontSize: 10, italic: true, color: MIDGRAY,
});
cover.addText(`${data.accountExec}  \u2022  CDW.com  \u2022  (800) 800-4239`, {
  x: MX, y: 10.4, w: CONTENT_W, h: 0.3,
  fontFace: FONT, fontSize: 9.5, color: MIDGRAY,
});

// Synthesizes the same kind of opening narrative sentence the real 2-pager
// example uses, entirely from data already in the schema (headline stat,
// detail.payback, readiness gap list) -- no invented facts, just a natural
// stitch of numbers/categories already present.
function buildNarrative(data) {
  const parts = [];
  const roi = data.tools.roi;
  if (roi && roi.included && roi.headlineStat) {
    const payback = roi.detail && typeof roi.detail.payback === "number" ? ` with a ${roi.detail.payback.toFixed(1)}-month payback` : "";
    const roiYears = roi.detail && typeof roi.detail.horizonYears === "number" ? roi.detail.horizonYears : 3;
    parts.push(`Your on-prem infrastructure investment shows strong economics: ${roi.headlineStat} ${roiYears}-year ROI${payback}.`);
  }
  const readiness = data.tools.readiness;
  if (readiness && readiness.included) {
    const gaps = readiness.statuses.filter((s) => isFlaggedStatus(s.status));
    if (gaps.length > 0) {
      parts.push(`Readiness assessment surfaced gaps in ${gaps.length} of ${readiness.statuses.length} areas (${gaps.map((g) => g.category).join(", ")}) that should be addressed before implementation.`);
    } else {
      parts.push(`Readiness assessment shows all ${readiness.statuses.length} areas in good standing.`);
    }
  }
  return parts.join(" ");
}

// ---------- Page 2: Executive Summary (reuses the 2-pager's stat grid) ----------

{
  const { slide } = addContentPage("EXECUTIVE SUMMARY", "Key Results at a Glance");

  const statCards = [];
  includedTools.forEach((key) => {
    const t = data.tools[key];
    statCards.push({ stat: t.headlineStat, label: t.headlineLabel });
  });
  const rc = readinessReadyCount(data.tools.readiness);
  if (rc) statCards.push({ stat: `${rc.ready}/${rc.total}`, label: "Readiness Areas Ready" });

  const gridTop = 1.95;
  const gap = 0.3;
  const hasCards = statCards.length > 0;
  const cols = !hasCards ? 0 : statCards.length <= 3 ? statCards.length : Math.ceil(statCards.length / 2);
  const rows = hasCards ? Math.ceil(statCards.length / cols) : 0;
  const cardW = hasCards ? (CONTENT_W - gap * (cols - 1)) / cols : 0;
  const cardH = 1.5;

  statCards.forEach((card, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = MX + col * (cardW + gap);
    const y = gridTop + row * (cardH + gap);
    const statFontSize = card.stat.length > 9 ? 19 : 27;

    slide.addShape("roundRect", { x, y, w: cardW, h: cardH, rectRadius: 0.08, fill: { color: CHARCOAL }, line: { type: "none" } });
    slide.addText(card.stat, { x: x + 0.15, y: y + 0.15, w: cardW - 0.3, h: cardH - 0.65, fontFace: DISPLAY_FONT, fontSize: statFontSize, bold: true, color: WHITE, valign: "bottom" });
    slide.addText(card.label, { x: x + 0.15, y: y + cardH - 0.45, w: cardW - 0.3, h: 0.4, fontFace: FONT, fontSize: 10.5, color: "DDDDDD", valign: "top" });
  });

  let y = (hasCards ? gridTop + rows * cardH + (rows - 1) * gap : gridTop) + 0.45;

  const narrative = buildNarrative(data);
  if (narrative) {
    slide.addText(narrative, {
      x: MX, y, w: CONTENT_W, h: 0.75,
      fontFace: FONT, fontSize: 11, color: BODY, valign: "top", lineSpacingMultiple: 1.2,
    });
    y += 0.85;
  }

  const previewGaps = readinessIncluded ? data.tools.readiness.statuses.filter((s) => isFlaggedStatus(s.status)) : [];
  if (previewGaps.length > 0) {
    sectionLabel(slide, "Recommended Next Steps in Key Focus Areas", MX, y, CONTENT_W);
    y += 0.28;
    const stepItems = [];
    previewGaps.forEach((s, idx) => {
      const isLast = idx === previewGaps.length - 1;
      const svc = serviceFor(s.category);
      stepItems.push({ text: s.category + ":  ", options: { fontFace: FONT, fontSize: 10.5, bold: true, color: BODY, paraSpaceAfter: 2, breakLine: false } });
      stepItems.push({ text: svc ? svc.primary : "Discuss the right engagement with your CDW account team.", options: { fontFace: FONT, fontSize: 10.5, color: svc ? BODY : MIDGRAY, italic: !svc, paraSpaceAfter: 2, breakLine: !isLast } });
    });
    slide.addText(stepItems, { x: MX + 0.05, y, w: CONTENT_W - 0.1, h: 0.22 * previewGaps.length + 0.1, valign: "top" });
    y += 0.22 * previewGaps.length + 0.35;
  }

  sectionLabel(slide, "What's in this document", MX, y, CONTENT_W);
  y += 0.28;
  const tocItems = includedTools.map((k, i) => ({
    text: `${data.tools[k].label || TOOL_LABEL_FALLBACK[k]} \u2014 full sizing, cost, and recommendation detail`,
    options: { bullet: { code: "2022", indent: 14 }, fontFace: FONT, fontSize: 11, color: BODY, paraSpaceAfter: 3, breakLine: true },
  }));
  if (readinessIncluded) {
    tocItems.push({
      text: "AI Readiness Checklists \u2014 category-by-category status and recommended next steps",
      options: { bullet: { code: "2022", indent: 14 }, fontFace: FONT, fontSize: 11, color: BODY, paraSpaceAfter: 3, breakLine: false },
    });
  } else if (tocItems.length) {
    tocItems[tocItems.length - 1].options.breakLine = false;
  }
  slide.addText(tocItems, { x: MX + 0.05, y, w: CONTENT_W - 0.1, h: 2, valign: "top" });
}

// ---------- One detail page per included tool ----------

includedTools.forEach((key) => {
  const t = data.tools[key];
  const { slide, contentTop } = addContentPage(TOOL_LABEL_FALLBACK[key] || t.label, t.label || TOOL_LABEL_FALLBACK[key]);
  let y = contentTop + 0.1;

  // Large stat callout -- the number is the story on every real report
  // (ROI, TCO), so it gets real visual weight (54pt) instead of competing
  // with everything else at a similar size.
  if (t.headlineStat) {
    slide.addText((t.headlineLabel || "").toUpperCase(), {
      x: MX, y, w: CONTENT_W, h: 0.24,
      fontFace: FONT, fontSize: 10.5, bold: true, color: RED, charSpacing: 1.5,
    });
    slide.addText(t.headlineStat, {
      x: MX, y: y + 0.24, w: CONTENT_W, h: 0.8,
      fontFace: DISPLAY_FONT, fontSize: 54, bold: true, color: CHARCOAL,
    });
    y += 1.15;
  }

  // Two columns, not stacked -- real layout variation instead of the
  // identical single vertical column every page has used so far. Tools
  // with a genuine single "big number" result (TCO, ROI) pair the chart
  // with a bold highlight card, mirroring the reference deck's actual
  // layout; bullets compress into a strip below instead of competing for
  // the same column. Tools without one (GPU Sizing, Model Advisor) keep
  // bullets-left / chart-right.
  const colGap = 0.3;
  const highlight = HIGHLIGHT_SPEC[key] ? HIGHLIGHT_SPEC[key](t) : null;
  let leftBottom = y, rightBottom = y;

  if (highlight) {
    const chartW = CONTENT_W * 0.6 - colGap / 2;
    const cardW = CONTENT_W * 0.4 - colGap / 2;
    const cardX = MX + chartW + colGap;
    const chart = chartDataFor(key, t.detail);
    if (chart) {
      addBarChart(slide, MX, y, chartW, LAYOUT.chart - 0.1, chart.title, chart.categories, chart.values, chart.formatCode);
      leftBottom = y + LAYOUT.chart;
    }
    highlightCard(slide, cardX, y, cardW, LAYOUT.chart - 0.1, highlight.label, highlight.stat, highlight.context);
    rightBottom = y + LAYOUT.chart;
    y = Math.max(leftBottom, rightBottom) + 0.15;

    if (t.bullets && t.bullets.length) {
      slide.addText(t.bullets.join("   \u2022   "), {
        x: MX, y, w: CONTENT_W, h: 0.4,
        fontFace: FONT, fontSize: 9.5, color: MIDGRAY, valign: "top", italic: true,
      });
      y += 0.45;
    }

    // TCO-only: the cumulative crossover trajectory, full width, when the
    // source PDF actually had it. Genuinely new information (when the two
    // series cross, not just where they end up), not a duplicate of the
    // bar chart above.
    if (key === "tco") {
      const cum = cumulativeChartDataFor(t.detail);
      if (cum) {
        addLineChart(slide, MX, y, CONTENT_W, LAYOUT.chart, cum.categories, cum.cloudValues, cum.onPremValues);
        y += LAYOUT.chart + 0.15;
      }
    }
  } else {
    const leftW = CONTENT_W * 0.4;
    const rightW = CONTENT_W - leftW - colGap;
    const rightX = MX + leftW + colGap;

    if (t.bullets && t.bullets.length) {
      const bulletItems = [];
      t.bullets.forEach((b, idx) => {
        const parts = b.split(":");
        const boldLabel = parts.length > 1 ? parts[0] + ":" : null;
        const rest = parts.length > 1 ? parts.slice(1).join(":") : b;
        const isLast = idx === t.bullets.length - 1;
        if (boldLabel) {
          bulletItems.push({ text: boldLabel + " ", options: { bullet: { code: "2022", indent: 12 }, fontFace: FONT, fontSize: 10.5, bold: true, color: BODY, paraSpaceAfter: 4, breakLine: false } });
          bulletItems.push({ text: rest.trim(), options: { fontFace: FONT, fontSize: 10.5, color: BODY, paraSpaceAfter: 4, breakLine: !isLast } });
        } else {
          bulletItems.push({ text: b, options: { bullet: { code: "2022", indent: 12 }, fontFace: FONT, fontSize: 10.5, color: BODY, paraSpaceAfter: 4, breakLine: !isLast } });
        }
      });
      slide.addText(bulletItems, { x: MX, y, w: leftW, h: 2.1, valign: "top" });
      leftBottom = y + LAYOUT.bulletLine * t.bullets.length + LAYOUT.bulletPad;
    }

    const chart = chartDataFor(key, t.detail);
    if (chart) {
      addBarChart(slide, rightX, y, rightW, LAYOUT.chart - 0.1, chart.title, chart.categories, chart.values, chart.formatCode);
      rightBottom = y + LAYOUT.chart;
    } else if (key === "modelAdvisor" && t.detail) {
      const conf = t.detail.topModelConfidence;
      const confColor = /high/i.test(conf) ? GREEN : /medium/i.test(conf) ? AMBER : MIDGRAY;
      if (conf) {
        slide.addShape("roundRect", { x: rightX, y, w: 1.9, h: 0.38, rectRadius: 0.19, fill: { color: WHITE }, line: { color: confColor, width: 1.5 } });
        slide.addText(`${conf.toUpperCase()} CONFIDENCE`, { x: rightX, y, w: 1.9, h: 0.38, align: "center", valign: "middle", fontFace: FONT, fontSize: 10, bold: true, color: confColor });
        // License as a caption under the badge -- only shown paired with a
        // badge it can anchor to. Without one it's orphaned text with no
        // visual role, and it's already a proper labeled row in the Model
        // detail card below regardless, so it's not lost information.
        if (t.detail.topModelLicense) {
          slide.addText(t.detail.topModelLicense, { x: rightX, y: y + 0.5, w: rightW, h: 0.4, valign: "top", fontFace: FONT, fontSize: 11, italic: true, color: MIDGRAY });
        }
        rightBottom = y + LAYOUT.badge;
      }
    }
    y = Math.max(leftBottom, rightBottom) + 0.15;
  }

  // Detail cards, two per row instead of one long single column -- the
  // actual structural fix for pages reading as a single repeated stack.
  // Genuinely spills to a new page (with a "(continued)" title) when a row
  // wouldn't fit, rather than shrinking rows toward unreadability.
  let currentSlide = slide;
  const groups = detailGroups(key, t.detail);
  const cardGapX = 0.25;
  const cardW = (CONTENT_W - cardGapX) / 2;
  for (let i = 0; i < groups.length; i += 2) {
    const pair = [groups[i], groups[i + 1]].filter(Boolean);
    const pairMaxCardH = Math.max(...pair.map((g) => cardHeightFor(g.rows)));
    const neededH = LAYOUT.label + pairMaxCardH;
    if (y + neededH > FOOTER_TOP) {
      const next = addContentPage(TOOL_LABEL_FALLBACK[key] || t.label, `${t.label || TOOL_LABEL_FALLBACK[key]} (continued)`);
      currentSlide = next.slide;
      y = next.contentTop + 0.15;
    }
    pair.forEach((g, colIdx) => {
      const cardX = MX + colIdx * (cardW + cardGapX);
      sectionLabel(currentSlide, g.group, cardX, y, cardW);
      const cardH = cardHeightFor(g.rows);
      currentSlide.addShape("roundRect", {
        x: cardX, y: y + LAYOUT.label, w: cardW, h: cardH, rectRadius: 0.06,
        fill: { color: WHITE }, line: { color: "DDDDDD", width: 1 },
      });
      let rowOffset = 0;
      g.rows.forEach(([label, value], ri) => {
        const rh = rowHeightFor(value);
        const rowY = y + LAYOUT.label + LAYOUT.cardPad + rowOffset;
        currentSlide.addText(label, { x: cardX + 0.14, y: rowY, w: cardW * 0.58, h: rh - 0.02, fontFace: FONT, fontSize: 9.5, color: BODY, valign: "middle" });
        currentSlide.addText(value, { x: cardX + cardW * 0.55, y: rowY, w: cardW * 0.45 - 0.2, h: rh - 0.02, fontFace: FONT, fontSize: 9.5, bold: true, color: BODY, valign: "middle", align: "right" });
        if (ri > 0) {
          currentSlide.addShape("line", { x: cardX + 0.1, y: rowY, w: cardW - 0.2, h: 0, line: { color: "EEEEEE", width: 0.75 } });
        }
        rowOffset += rh;
      });
    });
    y += neededH + LAYOUT.cardGap;
  }
  if (!groups.length) {
    slide.addText("Detailed figures were not provided for this tool in the source data.", {
      x: MX, y, w: CONTENT_W, h: 0.4,
      fontFace: FONT, fontSize: 11, italic: true, color: MIDGRAY,
    });
  }
});

// ---------- Readiness detail page (reuses the 2-pager's logic verbatim) ----------

if (readinessIncluded) {
  const { slide, contentTop } = addContentPage("READINESS", "AI Readiness Snapshot");
  let y = contentTop + 0.15;

  const rc2 = readinessReadyCount(data.tools.readiness);
  if (rc2) {
    slide.addText("READINESS AREAS READY", {
      x: MX, y, w: CONTENT_W, h: 0.24,
      fontFace: FONT, fontSize: 10.5, bold: true, color: RED, charSpacing: 1.5,
    });
    slide.addText(`${rc2.ready}/${rc2.total}`, {
      x: MX, y: y + 0.24, w: CONTENT_W, h: 0.8,
      fontFace: DISPLAY_FONT, fontSize: 54, bold: true, color: CHARCOAL,
    });
    y += 1.15;
  }

  sectionLabel(slide, "At a Glance", MX, y, CONTENT_W);
  y += 0.3;

  const rowH = 0.32;
  const cardPad = 0.14;
  const statusRows = data.tools.readiness.statuses;
  const cardH = statusRows.length * rowH + cardPad * 2;
  slide.addShape("roundRect", {
    x: MX, y, w: CONTENT_W, h: cardH, rectRadius: 0.06,
    fill: { color: WHITE }, line: { color: "DDDDDD", width: 1 },
  });
  statusRows.forEach((s, i) => {
    const rowY = y + cardPad + i * rowH;
    slide.addText(s.category, { x: MX + 0.18, y: rowY, w: CONTENT_W * 0.6, h: rowH - 0.02, fontFace: FONT, fontSize: 10.5, color: BODY, valign: "middle" });
    slide.addText(s.status, { x: MX + CONTENT_W * 0.6, y: rowY, w: CONTENT_W * 0.4 - 0.3, h: rowH - 0.02, fontFace: FONT, fontSize: 10.5, bold: true, color: statusColor(s.status), valign: "middle", align: "right" });
    if (i > 0) {
      slide.addShape("line", { x: MX + 0.14, y: rowY, w: CONTENT_W - 0.28, h: 0, line: { color: "EEEEEE", width: 0.75 } });
    }
  });
  y += cardH + 0.35;

  const flaggedDoors = statusRows.filter((s) => isFlaggedStatus(s.status));
  if (flaggedDoors.length > 0) {
    sectionLabel(slide, "Recommended Next Steps", MX, y, CONTENT_W);
    y += 0.3;

    const stepItems = [];
    flaggedDoors.forEach((s, idx) => {
      const isLast = idx === flaggedDoors.length - 1;
      const svc = serviceFor(s.category);
      stepItems.push({ text: s.category + ": ", options: { bullet: { code: "2022", indent: 14 }, fontFace: FONT, fontSize: 11, bold: true, color: BODY, paraSpaceAfter: 2, breakLine: false } });
      if (svc) {
        const text = svc.secondary ? `${svc.primary} (or ${svc.secondary})` : svc.primary;
        stepItems.push({ text, options: { fontFace: FONT, fontSize: 11, color: BODY, paraSpaceAfter: 2, breakLine: !isLast } });
      } else {
        stepItems.push({ text: "Discuss the right engagement with your CDW account team.", options: { fontFace: FONT, fontSize: 11, italic: true, color: MIDGRAY, paraSpaceAfter: 2, breakLine: !isLast } });
      }
    });
    slide.addText(stepItems, { x: MX + 0.05, y, w: CONTENT_W - 0.1, h: 0.24 * flaggedDoors.length + 0.1, valign: "top" });
  }
}

// ---------- Closing / CTA page ----------

{
  const { slide, contentTop } = addContentPage("NEXT STEPS", "Ready to Move Forward?");
  let y = contentTop + 0.3;

  slide.addText(
    "Ready to move from assessment to implementation? Based on the analysis in this document, " +
    "your CDW AI Factory team is prepared to help you take the next step -- whether that's " +
    "refining the technical approach, building a formal proposal, or scheduling a working session " +
    "with your infrastructure and security stakeholders.",
    { x: MX, y, w: CONTENT_W, h: 1.4, fontFace: FONT, fontSize: 13, bold: true, color: RED, valign: "top", lineSpacingMultiple: 1.2 }
  );
  y += 1.7;

  slide.addText(
    "All figures in this document are directional planning estimates derived from the assumptions " +
    "provided during your working session with CDW's AI Factory tools. They are intended to support " +
    "scenario planning and internal decision-making, not to serve as a final quote or binding proposal. " +
    "Confirm pricing, technical specifications, and implementation timelines with your CDW account team " +
    "before finalizing any purchase or budget decision.",
    { x: MX, y, w: CONTENT_W, h: 1.5, fontFace: FONT, fontSize: 10.5, color: MIDGRAY, valign: "top", lineSpacingMultiple: 1.25 }
  );

  slide.addShape("ellipse", { x: MX, y: 9.72, w: 0.1, h: 0.1, fill: { color: RED }, line: { type: "none" } });
  slide.addText(`${data.accountExec}  \u2022  CDW.com  \u2022  (800) 800-4239`, {
    x: MX + 0.24, y: 9.62, w: 5.5, h: 0.3, fontFace: FONT, fontSize: 10, color: BODY,
  });
  slide.addText("MKT-AIFACTORY-FULLSUMMARY", {
    x: MX + 0.24, y: 9.9, w: 5.5, h: 0.25, fontFace: FONT, fontSize: 8, color: MIDGRAY,
  });
  logoBox(slide, PAGE_W - MX - 1.6, 9.6, 1.6, 0.45, "CDW LOGO");
}

pres.writeFile({ fileName: outPath }).then(() => {
  console.log("Wrote " + outPath);
});
