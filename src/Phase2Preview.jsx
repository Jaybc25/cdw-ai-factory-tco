import React from "react";

const tools = [
  {
    name: "Power, cooling and rack planner",
    purpose: "Size rack footprint, design power, cooling requirement and facility fit. Energy cost and facility burden remain separate.",
    status: "Wave 1",
  },
  {
    name: "Storage sizer",
    purpose: "Derive fast and bulk capacity plus throughput from the workload, then feed storage requirements downstream.",
    status: "Wave 2",
  },
  {
    name: "Software stack and licensing configurator",
    purpose: "Itemize software layers, entitlement terms and year-by-year licensing cost without treating $0 license as $0 operating cost.",
    status: "Wave 3",
  },
  {
    name: "Network fabric planner",
    purpose: "Size compute, storage and management fabrics and produce a fleet-size-dependent cost schedule rather than a single per-system scalar.",
    status: "Wave 4",
  },
];

const foundation = [
  "System-profile registry extension",
  "Source + derivation provenance model",
  "Named TCO override contract",
  "Dependency fingerprints and STALE state",
  "User-triggered recompute / revert behavior",
  "Owned datacenter vs colocation facility-cost branches",
  "Pod Brief data contract",
  "Phase 2 gating and seller signal",
];

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f5f5",
    color: "#171717",
    fontFamily: "Arial, Helvetica, sans-serif",
    padding: "32px 20px 56px",
  },
  wrap: {
    width: "min(1120px, 100%)",
    margin: "0 auto",
  },
  banner: {
    background: "#111",
    color: "#fff",
    borderLeft: "6px solid #c8102e",
    padding: "14px 16px",
    marginBottom: 24,
    fontSize: 14,
    lineHeight: 1.45,
  },
  kicker: {
    color: "#c8102e",
    fontWeight: 800,
    letterSpacing: ".08em",
    textTransform: "uppercase",
    fontSize: 13,
    marginBottom: 10,
  },
  h1: {
    fontSize: "clamp(32px, 5vw, 54px)",
    lineHeight: 1.02,
    margin: "0 0 12px",
    letterSpacing: "-.03em",
  },
  intro: {
    fontSize: 18,
    lineHeight: 1.55,
    maxWidth: 860,
    margin: "0 0 28px",
    color: "#444",
  },
  section: {
    background: "#fff",
    border: "1px solid #ddd",
    borderRadius: 14,
    padding: 24,
    marginBottom: 22,
    boxShadow: "0 8px 30px rgba(0,0,0,.04)",
  },
  sectionTitle: {
    margin: "0 0 8px",
    fontSize: 24,
  },
  sectionCopy: {
    margin: "0 0 18px",
    color: "#555",
    lineHeight: 1.5,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 14,
  },
  card: {
    border: "1px solid #ddd",
    borderRadius: 12,
    padding: 18,
    background: "#fafafa",
  },
  badge: {
    display: "inline-block",
    fontSize: 12,
    fontWeight: 800,
    color: "#c8102e",
    background: "#fff0f3",
    border: "1px solid #f0c5cf",
    borderRadius: 999,
    padding: "4px 9px",
    marginBottom: 10,
  },
  cardTitle: {
    margin: "0 0 8px",
    fontSize: 18,
    lineHeight: 1.25,
  },
  cardText: {
    margin: 0,
    color: "#555",
    lineHeight: 1.5,
    fontSize: 14,
  },
  list: {
    margin: 0,
    paddingLeft: 20,
    lineHeight: 1.7,
  },
  flow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 10,
  },
  flowItem: {
    padding: 14,
    borderRadius: 10,
    background: "#f7f7f7",
    border: "1px solid #e2e2e2",
    fontWeight: 700,
    lineHeight: 1.35,
  },
};

export default function Phase2Preview() {
  return (
    <div style={styles.page}>
      <main style={styles.wrap}>
        <div style={styles.banner}>
          <strong>Phase 2 construction preview.</strong> This route exists only on the Phase 2 feature branch. Nothing here is exposed from the production landing page and nothing writes into production TCO yet.
        </div>

        <div style={styles.kicker}>CDW AI Factory · Phase 2</div>
        <h1 style={styles.h1}>From AI economics to a pod that can actually be built.</h1>
        <p style={styles.intro}>
          Phase 1 answers whether the workload makes sense and what it costs. Phase 2 sizes the site requirements and replaces reference averages with explicit customer-specific inputs. The tools size and cost; CDW engineers design.
        </p>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Wave 0 · Shared foundation</h2>
          <p style={styles.sectionCopy}>
            The first build is intentionally plumbing-first. Before any calculator math ships, Phase 2 needs a trustworthy contract for provenance, write-back, dependencies and stale-state handling.
          </p>
          <div style={styles.grid}>
            {foundation.map((item) => (
              <div key={item} style={styles.card}>
                <div style={styles.badge}>FOUNDATION</div>
                <div style={styles.cardTitle}>{item}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>The four Phase 2 tools</h2>
          <p style={styles.sectionCopy}>
            Build order is Power → Storage → Software → Network. Final dependency order is different: Storage and Fabric can invalidate Power, so downstream results become STALE until the user explicitly recomputes them.
          </p>
          <div style={styles.grid}>
            {tools.map((tool) => (
              <article key={tool.name} style={styles.card}>
                <div style={styles.badge}>{tool.status}</div>
                <h3 style={styles.cardTitle}>{tool.name}</h3>
                <p style={styles.cardText}>{tool.purpose}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>State and write-back contract</h2>
          <div style={styles.flow}>
            <div style={styles.flowItem}>CURRENT<br /><span style={{ fontWeight: 400 }}>Result matches its upstream inputs.</span></div>
            <div style={styles.flowItem}>STALE<br /><span style={{ fontWeight: 400 }}>An upstream input changed. Existing value stays visible but is not silently replaced.</span></div>
            <div style={styles.flowItem}>RECOMPUTED<br /><span style={{ fontWeight: 400 }}>User explicitly accepts a fresh calculation and TCO override.</span></div>
            <div style={styles.flowItem}>REVERTED<br /><span style={{ fontWeight: 400 }}>User returns to the reference/default TCO value.</span></div>
          </div>
        </section>

        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>V2 modeling guardrails already locked</h2>
          <ul style={styles.list}>
            <li>Energy expense and facility burden are separate; utility-rate math never replaces a fully loaded facility-cost assumption.</li>
            <li>Owned datacenter and colocation are separate economic branches.</li>
            <li>Provenance has two dimensions: source and derivation.</li>
            <li>Facility feasibility uses design / maximum rated power; utilization affects energy consumption only.</li>
            <li>Heat rejection is based on IT load, not IT load multiplied by PUE.</li>
            <li>Fabric cost writes back as a fleet-size step schedule.</li>
            <li>Carbon reporting is parked for a later release.</li>
            <li>Open-source software can show $0 license cost, never $0 operating cost.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
