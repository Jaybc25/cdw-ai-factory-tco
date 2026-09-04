from pathlib import Path

p = Path("src/AiReadinessChecklists.jsx")
text = p.read_text(encoding="utf-8")


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    text = text.replace(old, new, 1)

replace_once(
    '<style>{`@media print { .no-print { display: none !important; } }`}</style>\n',
    '''<style>{`\n        .readiness-print-only { display: none; }\n        @media print {\n          .no-print { display: none !important; }\n          body { background: #fff; }\n          body * { visibility: hidden !important; }\n          .readiness-report-root, .readiness-report-root * { visibility: visible !important; }\n          .readiness-report-root {\n            position: absolute !important;\n            inset: 0 auto auto 0 !important;\n            width: 100% !important;\n            max-width: none !important;\n            margin: 0 !important;\n            padding: 0 !important;\n            background: #fff !important;\n            z-index: 9999 !important;\n            font-size: 95%;\n          }\n          .readiness-print-only { display: block !important; }\n          .readiness-report-root .readiness-report-section {\n            break-inside: avoid;\n            page-break-inside: avoid;\n          }\n          .readiness-report-root .readiness-report-footer {\n            break-inside: avoid;\n            page-break-inside: avoid;\n            margin-top: 14px !important;\n          }\n          @page { size: Letter; margin: .35in; }\n        }\n      `}</style>\n''',
    "print CSS",
)

replace_once(
    '''                {emailDone && (\n                  <div>\n                    <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 16 }}>\n''',
    '''                {emailDone && (\n                  <div className="readiness-report-root">\n                    <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 16 }}>\n''',
    "report root",
)

# Keep each detailed door section together where practical.
text = text.replace(
    '<div key={d.id} style={{ marginBottom: 26 }}>',
    '<div key={d.id} className="readiness-report-section" style={{ marginBottom: 20 }}>',
)

replace_once(
    '''                    <div style={{ borderTop: `2px solid ${C.charcoal}`, marginTop: 18, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>\n                      <div>\n                        <div style={{ fontWeight: 700, fontSize: 13, color: C.charcoal }}>Jay B. Carlile</div>\n                        <div style={{ fontSize: 11, color: C.slate }}>AI Solutions Executive &middot; CDW AI Factory</div>\n                      </div>\n                      <div style={{ fontSize: 11, color: C.slate, textAlign: "right" }}>Next step: bring these gaps to<br />a CDW AI Factory specialist</div>\n                    </div>\n''',
    '''                    <div className="readiness-report-footer" style={{ borderTop: `2px solid ${C.charcoal}`, marginTop: 18, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>\n                      <div>\n                        <div style={{ fontWeight: 700, fontSize: 13, color: C.charcoal }}>Jay B. Carlile</div>\n                        <div style={{ fontSize: 11, color: C.slate }}>AI Solutions Executive &middot; CDW AI Factory</div>\n                      </div>\n                      <div style={{ fontSize: 11, color: C.slate, textAlign: "right" }}>Next step: bring these gaps to<br />a CDW AI Factory specialist</div>\n                    </div>\n                    <div className="readiness-print-only readiness-report-footer" style={{ marginTop: 14, paddingTop: 10, borderTop: `1px solid ${C.line}`, color: C.slate, fontSize: 11.5, lineHeight: 1.45 }}>\n                      <p style={{ margin: "0 0 4px" }}>\n                        These checklists record what you tell them and organize the gaps. They don't certify, validate, or verify anything,\n                        and they aren't legal or compliance advice — the teams named on each question determine what applies to your organization.\n                      </p>\n                      <p style={{ margin: 0 }}>CDW AI Factory · Draft for internal, seller-assisted use · Content version {checklistData.content_version}</p>\n                    </div>\n''',
    "report signature/footer",
)

p.write_text(text, encoding="utf-8")
print("Applied branch-only Readiness PDF layout experiment.")
