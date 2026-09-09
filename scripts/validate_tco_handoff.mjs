import "./validate_tco_cloud_unit_price_trend.mjs";
import fs from "node:fs";

const source = fs.readFileSync("src/TcoCalculator.jsx", "utf8");

function requireText(text, message) {
  if (!source.includes(text)) throw new Error(message);
}

const requiredMappings = [
  ['B200: "B200-class"', "B200 must normalize to B200-class for TCO cloud pricing"],
  ['"GB200 NVL72": "GB200"', "GB200 NVL72 must normalize to GB200 for TCO cloud pricing"],
];
for (const [text, message] of requiredMappings) requireText(text, message);

requireText(
  "const matchedCloudGpuClass = sourceClass ? normalizeSourceClass(sourceClass) : null;",
  "TCO must derive the matched cloud class from the GPU Sizing source class"
);
requireText(
  "const [cloudGpuClassOverridden, setCloudGpuClassOverridden]",
  "TCO must track whether the cloud GPU class is an explicit user override"
);
requireText(
  "saved?.cloudGpuClassOverridden === true",
  "Fresh handoffs must distinguish explicit cloud-class overrides from stale historical state"
);
requireText(
  "setCloudGpuClassOverridden(next !== matchedCloudGpuClass)",
  "Changing the cloud GPU class must update explicit override provenance"
);
requireText(
  "const cloudRateProfileKey = `${provider}::${gpuClass}`;",
  "Cloud instance-rate overrides must be scoped by provider and GPU class"
);
requireText(
  "const onPremRateProfileKey = ownSys;",
  "System-specific on-prem rate overrides must be scoped by the active on-prem target"
);
requireText(
  "cloudRateOverrides",
  "TCO must persist cloud instance-rate profiles rather than delete user-entered rates on handoff"
);
requireText(
  "onPremRateOverrides",
  "TCO must preserve system-specific on-prem rate edits without applying them to different hardware"
);
requireText(
  "Set by GPU Sizing. Return to GPU Sizing to change the technical design.",
  "GPU-derived on-prem target must be structurally locked in TCO"
);
requireText(
  "TCO resilience assumption",
  "N+1 must be disclosed as a TCO-owned resilience assumption rather than part of the GPU Sizing base recommendation"
);
requireText(
  "Reset current scenario edits",
  "Reset behavior must be scoped to the active rate profiles rather than deleting inactive saved profiles"
);

console.log("TCO GPU Sizing handoff ownership guard: PASS");
console.log("- upstream technical fields follow the fresh GPU Sizing handoff");
console.log("- cloud GPU class auto-follows unless the user explicitly overrides it");
console.log("- cloud instance-rate edits persist by provider + GPU class");
console.log("- system-specific on-prem rate edits persist by target system");
console.log("- GPU-derived on-prem target is locked in TCO");
console.log("- TCO-owned economic and resilience assumptions remain separate");
