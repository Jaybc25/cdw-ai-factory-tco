import assert from "node:assert/strict";
import { presentSummary, buildScenarioConsistencyIssues } from "../src/combinedSummaryPresentation.js";

const specimen = [
  {
    tool: "tco",
    updated_at: "2026-09-04T11:39:47-05:00",
    summary: {
      savings: 430934,
      facility: "Self-hosted (AI-ready)",
      gpuClass: "B300",
      provider: "AWS",
      cloudCost: 7132485,
      cloudYear1: 1984984,
      confidence: "REFINED",
      onPremCost: 6701551,
      monthlyBill: 105000,
      monthlyOpex: 28018,
      horizonYears: 3,
      paybackMonths: 31.5,
      planningBasis: "Workload Requirement",
      gpuSizingFleet: "3 x DGX B300",
      residualCredit: 610564,
      capexPlusOneTime: 4326486,
      floorCaseSavings: 430934,
      recommendedFleet: "3 x DGX B300",
      onPremYear1Capital: 4326486,
      onPremYear1Operating: 336220,
    },
  },
  {
    tool: "gpu-sizing",
    updated_at: "2026-09-04T12:34:25-05:00",
    summary: {
      mode: "Inference",
      model: "Llama 3.1 70B Instruct",
      budget: 744792,
      gpuClass: "B200",
      confidence: "HIGH",
      recommended: 8,
      minTechnical: 1,
      lowerCostClass: "H200",
      lowerCostCount: 8,
      utilizationPct: 0.03,
      higherGrowthClass: "B300",
      higherGrowthCount: 8,
    },
  },
  {
    tool: "model-advisor",
    updated_at: "2026-09-04T12:38:45-05:00",
    summary: {
      topModel: "muse-glimmer-30b",
      totalCount: 11,
      eligibleCount: 11,
      topModelParams: 29.6,
      primaryWorkload: "chat",
      qualityPriority: "strong",
      topModelLicense: "apache-2.0",
      otherEligibleCount: 10,
      topModelConfidence: "HIGH",
      optimizationPriority: "balanced",
      verificationCandidateCount: 0,
    },
  },
  {
    tool: "roi",
    updated_at: "2026-09-04T14:22:39-05:00",
    summary: {
      payback: 4.4,
      year1Net: 7465164,
      costSource: "TCO Calculator (Workload Requirement) — unmodified",
      horizonNet: 31080724,
      horizonROI: 5.808,
      year1Value: 12144000,
      horizonYears: 3,
      fteEquivalent: 120,
      grossCapacity: 368000,
      steadyStateValue: 12144000,
      redeployableCapacity: 220800,
    },
  },
];

const tcoFields = presentSummary("tco", specimen[0].summary);
assert.equal(tcoFields.find((f) => f.key === "gpuClass")?.label, "Cloud GPU Class");
assert.equal(tcoFields.find((f) => f.key === "gpuSizingFleet")?.label, "GPU Sizing Base Fleet");
assert.equal(tcoFields.some((f) => f.key === "recommendedFleet"), false, "duplicate evaluated fleet should be hidden when it matches the base fleet");
assert.equal(tcoFields.find((f) => f.key === "onPremYear1Capital")?.label, "Year 1 On-Prem Capital");
assert.equal(tcoFields.some((f) => f.label === "On Prem Year1Capital"), false);

const gpuFields = presentSummary("gpu-sizing", specimen[1].summary);
assert.equal(gpuFields.find((f) => f.key === "gpuClass")?.label, "Recommended GPU Class");
assert.equal(gpuFields.find((f) => f.key === "recommended")?.label, "Recommended GPU Count");
assert.equal(gpuFields.find((f) => f.key === "utilizationPct")?.value, "3.0%");

const advisorFields = presentSummary("model-advisor", specimen[2].summary);
assert.equal(advisorFields.find((f) => f.key === "topModel")?.value, "Meta Muse Glimmer 30B");
assert.equal(advisorFields.find((f) => f.key === "topModelParams")?.value, "29.6B");

const roiFields = presentSummary("roi", specimen[3].summary);
assert.equal(roiFields.find((f) => f.key === "year1Net")?.label, "Year 1 Net Benefit");
assert.equal(roiFields.find((f) => f.key === "horizonROI")?.value, "580.8%");

const issues = buildScenarioConsistencyIssues(specimen);
assert.equal(issues.length >= 2, true);
assert.equal(issues.some((issue) => issue.includes("3 × B300") && issue.includes("8 × B200")), true, "mixed TCO/GPU fleet should be called out");
assert.equal(issues.some((issue) => issue.includes("Meta Muse Glimmer 30B") && issue.includes("Llama 3.1 70B Instruct")), true, "mixed Advisor/GPU model should be called out");

const coherent = [
  {
    tool: "model-advisor",
    updated_at: "2026-09-04T12:00:00-05:00",
    summary: { topModel: "llama-3.1-70b" },
  },
  {
    tool: "gpu-sizing",
    updated_at: "2026-09-04T12:05:00-05:00",
    summary: { model: "Llama 3.1 70B Instruct", gpuClass: "B200", recommended: 8 },
  },
  {
    tool: "tco",
    updated_at: "2026-09-04T12:10:00-05:00",
    summary: { gpuSizingFleet: "8 x DGX B200" },
  },
  {
    tool: "roi",
    updated_at: "2026-09-04T12:15:00-05:00",
    summary: { costSource: "TCO Calculator (Workload Requirement) — unmodified" },
  },
];
assert.deepEqual(buildScenarioConsistencyIssues(coherent), []);

console.log("Combined Summary presentation/consistency checks: PASS");
