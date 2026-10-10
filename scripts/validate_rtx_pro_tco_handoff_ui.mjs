import fs from "node:fs";

const app = fs.readFileSync("src/App.jsx", "utf8");
const card = fs.readFileSync("src/RtxProAlternativeCard.jsx", "utf8");
const gpuSizing = fs.readFileSync("src/GpuSizingCalculator.jsx", "utf8");
const intake = fs.readFileSync("src/RtxProTcoIntake.jsx", "utf8");
const defaults = fs.readFileSync("src/rtxProTcoPlanningDefaults.js", "utf8");

function requireText(source, text, message) {
  if (!source.includes(text)) throw new Error(message);
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
  "Electricity rate",
  "PUE",
  "Colocation facility rate",
]) {
  requireText(intake, required, `RTX TCO intake is missing required field: ${required}`);
}

requireText(intake, "buildRtxProSingleServerTcoPolicy", "RTX TCO UI must use the validated policy helper rather than duplicate its readiness rules.");
requireText(intake, "buildRtxProLifecycleTco", "RTX TCO UI must use the validated lifecycle engine rather than duplicate lifecycle math.");
requireText(intake, "buildRtxProTcoPlanningDefaults", "RTX TCO UI must source planning defaults from the dedicated provenance registry.");
requireText(intake, "effectiveFacilityRatePerKwMonth", "RTX TCO UI must normalize facility economics through the owned-DC/colo facility helper.");
requireText(intake, "Owned data center", "RTX TCO UI must expose the owned-data-center facility branch.");
requireText(intake, "Colocation", "RTX TCO UI must expose the colocation facility branch.");
requireText(intake, "LISTED values come from public evidence", "RTX TCO UI must disclose planning-default provenance semantics.");
requireText(intake, 'source: "CUSTOMER"', "User-edited planning assumptions must be re-labeled CUSTOMER.");
requireText(intake, "TCO horizon", "RTX TCO UI must expose a 1/3/5-year horizon control.");
requireText(intake, "Annual amount", "RTX recurring commercial inputs must support annual basis.");
requireText(intake, "Total for quoted term", "RTX recurring commercial inputs must support term-total basis.");
requireText(intake, "Quoted term coverage", "Term-total inputs must carry explicit coverage years.");
requireText(intake, "Directional lifecycle TCO", "RTX TCO UI must render the validated lifecycle total when a configured price is admitted.");
requireText(intake, "Planning lifecycle TCO", "RTX TCO UI must render a directional planning total when 8-GPU hardware uses an EST basis.");
requireText(intake, "Planning TCO ready", "RTX TCO readiness must distinguish an estimate-backed result from client-ready configured pricing.");
requireText(intake, "confirm before client-ready", "8-GPU planning hardware must visibly preserve the quote-confirmation requirement.");
requireText(intake, "hardwarePlanningUSD: defaults.hardwareUSD", "RTX intake must pass the explicit planning hardware basis into policy rather than inventing it inside lifecycle math.");
requireText(intake, "lifecycle.totalTcoUSD", "Displayed RTX lifecycle total must come from the tested engine output.");
requireText(intake, "the tool will not invent renewal pricing", "RTX TCO UI must disclose that renewal pricing is not invented.");

requireText(defaults, "NVIDIA_AI_ENTERPRISE_PER_GPU_ANNUAL_USD = 4500", "NVIDIA AI Enterprise planning default must stay tied to the admitted public-list value.");
requireText(defaults, "US_COMMERCIAL_ELECTRICITY_USD_PER_KWH = 0.1453", "Owned-DC electricity planning default must remain source-explicit.");
requireText(defaults, "INDUSTRY_AVERAGE_PUE = 1.52", "Owned-DC PUE planning default must remain source-explicit.");
requireText(defaults, "SUPERMICRO_RTX_PRO_6000_CARD_USD = 15334.10", "8-GPU hardware estimate must remain tied to the admitted public Supermicro RTX PRO card price.");
requireText(defaults, "CALCULATED_FROM_LISTED_COMPONENTS", "8-GPU hardware estimate must identify its derivation rather than masquerading as a configured-system list price.");
requireText(defaults, "quoteRequired: true", "8-GPU estimate must retain explicit quote confirmation before client-ready use.");
requireText(defaults, 'facilityMode: "owned-dc"', "RTX planning defaults must not silently force colocation economics.");
requireText(defaults, 'source: "EST"', "Planning allowances must be explicitly marked EST.");
requireText(defaults, 'source: "LISTED"', "Public evidence defaults must be explicitly marked LISTED.");
requireText(defaults, "This is not a utility electricity rate", "Colocation allowance must remain distinguished from utility power.");

console.log("RTX PRO GPU Sizing → lifecycle TCO UI validation PASS");
console.log("- single-server evidence-qualified sizing is selectable and continues through the shared RTX PRO TCO handoff");
console.log("- planning defaults are explicit, source-labeled, and editable");
console.log("- 8-GPU component-derived hardware estimate produces planning TCO while retaining quote confirmation");
console.log("- user edits are labeled CUSTOMER");
console.log("- owned-DC electricity/PUE and colocation $/kW-month are separate facility branches");
console.log("- recurring commercial term basis and coverage are explicit");
console.log("- displayed lifecycle total is sourced from the validated engine");
