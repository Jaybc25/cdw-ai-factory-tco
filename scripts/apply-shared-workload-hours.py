from pathlib import Path

p = Path('src/TcoCalculator.jsx')
s = p.read_text()

pairs = [
(
'  const [workingDayHours] = useState(() => getInitialWorkingDayHours() ?? saved?.workingDayHours ?? null);',
'  const [workingDayHours, setWorkingDayHours] = useState(() => getInitialWorkingDayHours() ?? saved?.workingDayHours ?? null);'
),
(
'  const rateInfo = RATES[provider][gpuClass];\n\n  // Auto mode:',
'  const rateInfo = RATES[provider][gpuClass];\n  const setSharedWorkingDayHours = (next) => {\n    const bounded = Math.max(1, Math.min(24, Number(next) || 1));\n    setWorkingDayHours(bounded);\n    const gpuSizingSaved = loadSessionState("gpu-sizing") ?? {};\n    saveSessionState("gpu-sizing", { ...gpuSizingSaved, workingDayHours: bounded });\n  };\n\n  // Auto mode:'
),
(
'                <Row label="Cloud-pricing basis" value={`${Math.round(r.gpuHrsCloud).toLocaleString()} GPU-hrs/mo`} sub={workingDayHours ? `${workingDayHours} hrs/day duty cycle from GPU Sizing (not 24/7)` : `no duty-cycle data from GPU Sizing -- assumes ${Math.round(util * 100)}% of all hours, likely an overstatement`} />',
'                <Row label="Cloud-pricing basis" value={`${Math.round(r.gpuHrsCloud).toLocaleString()} GPU-hrs/mo`} sub={workingDayHours ? `${workingDayHours} hrs/day duty cycle shared with GPU Sizing (not 24/7)` : `no duty-cycle data from GPU Sizing -- assumes ${Math.round(util * 100)}% of all hours, likely an overstatement`} />'
),
(
'                    <>Cloud side priced for a {workingDayHours}-hour/day duty cycle (from GPU Sizing), not 24/7 -- a business-hours\n                    workload shouldn\'t be priced as continuous rental. </>',
'                    <>Cloud side priced for a {workingDayHours}-hour/day duty cycle shared with GPU Sizing, not 24/7 -- a business-hours\n                    workload shouldn\'t be priced as continuous rental. </>'
),
]
for old, new in pairs:
    if old not in s:
        raise SystemExit(f'missing patch target: {old[:120]}')
    s = s.replace(old, new, 1)

marker = 'function Seg({ options, value, onChange }) {'
insert = '''function WorkloadDayBar({ hours }) {\n  const activeHours = Math.max(1, Math.min(24, Math.round(hours)));\n  const startHour = Math.max(0, Math.round(12 - activeHours / 2));\n  const endHour = Math.min(24, startHour + activeHours);\n  return (\n    <div style={{ marginTop: 6 }}>\n      <div style={{ display: "grid", gridTemplateColumns: "repeat(24, minmax(0, 1fr))", gap: 2, height: 26 }}>\n        {Array.from({ length: 24 }, (_, hour) => (\n          <div key={hour} aria-hidden="true" style={{ background: hour >= startHour && hour < endHour ? C.green : "#E5E7EB", borderRadius: 2 }} />\n        ))}\n      </div>\n      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: C.sub, marginTop: 3 }}>\n        <span>0h</span><span>12h</span><span>24h</span>\n      </div>\n    </div>\n  );\n}\n\n'''
if marker not in s:
    raise SystemExit('missing Seg marker')
s = s.replace(marker, insert + marker, 1)

old = '''        {view === "calc" && (\n          <div style={{ background: "#F7F7F7", border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>\n            <div style={{ ...mono, fontSize: 10, letterSpacing: 0.8, color: C.sub, marginBottom: 3 }}>CLOUD GPU PRICE SENSITIVITY</div>'''
new = '''        {view === "calc" && (\n          <div style={{ background: "#F7F7F7", border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>\n            <div style={{ ...mono, fontSize: 10, letterSpacing: 0.8, color: C.sub, marginBottom: 3 }}>{r.isWorkloadMode ? "CLOUD & WORKLOAD SENSITIVITY" : "CLOUD GPU PRICE SENSITIVITY"}</div>'''
if old not in s:
    raise SystemExit('missing sensitivity header')
s = s.replace(old, new, 1)

anchor = '            <div style={{ fontSize: 11, color: C.sub, marginTop: 7, lineHeight: 1.4 }}>Applies an annual change to modeled cloud GPU compute rates only. Workload growth remains a separate consumption assumption.</div>\n'
addition = anchor + '''            {r.isWorkloadMode && workingDayHours && (\n              <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 12, paddingTop: 10 }}>\n                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 4 }}>\n                  <label htmlFor="workload-hours-per-day" style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>Length of working day</label>\n                  <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: C.green }}>{workingDayHours} hrs/day</span>\n                </div>\n                <input id="workload-hours-per-day" aria-label="Length of working day" type="range" min="1" max="24" step="1" value={workingDayHours} onChange={(e) => setSharedWorkingDayHours(Number(e.target.value))} style={{ width: "100%", accentColor: C.green }} />\n                <WorkloadDayBar hours={workingDayHours} />\n                <div style={{ fontSize: 11, color: C.sub, marginTop: 7, lineHeight: 1.4 }}>Shared with GPU Sizing across the full 24-hour day. Changing this updates cloud rental GPU-hours for the same technical workload; the on-prem fleet stays fixed to the GPU Sizing requirement.</div>\n              </div>\n            )}\n'''
if anchor not in s:
    raise SystemExit('missing sensitivity anchor')
s = s.replace(anchor, addition, 1)

p.write_text(s)

Path('tests/e2e/tco-working-day-sync.spec.js').write_text(r'''import { test, expect } from "@playwright/test";
import { AUTH_BYPASSED, BYPASS_ONLY_REASON } from "./helpers/auth-context.js";

test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);

const TCO_KEY = "ai-factory-session:tco";
const GPU_KEY = "ai-factory-session:gpu-sizing";

async function waitField(page, key, field, expected) {
  await page.waitForFunction(({ key, field, expected }) => {
    const raw = sessionStorage.getItem(key);
    return raw && JSON.parse(raw)?.[field] === expected;
  }, { key, field, expected });
}

test("working-day hours synchronize between TCO and GPU Sizing", async ({ page }) => {
  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });
  await page.waitForFunction((key) => !!sessionStorage.getItem(key), GPU_KEY);

  const params = new URLSearchParams({ ownSys: "DGX B300", gpuCount: "8", sourceClass: "B300", sizingBasis: "recommended", workingDayHours: "10" });
  await page.goto(`/tco?${params}`, { waitUntil: "domcontentloaded" });
  const tco = page.getByLabel("Length of working day");
  await expect(tco).toHaveValue("10");

  await tco.evaluate((el) => { el.value = "18"; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); });
  await waitField(page, TCO_KEY, "workingDayHours", 18);
  await waitField(page, GPU_KEY, "workingDayHours", 18);

  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByLabel("Length of working day")).toHaveValue("18");

  await page.goto("/gpu-sizing", { waitUntil: "domcontentloaded" });
  const gpu = page.getByLabel("Length of working day, hours per day");
  await expect(gpu).toHaveValue("18");
  await gpu.fill("12");
  await gpu.blur();
  await waitField(page, GPU_KEY, "workingDayHours", 12);
  await expect(page.getByRole("link", { name: "Compare TCO" }).first()).toHaveAttribute("href", /workingDayHours=12/);
});
''')
