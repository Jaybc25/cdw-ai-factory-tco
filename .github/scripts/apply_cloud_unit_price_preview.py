from pathlib import Path

p = Path('src/TcoCalculator.jsx')
s = p.read_text()

old = '  const [growth, setGrowth] = useState(saved?.growth ?? 0.25);\n'
new = old + '  // Workstream #3 preview only: intentionally local UI state. It is not persisted, autosaved, passed into run(), or included in reports.\n  const [cloudUnitPriceTrendPreview, setCloudUnitPriceTrendPreview] = useState(0);\n'
if old not in s:
    raise SystemExit('growth state anchor not found')
s = s.replace(old, new, 1)

old = '''        {view === "calc" && (\n          <div style={{ background: "#F7F7F7", border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>\n            <div style={{ ...mono, fontSize: 10, letterSpacing: 0.8, color: C.sub, marginBottom: 3 }}>CLOUD PRICING ASSUMPTION</div>\n            <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.45 }}>\n              Current cloud GPU rates are held constant across the analysis horizon. Annual growth reflects increased workload consumption, not assumed provider price inflation or deflation.\n            </div>\n          </div>\n        )}\n'''
new = '''        {view === "calc" && (\n          <div style={{ background: "#F7F7F7", border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>\n            <div style={{ ...mono, fontSize: 10, letterSpacing: 0.8, color: C.sub, marginBottom: 3 }}>CLOUD PRICING ASSUMPTION</div>\n            <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.45 }}>\n              Current cloud GPU rates are held constant across the analysis horizon. Annual growth reflects increased workload consumption, not assumed provider price inflation or deflation.\n            </div>\n            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>\n              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 4 }}>\n                <label htmlFor="cloud-unit-price-trend-preview" style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>Cloud GPU unit-price trend</label>\n                <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: cloudUnitPriceTrendPreview === 0 ? C.sub : C.ink }}>\n                  {cloudUnitPriceTrendPreview > 0 ? "+" : ""}{cloudUnitPriceTrendPreview}%/yr\n                </span>\n              </div>\n              <input\n                id="cloud-unit-price-trend-preview"\n                aria-label="Cloud GPU unit-price trend preview"\n                type="range"\n                min="-20"\n                max="20"\n                step="5"\n                value={cloudUnitPriceTrendPreview}\n                onChange={(e) => setCloudUnitPriceTrendPreview(Number(e.target.value))}\n                style={{ width: "100%" }}\n              />\n              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: C.sub, marginTop: -1 }}>\n                <span>-20%</span><span>0%</span><span>+20%</span>\n              </div>\n              <div style={{ fontSize: 11, color: "#92400E", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 6, padding: "7px 8px", marginTop: 7, lineHeight: 1.4 }}>\n                <b>Preview only — does not affect results yet.</b> This control is being evaluated as a future sensitivity input. Workload growth remains separate, and the production calculation continues to use a 0%/yr cloud unit-price trend.\n              </div>\n            </div>\n          </div>\n        )}\n'''
if old not in s:
    raise SystemExit('pricing disclosure block not found')
s = s.replace(old, new, 1)
p.write_text(s)

p = Path('tests/e2e/tco-handoff-ownership.spec.js')
s = p.read_text()
insert = '''\ntest("cloud unit-price trend preview is interactive but does not enter TCO state or economics", async ({ page }) => {\n  await seedTcoSession(page, { mode: "spend", growth: 0.25, horizon: 3 });\n  await page.reload({ waitUntil: "domcontentloaded" });\n\n  const slider = page.getByLabel("Cloud GPU unit-price trend preview");\n  await expect(slider).toBeVisible();\n  await expect(slider).toHaveValue("0");\n  await expect(page.getByText(/Preview only .* does not affect results yet/i)).toBeVisible();\n\n  const before = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)), KEY);\n  await slider.fill("20");\n  await expect(slider).toHaveValue("20");\n  await expect(page.getByText("+20%/yr", { exact: true })).toBeVisible();\n\n  const after = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)), KEY);\n  expect(after.growth).toBe(before.growth);\n  expect(after.horizon).toBe(before.horizon);\n  expect(after.cloudUnitPriceTrendPreview).toBeUndefined();\n});\n'''
anchor = '\ntest("GPU Sizing handoff preserves explicit higher-growth selection provenance"'
if anchor not in s:
    raise SystemExit('test insertion anchor not found')
s = s.replace(anchor, insert + anchor, 1)
p.write_text(s)

p = Path('CHANGELOG.md')
s = p.read_text()
anchor = '## Unreleased\n\n'
entry = '''### September 7, 2026 - Cloud GPU unit-price trend sensitivity preview\n- Added an interactive preview-only cloud GPU unit-price trend control ranging from -20% to +20% per year in 5-point steps, defaulting to 0%/year.\n- The preview is explicitly non-functional: it is not persisted, autosaved, passed into the TCO engine, or reflected in report economics.\n- Workload growth remains a separate production input; current TCO economics still hold cloud GPU unit rates constant across the analysis horizon.\n\n'''
if anchor not in s:
    raise SystemExit('changelog anchor not found')
s = s.replace(anchor, anchor + entry, 1)
p.write_text(s)
