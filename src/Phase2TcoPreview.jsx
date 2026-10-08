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

export default function Phase2TcoPreview() {
  const [record, setRecord] = useState(() => loadSessionState("phase2-preview-override"));
  const override = record?.override || null;
  const eligible = useMemo(() => phase2OverrideCanWriteBack(override), [override]);

  function revertHere() {
    if (!override) return;
    const next = {
      ...record,
      override: {
        ...override,
        state: PHASE2_STATE.REVERTED,
        staleReason: null,
        revertedAt: new Date().toISOString(),
      },
    };
    saveSessionState("phase2-preview-override", next);
    setRecord(next);
  }

  return (
    <>
      <section style={box}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#c8102e", marginBottom: 8 }}>
          Phase 2 · Wave 0B receiving contract
        </div>
        <h2 style={{ margin: "0 0 8px", fontSize: 24 }}>TCO can now receive a Phase 2 override record</h2>
        <p style={{ margin: "0 0 14px", color: "#555", lineHeight: 1.5 }}>
          This preview panel sits directly above the real TCO calculator. It proves the receiving-side contract without changing the production TCO math yet. Only CURRENT or RECOMPUTED values are eligible to replace a TCO reference value.
        </p>

        {!override ? (
          <div style={{ background: "#f7f7f7", border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
            No Phase 2 override is currently staged. Return to the Phase 2 construction route, create or recompute the sample override, then come back here.
            <div style={{ marginTop: 12 }}><a href="/__phase2" style={{ color: "#c8102e", fontWeight: 800 }}>Back to Phase 2 construction preview</a></div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <span style={{ ...badge, background: override.state === PHASE2_STATE.STALE ? "#fff4d6" : override.state === PHASE2_STATE.REVERTED ? "#eee" : "#eaf7ee", color: "#222" }}>{override.state}</span>
              <span style={{ ...badge, background: eligible ? "#eaf7ee" : "#fff0f3", color: eligible ? "#176b31" : "#9b1c31" }}>{eligible ? "WRITE-BACK ELIGIBLE" : "NOT ELIGIBLE"}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <div><strong>Target</strong><br />{override.target}</div>
              <div><strong>Value</strong><br />{formatMoney(override.value)} / month</div>
              <div><strong>Source tool</strong><br />{override.sourceTool}</div>
              <div><strong>Provenance</strong><br />{override.provenance?.source} · {override.provenance?.derivation}</div>
            </div>
            <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, overflowWrap: "anywhere" }}>
              Accepted input fingerprint: {override.inputFingerprint}
            </div>
            {override.staleReason && <div style={{ color: "#9b1c31" }}><strong>Why stale:</strong> {override.staleReason}</div>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <a href="/__phase2" style={{ display: "inline-block", textDecoration: "none", background: "#c8102e", color: "#fff", borderRadius: 8, padding: "10px 14px", fontWeight: 800 }}>Adjust Phase 2 input</a>
              <button type="button" onClick={revertHere} disabled={override.state === PHASE2_STATE.REVERTED} style={{ border: "1px solid #aaa", background: "#fff", borderRadius: 8, padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}>Revert from TCO preview</button>
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
