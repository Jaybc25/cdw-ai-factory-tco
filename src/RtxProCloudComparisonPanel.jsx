import React, { useMemo, useState } from "react";

const RED = "#CC0000";
const INK = "#2D2D2D";

function money(value) {
  if (!Number.isFinite(Number(value))) return "—";
  return `$${Math.round(Number(value)).toLocaleString("en-US")}`;
}

function pct(value) {
  if (!Number.isFinite(Number(value))) return "—";
  return `${Math.abs(Number(value) * 100).toFixed(0)}%`;
}

function evidenceLabel(row) {
  if (!row) return "Unavailable";
  if (row.customerFacingRateReady) return "VERIFIED PUBLIC RATE";
  if (row.status === "READY_FOR_ENGINEERING_COMPARISON") return "ENGINEERING RATE · VERIFY BEFORE CLIENT USE";
  return "RATE NOT READY";
}

function CrossoverChart({ row, horizonYears }) {
  const points = row?.cumulativeByYear || [];
  if (!points.length) return null;
  const shown = points.slice(0, Math.max(1, Number(horizonYears) || 1));
  const W = 660;
  const H = 220;
  const padL = 58;
  const padR = 18;
  const padT = 26;
  const padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const maxVal = Math.max(1, ...shown.map((p) => Math.max(p.cloudUSD, p.onPremUSD)));
  const n = shown.length;
  const xFor = (i) => padL + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2);
  const yFor = (value) => padT + plotH - (Number(value) / maxVal) * plotH;
  const cloudPts = shown.map((p, i) => `${xFor(i)},${yFor(p.cloudUSD)}`).join(" ");
  const onPremPts = shown.map((p, i) => `${xFor(i)},${yFor(p.onPremUSD)}`).join(" ");
  const crossYear = row.crossoverMonth ? row.crossoverMonth / 12 : null;
  const crossX = crossYear != null && crossYear >= 1 && crossYear <= Number(horizonYears) && n > 1
    ? padL + ((crossYear - 1) / (n - 1)) * plotW
    : null;

  return (
    <div data-testid="rtx-cloud-crossover-chart">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Cumulative spend comparison for ${row.provider}`} style={{ display: "block", overflow: "visible" }}>
        {shown.map((_, i) => <line key={`grid-${i}`} x1={xFor(i)} y1={padT} x2={xFor(i)} y2={padT + plotH} stroke="#E5E7EB" strokeWidth="1" />)}
        {crossX != null && <line x1={crossX} y1={padT} x2={crossX} y2={padT + plotH} stroke={INK} strokeWidth="1" strokeDasharray="5,4" opacity="0.5" />}
        <polyline points={cloudPts} fill="none" stroke="#8A8A8A" strokeWidth="3" />
        <polyline points={onPremPts} fill="none" stroke={RED} strokeWidth="3" />
        {shown.map((p, i) => <circle key={`cloud-${i}`} cx={xFor(i)} cy={yFor(p.cloudUSD)} r="3.5" fill="#8A8A8A" />)}
        {shown.map((p, i) => <circle key={`prem-${i}`} cx={xFor(i)} cy={yFor(p.onPremUSD)} r="3.5" fill={RED} />)}
        {shown.map((p, i) => <text key={`year-${i}`} x={xFor(i)} y={H - 7} textAnchor="middle" fontSize="11" fill="#6B7280">Yr {p.year}</text>)}
      </svg>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600 mt-1">
        <span><span className="inline-block w-3 h-0.5 bg-gray-500 mr-1 align-middle" />{row.provider} cumulative</span>
        <span><span className="inline-block w-3 h-0.5 mr-1 align-middle" style={{ background: RED }} />On-prem RTX PRO cumulative</span>
        {row.crossoverWithinHorizon && <span className="font-semibold" style={{ color: INK }}>Crossover month {row.crossoverMonth}</span>}
      </div>
    </div>
  );
}

export default function RtxProCloudComparisonPanel({ comparison, horizonYears, compact = false }) {
  const readyRows = comparison?.rows?.filter((row) => row.status === "READY_FOR_ENGINEERING_COMPARISON") || [];
  const verifiedRows = comparison?.verifiedRows || [];
  const recommendation = comparison?.verifiedRecommendation || null;
  const defaultProvider = recommendation?.cloudProvider || verifiedRows[0]?.provider || readyRows[0]?.provider || null;
  const [selectedProvider, setSelectedProvider] = useState(defaultProvider);

  const selected = useMemo(() => {
    const exact = readyRows.find((row) => row.provider === selectedProvider);
    return exact || readyRows.find((row) => row.provider === defaultProvider) || readyRows[0] || null;
  }, [readyRows, selectedProvider, defaultProvider]);

  if (!comparison || comparison.status === "NO_COMPARABLE_CLOUD_RATE") {
    return <section className="rounded-xl border border-gray-200 bg-gray-50 p-5 mb-5"><div className="text-sm font-bold" style={{ color: INK }}>Cloud comparison pending</div><div className="text-xs text-gray-600 mt-1">A comparable RTX PRO cloud rate is not yet available for this configuration.</div></section>;
  }

  if (!recommendation) {
    return <section className="rounded-xl border border-amber-300 bg-amber-50 p-5 mb-5"><div className="text-sm font-bold text-amber-950">Cloud comparison evidence is not yet recommendation-ready</div><div className="text-xs text-amber-900 mt-1">Engineering comparisons may be available below, but no provider with a customer-facing verified rate is available for a preferred-path recommendation.</div></section>;
  }

  const onPremPreferred = recommendation.preferredPath === "ON_PREM";
  const savingsPositive = Number(recommendation.savingsUSD) >= 0;

  return (
    <section data-testid="rtx-cloud-comparison-panel" className="rounded-xl border border-gray-300 bg-white p-5 mb-5">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide" style={{ color: RED }}>Cloud vs on-prem decision</div>
          <h3 className="text-xl font-bold mt-1" style={{ color: INK }}>{onPremPreferred ? "Preferred path: On-prem RTX PRO" : `Preferred path: ${recommendation.cloudProvider}`}</h3>
          <div className="text-sm text-gray-600 mt-1">Based only on customer-facing verified public cloud rates for the selected {horizonYears}-year horizon.</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Verified comparator</div>
          <div className="font-bold" style={{ color: INK }}>{recommendation.cloudProvider}</div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5" data-testid="rtx-preferred-path-summary">
        <div className="rounded-lg border border-gray-200 p-3"><div className="text-xs text-gray-500">On-prem TCO</div><div className="text-lg font-bold" style={{ color: INK }}>{money(recommendation.onPremHorizonUSD)}</div><div className="text-[11px] text-gray-500">{horizonYears}-year lifecycle</div></div>
        <div className="rounded-lg border border-gray-200 p-3"><div className="text-xs text-gray-500">{recommendation.cloudProvider} TCO</div><div className="text-lg font-bold" style={{ color: INK }}>{money(recommendation.cloudHorizonUSD)}</div><div className="text-[11px] text-gray-500">730 active hours/month</div></div>
        <div className="rounded-lg border border-gray-200 p-3"><div className="text-xs text-gray-500">{savingsPositive ? "On-prem savings" : "Cloud savings"}</div><div className="text-lg font-bold" style={{ color: INK }}>{money(Math.abs(recommendation.savingsUSD))}</div><div className="text-[11px] text-gray-500">{pct(recommendation.savingsPctVsCloud)} vs verified cloud</div></div>
        <div className="rounded-lg border border-gray-200 p-3"><div className="text-xs text-gray-500">Crossover</div><div className="text-lg font-bold" style={{ color: INK }}>{recommendation.crossoverWithinHorizon ? `Month ${recommendation.crossoverMonth}` : "No crossover"}</div><div className="text-[11px] text-gray-500">{recommendation.crossoverWithinHorizon ? `within ${horizonYears}-year horizon` : `within selected ${horizonYears}-year horizon`}</div></div>
      </div>

      {!compact && <>
        <div className="mb-5">
          <div className="flex flex-wrap items-end justify-between gap-2 mb-3"><div><div className="text-sm font-bold" style={{ color: INK }}>Comparable RTX PRO cloud options</div><div className="text-xs text-gray-500">Select a provider to inspect its economics. Only VERIFIED PUBLIC RATE providers can drive the preferred-path recommendation.</div></div></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(comparison.rows || []).map((row) => {
              const ready = row.status === "READY_FOR_ENGINEERING_COMPARISON";
              const selectedRow = ready && selected?.provider === row.provider;
              return (
                <button key={row.provider} type="button" disabled={!ready} onClick={() => ready && setSelectedProvider(row.provider)} className={`text-left rounded-lg border p-3 transition ${selectedRow ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200"} ${ready ? "bg-white" : "bg-gray-50 opacity-70 cursor-not-allowed"}`} aria-pressed={selectedRow}>
                  <div className="flex items-start justify-between gap-2"><div className="text-sm font-bold" style={{ color: INK }}>{row.provider}</div><span className={`text-[9px] font-bold rounded px-1.5 py-0.5 ${row.customerFacingRateReady ? "bg-green-100 text-green-800" : ready ? "bg-amber-100 text-amber-900" : "bg-gray-200 text-gray-600"}`}>{evidenceLabel(row)}</span></div>
                  {ready ? <><div className="text-lg font-bold mt-2" style={{ color: INK }}>{money(row.cloudHorizonUSD)}</div><div className="text-[11px] text-gray-500">{money(row.cloudMonthlyUSD)}/mo · {row.regionLabel}</div><div className="text-[11px] text-gray-500 mt-1">{row.composition === "MULTI_VM_COMPOSITION" ? `${row.vmQuantity} × ${row.sku}` : row.sku}</div></> : <div className="text-xs text-gray-500 mt-2">{row.reason || "Comparable rate not available for this GPU count."}</div>}
                </button>
              );
            })}
          </div>
        </div>

        {selected && <div className={`rounded-lg border p-4 mb-4 ${selected.customerFacingRateReady ? "border-gray-200 bg-gray-50" : "border-amber-300 bg-amber-50"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3"><div><div className="text-sm font-bold" style={{ color: INK }}>{selected.provider} comparison</div><div className="text-xs text-gray-600">{selected.productFamily} · {selected.composition === "MULTI_VM_COMPOSITION" ? `${selected.vmQuantity} VMs × ${selected.gpusPerVm} GPUs` : `${selected.gpuCount}-GPU direct shape`} · {selected.regionLabel}</div></div><span className={`text-[10px] font-bold rounded px-2 py-1 ${selected.customerFacingRateReady ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"}`}>{evidenceLabel(selected)}</span></div>
          {!selected.customerFacingRateReady && <div className="text-xs text-amber-900 mb-3"><strong>Planning comparison only.</strong> This provider is shown for engineering visibility and cannot override the verified preferred-path recommendation until its exact regional public rate is first-party verified.</div>}
          <CrossoverChart row={selected} horizonYears={horizonYears} />
        </div>}
      </>}

      <div className="text-[11px] text-gray-500 border-t border-gray-200 pt-3">Comparison assumes 730 active cloud hours/month and the normalized public on-demand/PAYG VM basis. Storage, platform services, networking, egress, taxes, discounts, and negotiated rates are excluded unless separately modeled. Replace public rates with customer-specific economics before final procurement decisions.</div>
    </section>
  );
}
