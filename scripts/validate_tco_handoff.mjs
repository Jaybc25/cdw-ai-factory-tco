import "./validate_tco_cloud_unit_price_trend.mjs";
import fs from "node:fs";
import { BASEPOD_MAX_8_GPU_SYSTEMS, getTcoInfrastructureCoverage } from "../src/tcoInfrastructureCoverage.js";
import { DEFAULT_SCHEDULING_FACTOR, DEFAULT_NVAIE_FACTOR, maxSchedulingFactorForUtilization, schedulingUtilizationIsValid } from "../src/tcoPerformanceFactorPolicy.js";

const source = fs.readFileSync("src/TcoCalculator.jsx", "utf8");

// M6 methodology guard: scheduling/orchestration is utilization recovery,
// not raw GPU speed, and NVAIE/NIM defaults to no incremental credit above
// the already-optimized benchmark/capability basis.
if (DEFAULT_SCHEDULING_FACTOR !== 1.10) {
  throw new Error("M6 scheduling default must remain 1.10x unless the policy is explicitly re-reviewed.");
}
if (DEFAULT_NVAIE_FACTOR !== 1.00) {
  throw new Error("M6 NVAIE/NIM incremental default must remain 1.00x to avoid automatic double counting.");
}
if (maxSchedulingFactorForUtilization(0.85) !== 1.17) {
  throw new Error("M6 scheduling cap must floor the 85% utilization ceiling to 1.17x.");
}
if (!schedulingUtilizationIsValid(0.85, 1.17) || schedulingUtilizationIsValid(0.85, 1.18)) {
  throw new Error("M6 scheduling utilization invariant is not enforced at the 85% planning default.");
}

// M5 methodology guard: do not manufacture a universal storage-per-GPU or
// linear cluster multiplier. Instead, workload-mode TCO must qualify the
// planning allowances when storage is unconfirmed or deployment scale exceeds
// the current small-cluster reference envelope.
if (BASEPOD_MAX_8_GPU_SYSTEMS !== 8) {
  throw new Error("M5 small-cluster envelope must remain aligned to the current 2-8 system NVIDIA BasePOD reference.");
}
const smallUnconfirmed = getTcoInfrastructureCoverage({
  isWorkloadMode: true,
  isRubinPhase1: false,
  system: { gpus: 8 },
  systemName: "DGX B300",
  systemCount: 1,
  rackCount: 1,
  fastPB: 0.25,
  bulkPB: 0.75,
  workloadStorageConfirmed: false,
  clusterAllowance: 600000,
});
if (smallUnconfirmed.clientReady || smallUnconfirmed.storageStatus !== "UNCONFIRMED_PLANNING_INPUT") {
  throw new Error("M5 must not treat default workload storage as a confirmed workload fact.");
}

const smallConfirmed = getTcoInfrastructureCoverage({
  isWorkloadMode: true,
  isRubinPhase1: false,
  system: { gpus: 8 },
  systemName: "DGX B300",
  systemCount: 8,
  rackCount: 4,
  fastPB: 0.5,
  bulkPB: 1.0,
  workloadStorageConfirmed: true,
  clusterAllowance: 600000,
});
if (!smallConfirmed.clientReady || smallConfirmed.requiresArchitectureReview) {
  throw new Error("M5 must allow confirmed storage inside the current small-cluster planning envelope.");
}

const largeFleet = getTcoInfrastructureCoverage({
  isWorkloadMode: true,
  isRubinPhase1: false,
  system: { gpus: 8 },
  systemName: "DGX B200",
  systemCount: 9,
  rackCount: 5,
  fastPB: 0.5,
  bulkPB: 1.0,
  workloadStorageConfirmed: true,
  clusterAllowance: 600000,
});
if (largeFleet.clientReady || largeFleet.clusterScaleStatus !== "ARCHITECTURE_REVIEW_REQUIRED") {
  throw new Error("M5 must require architecture review beyond the current 8-system BasePOD planning envelope.");
}

const rubinFleet = getTcoInfrastructureCoverage({
  isWorkloadMode: true,
  isRubinPhase1: true,
  system: { gpus: 8, rackPlanningBasis: "PHASE1_LOGICAL_SYSTEM_UNIT" },
  systemName: "DGX Rubin NVL8",
  systemCount: 20,
  rackCount: 20,
  fastPB: 1,
  bulkPB: 2,
  workloadStorageConfirmed: true,
  clusterAllowance: 600000,
});
if (rubinFleet.clientReady || rubinFleet.rackCostStatus !== "QUOTE_REQUIRED") {
  throw new Error("M5 must preserve Rubin high-density infrastructure as quote-required rather than inventing rack CAPEX.");
}


function requireText(text, message) {
  if (!source.includes(text)) throw new Error(message);
}

const requiredMappings = [
  ['"B200": "B200-class"', "B200 must normalize to B200-class for TCO cloud pricing"],
  ['"GB200 NVL72": "GB200"', "GB200 NVL72 must normalize to GB200 for TCO cloud pricing"],
];
for (const [text, message] of requiredMappings) requireText(text, message);

requireText(
  "const matchedCloudGpuClass = sourceClass ? normalizeSourceClass(sourceClass) : null;",
  "TCO must derive the matched cloud class from the GPU Sizing source class",
);
requireText(
  "const [cloudGpuClassOverridden, setCloudGpuClassOverridden]",
  "TCO must track whether the cloud GPU class is an explicit user override",
);
requireText(
  "saved?.cloudGpuClassOverridden === true",
  "Fresh handoffs must distinguish explicit cloud-class overrides from stale historical state",
);
requireText(
  "setCloudGpuClassOverridden(next !== matchedCloudGpuClass)",
  "Changing the cloud GPU class must update explicit override provenance",
);
requireText(
  "const cloudRateProfileKey = `${provider}::${gpuClass}`;",
  "Cloud instance-rate overrides must be scoped by provider and GPU class",
);
requireText(
  "const onPremRateProfileKey = ownSys;",
  "System-specific on-prem rate overrides must be scoped by the active on-prem target",
);
requireText(
  "cloudRateOverrides",
  "TCO must persist cloud instance-rate profiles rather than delete user-entered rates on handoff",
);
requireText(
  "onPremRateOverrides",
  "TCO must preserve system-specific on-prem rate edits without applying them to different hardware",
);
requireText(
  "Set by GPU Sizing. Return to GPU Sizing to change the technical design.",
  "GPU-derived on-prem target must be structurally locked in TCO",
);
requireText(
  "TCO resilience assumption",
  "N+1 must be disclosed as a TCO-owned resilience assumption rather than part of the GPU Sizing base recommendation",
);
requireText(
  "Reset current scenario edits",
  "Reset behavior must be scoped to the active rate profiles rather than deleting inactive saved profiles",
);

requireText(
  'getTcoInfrastructureCoverage({',
  "TCO must evaluate infrastructure coverage from the deployed workload fleet",
);
requireText(
  'workloadStorageConfirmed',
  "TCO must persist explicit workload-storage confirmation rather than treating defaults as workload facts",
);
requireText(
  'STORAGE: WORKLOAD INPUT — CONFIRM',
  "Workload-mode storage must visibly require confirmation",
);
requireText(
  'Infrastructure architecture review required.',
  "Large or quote-dependent workload deployments must surface architecture-review status",
);
requireText(
  'MODELED DELTA',
  "Incomplete workload infrastructure coverage must qualify the headline rather than present an unqualified savings verdict",
);

requireText(
  'DEFAULT_SCHEDULING_FACTOR',
  "TCO must source the scheduling default from the M6 policy helper",
);
requireText(
  'DEFAULT_NVAIE_FACTOR',
  "TCO must source the NVAIE/NIM incremental default from the M6 policy helper",
);
requireText(
  'maxSchedulingFactorForUtilization(util)',
  "TCO must bind the scheduling slider ceiling to target utilization",
);
requireText(
  'target utilization × scheduling factor can never exceed 100%',
  "Run:ai / Mission Control tooltip must explain the utilization-recovery guardrail",
);
requireText(
  'default incremental factor is 1.00x because the benchmark/capability basis already reflects an optimized NVIDIA software stack',
  "NVAIE/NIM tooltip must explain why 1.00x is not a zero-value assumption",
);

console.log("TCO GPU Sizing handoff ownership guard: PASS");
console.log("- upstream technical fields follow the fresh GPU Sizing handoff");
console.log("- cloud GPU class auto-follows unless the user explicitly overrides it");
console.log("- cloud instance-rate edits persist by provider + GPU class");
console.log("- system-specific on-prem rate edits persist by target system");
console.log("- GPU-derived on-prem target is locked in TCO");
console.log("- TCO-owned economic and resilience assumptions remain separate");
console.log("- workload storage is explicit/confirmable and infrastructure coverage is qualified by deployment scale");
console.log("- scheduling defaults to 1.10x, NVAIE incremental credit to 1.00x, and scheduling recovery is utilization-bounded");
