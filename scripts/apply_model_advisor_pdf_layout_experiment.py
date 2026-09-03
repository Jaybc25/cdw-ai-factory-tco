from pathlib import Path
p=Path('src/ModelAdvisor.jsx'); text=p.read_text()
def r(a,b,label):
 global text
 c=text.count(a)
 if c!=1: raise SystemExit(f'{label}: expected 1 match, found {c}')
 text=text.replace(a,b,1)
r('<style>{`@media print { .no-print { display: none !important; } body { background: #fff; } }`}</style>\n','''<style>{`\n        @media print {\n          .no-print { display: none !important; }\n          body { background: #fff; }\n          .model-advisor-app-header { display: none !important; }\n          .model-advisor-print-report { max-width: none !important; margin: 0 !important; padding: 0 !important; }\n          .model-advisor-print-report .mb-6 { margin-bottom: .75rem !important; }\n          .model-advisor-print-report .gap-4 { gap: .65rem !important; }\n          @page { size: Letter; margin: .3in; }\n        }\n      `}</style>\n''','print CSS')
r('<div className="border-b border-gray-200 px-6 py-4 flex items-center gap-3">\n','<div className="model-advisor-app-header border-b border-gray-200 px-6 py-4 flex items-center gap-3">\n','header')
r('''      {view === "report" && (\n        <div className="max-w-3xl mx-auto px-6 py-10">\n''','''      {view === "report" && (\n        <div className="model-advisor-print-report max-w-3xl mx-auto px-6 py-10">\n''','report wrapper')
p.write_text(text); print('Applied one-page Model Advisor print layout.')
