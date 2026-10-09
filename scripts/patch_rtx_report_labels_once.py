from pathlib import Path

path = Path("src/GpuSizingCalculator.jsx")
s = path.read_text()

old_report = '''          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">{effectiveTcoSelection === "higher-growth" ? "Selected configuration for TCO" : "Recommended configuration"}</div>
          <div className="flex flex-wrap gap-3 mb-6">
            <ResultCard
              icon={effectiveTcoSelection === "higher-growth" ? TrendingUp : Zap}
              title={effectiveTcoSelection === "higher-growth" ? "Selected for TCO · Higher-growth" : "Recommended"}
              gpuClass={tcoSelectedClass}
              gpus={tcoSelectedCount}
              subtitle={effectiveTcoSelection === "higher-growth" ? getHigherGrowthSubtitle(result.higherGrowth) : "Node-rounded for production"}
              accent
            />
          </div>'''
new_report = '''          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">{effectiveTcoSelection === "recommended" ? "Recommended configuration" : "Selected configuration for TCO"}</div>
          <div className="flex flex-wrap gap-3 mb-6">
            <ResultCard
              icon={effectiveTcoSelection === "rtx" ? TrendingDown : effectiveTcoSelection === "higher-growth" ? TrendingUp : Zap}
              title={effectiveTcoSelection === "rtx" ? "Selected for TCO · Lower-cost" : effectiveTcoSelection === "higher-growth" ? "Selected for TCO · Higher-growth" : "Recommended"}
              gpuClass={tcoSelectedClass}
              gpus={tcoSelectedCount}
              subtitle={effectiveTcoSelection === "rtx" ? "Right-sized private AI · independent serving replicas" : effectiveTcoSelection === "higher-growth" ? getHigherGrowthSubtitle(result.higherGrowth) : "Node-rounded for production"}
              accent
            />
          </div>'''
assert s.count(old_report) == 1, f"report guard failed: {s.count(old_report)}"
s = s.replace(old_report, new_report)

old_audit = '''          <AuditRow label="TCO selection basis" value={effectiveTcoSelection === "higher-growth" ? "User-selected higher-growth alternative" : "Recommended configuration"} />
          <AuditFormula
            label="Selected configuration for TCO"
            formula={effectiveTcoSelection === "higher-growth" ? "selected = higher-growth deployment chosen by the user" : "selected = recommended node-rounded configuration"}
            substituted={effectiveTcoSelection === "higher-growth" ? getHigherGrowthAuditText(result.higherGrowth, mode) : `${result.recommended} × ${result.selectedClass}`}
            result={`${tcoSelectedCount} × ${tcoSelectedClass}`}
          />'''
new_audit = '''          <AuditRow label="TCO selection basis" value={effectiveTcoSelection === "rtx" ? "User-selected lower-cost RTX PRO alternative" : effectiveTcoSelection === "higher-growth" ? "User-selected higher-growth alternative" : "Recommended configuration"} />
          <AuditFormula
            label="Selected configuration for TCO"
            formula={effectiveTcoSelection === "rtx" ? "selected = benchmark-qualified RTX PRO deployment chosen by the user" : effectiveTcoSelection === "higher-growth" ? "selected = higher-growth deployment chosen by the user" : "selected = recommended node-rounded configuration"}
            substituted={effectiveTcoSelection === "rtx" ? `${result.rtxAlt?.deployment?.totalDeployedGpus ?? "—"} × RTX PRO 6000 · ${result.rtxAlt?.benchmark?.id || "benchmark unavailable"}` : effectiveTcoSelection === "higher-growth" ? getHigherGrowthAuditText(result.higherGrowth, mode) : `${result.recommended} × ${result.selectedClass}`}
            result={`${tcoSelectedCount} × ${tcoSelectedClass}`}
          />'''
assert s.count(old_audit) == 1, f"audit guard failed: {s.count(old_audit)}"
s = s.replace(old_audit, new_audit)

path.write_text(s)
