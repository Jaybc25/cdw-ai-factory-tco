from pathlib import Path

p = Path("src/TcoCalculator.jsx")
text = p.read_text(encoding="utf-8")


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    text = text.replace(old, new, 1)

replace_once(
    '''          .report-appendix{break-before:page;page-break-before:always}\n          .report-appendix-row{display:grid!important;grid-template-columns:minmax(0,42%) minmax(0,58%)!important;gap:12px!important;align-items:start!important}\n          .report-appendix-row>span:last-child{text-align:right;overflow-wrap:anywhere}\n''',
    '''          .report-cumulative{break-before:page;page-break-before:always;break-inside:avoid;page-break-inside:avoid}\n          .report-cumulative svg{max-height:165px}\n          .report-appendix{break-before:auto;page-break-before:auto;margin-top:8px!important}\n          .report-appendix-grid{font-size:10px!important;gap:1px 14px!important}\n          .report-appendix-row{display:grid!important;grid-template-columns:minmax(0,42%) minmax(0,58%)!important;gap:10px!important;align-items:start!important;line-height:1.2}\n          .report-appendix-row>span:last-child{text-align:right;overflow-wrap:anywhere}\n''',
    "print pagination CSS",
)

replace_once(
    '''            <div style={{ marginTop: 16 }}>\n              <div style={{ ...mono, fontSize: 10, letterSpacing: 1.2, color: C.sub, marginBottom: 6 }}>CUMULATIVE SPEND, {Math.max(2, horizon)}-YEAR VIEW{horizon < 2 ? " (min. 2yr shown for a readable trend)" : ""}</div>\n''',
    '''            <div className="report-cumulative" style={{ marginTop: 16 }}>\n              <div style={{ ...mono, fontSize: 10, letterSpacing: 1.2, color: C.sub, marginBottom: 6 }}>CUMULATIVE SPEND, {Math.max(2, horizon)}-YEAR VIEW{horizon < 2 ? " (min. 2yr shown for a readable trend)" : ""}</div>\n''',
    "cumulative section class",
)

replace_once(
    '<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 14px", fontSize: 11 }}>\n',
    '<div className="report-appendix-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 14px", fontSize: 11 }}>\n',
    "appendix grid class",
)

replace_once(
    '["Suite baseline", "AI Factory Suite 2026.09; current source may include unreleased maintenance changes. Core TCO formulas remain checked against the audited reference workbook in the permanent quality gate."],',
    '["Suite baseline", "AI Factory Suite 2026.09 baseline; current source may include Unreleased maintenance. TCO parity remains enforced against the audited reference workbook in CI."],',
    "suite baseline compact copy",
)

p.write_text(text, encoding="utf-8")
print("Applied two-page TCO PDF refinement.")
