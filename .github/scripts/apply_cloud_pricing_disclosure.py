from pathlib import Path

p = Path('src/TcoCalculator.jsx')
s = p.read_text()
anchor = '''        {view === "gate" && ('''
block = '''        {view === "calc" && (
          <div style={{ background: "#F7F7F7", border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
            <div style={{ ...mono, fontSize: 10, letterSpacing: 0.8, color: C.sub, marginBottom: 3 }}>CLOUD PRICING ASSUMPTION</div>
            <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.45 }}>
              Current cloud GPU rates are held constant across the analysis horizon. Annual growth reflects increased workload consumption, not assumed provider price inflation or deflation.
            </div>
          </div>
        )}

'''
if anchor not in s:
    raise SystemExit('calc insertion anchor not found')
s = s.replace(anchor, block + anchor, 1)

anchor = '''            <Row label={`Recommended build`} value={`${r.sysAdj} × ${ownSys}${redundancy ? " (incl. N+1)" : ""}`} sub={r.isWorkloadMode ? `fixed to the workload's technical requirement · ${facility}` : `${Math.round(r.headroom * 100)}% growth headroom · ${facility}`} />'''
row = '''            <Row label="Cloud unit-price assumption" value="Current rates held constant" sub="annual growth reflects increased workload consumption, not assumed provider price inflation or deflation" />\n'''
if anchor not in s:
    raise SystemExit('report insertion anchor not found')
s = s.replace(anchor, anchor + '\n' + row.rstrip(), 1)

anchor = '''            {/* SECTION 3: ON-PREM CALCULATION */}'''
audit = '''            <div style={{ fontSize: 11, color: C.sub, marginBottom: 10, background: "#F7F7F7", borderRadius: 6, padding: "8px 10px" }}>
              <b>Cloud unit-price assumption:</b> current cloud GPU rates are held constant across the analysis horizon. The annual growth assumption changes workload consumption, not the provider $/GPU-hr rate itself.
            </div>

'''
if anchor not in s:
    raise SystemExit('audit insertion anchor not found')
s = s.replace(anchor, audit + anchor, 1)
p.write_text(s)

p = Path('tests/e2e/tco-handoff-ownership.spec.js')
s = p.read_text()
anchor = '''test("GPU Sizing handoff preserves explicit higher-growth selection provenance", async ({ page }) => {'''
test = '''test("TCO discloses constant cloud unit-price assumption separately from workload growth", async ({ page }) => {
  await seedTcoSession(page, { mode: "spend" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText("CLOUD PRICING ASSUMPTION", { exact: true })).toBeVisible();
  await expect(page.getByText(/Current cloud GPU rates are held constant across the analysis horizon/)).toBeVisible();
  await expect(page.getByText(/Annual growth reflects increased workload consumption, not assumed provider price inflation or deflation/)).toBeVisible();
});

'''
if anchor not in s:
    raise SystemExit('test insertion anchor not found')
s = s.replace(anchor, test + anchor, 1)
p.write_text(s)

p = Path('CHANGELOG.md')
s = p.read_text()
anchor = '''## Unreleased\n\n'''
entry = '''### September 7, 2026 - TCO cloud unit-price assumption disclosure
- Made the existing cloud-pricing treatment explicit in the TCO UI and report: current cloud GPU unit rates are held constant across the selected analysis horizon.
- Clarified that annual growth changes modeled workload consumption, not assumed provider price inflation or deflation.
- No TCO formulas, pricing values, growth defaults, or provider-selection behavior changed.

'''
if anchor not in s:
    raise SystemExit('changelog insertion anchor not found')
s = s.replace(anchor, anchor + entry, 1)
p.write_text(s)
