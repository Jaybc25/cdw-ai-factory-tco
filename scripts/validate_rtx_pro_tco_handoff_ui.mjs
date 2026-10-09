import fs from "node:fs";

const app = fs.readFileSync("src/App.jsx", "utf8");
const card = fs.readFileSync("src/RtxProAlternativeCard.jsx", "utf8");
const gpuSizing = fs.readFileSync("src/GpuSizingCalculator.jsx", "utf8");
const intake = fs.readFileSync("src/RtxProTcoIntake.jsx", "utf8");

function requireText(source, text, message) {
  if (!source.includes(text)) throw new Error(message);
}

function rejectText(source, text, message) {
  if (source.includes(text)) throw new Error(message);
}

requireText(app, 'path="/tco/rtx-pro"', "RTX PRO TCO route must remain registered.");
requireText(app, "<RtxProTcoIntake />", "RTX PRO TCO route must render the input-aware intake surface.");
requireText(card, "aria-pressed={selected}", "Evidence-qualified single-server RTX sizing must remain a true selectable recommendation card.");
requireText(gpuSizing, "Continue to RTX PRO TCO", "Selecting an evidence-qualified RTX recommendation must expose the shared forward TCO handoff.");
requireText(gpuSizing, 'data-testid="rtx-selected-handoff"', "RTX selection must continue through the dedicated shared next-step handoff.");
requireText(card, "deployment.servers === 1", "RTX TCO handoff must remain limited to one physical server in v1.");
requireText(card, "/tco/rtx-pro?", "GPU Sizing RTX handoff must target the dedicated RTX TCO route.");
requireText(card, "benchmarkId", "RTX forward handoff must preserve the admitted benchmark identity.");
requireText(card, "Multi-server RTX TCO requires engineering validation", "Multi-server RTX must remain explicitly gated.");

for (const required of [
  "NVIDIA software / support entitlement",
  "OEM / server support",
  "Professional services / implementation",
  "Workload-derived storage",
  "Incremental admin / operations labor (annual)",
  "Full configured-server power draw",
  "Facility power burden",
]) {
  requireText(intake, required, `RTX TCO intake is missing required field: ${required}`);
}

requireText(intake, "buildRtxProSingleServerTcoPolicy", "RTX TCO UI must use the validated policy helper rather than duplicate its readiness rules.");
requireText(intake, "buildRtxProLifecycleTco", "RTX TCO UI must use the validated lifecycle engine rather than duplicate lifecycle math.");
requireText(intake, "TCO horizon", "RTX TCO UI must expose a 1/3/5-year horizon control.");
requireText(intake, "Annual amount", "RTX recurring commercial inputs must support annual basis.");
requireText(intake, "Total for quoted term", "RTX recurring commercial inputs must support term-total basis.");
requireText(intake, "Quoted term coverage", "Term-total inputs must carry explicit coverage years.");
requireText(intake, "Directional lifecycle TCO", "RTX TCO UI must render the validated lifecycle total when ready.");
requireText(intake, "lifecycle.totalTcoUSD", "Displayed RTX lifecycle total must come from the tested engine output.");
requireText(intake, "the tool does not infer renewal pricing", "RTX TCO UI must disclose that renewal pricing is not invented.");
requireText(intake, 'useState(restore.serverPowerKW ?? "")', "Configured-server power must restore a prior explicit value or remain blank.");
requireText(intake, 'useState(restore.powerBurdenPerKwMonth ?? "")', "Facility burden must restore a prior explicit value or remain blank.");
rejectText(intake, "powerBurdenPerKwMonth ?? 300", "RTX TCO must not silently assign a universal $/kW-month facility default during visual convergence.");
rejectText(intake, "does not sum software/support/services into lifecycle TCO until their commercial term", "The pre-lifecycle placeholder disclosure must be removed after lifecycle normalization is active.");

console.log("RTX PRO GPU Sizing → lifecycle TCO UI validation PASS");
console.log("- single-server evidence-qualified sizing is selectable and continues through the shared RTX PRO TCO handoff");
console.log("- benchmark identity is preserved in the dedicated RTX route");
console.log("- multi-server RTX remains engineering-validation gated");
console.log("- required commercial/workload/facility inputs remain explicit");
console.log("- facility/power restores explicit values or stays blank; no silent universal defaults");
console.log("- recurring commercial term basis and coverage are explicit");
console.log("- displayed lifecycle total is sourced from the validated engine");
