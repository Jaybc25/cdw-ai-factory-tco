from pathlib import Path

PATH = Path("src/TcoCalculator.jsx")
text = PATH.read_text(encoding="utf-8")


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    text = text.replace(old, new, 1)


replace_once(
    '        @media print { .no-print{display:none!important} body{background:#fff} }\n',
    '''        .report-methodology-print{display:none}\n        @media print {\n          .no-print{display:none!important}\n          body{background:#fff}\n          .tco-app-header{display:none!important}\n          .tco-root{background:#fff!important}\n          .tco-root main{max-width:none!important;margin:0!important;padding:0!important}\n          .tco-print-report{border:none!important;border-radius:0!important;padding:0!important;margin:0!important}\n          .report-methodology-full{display:none!important}\n          .report-methodology-print{display:block!important}\n          .report-appendix{break-before:page;page-break-before:always}\n          .report-appendix-row{display:grid!important;grid-template-columns:minmax(0,42%) minmax(0,58%)!important;gap:12px!important;align-items:start!important}\n          .report-appendix-row>span:last-child{text-align:right;overflow-wrap:anywhere}\n          @page{size:Letter;margin:.35in}\n        }\n''',
    "print CSS",
)

replace_once(
    '        <div style={{ borderBottom: `1px solid ${C.line}`, paddingBottom: 14, marginBottom: 16 }}>\n',
    '        <div className="tco-app-header" style={{ borderBottom: `1px solid ${C.line}`, paddingBottom: 14, marginBottom: 16 }}>\n',
    "app header class",
)

replace_once(
    '''        {view === "report" && (\n          <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: 18, marginBottom: 14 }}>\n            <div className="no-print pdf-btn-row" style={{ display: "flex", gap: 8, marginBottom: 12 }}>\n''',
    '''        {view === "report" && (\n          <div className="tco-print-report" style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: 18, marginBottom: 14 }}>\n            <div className="no-print pdf-btn-row" style={{ display: "flex", gap: 8, marginBottom: 12 }}>\n''',
    "report wrapper class",
)

replace_once(
    '            <div style={{ fontSize: 11, color: C.sub, marginTop: 12 }}>\n              {r.isWorkloadMode ? (\n',
    '            <div className="report-methodology-full" style={{ fontSize: 11, color: C.sub, marginTop: 12 }}>\n              {r.isWorkloadMode ? (\n',
    "full methodology class",
)

method_end = '''            </div>\n            <div style={{ marginTop: 16 }}>\n              <div style={{ ...mono, fontSize: 10, letterSpacing: 1.2, color: C.sub, marginBottom: 6 }}>WHERE THE MONEY GOES IN YEAR 1</div>\n'''
method_new = '''            </div>\n            <div className="report-methodology-print" style={{ fontSize: 10.5, color: C.sub, marginTop: 10, lineHeight: 1.45 }}>\n              <b>Methodology summary:</b>{" "}\n              {r.isWorkloadMode\n                ? `On-prem capacity is sized from the GPU Sizing technical requirement; the cloud alternative prices that same workload using its duty cycle and the benchmark-derived generational capability factor.`\n                : `Reported cloud spend is normalized to GPU-hours at current reference rates; the comparable on-prem fleet is sized at ${Math.round(util * 100)}% target utilization and evaluated with an adjusted case plus a zero-performance-credit floor case.`}\n              {" "}Cash-flow TCO is shown in nominal dollars. Detailed assumptions, pricing provenance, caveats, and the reproducibility ledger appear in the appendix.\n            </div>\n            <div style={{ marginTop: 16 }}>\n              <div style={{ ...mono, fontSize: 10, letterSpacing: 1.2, color: C.sub, marginBottom: 6 }}>WHERE THE MONEY GOES IN YEAR 1</div>\n'''
replace_once(method_end, method_new, "print methodology summary")

appendix_old = '''            <div style={{ marginTop: 14 }}>\n              <div style={{ ...mono, fontSize: 10, letterSpacing: 1.2, color: C.sub, marginBottom: 4 }}>APPENDIX — FULL INPUTS & OUTPUTS (for independent reproduction)</div>\n'''
appendix_new = '''            <div className="report-appendix" style={{ marginTop: 14 }}>\n              <div style={{ ...mono, fontSize: 10, letterSpacing: 1.2, color: C.sub, marginBottom: 4 }}>APPENDIX - FULL INPUTS & OUTPUTS (for independent reproduction)</div>\n'''
replace_once(appendix_old, appendix_new, "appendix class")

row_old = '<div key={k} style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${C.line}`, padding: "2px 0" }}>'
row_count = text.count(row_old)
if row_count < 2:
    raise SystemExit(f"appendix rows: expected at least two compact row maps, found {row_count}")
text = text.replace(row_old, '<div className="report-appendix-row" key={k} style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${C.line}`, padding: "2px 0" }}>')

replace_once(
    '["Engine version", "v2.8 (UI restyle only — engine unchanged from v2.3; reference workbook audit-complete after 9 external rounds — see docs/ for the audited xlsx and spec)"],',
    '["Suite baseline", "AI Factory Suite 2026.09; current source may include unreleased maintenance changes. Core TCO formulas remain checked against the audited reference workbook in the permanent quality gate."],',
    "suite baseline label",
)

PATH.write_text(text, encoding="utf-8")
print("Applied branch-only TCO PDF layout experiment.")
