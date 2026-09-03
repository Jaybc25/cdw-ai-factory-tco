from pathlib import Path

p = Path("src/ModelAdvisor.jsx")
text = p.read_text(encoding="utf-8")


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    text = text.replace(old, new, 1)

replace_once(
    '<style>{`@media print { .no-print { display: none !important; } body { background: #fff; } }`}</style>\n',
    '''<style>{`\n        @media print {\n          .no-print { display: none !important; }\n          body { background: #fff; }\n          .model-advisor-app-header { display: none !important; }\n          .model-advisor-print-report {\n            max-width: none !important;\n            margin: 0 !important;\n            padding: 0 !important;\n          }\n          .model-advisor-print-report .mb-6 { margin-bottom: .75rem !important; }\n          .model-advisor-print-report .gap-4 { gap: .65rem !important; }\n          .model-advisor-page2 {\n            break-before: auto;\n            page-break-before: auto;\n          }\n          @page { size: Letter; margin: .3in; }\n        }\n      `}</style>\n''',
    "print CSS",
)

replace_once(
    '<div className="border-b border-gray-200 px-6 py-4 flex items-center gap-3">\n',
    '<div className="model-advisor-app-header border-b border-gray-200 px-6 py-4 flex items-center gap-3">\n',
    "application header class",
)

replace_once(
    '''      {view === "report" && (\n        <div className="max-w-3xl mx-auto px-6 py-10">\n''',
    '''      {view === "report" && (\n        <div className="model-advisor-print-report max-w-3xl mx-auto px-6 py-10">\n''',
    "report wrapper class",
)

replace_once(
    '''            <div className="flex flex-col gap-4 mb-6">\n              {result.cards.map((c) => (\n                <RecommendationCard key={c.model.canonical_model_id} card={c} ranking={result.ranking} inputs={inputs} />\n              ))}\n            </div>\n          )}\n\n          {result.otherEligible.length > 0 && (\n''',
    '''            <div className="flex flex-col gap-4 mb-6">\n              {result.cards.map((c) => (\n                <RecommendationCard key={c.model.canonical_model_id} card={c} ranking={result.ranking} inputs={inputs} />\n              ))}\n            </div>\n          )}\n\n          <div className="model-advisor-page2">\n          {result.otherEligible.length > 0 && (\n''',
    "lower report section wrapper",
)

replace_once(
    '''          <div className="border-t-2 pt-4 flex justify-between" style={{ borderColor: CHARCOAL }}>\n            <div>\n              <div className="text-sm font-bold" style={{ color: CHARCOAL }}>Jay B. Carlile</div>\n              <div className="text-xs text-gray-500">AI Solutions Executive &middot; CDW AI Factory</div>\n            </div>\n            <div className="text-xs text-gray-500 text-right">Next step: bring your actual<br />deployment constraints for a validated shortlist</div>\n          </div>\n        </div>\n      )}\n''',
    '''          <div className="border-t-2 pt-4 flex justify-between" style={{ borderColor: CHARCOAL }}>\n            <div>\n              <div className="text-sm font-bold" style={{ color: CHARCOAL }}>Jay B. Carlile</div>\n              <div className="text-xs text-gray-500">AI Solutions Executive &middot; CDW AI Factory</div>\n            </div>\n            <div className="text-xs text-gray-500 text-right">Next step: bring your actual<br />deployment constraints for a validated shortlist</div>\n          </div>\n          </div>\n        </div>\n      )}\n''',
    "lower report section end",
)

p.write_text(text, encoding="utf-8")
print("Applied branch-only Model Advisor PDF layout experiment.")
