import React, { useMemo } from "react";
import { buildPodBrief } from "./podBriefEngine.js";
import { loadSessionState } from "./sessionState.js";

const card = { border: "1px solid #ddd", borderRadius: 12, padding: 16, background: "#fff" };
const label = { fontSize: 12, fontWeight: 800, color: "#555", textTransform: "uppercase", letterSpacing: ".05em" };

function money(v) { return `$${Math.round(Number(v || 0)).toLocaleString()}`; }
function num(v, digits = 1) { return v == null ? "—" : Number(v).toFixed(digits); }

export default function PodBriefPreview() {
  const storageBundle = useMemo(() => loadSessionState("phase2-storage-writeback"), []);
  const fabricBundle = useMemo(() => loadSessionState("phase2-network-writeback"), []);
  const powerBundle = useMemo(() => loadSessionState("phase2-power-writeback"), []);
  const softwareBundle = useMemo(() => loadSessionState("phase2-software-writeback"), []);
  const brief = useMemo(() => buildPodBrief({ storageBundle, fabricBundle, powerBundle, softwareBundle }), [storageBundle, fabricBundle, powerBundle, softwareBundle]);

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100vh", padding: "24px 16px 56px", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <main style={{ width: "min(1180px, 100%)", margin: "0 auto" }}>
        <div style={{ background: "#111", color: "#fff", borderLeft: "6px solid #c8102e", padding: 14, marginBottom: 20 }}>
          <strong>Phase 2 · Wave 5A.</strong> Integrated Pod Brief preview from accepted Storage, Fabric, Power and Software outputs.
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 8px", fontSize: "clamp(30px, 5vw, 48px)" }}>AI Factory Pod Brief</h1>
            <p style={{ margin: 0, color: "#555", fontSize: 17, lineHeight: 1.55, maxWidth: 900 }}>
              Pre-architecture handoff: what the environment needs, what remains unresolved, and what CDW engineering should validate next.
            </p>
          </div>
          <div style={{ ...card, minWidth: 250, borderLeft: `6px solid ${brief.clientReady ? "#176b31" : "#c8102e"}` }}>
            <div style={label}>Pod Brief status</div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 6 }}>{brief.status}</div>
          </div>
        </div>

        <section style={{ marginTop: 20, marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <div style={card}><div style={label}>Compute system</div><div style={{ fontSize: 24, fontWeight: 900, marginTop: 6 }}>{brief.compute.systemName || "—"}</div></div>
            <div style={card}><div style={label}>Total racks</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{brief.compute.totalRacks ?? "—"}</div></div>
            <div style={card}><div style={label}>Design IT load</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{num(brief.facility?.designItKw)} kW</div></div>
            <div style={card}><div style={label}>Facility demand</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{num(brief.facility?.facilityDesignKw)} kW</div></div>
            <div style={card}><div style={label}>Cooling</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{num(brief.facility?.coolingTons)} tons</div></div>
            <div style={card}><div style={label}>Storage raw</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{brief.storage ? Math.round(brief.storage.totalRawTb).toLocaleString() : "—"} TB</div></div>
            <div style={card}><div style={label}>Fabric</div><div style={{ fontSize: 24, fontWeight: 900, marginTop: 6 }}>{brief.fabric ? `${brief.fabric.technology} · ${brief.fabric.linkGbps}G` : "—"}</div></div>
            <div style={card}><div style={label}>Software horizon</div><div style={{ fontSize: 30, fontWeight: 900, marginTop: 6 }}>{brief.software?.horizonYears ?? "—"} years</div></div>
          </div>
        </section>

        <section style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>1. Storage requirement</h2>
          {brief.storage ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
              <div><strong>Fast usable</strong><br />{Math.round(brief.storage.fastUsableTb).toLocaleString()} TB</div>
              <div><strong>Bulk usable</strong><br />{Math.round(brief.storage.bulkUsableTb).toLocaleString()} TB</div>
              <div><strong>Raw provisioned</strong><br />{Math.round(brief.storage.totalRawTb).toLocaleString()} TB</div>
              <div><strong>Storage racks</strong><br />{brief.storage.storageRacks}</div>
              <div><strong>Storage power</strong><br />{num(brief.storage.storagePowerKw)} kW</div>
              <div><strong>Aggregate bandwidth</strong><br />{num(brief.storage.aggregateGbps)} GB/s</div>
            </div>
          ) : <p>No accepted Storage requirement.</p>}
        </section>

        <section style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>2. Network fabric requirement</h2>
          {brief.fabric ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
              <div><strong>Technology</strong><br />{brief.fabric.technology}</div>
              <div><strong>Topology</strong><br />{brief.fabric.topology}</div>
              <div><strong>Leaf / spine</strong><br />{brief.fabric.switches?.leaf ?? 0} / {brief.fabric.switches?.spine ?? 0}</div>
              <div><strong>Endpoint ports</strong><br />{brief.fabric.endpointPorts ?? "—"}</div>
              <div><strong>Total links</strong><br />{brief.fabric.totalLinks ?? "—"}</div>
              <div><strong>Switch power</strong><br />{num(brief.fabric.switchPowerKw)} kW</div>
              <div><strong>Fleet schedule steps</strong><br />{brief.fabric.fleetStepSchedule.length}</div>
            </div>
          ) : <p>No accepted Fabric requirement.</p>}
        </section>

        <section style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>3. Facility requirement</h2>
          {brief.facility ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
              <div><strong>Facility verdict</strong><br />{brief.facility.verdict}</div>
              <div><strong>Design IT</strong><br />{num(brief.facility.designItKw)} kW</div>
              <div><strong>Facility demand</strong><br />{num(brief.facility.facilityDesignKw)} kW</div>
              <div><strong>Cooling</strong><br />{num(brief.facility.coolingTons)} tons</div>
              <div><strong>Compute racks</strong><br />{brief.facility.racks?.compute ?? "—"}</div>
              <div><strong>Storage racks</strong><br />{brief.facility.racks?.storage ?? "—"}</div>
              <div><strong>Network racks</strong><br />{brief.facility.racks?.network ?? "—"}</div>
            </div>
          ) : <p>No accepted Power requirement.</p>}
        </section>

        <section style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>4. Software stack</h2>
          {brief.software ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 12 }}>
                <div><strong>Components</strong><br />{brief.software.components.length}</div>
                <div><strong>Year 1 recurring</strong><br />{money(brief.software.totals?.annualRecurringYear1)}</div>
                <div><strong>Implementation</strong><br />{money(brief.software.totals?.implementation)}</div>
                <div><strong>Horizon total</strong><br />{money(brief.software.totals?.total)}</div>
              </div>
              <ul style={{ lineHeight: 1.6 }}>{brief.software.components.map((item) => <li key={`${item.name}-${item.unit}`}><strong>{item.name}</strong> — {item.mode} · {item.priceSource} · {item.unit} × {item.quantity}</li>)}</ul>
            </>
          ) : <p>No accepted Software requirement.</p>}
        </section>

        <section style={{ ...card, marginBottom: 18, borderLeft: "6px solid #c8102e" }}>
          <h2 style={{ marginTop: 0 }}>5. Phase 2 economic envelope</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
            <div><strong>Power + facility monthly</strong><br />{money(brief.economics.powerMonthly)}</div>
            <div><strong>Power + facility annualized</strong><br />{money(brief.economics.powerAnnualized)}</div>
            <div><strong>Fabric current-fleet CAPEX</strong><br />{money(brief.economics.networkCapex)}</div>
            <div><strong>Software Year 1</strong><br />{money(brief.economics.softwareByYear?.[1] || 0)}</div>
          </div>
          <p style={{ color: "#666", marginBottom: 0, marginTop: 12 }}>{brief.economics.note}</p>
        </section>

        {(brief.unresolved.length > 0 || brief.stale.length > 0) && (
          <section style={{ ...card, marginBottom: 18, background: "#fff7e8", borderColor: "#e4c679" }}>
            <h2 style={{ marginTop: 0 }}>6. Unresolved / review-required items</h2>
            <ul style={{ lineHeight: 1.6 }}>
              {[...brief.unresolved, ...brief.stale].map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        )}

        <section style={{ ...card, marginBottom: 18 }}>
          <h2 style={{ marginTop: 0 }}>7. CDW engineering handoff</h2>
          <ul style={{ lineHeight: 1.7 }}>{brief.engineeringHandoff.map((item) => <li key={item}>{item}</li>)}</ul>
          <p style={{ marginBottom: 0, color: "#555" }}><strong>Boundary:</strong> the tools size and cost. CDW engineers design.</p>
        </section>

        <section style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href="/__phase2/storage" style={{ textDecoration: "none", background: "#222", color: "#fff", borderRadius: 8, padding: "10px 14px", fontWeight: 800 }}>Storage</a>
          <a href="/__phase2/network" style={{ textDecoration: "none", background: "#222", color: "#fff", borderRadius: 8, padding: "10px 14px", fontWeight: 800 }}>Fabric</a>
          <a href="/__phase2/power" style={{ textDecoration: "none", background: "#222", color: "#fff", borderRadius: 8, padding: "10px 14px", fontWeight: 800 }}>Power</a>
          <a href="/__phase2/software" style={{ textDecoration: "none", background: "#222", color: "#fff", borderRadius: 8, padding: "10px 14px", fontWeight: 800 }}>Software</a>
          <a href="/__phase2/tco" style={{ textDecoration: "none", background: "#c8102e", color: "#fff", borderRadius: 8, padding: "10px 14px", fontWeight: 800 }}>TCO receiving preview</a>
        </section>
      </main>
    </div>
  );
}
