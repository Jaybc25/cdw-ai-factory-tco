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
    '''<style>{`\n        @media print {\n          .no-print { display: none !important; }\n          body { background: #fff; }\n          .readiness-report-root {\n            position: absolute !important;\n            inset: 0 auto auto 0 !important;\n            width: 100% !important;\n            background: #fff !important;\n            z-index: 9999 !important;\n          }\n          body * { visibility: hidden !important; }\n          .readiness-report-root, .readiness-report-root * { visibility: visible !important; }\n          .readiness-report-root { font-size: 95%; }\n          .readiness-report-root .readiness-report-section {\n            break-inside: avoid;\n            page-break-inside: avoid;\n          }\n          .readiness-report-root .readiness-report-footer {\n            break-inside: avoid;\n            page-break-inside: avoid;\n            margin-top: 14px !important;\n          }\n          @page { size: Letter; margin: .35in; }\n        }\n      `}</style>\n''',
    "print CSS",
)

replace_once(
    '''                {emailDone && (\n                  <div>\n                    <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 16 }}>\n''',
    '''                {emailDone && (\n                  <div className="readiness-report-root">\n                    <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 16 }}>\n''',
    "report root",
)

text = text.replace(
    '<div key={door.id} style={{ marginBottom: 26 }}>',
    '<div key={door.id} className="readiness-report-section" style={{ marginBottom: 20 }}>',
)

replace_once(
    '''                    <div style={{ ...S.footer, marginTop: 28 }}>\n''',
    '''                    <div className="readiness-report-footer" style={{ ...S.footer, marginTop: 28 }}>\n''',
    "report footer",
)

p.write_text(text, encoding="utf-8")
print("Applied branch-only Readiness PDF layout experiment.")
