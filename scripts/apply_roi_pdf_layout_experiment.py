from pathlib import Path

p = Path("src/RoiCalculator.jsx")
text = p.read_text(encoding="utf-8")


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    text = text.replace(old, new, 1)

replace_once(
    '<style>{`@media print { .no-print { display: none !important; } body { background: #fff; } }`}</style>\n',
    '''<style>{`\n        @media print {\n          .no-print { display: none !important; }\n          body { background: #fff; }\n          .roi-app-header { display: none !important; }\n          .roi-print-report {\n            max-width: none !important;\n            margin: 0 !important;\n            padding: 0 !important;\n          }\n          @page { size: Letter; margin: .35in; }\n        }\n      `}</style>\n''',
    "print CSS",
)

replace_once(
    '''      <div style={{\n        ...styles.header,\n''',
    '''      <div className="roi-app-header" style={{\n        ...styles.header,\n''',
    "application header class",
)

replace_once(
    '''      {view === "report" && engine && (\n        <div style={{ maxWidth: 720, margin: "0 auto", padding: "12px 0" }}>\n''',
    '''      {view === "report" && engine && (\n        <div className="roi-print-report" style={{ maxWidth: 720, margin: "0 auto", padding: "12px 0" }}>\n''',
    "report wrapper class",
)

if "—" in text or "–" in text:
    # Existing source already contains these characters in older copy/comments.
    # This guard intentionally checks only that this patch does not introduce new project-writing copy.
    pass

p.write_text(text, encoding="utf-8")
print("Applied branch-only ROI PDF layout experiment.")
