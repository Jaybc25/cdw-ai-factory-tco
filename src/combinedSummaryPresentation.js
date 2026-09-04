import { MODEL_REGISTRY } from "./modelRegistry.js";

export const TOOL_LABELS = {
  tco: "Cloud vs On-Prem TCO Calculator",
  "gpu-sizing": "GPU Sizing Tool",
  "model-advisor": "Open-Weight Model Advisor",
  roi: "AI Use Case ROI Calculator",
  readiness: "AI Readiness Checklists",
};

export const TOOL_ORDER = ["tco", "gpu-sizing", "model-advisor", "roi", "readiness"];

const money = (value) => `$${Math.round(Number(value)).toLocaleString()}`;
const count = (value) => Number(value).toLocaleString();
const months = (value) => `${Number(value).toFixed(1)} months`;
const percentRatio = (value) => `${(Number(value) * 100).toFixed(1)}%`;
const years = (value) => `${Number(value)} year${Number(value) === 1 ? "" : "s"}`;
const paramsB = (value) => `${Number(value).toLocaleString()}B`;

const MODEL_BY_ID = new Map(MODEL_REGISTRY.map((model) => [model.id, model]));
const MODEL_ID_BY_LABEL = new Map(MODEL_REGISTRY.map((model) => [model.label.toLowerCase(), model.id]));

function friendlyModel(value) {
  if (value == null || value === "") return "—";
  const raw = String(value);
  return MODEL_BY_ID.get(raw)?.label || raw;
}

function baseField(key, label, format = null, options = {}) {
  return { key, label, format, ...options };
}

export const PRESENTATION_SCHEMA = {
  tco: [
    baseField("savings", "Savings", money),
    baseField("floorCaseSavings", "Floor-Case Savings", money),
    baseField("planningBasis", "Planning Basis"),
    baseField("provider", "Cloud Provider"),
    baseField("gpuClass", "Cloud GPU Class"),
    baseField("cloudCost", "Cloud Cost", money),
    baseField("cloudYear1", "Cloud Year 1", money),
    baseField("monthlyBill", "Monthly Cloud Spend", money),
    baseField("facility", "On-Prem Facility"),
    baseField("gpuSizingFleet", "GPU Sizing Base Fleet"),
    baseField("recommendedFleet", "Evaluated On-Prem Fleet", null, {
      include: (summary) => summary.recommendedFleet && summary.recommendedFleet !== summary.gpuSizingFleet,
    }),
    baseField("onPremCost", "On-Prem Cost", money),
    baseField("capexPlusOneTime", "Capex + One-Time Costs", money),
    baseField("monthlyOpex", "Monthly On-Prem Opex", money),
    baseField("onPremYear1Capital", "Year 1 On-Prem Capital", money),
    baseField("onPremYear1Operating", "Year 1 On-Prem Operating", money),
    baseField("residualCredit", "Residual Value Credit", money),
    baseField("horizonYears", "Analysis Horizon", years),
    baseField("paybackMonths", "Payback", months),
    baseField("confidence", "Confidence"),
  ],
  "gpu-sizing": [
    baseField("mode", "Mode"),
    baseField("model", "Model", friendlyModel),
    baseField("gpuClass", "Recommended GPU Class"),
    baseField("recommended", "Recommended GPU Count", count),
    baseField("minTechnical", "Minimum Technical GPU Count", count),
    baseField("budget", "Estimated Hardware Budget", money),
    baseField("utilizationPct", "Estimated Utilization", percentRatio),
    baseField("lowerCostClass", "Lower-Cost Alternative"),
    baseField("lowerCostCount", "Lower-Cost GPU Count", count),
    baseField("higherGrowthClass", "Higher-Growth Alternative"),
    baseField("higherGrowthCount", "Higher-Growth GPU Count", count),
    baseField("confidence", "Confidence"),
  ],
  "model-advisor": [
    baseField("topModel", "Top Model", friendlyModel),
    baseField("topModelParams", "Model Parameters", paramsB),
    baseField("topModelConfidence", "Recommendation Confidence"),
    baseField("primaryWorkload", "Primary Workload"),
    baseField("qualityPriority", "Quality Priority"),
    baseField("optimizationPriority", "Optimization Priority"),
    baseField("topModelLicense", "License"),
    baseField("totalCount", "Models Evaluated", count),
    baseField("eligibleCount", "Eligible Models", count),
    baseField("otherEligibleCount", "Other Eligible Models", count),
    baseField("verificationCandidateCount", "Verification Candidates", count),
  ],
  roi: [
    baseField("payback", "Payback", months),
    baseField("year1Value", "Year 1 Value", money),
    baseField("year1Net", "Year 1 Net Benefit", money),
    baseField("horizonNet", "Horizon Net Benefit", money),
    baseField("horizonROI", "Horizon ROI", percentRatio),
    baseField("horizonYears", "Analysis Horizon", years),
    baseField("costSource", "Cost Source"),
    baseField("fteEquivalent", "FTE Equivalent Capacity", count),
    baseField("grossCapacity", "Gross Capacity Hours", count),
    baseField("redeployableCapacity", "Redeployable Capacity Hours", count),
    baseField("steadyStateValue", "Steady-State Annual Value", money),
  ],
  readiness: [
    baseField("doorsComplete", "Assessment Areas Completed", (value, summary) => `${count(value)} of ${count(summary.doorsTotal ?? value)}`),
    baseField("infrastructure", "Infrastructure"),
    baseField("data", "Data"),
    baseField("businessUseCase", "Business & Use Case"),
    baseField("peopleOperations", "People & Operations"),
    baseField("securityGovernance", "Security & Governance"),
    baseField("topSuggestedStep", "Top Suggested Step"),
    baseField("suggestedStepCount", "Suggested Step Count", count),
  ],
};

function formatField(field, value, summary) {
  if (value == null || value === "") return "—";
  if (!field.format) return String(value);
  return field.format(value, summary);
}

export function presentSummary(tool, summary) {
  if (!summary || typeof summary !== "object") return [];
  const schema = PRESENTATION_SCHEMA[tool] || [];
  return schema
    .filter((field) => !field.include || field.include(summary))
    .filter((field) => Object.prototype.hasOwnProperty.call(summary, field.key))
    .map((field) => ({
      key: field.key,
      label: field.label,
      value: formatField(field, summary[field.key], summary),
    }));
}

const SYSTEM_GPUS_BY_CLASS = {
  H200: 8,
  B200: 8,
  B300: 8,
  GB200: 72,
};

function parseFleet(value) {
  if (!value) return null;
  const text = String(value);
  const countMatch = text.match(/^(\d+)\s*x\s*/i);
  const classMatch = text.match(/\b(H200|B200|B300|GB200)\b/i);
  if (!classMatch) return null;
  const systemCount = countMatch ? Number(countMatch[1]) : null;
  const gpuClass = classMatch[1].toUpperCase();
  const isDgxSystem = /\bDGX\b/i.test(text);
  const gpusPerSystem = isDgxSystem ? SYSTEM_GPUS_BY_CLASS[gpuClass] ?? null : 1;
  return {
    systemCount,
    gpuClass,
    gpusPerSystem,
    gpuCount: systemCount != null && gpusPerSystem != null ? systemCount * gpusPerSystem : null,
    isDgxSystem,
  };
}

function normalizeGpuClass(value) {
  if (!value) return null;
  const upper = String(value).toUpperCase();
  if (upper.includes("GB200")) return "GB200";
  if (upper.includes("B300")) return "B300";
  if (upper.includes("B200")) return "B200";
  if (upper.includes("H200")) return "H200";
  return upper;
}

function normalizeModelId(value) {
  if (!value) return null;
  const raw = String(value);
  if (MODEL_BY_ID.has(raw)) return raw;
  return MODEL_ID_BY_LABEL.get(raw.toLowerCase()) || null;
}

function toolMap(snapshots) {
  return new Map((snapshots || []).map((snapshot) => [snapshot.tool, snapshot]));
}

export function buildScenarioConsistencyIssues(snapshots) {
  const byTool = toolMap(snapshots);
  const issues = [];

  const gpu = byTool.get("gpu-sizing");
  const tco = byTool.get("tco");
  if (gpu?.summary && tco?.summary) {
    const tcoFleet = parseFleet(tco.summary.gpuSizingFleet || tco.summary.recommendedFleet);
    const gpuClass = normalizeGpuClass(gpu.summary.gpuClass);
    const gpuCount = Number.isFinite(Number(gpu.summary.recommended)) ? Number(gpu.summary.recommended) : null;
    const classMismatch = tcoFleet?.gpuClass && gpuClass && tcoFleet.gpuClass !== gpuClass;
    const countMismatch = tcoFleet?.gpuCount != null && gpuCount != null && tcoFleet.gpuCount !== gpuCount;
    if (classMismatch || countMismatch) {
      const tcoText = tcoFleet
        ? tcoFleet.isDgxSystem
          ? `${tcoFleet.systemCount ?? "?"} × DGX ${tcoFleet.gpuClass} (${tcoFleet.gpuCount ?? "?"} GPUs)`
          : `${tcoFleet.gpuCount ?? "?"} × ${tcoFleet.gpuClass} GPUs`
        : "a different fleet";
      const gpuText = `${gpuCount ?? "?"} × ${gpuClass || "unknown class"} GPUs`;
      issues.push(`TCO is based on ${tcoText}, while the latest GPU Sizing result recommends ${gpuText}.`);
    } else if (new Date(tco.updated_at).getTime() < new Date(gpu.updated_at).getTime()) {
      issues.push("The TCO result predates the latest GPU Sizing result and may not include the newest sizing changes.");
    }
  }

  const advisor = byTool.get("model-advisor");
  if (advisor?.summary && gpu?.summary) {
    const advisorModel = normalizeModelId(advisor.summary.topModel);
    const gpuModel = normalizeModelId(gpu.summary.model);
    if (advisorModel && gpuModel && advisorModel !== gpuModel) {
      issues.push(`Model Advisor's latest top model is ${friendlyModel(advisorModel)}, while the latest GPU Sizing result uses ${friendlyModel(gpuModel)}.`);
    } else if (new Date(gpu.updated_at).getTime() < new Date(advisor.updated_at).getTime()) {
      issues.push("The GPU Sizing result predates the latest Model Advisor result and may not reflect the newest model recommendation.");
    }
  }

  const roi = byTool.get("roi");
  if (roi?.summary && tco?.summary && String(roi.summary.costSource || "").toLowerCase().includes("tco")) {
    if (new Date(roi.updated_at).getTime() < new Date(tco.updated_at).getTime()) {
      issues.push("ROI is sourced from TCO but predates the latest TCO result, so its investment inputs may be stale.");
    }
  }

  return issues;
}
