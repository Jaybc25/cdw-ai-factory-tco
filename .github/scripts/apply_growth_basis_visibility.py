from pathlib import Path

p = Path('src/TcoCalculator.jsx')
s = p.read_text()
old = '''        </div>\n\n\n        {view === "gate" && ('''
new = '''        </div>\n\n        {view === "calc" && r.isWorkloadMode && (\n          <div style={{ background: gpuSizingBasis === "higher-growth" ? "#FFF5F5" : C.panel, border: `1px solid ${gpuSizingBasis === "higher-growth" ? "#E6A3A3" : C.line}`, borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>\n            <div style={{ ...mono, fontSize: 10, letterSpacing: 0.8, color: gpuSizingBasis === "higher-growth" ? C.red : C.sub, marginBottom: 3 }}>SIZING BASIS</div>\n            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>\n              {gpuSizingBasis === "higher-growth" ? "Higher-growth alternative selected in GPU Sizing" : "Recommended configuration from GPU Sizing"}\n            </div>\n            {gpuSizingBasis === "higher-growth" && (\n              <div style={{ fontSize: 12, color: C.sub, marginTop: 3 }}>This configuration intentionally includes additional capacity/headroom beyond the primary recommendation.</div>\n            )}\n          </div>\n        )}\n\n        {view === "gate" && ('''
if old not in s:
    raise SystemExit('visibility insertion anchor not found')
p.write_text(s.replace(old, new, 1))
