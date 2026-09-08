from pathlib import Path

p = Path('src/GpuSizingCalculator.jsx')
s = p.read_text()

old = '''function ResultCard({ icon: Icon, title, gpuClass, gpus, subtitle, accent, emptyMessage }) {
  if (gpuClass == null) {
    return (
      <div
        className="rounded-xl p-5 flex-1 min-w-[220px]"
        style={{ background: accent ? CHARCOAL : "#F7F7F7", color: accent ? "white" : CHARCOAL }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4" style={{ color: RED }} />
          <span className="text-xs font-bold uppercase tracking-wide" style={{ opacity: 0.8 }}>{title}</span>
        </div>
        <div className="text-sm" style={{ opacity: 0.7 }}>{emptyMessage || `No qualifying ${title.toLowerCase()} in the current supported catalog.`}</div>
      </div>
    );
  }
  return (
    <div
      className="rounded-xl p-5 flex-1 min-w-[220px]"
      style={{ background: accent ? CHARCOAL : "#F7F7F7", color: accent ? "white" : CHARCOAL }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color: RED }} />
        <span className="text-xs font-bold uppercase tracking-wide" style={{ opacity: 0.8 }}>{title}</span>
      </div>
      <div className="text-3xl font-bold mb-1">{gpus} <span className="text-base font-normal">GPUs</span></div>
      <div className="text-sm font-semibold" style={{ color: accent ? "white" : CHARCOAL }}>{gpuClass}</div>
      {subtitle && <div className="text-xs mt-1" style={{ opacity: 0.7 }}>{subtitle}</div>}
    </div>
  );
}'''
new = '''function ResultCard({ icon: Icon, title, gpuClass, gpus, subtitle, accent, emptyMessage, selectable = false, selected = false, onSelect }) {
  if (gpuClass == null) {
    return (
      <div
        className="rounded-xl p-5 flex-1 min-w-[220px]"
        style={{ background: accent ? CHARCOAL : "#F7F7F7", color: accent ? "white" : CHARCOAL }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4" style={{ color: RED }} />
          <span className="text-xs font-bold uppercase tracking-wide" style={{ opacity: 0.8 }}>{title}</span>
        </div>
        <div className="text-sm" style={{ opacity: 0.7 }}>{emptyMessage || `No qualifying ${title.toLowerCase()} in the current supported catalog.`}</div>
      </div>
    );
  }
  const cardStyle = {
    background: accent ? CHARCOAL : "#F7F7F7",
    color: accent ? "white" : CHARCOAL,
    border: selectable ? `2px solid ${selected ? RED : "transparent"}` : undefined,
    boxShadow: selectable && selected ? "0 0 0 2px rgba(204,0,0,0.14)" : undefined,
    cursor: selectable ? "pointer" : undefined,
  };
  const content = (
    <>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color: RED }} />
        <span className="text-xs font-bold uppercase tracking-wide" style={{ opacity: 0.8 }}>{title}</span>
      </div>
      {selectable && (
        <div className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: selected ? RED : (accent ? "#D1D5DB" : "#707070") }}>
          {selected ? "Selected for TCO" : "Tap to select for TCO"}
        </div>
      )}
      <div className="text-3xl font-bold mb-1">{gpus} <span className="text-base font-normal">GPUs</span></div>
      <div className="text-sm font-semibold" style={{ color: accent ? "white" : CHARCOAL }}>{gpuClass}</div>
      {subtitle && <div className="text-xs mt-1" style={{ opacity: 0.7 }}>{subtitle}</div>}
    </>
  );
  if (selectable) {
    return (
      <button type="button" onClick={onSelect} aria-pressed={selected} className="rounded-xl p-5 flex-1 min-w-[220px] text-left" style={cardStyle}>
        {content}
      </button>
    );
  }
  return <div className="rounded-xl p-5 flex-1 min-w-[220px]" style={cardStyle}>{content}</div>;
}'''
assert old in s, 'ResultCard definition anchor not found'
s = s.replace(old, new, 1)

start = s.index('function TcoConfigurationSelector(')
end = s.index('\nfunction getIncomingParams()', start)
s = s[:start] + s[end+1:]

old = '''              <div className="flex flex-wrap gap-3 mb-4"><ResultCard icon={Cpu} title="Minimum technical" gpuClass={result.selectedClass} gpus={result.minTechnical} subtitle="Unrounded workload requirement" /><ResultCard icon={Zap} title="Recommended" gpuClass={result.selectedClass} gpus={result.recommended} subtitle="Node-rounded for production" accent /></div>
              <div className="flex flex-wrap gap-3 mb-6"><ResultCard icon={TrendingDown} title="Lower-cost alternative" gpuClass={result.lowerCost.class} gpus={result.lowerCost.recommended} emptyMessage="No qualifying lower-cost alternative in the current supported catalog." /><ResultCard icon={TrendingUp} title="Higher-growth alternative" gpuClass={result.higherGrowth.class} gpus={result.higherGrowth.recommended} emptyMessage="No qualifying higher-growth alternative in the current supported catalog." /></div>'''
new = '''              <div className="flex flex-wrap gap-3 mb-4"><ResultCard icon={Cpu} title="Minimum technical" gpuClass={result.selectedClass} gpus={result.minTechnical} subtitle="Unrounded workload requirement" /><ResultCard icon={Zap} title="Recommended" gpuClass={result.selectedClass} gpus={result.recommended} subtitle="Node-rounded for production" accent selectable selected={effectiveTcoSelection === "recommended"} onSelect={() => setTcoSelection("recommended")} /></div>
              <div className="flex flex-wrap gap-3 mb-6"><ResultCard icon={TrendingDown} title="Lower-cost alternative" gpuClass={result.lowerCost.class} gpus={result.lowerCost.recommended} emptyMessage="No qualifying lower-cost alternative in the current supported catalog." /><ResultCard icon={TrendingUp} title="Higher-growth alternative" gpuClass={result.higherGrowth.class} gpus={result.higherGrowth.recommended} emptyMessage="No qualifying higher-growth alternative in the current supported catalog." selectable={!!result.higherGrowth.class} selected={effectiveTcoSelection === "higher-growth"} onSelect={() => setTcoSelection("higher-growth")} /></div>'''
assert old in s, 'calculator cards anchor not found'
s = s.replace(old, new, 1)

old = '''              <TcoConfigurationSelector result={result} selection={effectiveTcoSelection} onSelectionChange={setTcoSelection} />
              <TcoHandoff'''
new = '''              <TcoHandoff'''
assert old in s, 'redundant selector render anchor not found'
s = s.replace(old, new, 1)
p.write_text(s)

p = Path('tests/e2e/gpu-sizing-architecture-aware.spec.js')
s = p.read_text()
old = '''  const recommendedChoice = page.getByRole("button", { name: /Recommended · Selected for TCO/i });
  await expect(recommendedChoice).toBeVisible();
  await expect(recommendedChoice).toHaveAttribute("aria-pressed", "true");

  const higherGrowthChoice = page.getByRole("button", { name: /Higher-growth/i });'''
new = '''  const recommendedChoice = page.getByRole("button", { name: /Recommended.*Selected for TCO/i });
  await expect(recommendedChoice).toBeVisible();
  await expect(recommendedChoice).toHaveAttribute("aria-pressed", "true");

  const higherGrowthChoice = page.getByRole("button", { name: /Higher-growth alternative/i });'''
assert old in s, 'test selector anchor not found'
s = s.replace(old, new, 1)
old = '''  await chooseInferenceModel(page, "llama-4-scout");
  await expect(page.getByRole("button", { name: /Recommended · Selected for TCO/i })).toHaveAttribute("aria-pressed", "true");'''
new = '''  await chooseInferenceModel(page, "llama-4-scout");
  await expect(page.getByRole("button", { name: /Recommended.*Selected for TCO/i })).toHaveAttribute("aria-pressed", "true");'''
assert old in s, 'reset selector anchor not found'
s = s.replace(old, new, 1)
p.write_text(s)
