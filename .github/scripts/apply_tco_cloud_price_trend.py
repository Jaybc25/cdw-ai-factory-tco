from pathlib import Path

p = Path('src/TcoCalculator.jsx')
text = p.read_text()

text = text.replace('import { GPUAAS_CONFIDENCE, rankSameClassGpuAas, topGpuAasValues } from "./bestValueGpuaas.js";\n', 'import { GPUAAS_CONFIDENCE, rankSameClassGpuAas, topGpuAasValues } from "./bestValueGpuaas.js";\nimport { trendCloudGpuCompute } from "./cloudUnitPriceTrend.js";\n', 1)
text = text.replace('  // Workstream #3 preview only: intentionally local UI state. It is not persisted, autosaved, passed into run(), or included in reports.\n  const [cloudUnitPriceTrendPreview, setCloudUnitPriceTrendPreview] = useState(0);\n', '  const [cloudUnitPriceTrend, setCloudUnitPriceTrend] = useState(saved?.cloudUnitPriceTrend ?? 0);\n', 1)
text = text.replace('      fastPBm, bulkPBm, egressPct, computeShare, growth, facility, powerRate, util,\n', '      fastPBm, bulkPBm, egressPct, computeShare, growth, cloudUnitPriceTrend, facility, powerRate, util,\n', 1)

old_inputs = '  const inputsObj = { bill, computeShare, odShare, gpuClass, ownSys, trainShare, util, fastPB, bulkPB, egressPct, growth, facility, powerRate, fNet, fSw, fNvaie, tier3Hrs, retrofit, migration, dualRun, redundancy, residPct, modelId, modelParamsB, quant, horizon, mode, gpuSizingCount, sourceClass, workingDayHours };'
new_inputs = '  const inputsObj = { bill, computeShare, odShare, gpuClass, ownSys, trainShare, util, fastPB, bulkPB, egressPct, growth, cloudUnitPriceTrend, facility, powerRate, fNet, fSw, fNvaie, tier3Hrs, retrofit, migration, dualRun, redundancy, residPct, modelId, modelParamsB, quant, horizon, mode, gpuSizingCount, sourceClass, workingDayHours };'
if old_inputs not in text: raise SystemExit('inputsObj anchor missing')
text = text.replace(old_inputs, new_inputs, 1)
text = text.replace('[bill, computeShare, odShare, gpuClass, ownSys, trainShare, util, fastPB, bulkPB, egressPct, storageAuto, growth, facility,', '[bill, computeShare, odShare, gpuClass, ownSys, trainShare, util, fastPB, bulkPB, egressPct, storageAuto, growth, cloudUnitPriceTrend, facility,', 1)

old_work = '    cloudYears = [0, 1, 2, 3, 4].map((y) => 12 * (adjCloud.monthlyCompute * Math.pow(1 + inp.growth, y) + cloudStorage * Math.pow(1 + RC.opsGrowth, y)));\n    cloudYearsFloor = [0, 1, 2, 3, 4].map((y) => 12 * (flrCloud.monthlyCompute * Math.pow(1 + inp.growth, y) + cloudStorage * Math.pow(1 + RC.opsGrowth, y)));'
new_work = '    cloudYears = [0, 1, 2, 3, 4].map((y) => 12 * (trendCloudGpuCompute(adjCloud.monthlyCompute, inp.growth, inp.cloudUnitPriceTrend, y) + cloudStorage * Math.pow(1 + RC.opsGrowth, y)));\n    cloudYearsFloor = [0, 1, 2, 3, 4].map((y) => 12 * (trendCloudGpuCompute(flrCloud.monthlyCompute, inp.growth, inp.cloudUnitPriceTrend, y) + cloudStorage * Math.pow(1 + RC.opsGrowth, y)));'
if old_work not in text: raise SystemExit('workload cloudYears anchor missing')
text = text.replace(old_work, new_work, 1)

old_bake = '    cloudYears = [0, 1, 2, 3, 4].map((y) =>\n      12 * (inp.bill * inp.computeShare * Math.pow(1 + inp.growth, y) + inp.bill * (1 - inp.computeShare) * Math.pow(1 + RC.opsGrowth, y))\n    );'
new_bake = '    cloudYears = [0, 1, 2, 3, 4].map((y) =>\n      12 * (trendCloudGpuCompute(inp.bill * inp.computeShare, inp.growth, inp.cloudUnitPriceTrend, y) + inp.bill * (1 - inp.computeShare) * Math.pow(1 + RC.opsGrowth, y))\n    );'
if old_bake not in text: raise SystemExit('bakeoff cloudYears anchor missing')
text = text.replace(old_bake, new_bake, 1)

start = text.find('        {view === "calc" && (\n          <div style={{ background: "#F7F7F7"')
if start == -1: raise SystemExit('preview block start missing')
gate = text.find('        {view === "gate" && (', start)
if gate == -1: raise SystemExit('gate anchor missing')
text = text[:start] + text[gate:]

insert_anchor = '        {/* TIER 2 */}\n        <Section title="Refine when known" badge="TIER 2" defaultOpen={false}>'
trend_block = '''        {view === "calc" && (\n          <div style={{ background: "#F7F7F7", border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>\n            <div style={{ ...mono, fontSize: 10, letterSpacing: 0.8, color: C.sub, marginBottom: 3 }}>CLOUD GPU PRICE SENSITIVITY</div>\n            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 4 }}>\n              <label htmlFor="cloud-unit-price-trend" style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>Cloud GPU unit-price trend</label>\n              <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: cloudUnitPriceTrend === 0 ? C.sub : C.ink }}>{cloudUnitPriceTrend > 0 ? "+" : ""}{cloudUnitPriceTrend}%/yr</span>\n            </div>\n            <input id="cloud-unit-price-trend" aria-label="Cloud GPU unit-price trend" type="range" min="-20" max="20" step="5" value={cloudUnitPriceTrend} onChange={(e) => setCloudUnitPriceTrend(Number(e.target.value))} style={{ width: "100%" }} />\n            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: C.sub, marginTop: -1 }}><span>-20%</span><span>0%</span><span>+20%</span></div>\n            <div style={{ fontSize: 11, color: C.sub, marginTop: 7, lineHeight: 1.4 }}>Applies an annual change to modeled cloud GPU compute rates only. Workload growth remains a separate consumption assumption.</div>\n          </div>\n        )}\n\n'''
if insert_anchor not in text: raise SystemExit('tier2 anchor missing')
text = text.replace(insert_anchor, trend_block + insert_anchor, 1)

text = text.replace('<Row label="Cloud unit-price assumption" value="Current rates held constant" sub="annual growth reflects increased workload consumption, not assumed provider price inflation or deflation" />', '<Row label="Cloud GPU unit-price trend" value={`${cloudUnitPriceTrend > 0 ? "+" : ""}${cloudUnitPriceTrend}%/yr`} sub="applies to modeled cloud GPU compute rates only; workload growth remains separate" />', 1)
text = text.replace('<b>Cloud unit-price assumption:</b> current cloud GPU rates are held constant across the analysis horizon. The annual growth assumption changes workload consumption, not the provider $/GPU-hr rate itself.', '<b>Cloud GPU unit-price trend:</b> {cloudUnitPriceTrend > 0 ? "+" : ""}{cloudUnitPriceTrend}%/yr applied to modeled cloud GPU compute rates only. Workload growth remains a separate consumption assumption.', 1)
text = text.replace('powerRate, fNet, fSw, fNvaie, retrofit, migration, dualRun, redundancy, residPct, computeShare, odShare, provider, ov, horizon, mode]);', 'powerRate, fNet, fSw, fNvaie, retrofit, migration, dualRun, redundancy, residPct, computeShare, odShare, provider, ov, horizon, mode, cloudUnitPriceTrend]);', 1)

p.write_text(text)

Path('scripts/validate_tco_cloud_unit_price_trend.mjs').write_text('''import { cloudGpuUnitPriceFactor, trendCloudGpuCompute } from "../src/cloudUnitPriceTrend.js";\nimport fs from "node:fs";\nfunction assert(c,m){ if(!c) throw new Error(m); }\nassert(cloudGpuUnitPriceFactor(0, 4) === 1, "0% trend must preserve exact baseline");\nassert(Math.abs(trendCloudGpuCompute(100, .25, -.10, 1) - 112.5) < 1e-9, "workload growth and price trend must compound independently");\nassert(Math.abs(trendCloudGpuCompute(100, .25, .10, 1) - 137.5) < 1e-9, "positive price trend must compound with workload growth");\nconst s=fs.readFileSync("src/TcoCalculator.jsx","utf8");\nassert(s.includes("trendCloudGpuCompute(adjCloud.monthlyCompute"), "workload-mode cloud compute must use production price trend");\nassert(s.includes("trendCloudGpuCompute(inp.bill * inp.computeShare"), "existing-spend mode must trend compute share only");\nassert(!s.includes("Preview only — does not affect results yet."), "preview warning must be removed");\nassert(s.includes("saved?.cloudUnitPriceTrend ?? 0"), "trend must persist with default 0% semantics");\nassert(s.includes("CLOUD GPU PRICE SENSITIVITY"), "production control must sit in calculator flow");\nconsole.log("TCO cloud unit-price trend PASS");\n''')

ch=Path('CHANGELOG.md')
c=ch.read_text()
entry='''\n## September 8, 2026 - TCO cloud GPU unit-price trend production sensitivity\n\n- Activated the cloud GPU unit-price trend sensitivity with a default of 0%/yr, preserving prior results unless changed.\n- The trend applies only to modeled cloud GPU compute rates; workload growth remains a separate consumption assumption and non-compute cloud costs retain their existing escalation basis.\n- Moved the control into the calculator flow between Tier 1 and Tier 2 refinement and removed the preview-only warning.\n- Persisted the selected assumption and exposed it in TCO reporting/audit language.\n\n'''
if entry.strip() not in c: ch.write_text(c.replace('# Changelog\n','# Changelog\n'+entry,1))
