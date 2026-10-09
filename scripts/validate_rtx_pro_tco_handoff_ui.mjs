import fs from "node:fs";

const app = fs.readFileSync("src/App.jsx", "utf8");
const card = fs.readFileSync("src/RtxProAlternativeCard.jsx", "utf8");
const intake = fs.readFileSync("src/RtxProTcoIntake.jsx", "utf8");

function requireText(source, text, message) {
  if (!source.includes(text)) throw new Error(message);
}

requireText(app, 'path="/tco/rtx-pro"', "RTX PRO TCO route must remain registered.");
requireText(app, "<RtxProTcoIntake />", "RTX PRO TCO route must render the input-aware intake surface.");
requireText(card, "Continue to RTX PRO TCO", "Evidence-qualified single-server RTX sizing must expose a TCO handoff.");
requireText(card, "deployment.servers === 1", "RTX TCO handoff must remain limited to one physical server in v1.");
requireText(card, "/tco/rtx-pro?", "GPU Sizing RTX handoff must target the dedicated RTX TCO route.");
requireText(card, "Multi-server RTX TCO remains project-specific", "Multi-server RTX must remain explicitly gated.");

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
requireText(intake, "fullLifecycleInputsReady = policy.clientReady && powerRate !== null", "RTX TCO readiness must require both policy completeness and an explicit facility power basis.");
requireText(intake, "does not sum software/support/services into lifecycle TCO until their commercial term", "RTX TCO UI must not manufacture a lifecycle total before commercial term normalization.");
requireText(intake, "Intentionally no universal RTX default", "Facility/power economics must remain customer-specific in the RTX path.");

console.log("RTX PRO GPU Sizing → TCO handoff UI validation PASS");
console.log("- single-server evidence-qualified sizing can continue to RTX TCO");
console.log("- multi-server RTX remains project-specific");
console.log("- required commercial/workload/facility inputs are explicit");
console.log("- no premature lifecycle total is manufactured");
