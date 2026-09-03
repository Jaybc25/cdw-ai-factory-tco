from pathlib import Path

p = Path("src/GpuSizingCalculator.jsx")
text = p.read_text(encoding="utf-8")


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    text = text.replace(old, new, 1)

replace_once(
    '<style>{`@media print { .no-print { display: none !important; } body { background: #fff; } }`}</style>\n',
    '''<style>{`\n        @media print {\n          .no-print { display: none !important; }\n          body { background: #fff; }\n          .gpu-app-header { display: none !important; }\n          .gpu-print-report {\n            max-width: none !important;\n            margin: 0 !important;\n            padding: 0 !important;\n          }\n          .gpu-report-utilization {\n            break-inside: avoid;\n            page-break-inside: avoid;\n          }\n          .gpu-report-page2 {\n            break-before: page;\n            page-break-before: always;\n          }\n          .gpu-report-page2 .mb-6 { margin-bottom: 1rem !important; }\n          @page { size: Letter; margin: .35in; }\n        }\n      `}</style>\n''',
    "print CSS",
)

replace_once(
    '<div className="border-b border-gray-200 px-6 py-4 flex items-center gap-3">\n',
    '<div className="gpu-app-header border-b border-gray-200 px-6 py-4 flex items-center gap-3">\n',
    "application header class",
)

replace_once(
    '''      {view === "report" && result && (\n        <div className="max-w-3xl mx-auto px-6 py-10">\n''',
    '''      {view === "report" && result && (\n        <div className="gpu-print-report max-w-3xl mx-auto px-6 py-10">\n''',
    "report wrapper class",
)

replace_once(
    '''          {mode === "Inference" && (\n            <UtilizationPanel result={result} workingDayHours={workingDayHours} onWorkingDayHoursChange={setWorkingDayHours} />\n          )}\n\n          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2 mt-6">Assumptions used</div>\n''',
    '''          {mode === "Inference" && (\n            <div className="gpu-report-utilization">\n              <UtilizationPanel result={result} workingDayHours={workingDayHours} onWorkingDayHoursChange={setWorkingDayHours} />\n            </div>\n          )}\n\n          <div className="gpu-report-page2">\n          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2 mt-6">Assumptions used</div>\n''',
    "utilization and page 2 start",
)

replace_once(
    '''          <div className="border-t-2 pt-4 flex justify-between" style={{ borderColor: CHARCOAL }}>\n            <div>\n              <div className="text-sm font-bold" style={{ color: CHARCOAL }}>Jay B. Carlile</div>\n              <div className="text-xs text-gray-500">AI Solutions Executive &middot; CDW AI Factory</div>\n            </div>\n            <div className="text-xs text-gray-500 text-right">Next step: bring your actual<br />workload data for a validated sizing</div>\n          </div>\n        </div>\n      )}\n''',
    '''          <div className="border-t-2 pt-4 flex justify-between" style={{ borderColor: CHARCOAL }}>\n            <div>\n              <div className="text-sm font-bold" style={{ color: CHARCOAL }}>Jay B. Carlile</div>\n              <div className="text-xs text-gray-500">AI Solutions Executive &middot; CDW AI Factory</div>\n            </div>\n            <div className="text-xs text-gray-500 text-right">Next step: bring your actual<br />workload data for a validated sizing</div>\n          </div>\n          </div>\n        </div>\n      )}\n''',
    "page 2 end",
)

p.write_text(text, encoding="utf-8")
print("Applied branch-only GPU Sizing PDF layout experiment.")
