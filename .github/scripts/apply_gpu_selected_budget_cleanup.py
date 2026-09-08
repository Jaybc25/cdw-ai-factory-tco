from pathlib import Path

p = Path("src/GpuSizingCalculator.jsx")
text = p.read_text()

old = '''  const tcoSelectedClass = effectiveTcoSelection === "higher-growth" ? result?.higherGrowth?.class : result?.selectedClass;\n  const tcoSelectedCount = effectiveTcoSelection === "higher-growth" ? result?.higherGrowth?.recommended : result?.recommended;\n'''
new = '''  const tcoSelectedClass = effectiveTcoSelection === "higher-growth" ? result?.higherGrowth?.class : result?.selectedClass;\n  const tcoSelectedCount = effectiveTcoSelection === "higher-growth" ? result?.higherGrowth?.recommended : result?.recommended;\n  const selectedBudget = effectiveTcoSelection === "higher-growth" ? result?.budget?.higherGrowth : result?.budget?.recommended;\n'''
if old not in text:
    raise SystemExit("selected budget anchor not found")
text = text.replace(old, new, 1)

old = '''function PodSizingHandoff() {\n  return (\n    <div className="mb-6 rounded-xl p-4 border border-dashed border-gray-300 bg-gray-50 flex items-center justify-between gap-3">\n      <div>\n        <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-0.5">Next: Pod Sizing</div>\n        <div className="text-xs text-gray-500">Full deployment build-out -- networking, storage, power. Coming soon.</div>\n      </div>\n      <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-200 text-gray-600 flex-shrink-0">Coming soon</span>\n    </div>\n  );\n}\n\n'''
if old not in text:
    raise SystemExit("PodSizingHandoff component not found")
text = text.replace(old, "", 1)

old = '''              <BudgetPanel budget={result.budget} />\n'''
new = '''              <BudgetPanel budget={selectedBudget ? { recommended: selectedBudget } : null} />\n'''
if old not in text:
    raise SystemExit("calculator BudgetPanel anchor not found")
text = text.replace(old, new, 1)

old = '''              <PodSizingHandoff />\n'''
if old not in text:
    raise SystemExit("PodSizingHandoff render not found")
text = text.replace(old, "", 1)

p.write_text(text)

# Durable changelog note.
c = Path("CHANGELOG.md")
ct = c.read_text()
marker = "# Changelog\n"
entry = '''\n## September 8, 2026 - GPU Sizing selected-budget cleanup\n\n- Estimated Budget now follows the configuration explicitly selected for TCO, so selecting a Higher-Growth Alternative updates the visible budget to that configuration's existing pricing basis.\n- Removed the Pod Sizing `Coming soon` placeholder from the current production GPU Sizing journey; deployment-buildout/pod experience remains deferred to Phase 2.\n- No sizing methodology, pricing data, TCO economics, or hardware recommendation logic changed.\n\n'''
if entry.strip() not in ct:
    c.write_text(ct.replace(marker, marker + entry, 1))
