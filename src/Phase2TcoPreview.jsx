import React, { useMemo, useState } from "react";
import TcoCalculator from "./TcoCalculator.jsx";
import ModelCatalogVisibilityRoute from "./ModelCatalogVisibilityRoute.jsx";
import { loadSessionState, saveSessionState } from "./sessionState.js";
import { PHASE2_STATE, phase2OverrideCanWriteBack } from "./phase2Contract.js";

const box = {
  margin: "18px auto 0",
  width: "min(1120px, calc(100% - 32px))",
  border: "1px solid #d7d7d7",
  borderLeft: "6px solid #c8102e",
  borderRadius: 12,
  background: "#fff",
  padding: 18,
  boxShadow: "0 8px 24px rgba(0,0,0,.05)",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const badge = {
  display: "inline-block",
  borderRadius: 999,
  padding: "4px 9px",
  fontSize: 12,
  fontWeight: 800,
  marginRight: 8,
};

function formatMoney(value) {
  return `$${Math.round(Number(value || 0)).toLocaleString()}`;
}

function OverrideCard({ override, onRevert }) {
  const eligible = phase2OverrideCanWriteBack(override);
  const unitLabel = override.unit === "USD/year" ? " / year" : override.unit === "USD/month" ? " / month" : ` ${override.unit || ""}`;
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, background: "#fafafa" }}>
      <div style={{ marginBottom: 10 }}>
        <span style={{ ...badge, background: override.state === PHASE2_STATE.STALE ? "#fff4d6" : override.state === PHASE2_STATE.REVERTED ? "#eee" : "#eaf7ee", color: "#222" }}>{override.state}</span>
        <span style={{ ...badge, background: eligible ? "#eaf7ee" : "#fff0f3", color: eligible ? "#176b31" : "#9b1c31" }}>{eligible ? "WRITE-BACK ELIGIBLE" : "NOT ELIGIBLE"}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
        <div><strong>Target</strong><br />{override.target}</div>
        <div><strong>Value</strong><br />{formatMoney(override.value)}{unitLabel}</div>
        <div><strong>Source tool</strong><br />{override.sourceTool}</div>
        <div><strong>Provenance</strong><br />{override.provenance?.source} · {override.provenance?.derivation}</div>
      </div>
      <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, overflowWrap: "anywhere", marginTop: 10 }}>
        Accepted input fingerprint: {override.inputFingerprint}
      </div>
      {override.staleReason && <div style={{ color: "#9b1c31", marginTop: 8 }}><strong>Why stale:</strong> {override.staleReason}</div>}
      <button type="button" onClick={onRevert} disabled={override.state === PHASE2_STATE.REVERTED} style={{ marginTop: 12, border: "1px solid #aaa", background: "#fff", borderRadius: 8, padding: "9px 12px", fontWeight: 700, cursor: "pointer" }}>Revert this override</button>
    </div>
  );
}

export default function Phase2TcoPreview() {
  const [powerBundle, setPowerBundle] = useState(() => loadSessionState("phase2-power-writeback"));
  const [softwareBundle, setSoftwareBundle] = useState(() => loadSessionState("phase2-software-writeback"));
  const legacy = useMemo(() => loadSessionState("phase2-preview-override"), []);

  const powerOverrides = powerBundle?.overrides?.length ? powerBundle.overrides : legacy?.override ? [legacy.override] : [];
  const softwareOverrides = softwareBundle?.overrides || [];
  const allOverrides = [...powerOverrides, ...softwareOverrides];
  const eligibleCount = allOverrides.filter(phase2OverrideCanWriteBack).length;

  function revertPower(index) {
    if (!powerBundle?.overrides?.length) return;
    const nextOverrides = powerBundle.overrides.map((override, i) => i === index ? {
      ...override,
      state: PHASE2_STATE.REVERTED,
      staleReason: null,
      revertedAt: new Date().toISOString(),
    } : override);
    const next = { ...powerBundle, overrides: nextOverrides };
    saveSessionState("phase2-power-writeback", next);
    setPowerBundle(next);
  }

  function revertSoftware(index) {
    if (!softwareBundle?.overrides?.length) return;
    const nextOverrides = softwareBundle.overrides.map((override, i) => i === index ? {
      ...override,
      state: PHASE2_STATE.REVERTED,
      staleReason: null,
      revertedAt: new Date().toISOString(),
    } : override);
    const next = { ...softwareBundle, overrides: nextOverrides };
    saveSessionState("phase2-software-writeback", next);
    setSoftwareBundle(next);
  }

  return (
    <>
      <section style={box}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#c8102e", marginBottom: 8 }}>
          Phase 2 · receiving contract
        </div>
        <h2 style={{ margin: "0 0 8px", fontSize: 24 }}>TCO can now receive accepted Power and Software bundles</h2>
        <p style={{ margin: "0 0 14px", color: "#555", lineHeight: 1.5 }}>
          This preview shows the explicit Phase 2 records before any production TCO integration. Accepted values remain visible, attributable, independently revertible, and ineligible when stale or reverted.
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <span style={{ ...badge, background: "#eaf7ee", color: "#176b31" }}>{eligibleCount} OF {allOverrides.length} TOTAL OVERRIDES ELIGIBLE</span>
          {powerBundle?.requirements?.verdict && <span style={{ ...badge, background: "#f3f3f3", color: "#222" }}>FACILITY: {powerBundle.requirements.verdict.replaceAll("-", " ").toUpperCase()}</span>}
          {softwareBundle?.requirements?.horizonYears && <span style={{ ...badge, background: "#f3f3f3", color: "#222" }}>SOFTWARE: {softwareBundle.requirements.horizonYears}-YEAR PLAN</span>}
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <div>
            <h3 style={{ margin: "0 0 10px" }}>Power Planner</h3>
            {!powerOverrides.length ? (
              <div style={{ background: "#f7f7f7", border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
                No accepted Power Planner bundle is staged. <a href="/__phase2/power" style={{ color: "#c8102e", fontWeight: 800 }}>Open Power Planner</a>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {powerOverrides.map((override, index) => <OverrideCard key={override.id || index} override={override} onRevert={() => revertPower(index)} />)}
                {powerBundle?.requirements && (
                  <div style={{ borderTop: "1px solid #ddd", paddingTop: 12 }}>
                    <strong>Facility requirements:</strong> {powerBundle.requirements.racks?.total ?? "—"} racks · {Number(powerBundle.requirements.power?.designItKw || 0).toFixed(1)} kW design IT · {Number(powerBundle.requirements.cooling?.coolingTons || 0).toFixed(1)} cooling tons
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <h3 style={{ margin: "0 0 10px" }}>Software Stack</h3>
            {!softwareOverrides.length ? (
              <div style={{ background: "#f7f7f7", border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
                No accepted Software bundle is staged. <a href="/__phase2/software" style={{ color: "#c8102e", fontWeight: 800 }}>Open Software Stack configurator</a>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {softwareOverrides.map((override, index) => <OverrideCard key={override.id || index} override={override} onRevert={() => revertSoftware(index)} />)}
                <div style={{ borderTop: "1px solid #ddd", paddingTop: 12 }}>
                  <h4 style={{ margin: "0 0 8px" }}>Itemized software record</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                    <div><strong>Components</strong><br />{softwareBundle.requirements?.rows?.length || 0}</div>
                    <div><strong>Year 1 recurring</strong><br />{formatMoney(softwareBundle.requirements?.totals?.annualRecurringYear1 || 0)}</div>
                    <div><strong>Implementation</strong><br />{formatMoney(softwareBundle.requirements?.totals?.implementation || 0)}</div>
                    <div><strong>Horizon total</strong><br />{formatMoney(softwareBundle.requirements?.totals?.total || 0)}</div>
                  </div>
                  {softwareBundle.requirements?.rows?.length > 0 && <ul style={{ lineHeight: 1.55 }}>{softwareBundle.requirements.rows.map((row) => <li key={row.id}><strong>{row.name}</strong> — {row.mode} · {row.priceSource} · {row.unit} × {row.quantity}</li>)}</ul>}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <a href="/__phase2/power" style={{ display: "inline-block", textDecoration: "none", background: "#c8102e", color: "#fff", borderRadius: 8, padding: "10px 14px", fontWeight: 800 }}>Adjust Power Planner</a>
            <a href="/__phase2/software" style={{ display: "inline-block", textDecoration: "none", background: "#222", color: "#fff", borderRadius: 8, padding: "10px 14px", fontWeight: 800 }}>Adjust Software Stack</a>
            <a href="/__phase2" style={{ display: "inline-block", textDecoration: "none", border: "1px solid #aaa", color: "#222", borderRadius: 8, padding: "10px 14px", fontWeight: 700 }}>Back to Phase 2 construction</a>
          </div>
        </div>
      </section>

      <ModelCatalogVisibilityRoute tool="tco">
        <TcoCalculator />
      </ModelCatalogVisibilityRoute>
    </>
  );
}
