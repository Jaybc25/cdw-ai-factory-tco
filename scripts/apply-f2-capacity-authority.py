from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f"F2 patch target not found: {label}")
    if text.count(old) != 1:
        raise SystemExit(f"F2 patch target not unique ({text.count(old)}): {label}")
    return text.replace(old, new, 1)

# ---------------------------------------------------------------------------
# GPU Sizing: carry the inference demand facts that created the technical size.
# ---------------------------------------------------------------------------
gpu_path = Path("src/GpuSizingCalculator.jsx")
gpu = gpu_path.read_text()

gpu = replace_once(
    gpu,
    'function TcoHandoff({ selectedClass, recommended, sizingBasis = "recommended", mode, workingDayHours, model, modelParamsB, quant }) {',
    'function TcoHandoff({ selectedClass, recommended, sizingBasis = "recommended", mode, workingDayHours, concurrentUsers, targetTokPerUser, model, modelParamsB, quant }) {',
    "TcoHandoff signature",
)

gpu = replace_once(
    gpu,
    '  if (mode === "Inference" && quant) params.set("quant", quant);\n  if (mode === "Inference" && workingDayHours) params.set("workingDayHours", String(workingDayHours));\n  const href = `/tco?${params.toString()}`;',
    '  if (mode === "Inference" && quant) params.set("quant", quant);\n  if (mode === "Inference" && workingDayHours) params.set("workingDayHours", String(workingDayHours));\n  if (mode === "Inference" && Number.isFinite(Number(concurrentUsers)) && Number(concurrentUsers) > 0) params.set("concurrentUsers", String(concurrentUsers));\n  if (mode === "Inference" && Number.isFinite(Number(targetTokPerUser)) && Number(targetTokPerUser) > 0) params.set("targetTokPerUser", String(targetTokPerUser));\n  const href = `/tco?${params.toString()}`;',
    "TCO handoff demand params",
)

gpu = replace_once(
    gpu,
    '<TcoHandoff selectedClass={tcoSelectedClass} recommended={tcoSelectedCount} sizingBasis={effectiveTcoSelection} mode={mode} workingDayHours={workingDayHours} model={mode === "Inference" ? infModel : trainModel} modelParamsB={mode === "Inference" ? getModelParamsB(infModel, customParamsB) : getModelParamsB(trainModel, customParamsB)} quant={mode === "Inference" ? quant : null} />',
    '<TcoHandoff selectedClass={tcoSelectedClass} recommended={tcoSelectedCount} sizingBasis={effectiveTcoSelection} mode={mode} workingDayHours={workingDayHours} concurrentUsers={mode === "Inference" ? concurrentUsers : null} targetTokPerUser={mode === "Inference" ? targetTokPerUser : null} model={mode === "Inference" ? infModel : trainModel} modelParamsB={mode === "Inference" ? getModelParamsB(infModel, customParamsB) : getModelParamsB(trainModel, customParamsB)} quant={mode === "Inference" ? quant : null} />',
    "TcoHandoff call",
)

gpu_path.write_text(gpu)

# ---------------------------------------------------------------------------
# TCO: persist the upstream demand facts and stop creating a competing serving
# capacity answer in Workload Requirement mode. Spend mode keeps the existing
# standalone EST capacity/unit-economics model unchanged.
# ---------------------------------------------------------------------------
tco_path = Path("src/TcoCalculator.jsx")
tco = tco_path.read_text()

working_day_fn = '''function getInitialWorkingDayHours() {\n  const params = getIncomingParams();\n  const raw = params?.get("workingDayHours");\n  const n = raw ? parseFloat(raw) : NaN;\n  return Number.isFinite(n) && n > 0 && n <= 24 ? n : null;\n}\n'''
working_day_plus = working_day_fn + '''\nfunction getInitialGpuSizingDemand(name) {\n  const raw = getIncomingParams()?.get(name);\n  const n = raw ? parseFloat(raw) : NaN;\n  return Number.isFinite(n) && n > 0 ? n : null;\n}\n'''
tco = replace_once(tco, working_day_fn, working_day_plus, "GPU Sizing demand parser")

state_old = '  const [workingDayHours, setWorkingDayHours] = useState(() => getInitialWorkingDayHours() ?? saved?.workingDayHours ?? null);\n  const [incomingModelContext] = useState(getInitialModelContext);'
state_new = '''  const [workingDayHours, setWorkingDayHours] = useState(() => getInitialWorkingDayHours() ?? saved?.workingDayHours ?? null);\n  // F2: these are technical demand facts owned by GPU Sizing. On a fresh\n  // handoff, absence means the upstream workload did not provide them (for\n  // example training), so do not leak stale inference demand from a prior run.\n  const [gpuSizingConcurrentUsers] = useState(() => arrivedFromGpuSizing ? getInitialGpuSizingDemand("concurrentUsers") : saved?.gpuSizingConcurrentUsers ?? null);\n  const [gpuSizingTargetTokPerUser] = useState(() => arrivedFromGpuSizing ? getInitialGpuSizingDemand("targetTokPerUser") : saved?.gpuSizingTargetTokPerUser ?? null);\n  const [incomingModelContext] = useState(getInitialModelContext);'''
tco = replace_once(tco, state_old, state_new, "TCO demand state")

tco = replace_once(
    tco,
    '      gpuSizingCount, sourceClass, workingDayHours, gpuSizingBasis,',
    '      gpuSizingCount, sourceClass, workingDayHours, gpuSizingBasis, gpuSizingConcurrentUsers, gpuSizingTargetTokPerUser,',
    "persist demand facts",
)

tco = replace_once(
    tco,
    '      residPct, modelId, modelParamsB, quant, gpuSizingCount, sourceClass, workingDayHours, gpuSizingBasis]);',
    '      residPct, modelId, modelParamsB, quant, gpuSizingCount, sourceClass, workingDayHours, gpuSizingBasis, gpuSizingConcurrentUsers, gpuSizingTargetTokPerUser]);',
    "persistence dependencies",
)

# Include the upstream demand facts in the autosaved TCO snapshot as context.
tco = replace_once(
    tco,
    'const inputsObj = { bill, computeShare, odShare, gpuClass, ownSys, trainShare, util, fastPB, bulkPB, egressPct, growth, cloudUnitPriceTrend, facility, powerRate, fNet, fSw, fNvaie, tier3Hrs, retrofit, migration, dualRun, redundancy, residPct, modelId, modelParamsB, quant, horizon, mode, gpuSizingCount, sourceClass, workingDayHours };',
    'const inputsObj = { bill, computeShare, odShare, gpuClass, ownSys, trainShare, util, fastPB, bulkPB, egressPct, growth, cloudUnitPriceTrend, facility, powerRate, fNet, fSw, fNvaie, tier3Hrs, retrofit, migration, dualRun, redundancy, residPct, modelId, modelParamsB, quant, horizon, mode, gpuSizingCount, sourceClass, workingDayHours, gpuSizingConcurrentUsers, gpuSizingTargetTokPerUser };',
    "TCO snapshot context",
)

section_open_old = '''        {/* CAPACITY & UNIT ECONOMICS (v1.9) */}\n        <Section title="Capacity & unit economics" badge="EST" defaultOpen={false}>\n          <TipLabel text="How these estimates work" tip={TIPS.capGroup} style={{ fontSize: 12, color: "#6B6B6B", marginBottom: 4 }} />'''
section_open_new = '''        {/* CAPACITY & UNIT ECONOMICS (v1.9) */}\n        <Section title={r.isWorkloadMode ? "Workload capacity basis" : "Capacity & unit economics"} badge={r.isWorkloadMode ? "GPU SIZING" : "EST"} defaultOpen={false}>\n          {r.isWorkloadMode ? (\n            <>\n              <div style={{ fontSize: 12, color: C.ink, background: "#F6F8FA", border: `1px solid ${C.line}`, borderRadius: 8, padding: "10px 12px", marginBottom: 10, lineHeight: 1.5 }}>\n                <b>GPU Sizing is the technical capacity authority for this workload.</b> TCO prices the handed-off design and does not recalculate serving capacity with its standalone rule-of-thumb model.\n              </div>\n              {gpuSizingConcurrentUsers && gpuSizingTargetTokPerUser ? (\n                <>\n                  <Row label="Peak concurrent request streams" value={gpuSizingConcurrentUsers.toLocaleString()} sub="From GPU Sizing" />\n                  <Row label="Target response speed" value={`${gpuSizingTargetTokPerUser.toLocaleString()} tok/s per stream`} sub="From GPU Sizing" />\n                  <Row label="Peak throughput requirement" value={`${Math.round(gpuSizingConcurrentUsers * gpuSizingTargetTokPerUser).toLocaleString()} tok/s`} sub={`${gpuSizingConcurrentUsers.toLocaleString()} × ${gpuSizingTargetTokPerUser.toLocaleString()} tok/s`} />\n                  <Row label="GPU Sizing design" value={`${gpuSizingCount.toLocaleString()} × ${sourceClass || ownSys}`} sub="Technical configuration handed off to TCO; the economics on this page price this design." />\n                  <div style={{ fontSize: 11, color: C.sub, marginTop: 8, lineHeight: 1.45 }}>Peak concurrency is not assumed to be sustained for every hour of the working day, so TCO does not derive monthly tokens, cost per 1M tokens, or cost per user/month from these peak inputs.</div>\n                </>\n              ) : (\n                <div style={{ fontSize: 11, color: C.sub, lineHeight: 1.45 }}>Technical capacity remains owned by GPU Sizing for workload-mode scenarios. This handoff does not include inference demand fields, so TCO does not generate a separate serving-capacity estimate. Review or refresh the technical design in GPU Sizing; TCO economics continue to use the handed-off GPU count.</div>\n              )}\n            </>\n          ) : (\n            <>\n          <TipLabel text="How these estimates work" tip={TIPS.capGroup} style={{ fontSize: 12, color: "#6B6B6B", marginBottom: 4 }} />'''
tco = replace_once(tco, section_open_old, section_open_new, "capacity section workload branch")

section_close_old = '''              <Row label="Cost per user / month" value={`$${Math.round(r.cap.perUserOn).toLocaleString()} vs $${Math.round(r.cap.perUserCloud).toLocaleString()}`} sub="on-prem vs cloud API at the same usage" />\n            </>\n          )}\n        </Section>\n\n        {/* TIER 3 */}'''
section_close_new = '''              <Row label="Cost per user / month" value={`$${Math.round(r.cap.perUserOn).toLocaleString()} vs $${Math.round(r.cap.perUserCloud).toLocaleString()}`} sub="on-prem vs cloud API at the same usage" />\n            </>\n          )}\n            </>\n          )}\n        </Section>\n\n        {/* TIER 3 */}'''
tco = replace_once(tco, section_close_old, section_close_new, "capacity section close")

tco_path.write_text(tco)

# ---------------------------------------------------------------------------
# Focused browser regression: authoritative upstream demand in workload mode;
# old standalone capacity estimator remains available in spend mode.
# ---------------------------------------------------------------------------
test_path = Path("tests/e2e/tco-workload-capacity-authority.spec.js")
test_path.write_text('''import { test, expect } from "@playwright/test";\nimport { AUTH_BYPASSED, BYPASS_ONLY_REASON } from "./helpers/auth-context.js";\n\ntest.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);\n\nconst KEY = "ai-factory-session:tco";\n\nasync function openSection(page, name) {\n  const trigger = page.getByRole("button", { name });\n  await expect(trigger).toBeVisible();\n  if ((await trigger.getAttribute("aria-expanded")) !== "true") await trigger.click();\n  await expect(trigger).toHaveAttribute("aria-expanded", "true");\n}\n\nasync function waitForSavedDemand(page) {\n  await page.waitForFunction((key) => {\n    const raw = sessionStorage.getItem(key);\n    if (!raw) return false;\n    const saved = JSON.parse(raw);\n    return saved.gpuSizingConcurrentUsers === 1200 && saved.gpuSizingTargetTokPerUser === 40;\n  }, KEY);\n  return page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)), KEY);\n}\n\ntest("workload mode restates GPU Sizing demand instead of inventing a second capacity answer", async ({ page }) => {\n  await page.goto(\n    "/tco?ownSys=DGX%20B300&gpuCount=8&sourceClass=B300&sizingBasis=recommended&workingDayHours=10&concurrentUsers=1200&targetTokPerUser=40&model=gpt-oss-120b&modelParamsB=117&quant=FP8",\n    { waitUntil: "domcontentloaded" },\n  );\n\n  const saved = await waitForSavedDemand(page);\n  expect(saved.gpuSizingCount).toBe(8);\n  expect(saved.sourceClass).toBe("B300");\n  expect(new URL(page.url()).search).toBe("");\n\n  await openSection(page, /Workload capacity basis/i);\n  await expect(page.getByText(/GPU Sizing is the technical capacity authority for this workload/)).toBeVisible();\n  await expect(page.getByText("Peak concurrent request streams", { exact: true })).toBeVisible();\n  await expect(page.getByText("1,200", { exact: true })).toBeVisible();\n  await expect(page.getByText("40 tok/s per stream", { exact: true })).toBeVisible();\n  await expect(page.getByText("48,000 tok/s", { exact: true })).toBeVisible();\n  await expect(page.getByText("8 × B300", { exact: true })).toBeVisible();\n  await expect(page.getByText(/Peak concurrency is not assumed to be sustained/)).toBeVisible();\n\n  await expect(page.getByText("Concurrent interactive users (est.)", { exact: true })).toHaveCount(0);\n  await expect(page.getByText("Token throughput (est.)", { exact: true })).toHaveCount(0);\n  await expect(page.getByText("Cost per 1M tokens", { exact: true })).toHaveCount(0);\n  await expect(page.getByText("Cost per user / month", { exact: true })).toHaveCount(0);\n\n  await page.reload({ waitUntil: "domcontentloaded" });\n  await waitForSavedDemand(page);\n  await openSection(page, /Workload capacity basis/i);\n  await expect(page.getByText("48,000 tok/s", { exact: true })).toBeVisible();\n});\n\ntest("workload mode without inference demand refuses to fabricate serving capacity", async ({ page }) => {\n  await page.goto(\n    "/tco?ownSys=DGX%20B300&gpuCount=8&sourceClass=B300&sizingBasis=recommended&model=mistral-large-3&modelParamsB=675",\n    { waitUntil: "domcontentloaded" },\n  );\n\n  await openSection(page, /Workload capacity basis/i);\n  await expect(page.getByText(/does not include inference demand fields/)).toBeVisible();\n  await expect(page.getByText("Concurrent interactive users (est.)", { exact: true })).toHaveCount(0);\n});\n\ntest("standalone spend mode keeps the existing directional capacity estimator", async ({ page }) => {\n  await page.goto("/tco", { waitUntil: "domcontentloaded" });\n  await openSection(page, /Capacity & unit economics/i);\n  await expect(page.getByText("Concurrent interactive users (est.)", { exact: true })).toBeVisible();\n  await expect(page.getByText("Cost per 1M tokens", { exact: true })).toBeVisible();\n});\n''')

print("F2 capacity-authority patch applied")
