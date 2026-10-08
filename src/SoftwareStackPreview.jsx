import React, { useMemo, useState } from "react";
import { LICENSE_MODE, SOFTWARE_STACK_COMPONENTS, calculateSoftwareStack, validateSoftwareStackInputs } from "./softwareStackEngine.js";
import { buildSoftwareStackWritebackBundle } from "./softwareStackWriteback.js";
import { PHASE2_SOURCE } from "./phase2Contract.js";
import { saveSessionState } from "./sessionState.js";

const card = { border: "1px solid #ddd", borderRadius: 12, padding: 16, background: "#fff" };
const field = { display: "grid", gap: 6 };
const input = { padding: "10px 12px", border: "1px solid #bbb", borderRadius: 8, fontSize: 15, width: "100%", boxSizing: "border-box" };
const label = { fontSize: 12, fontWeight: 800, color: "#555", textTransform: "uppercase", letterSpacing: ".05em" };
const primaryButton = { border: 0, borderRadius: 8, padding: "11px 15px", fontWeight: 800, background: "#c8102e", color: "#fff", cursor: "pointer" };

function money(value) {
  return `$${Math.round(Number(value || 0)).toLocaleString()}`;
}

function makeComponent(id, category, name, mode, unit, quantity, annualUnitPrice, annualOpsCost, oneTimeCost = 0, supportPct = 0, priceSource = PHASE2_SOURCE.EST) {
  return { id, category, name, mode, unit, quantity, annualUnitPrice, annualOpsCost, oneTimeCost, supportPct, entitlementNotes: "", priceSource };
}

export default function SoftwareStackPreview() {
  const [horizonYears, setHorizonYears] = useState(3);
  const [annualEscalationPct, setAnnualEscalationPct] = useState(3);
  const [acceptance, setAcceptance] = useState(null);
  const [components, setComponents] = useState([
    makeComponent("orchestration", "orchestration", "Cluster orchestration", LICENSE_MODE.OPEN_SOURCE, "GPU", 16, 0, 18000, 12000, 0, PHASE2_SOURCE.EST),
    makeComponent("platform", "platform", "AI enterprise platform", LICENSE_MODE.COMMERCIAL, "GPU", 16, 2500, 6000, 8000, 15, PHASE2_SOURCE.EST),
    makeComponent("mlops", "mlops", "MLOps / model operations", LICENSE_MODE.OPEN_SOURCE, "node", 4, 0, 12000, 6000, 0, PHASE2_SOURCE.EST),
    makeComponent("observability", "observability", "Monitoring / observability", LICENSE_MODE.OPEN_SOURCE, "node", 4, 0, 8000, 4000, 0, PHASE2_SOURCE.EST),
  ]);

  function resetAcceptance() { setAcceptance(null); }

  function updateComponent(id, key, value) {
    setComponents((current) => current.map((component) => component.id === id ? { ...component, [key]: value } : component));
    resetAcceptance();
  }

  function addComponent() {
    const id = `custom-${Date.now()}`;
    setComponents((current) => [...current, makeComponent(id, "platform", "Additional software component", LICENSE_MODE.COMMERCIAL, "unit", 1, 0, 0)]);
    resetAcceptance();
  }

  function removeComponent(id) {
    setComponents((current) => current.filter((component) => component.id !== id));
    resetAcceptance();
  }

  const inputs = useMemo(() => ({ horizonYears, annualEscalationPct, components }), [horizonYears, annualEscalationPct, components]);
  const result = useMemo(() => calculateSoftwareStack(inputs), [inputs]);
  const validation = useMemo(() => validateSoftwareStackInputs(inputs), [inputs]);

  function stageForTco() {
    try {
      const bundle = buildSoftwareStackWritebackBundle(result, inputs);
      saveSessionState("phase2-software-writeback", bundle);
      setAcceptance({ ok: true, acceptedAt: bundle.acceptedAt, fingerprint: bundle.fingerprint });
    } catch (error) {
      setAcceptance({ ok: false, message: error.message });
    }
  }

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh", padding: "24px 16px 56px", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <main style={{ width: "min(1180px, 100%)", margin: "0 auto" }}>
        <div style={{ background: "#111", color: "#fff", borderLeft: "6px solid #c8102e", padding: 14, marginBottom: 20 }}>
          <strong>Phase 2 · Wave 3B.</strong> Software economics can now be explicitly staged into the Phase 2 TCO receiving contract.
        </div>

        <h1 style={{ margin: "0 0 8px", fontSize: "clamp(30px, 5vw, 48px)" }}>Software stack & licensing configurator</h1>
        <p style={{ margin: "0 0 24px", color: "#555", fontSize: 17, lineHeight: 1.55, maxWidth: 920 }}>
          Build an itemized software economics view across orchestration, AI platform, MLOps, observability, security and support. Commercial subscriptions, included entitlements, open-source software, implementation effort and ongoing operating effort stay separate.
        </p>

        <section style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>1. Planning horizon</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            <label style={field}><span style={label}>Planning horizon (years)</span><input style={input} type="number" min="1" max="7" value={horizonYears} onChange={(e) => { setHorizonYears(Number(e.target.value)); resetAcceptance(); }} /></label>
            <label style={field}><span style={label}>Annual escalation (%)</span><input style={input} type="number" step="0.5" value={annualEscalationPct} onChange={(e) => { setAnnualEscalationPct(Number(e.target.value)); resetAcceptance(); }} /></label>
          </div>
        </section>

        <section style={{ marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <div style={card}><div style={label}>Year 1 recurring</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{money(result.totals.annualRecurringYear1)}</div><div style={{ color: "#666" }}>License + support + operations</div></div>
            <div style={card}><div style={label}>Horizon license</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{money(result.totals.license)}</div><div style={{ color: "#666" }}>Commercial license only</div></div>
            <div style={card}><div style={label}>Horizon operations</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{money(result.totals.operations)}</div><div style={{ color: "#666" }}>Admin / support effort modeled separately</div></div>
            <div style={card}><div style={label}>Implementation</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{money(result.totals.implementation)}</div><div style={{ color: "#666" }}>One-time Year 1 costs</div></div>
            <div style={card}><div style={label}>{result.horizonYears}-year software TCO</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{money(result.totals.total)}</div><div style={{ color: "#666" }}>License + support + operations + implementation</div></div>
          </div>
        </section>

        <section style={{ ...card, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div><h2 style={{ margin: 0 }}>2. Stack components</h2><p style={{ color: "#666", marginBottom: 0 }}>Every component carries a source status so a later quote or price-book update can invalidate the accepted bundle cleanly.</p></div>
            <button type="button" onClick={addComponent} style={primaryButton}>Add component</button>
          </div>
        </section>

        {components.map((component) => {
          const meta = SOFTWARE_STACK_COMPONENTS[component.category] || SOFTWARE_STACK_COMPONENTS.platform;
          return (
            <section key={component.id} style={{ ...card, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, flexWrap: "wrap" }}>
                <div><div style={label}>{meta.label}</div><h3 style={{ margin: "5px 0" }}>{component.name}</h3><p style={{ margin: 0, color: "#666", lineHeight: 1.45 }}>{meta.notes}</p></div>
                <button type="button" onClick={() => removeComponent(component.id)} style={{ border: "1px solid #bbb", background: "#fff", borderRadius: 8, padding: "8px 10px", cursor: "pointer" }}>Remove</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginTop: 14 }}>
                <label style={field}><span style={label}>Category</span><select style={input} value={component.category} onChange={(e) => updateComponent(component.id, "category", e.target.value)}>{Object.entries(SOFTWARE_STACK_COMPONENTS).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label>
                <label style={field}><span style={label}>Component name</span><input style={input} value={component.name} onChange={(e) => updateComponent(component.id, "name", e.target.value)} /></label>
                <label style={field}><span style={label}>License mode</span><select style={input} value={component.mode} onChange={(e) => updateComponent(component.id, "mode", e.target.value)}><option value={LICENSE_MODE.COMMERCIAL}>Commercial</option><option value={LICENSE_MODE.OPEN_SOURCE}>Open source</option><option value={LICENSE_MODE.INCLUDED}>Included / bundled</option><option value={LICENSE_MODE.NONE}>Not used</option></select></label>
                <label style={field}><span style={label}>Price source</span><select style={input} value={component.priceSource} onChange={(e) => updateComponent(component.id, "priceSource", e.target.value)}><option value={PHASE2_SOURCE.EST}>Estimate</option><option value={PHASE2_SOURCE.LISTED}>Listed</option><option value={PHASE2_SOURCE.CUSTOMER}>Customer</option><option value={PHASE2_SOURCE.QUOTE}>Quote</option></select></label>
                <label style={field}><span style={label}>Unit</span><input style={input} value={component.unit} onChange={(e) => updateComponent(component.id, "unit", e.target.value)} /></label>
                <label style={field}><span style={label}>Quantity</span><input style={input} type="number" min="0" value={component.quantity} onChange={(e) => updateComponent(component.id, "quantity", Number(e.target.value))} /></label>
                <label style={field}><span style={label}>Annual unit price</span><input style={input} type="number" min="0" value={component.annualUnitPrice} onChange={(e) => updateComponent(component.id, "annualUnitPrice", Number(e.target.value))} /></label>
                <label style={field}><span style={label}>Support (% of license)</span><input style={input} type="number" min="0" value={component.supportPct} onChange={(e) => updateComponent(component.id, "supportPct", Number(e.target.value))} /></label>
                <label style={field}><span style={label}>Annual ops / admin cost</span><input style={input} type="number" min="0" value={component.annualOpsCost} onChange={(e) => updateComponent(component.id, "annualOpsCost", Number(e.target.value))} /></label>
                <label style={field}><span style={label}>One-time implementation</span><input style={input} type="number" min="0" value={component.oneTimeCost} onChange={(e) => updateComponent(component.id, "oneTimeCost", Number(e.target.value))} /></label>
              </div>
              <label style={{ ...field, marginTop: 12 }}><span style={label}>Entitlement / scope notes</span><input style={input} value={component.entitlementNotes} onChange={(e) => updateComponent(component.id, "entitlementNotes", e.target.value)} placeholder="Term, edition, support level, bundled entitlement, renewal condition..." /></label>
              <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
                {result.rows.find((row) => row.id === component.id)?.yearly.map((year) => <div key={year.year} style={{ ...card, background: "#fafafa" }}><strong>Year {year.year}</strong><div style={{ fontSize: 21, fontWeight: 900, marginTop: 5 }}>{money(year.total)}</div></div>)}
              </div>
            </section>
          );
        })}

        <section style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>3. Validation and methodology</h2>
          {!validation.valid && <div style={{ background: "#fff0f3", border: "1px solid #efc9cf", borderRadius: 8, padding: 12, marginBottom: 12 }}><strong>Input errors:</strong><ul>{validation.errors.map((x) => <li key={x}>{x}</li>)}</ul></div>}
          {validation.warnings.length > 0 && <div style={{ background: "#fff7e8", border: "1px solid #edd7a7", borderRadius: 8, padding: 12, marginBottom: 12 }}><strong>Planning warnings:</strong><ul>{validation.warnings.map((x) => <li key={x}>{x}</li>)}</ul></div>}
          {result.warnings.length > 0 && <div style={{ background: "#fff7e8", border: "1px solid #edd7a7", borderRadius: 8, padding: 12, marginBottom: 12 }}><strong>Stack warnings:</strong><ul>{result.warnings.map((x) => <li key={x}>{x}</li>)}</ul></div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {Object.entries(result.methodology).map(([key, value]) => <div key={key} style={{ ...card, background: "#fafafa" }}><strong>{key}</strong><div style={{ marginTop: 6, color: "#555", lineHeight: 1.45 }}>{value}</div></div>)}
          </div>
        </section>

        <section style={{ ...card, marginBottom: 18, borderLeft: "6px solid #c8102e" }}>
          <h2 style={{ marginTop: 0 }}>4. Explicit TCO handoff</h2>
          <p style={{ color: "#555", lineHeight: 1.55 }}>Accepting stages one year-by-year software override per planning year plus the full itemized component record and provenance. Nothing changes production TCO silently.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" style={{ ...primaryButton, opacity: validation.valid ? 1 : .45 }} disabled={!validation.valid} onClick={stageForTco}>Accept and stage software for TCO</button>
            <a href="/__phase2/tco" style={{ fontWeight: 800, color: "#c8102e" }}>Open TCO receiving preview</a>
          </div>
          {acceptance?.ok && <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: "#eaf7ee", border: "1px solid #b8dec3" }}><strong>Staged.</strong> Software bundle fingerprint: <span style={{ fontFamily: "ui-monospace, monospace" }}>{acceptance.fingerprint}</span></div>}
          {acceptance && !acceptance.ok && <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: "#fff0f3", border: "1px solid #efc9cf", color: "#9b1c31" }}>{acceptance.message}</div>}
        </section>

        <section style={{ ...card, background: "#fff8f8", borderColor: "#efc9cf" }}>
          <h2 style={{ marginTop: 0 }}>Scope guard</h2>
          <p style={{ marginBottom: 0, lineHeight: 1.55 }}>Wave 3B models and stages software economics and entitlement structure. It does not assert vendor pricing, prescribe the final stack, or treat open-source software as operationally free.</p>
        </section>
      </main>
    </div>
  );
}
