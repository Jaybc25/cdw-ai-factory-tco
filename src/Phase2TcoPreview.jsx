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
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, background: "#fafafa" }}>
      <div style={{ marginBottom: 10 }}>
        <span style={{ ...badge, background: override.state === PHASE2_STATE.STALE ? "#fff4d6" : override.state === PHASE2_STATE.REVERTED ? "#eee" : "#eaf7ee", color: "#222" }}>{override.state}</span>
        <span style={{ ...badge, background: eligible ? "#eaf7ee" : "#fff0f3", color: eligible ? "#176b31" : "#9b1c31" }}>{eligible ? "WRITE-BACK ELIGIBLE" : "NOT ELIGIBLE"}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
        <div><strong>Target</strong><br />{override.target}</div>
        <div><strong>Value</strong><br />{formatMoney(override.value)} / month</div>
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
  const [bundle, setBundle] = useState(() => loadSessionState("phase2-power-writeback"));
  const legacy = useMemo(() => loadSessionState("phase2-preview-override"), []);
  const overrides = bundle?.overrides?.length ? bundle.overrides : legacy?.override ? [legacy.override] : [];
  const requirements = bundle?.requirements || null;
  const eligibleCount = overrides.filter(phase2OverrideCanWriteBack).length;

  function revertAt(index) {
    if (!bundle?.overrides?.length) return;
    const nextOverrides = bundle.overrides.map((override, i) => i === index ? {
      ...override,
      state: PHASE2_STATE.REVERTED,
      staleReason: null,
      revertedAt: new Date().toISOString(),
    } : override);
    const next = { ...bundle, overrides: nextOverrides };
    saveSessionState("phase2-power-writeback", next);
    setBundle(next);
  }

  return (
    <>
      <section style={box}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#c8102e", marginBottom: 8 }}>
          Phase 2 · Wave 1B receiving contract
        </div>
        <h2 style={{ margin: "0 0 8px", fontSize: 24 }}>TCO can now receive the accepted Power Planner bundle</h2>
        <p style={{ margin: "0 0 14px", color: "#555", lineHeight: 1.5 }}>
          Power Planner now stages separate energy and facility-burden records plus the physical requirements used to derive them. This preview still does not alter production TCO math. It proves the explicit receiving contract first.
        </p>

        {!overrides.length ? (
          <div style={{ background: "#f7f7f7", border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
            No accepted Power Planner bundle is staged. Open the Power Planner, enter the site assumptions, and choose <strong>Accept and stage for TCO</strong>.
            <div style={{ marginTop: 12 }}><a href="/__phase2/power" style={{ color: "#c8102e", fontWeight: 800 }}>Open Power Planner</a></div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ ...badge, background: "#eaf7ee", color: "#176b31" }}>{eligibleCount} OF {overrides.length} OVERRIDES ELIGIBLE</span>
              {requirements?.verdict && <span style={{ ...badge, background: "#f3f3f3", color: "#222" }}>FACILITY: {requirements.verdict.replaceAll("-", " ").toUpperCase()}</span>}
            </div>

            {overrides.map((override, index) => <OverrideCard key={override.id || index} override={override} onRevert={() => revertAt(index)} />)}

            {requirements && (
              <div style={{ borderTop: "1px solid #ddd", paddingTop: 12 }}>
                <h3 style={{ margin: "0 0 8px" }}>Facility requirements carried with the economics</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
                  <div><strong>System</strong><br />{requirements.systemName || "—"}</div>
                  <div><strong>Racks</strong><br />{requirements.racks?.total ?? "—"}</div>
                  <div><strong>Design IT</strong><br />{Number(requirements.power?.designItKw || 0).toFixed(1)} kW</div>
                  <div><strong>Facility demand</strong><br />{Number(requirements.power?.facilityDesignKw || 0).toFixed(1)} kW</div>
                  <div><strong>Cooling</strong><br />{Number(requirements.cooling?.coolingTons || 0).toFixed(1)} tons</div>
                </div>
                {requirements.validationWarnings?.length > 0 && <ul style={{ color: "#7a5600", lineHeight: 1.55 }}>{requirements.validationWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
              </div>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <a href="/__phase2/power" style={{ display: "inline-block", textDecoration: "none", background: "#c8102e", color: "#fff", borderRadius: 8, padding: "10px 14px", fontWeight: 800 }}>Adjust Power Planner</a>
              <a href="/__phase2" style={{ display: "inline-block", textDecoration: "none", border: "1px solid #aaa", color: "#222", borderRadius: 8, padding: "10px 14px", fontWeight: 700 }}>Back to Phase 2 construction</a>
            </div>
          </div>
        )}
      </section>

      <ModelCatalogVisibilityRoute tool="tco">
        <TcoCalculator />
      </ModelCatalogVisibilityRoute>
    </>
  );
}
