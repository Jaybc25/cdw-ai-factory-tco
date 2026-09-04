import fs from "node:fs";

const source = fs.readFileSync("src/TcoCalculator.jsx", "utf8");

function requireText(text, message) {
  if (!source.includes(text)) {
    throw new Error(message);
  }
}

const requiredMappings = [
  ['"B200": "B200-class"', "B200 must normalize to B200-class for TCO cloud pricing"],
  ['"GB200 NVL72": "GB200"', "GB200 NVL72 must normalize to GB200 for TCO cloud pricing"],
];

for (const [text, message] of requiredMappings) {
  requireText(text, message);
}

requireText(
  "const matchedCloudGpuClass = sourceClass ? normalizeSourceClass(sourceClass) : null;",
  "TCO must derive the matched cloud class from the GPU Sizing source class",
);

requireText(
  "if (arrivedFromGpuSizing && matchedCloudGpuClass && RATES[provider]?.[matchedCloudGpuClass])",
  "A fresh GPU Sizing handoff must prefer the matched cloud GPU class over saved TCO class history",
);

requireText(
  'return saved?.gpuClass ?? "H100";',
  "Standalone or bare-return TCO sessions must still preserve saved cloud GPU class behavior",
);

requireText(
  "delete next.instOD;",
  "Fresh GPU Sizing handoffs must clear stale on-demand cloud-rate overrides",
);

requireText(
  "delete next.instRes;",
  "Fresh GPU Sizing handoffs must clear stale reserved cloud-rate overrides",
);

requireText(
  "the technical on-prem fleet remains anchored to GPU Sizing.",
  "Workload-mode helper text must preserve the GPU Sizing technical-authority boundary",
);

console.log("TCO GPU Sizing handoff guard: PASS");
console.log("- fresh handoff starts from the matched cloud GPU class");
console.log("- saved class remains the fallback outside a fresh handoff");
console.log("- class-specific cloud-rate overrides are cleared on fresh handoff");
console.log("- UI copy preserves GPU Sizing as technical fleet authority");
