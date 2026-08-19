import React, { useEffect, useMemo, useState } from "react";
import cdwLogo from "./cdw-logo.png";
import { AuthProvider, useAuth, useAutosaveSnapshot } from "./AuthContext";
import AuthWidget from "./AuthWidget";
import checklistData from "./checklists.json";

// ---------------------------------------------------------------------------
// CDW AI Factory — AI Readiness Checklists (Tool 6)
// Presentation layer only. All content, impact designations, summary decision
// logic, and next-step mappings live in checklists.json (content_version 1.2).
// ---------------------------------------------------------------------------

const C = {
  red: "#CC0000",
  redDark: "#A50000",
  charcoal: "#232323",
  slate: "#5A5A5A",
  line: "#E4E4E4",
  bg: "#FFFFFF",
  panel: "#F7F7F7",
  greenOk: "#1E7B34",
  amber: "#B95E04",
  blue: "#1B5AA6",
};

const STATE_LABELS = { in_place: "In Place", needs_attention: "Needs Attention", dont_know: "Don't Know" };
const STATE_ORDER = ["in_place", "needs_attention", "dont_know"];

// Versioned browser storage with in-memory fallback (sandboxed previews have
// no localStorage; behavior is identical minus persistence).
const memStore = {};
function loadState() {
  try {
    const raw = window.localStorage.getItem("cdw-readiness");
    if (raw) return JSON.parse(raw);
  } catch (e) { /* fall through to memory */ }
  return memStore.state || null;
}
function saveState(state) {
  memStore.state = state;
  try { window.localStorage.setItem("cdw-readiness", JSON.stringify(state)); } catch (e) { /* memory only */ }
}

const freshState = () => ({ content_version: checklistData.content_version, answers: {}, routes: {} });

function itemById(id) { return checklistData.items.find((i) => i.id === id); }
function doorById(id) { return checklistData.doors.find((d) => d.id === id); }
function routedBranch(door, routes) {
  const branchId = routes[door.id];
  if (!branchId) return null;
  return door.branches.find((b) => b.id === branchId) || null;
}

// Completion state per frozen spec 5.1 — pure UI progress, no readiness meaning.
function completionOf(door, routes, answers) {
  const branch = routedBranch(door, routes);
  if (!branch) return { state: "not_started", answered: 0, total: 0, branch: null };
  const total = branch.items.length;
  const answered = branch.items.filter((id) => answers[id]).length;
  if (answered === 0) return { state: "not_started", answered, total, branch };
  if (answered < total) return { state: "in_progress", answered, total, branch };
  return { state: "complete", answered, total, branch };
}

// Readiness per data-defined rule order (spec 5.2/5.3). Predicates are keyed by
// rule id; evaluation order comes from checklists.json readiness_rule_order.
const RULE_PREDICATES = {
  needs_attention: (items, answers) =>
    items.some((it) => it.impact === "blocking" && answers[it.id] === "needs_attention"),
  gaps_to_investigate: (items, answers) =>
    items.some((it) => (it.impact === "blocking" || it.impact === "important") && answers[it.id] === "dont_know"),
  mostly_ready: (items, answers) =>
    items.some((it) => it.impact === "important" && answers[it.id] === "needs_attention"),
  ready: () => true,
};

function readinessOf(door, routes, answers) {
  const completion = completionOf(door, routes, answers);
  if (completion.state !== "complete") return null; // readiness only on complete branches
  const items = completion.branch.items.map(itemById);
  const order = checklistData.summary_logic.readiness_rule_order;
  for (const ruleId of order) {
    if (RULE_PREDICATES[ruleId](items, answers)) {
      const rule = checklistData.summary_logic.readiness_rules[ruleId];
      return { ruleId, label: rule.label, detail: detailLine(items, answers, ruleId) };
    }
  }
  return null;
}

// Status detail describes the user's own answers (spec 5.4), never a judgment.
function detailLine(items, answers, ruleId) {
  const blockingNA = items.filter((it) => it.impact === "blocking" && answers[it.id] === "needs_attention").length;
  const unknown = items.filter((it) => (it.impact === "blocking" || it.impact === "important") && answers[it.id] === "dont_know").length;
  const importantNA = items.filter((it) => it.impact === "important" && answers[it.id] === "needs_attention").length;
  const parts = [];
  if (blockingNA) parts.push(`${blockingNA} blocking item${blockingNA > 1 ? "s" : ""} need${blockingNA > 1 ? "" : "s"} attention`);
  if (ruleId !== "ready" && unknown) parts.push(`${unknown} item${unknown > 1 ? "s" : ""} remain${unknown > 1 ? "" : "s"} unknown`);
  if (ruleId === "mostly_ready" && importantNA) parts.push(`${importantNA} important item${importantNA > 1 ? "s" : ""} to resolve`);
  return parts.join("; ");
}

// Suggested next steps (data-driven; spec 5.5 + audited selection/ordering rules):
// Complete doors that are not Ready only; blocker item_steps win, first-in-branch-
// order tiebreak; severity ordering with door priority as tiebreaker; cap max_steps.
function suggestedSteps(routes, answers) {
  const ns = checklistData.next_steps;
  const sevRank = { blocking_needs_attention: 0, blocking_or_important_dont_know: 1, important_needs_attention: 2 };
  const doorRank = {};
  ns.ordering_rule.tiebreaker_door_priority.forEach((d, i) => { doorRank[d] = i; });
  const candidates = [];
  for (const door of checklistData.doors) {
    const readiness = readinessOf(door, routes, answers);
    if (!readiness || readiness.ruleId === "ready") continue; // Complete + not Ready only
    const branch = routedBranch(door, routes);
    const items = branch.items.map(itemById);
    const severity = readiness.ruleId === "needs_attention" ? "blocking_needs_attention"
      : readiness.ruleId === "gaps_to_investigate" ? "blocking_or_important_dont_know"
      : "important_needs_attention";
    // First qualifying blocker in the routed branch's authored item order.
    const blocker = branch.items
      .map(itemById)
      .find((it) => it.impact === "blocking" && ns.item_steps[it.id] &&
        (answers[it.id] === "needs_attention" || answers[it.id] === "dont_know"));
    const entry = blocker ? ns.item_steps[blocker.id] : ns.branch_steps[`${door.id}.${branch.id}`];
    if (entry) candidates.push({ door: door.id, severity, step: entry.step, tool_route: entry.tool_route });
  }
  candidates.sort((a, b) =>
    sevRank[a.severity] - sevRank[b.severity] || doorRank[a.door] - doorRank[b.door]);
  return candidates.slice(0, ns.max_steps);
}

// ---------------------------------------------------------------------------

const S = {
  page: { fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif", background: C.bg, color: C.charcoal, minHeight: "100vh" },
  shell: { maxWidth: 980, margin: "0 auto", padding: "0 20px 64px" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 0", borderBottom: `3px solid ${C.red}`, marginBottom: 28 },
  homeBlock: { textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 12 },
  eyebrow: { display: "block", fontSize: 11.5, fontWeight: 800, letterSpacing: 1.1, color: C.red },
  toolName: { display: "block", fontSize: 18, fontWeight: 800, color: C.charcoal, marginTop: 2 },
  protoBadge: { background: C.red, color: "#fff", fontSize: 11, fontWeight: 800, borderRadius: 5, padding: "4px 8px", letterSpacing: 0.4 },
  hero: { fontSize: 32, fontWeight: 800, margin: "8px 0 6px" },
  heroSub: { color: C.slate, fontSize: 16, margin: "0 0 26px", maxWidth: 640 },
  tileGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 },
  tile: { background: C.red, color: "#fff", borderRadius: 18, padding: "22px 20px", cursor: "pointer", border: "none", textAlign: "left", boxShadow: "0 2px 8px rgba(0,0,0,0.10)" },
  tileTitle: { fontSize: 20, fontWeight: 800, margin: "0 0 6px" },
  tileBlurb: { fontSize: 14, opacity: 0.94, margin: 0, lineHeight: 1.45 },
  tileChip: { display: "inline-block", marginTop: 12, fontSize: 12, fontWeight: 700, background: "rgba(255,255,255,0.18)", borderRadius: 999, padding: "3px 10px" },
  card: { border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, marginBottom: 16, background: C.bg },
  h2: { fontSize: 24, fontWeight: 800, margin: "0 0 4px" },
  sub: { color: C.slate, fontSize: 15, margin: "0 0 18px" },
  optionBtn: { display: "block", width: "100%", textAlign: "left", background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 16px", fontSize: 15, marginBottom: 10, cursor: "pointer", color: C.charcoal },
  itemCard: { border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 16px 12px", marginBottom: 12 },
  itemText: { fontSize: 15.5, fontWeight: 600, margin: "0 0 12px", lineHeight: 1.45 },
  segWrap: { display: "flex", gap: 8, flexWrap: "wrap" },
  seg: (active, tone) => ({
    border: `1.5px solid ${active ? tone : C.line}`,
    background: active ? tone : "#fff",
    color: active ? "#fff" : C.charcoal,
    borderRadius: 999, padding: "7px 14px", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
  }),
  expand: { background: C.panel, borderRadius: 10, padding: "12px 14px", marginTop: 12, fontSize: 14, lineHeight: 1.5 },
  expandLabel: { fontWeight: 700, fontSize: 12.5, textTransform: "uppercase", letterSpacing: 0.4, color: C.slate, margin: "0 0 4px" },
  navRow: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", margin: "6px 0 20px" },
  linkBtn: { background: "none", border: "none", color: C.blue, fontSize: 14, cursor: "pointer", padding: 0, textDecoration: "underline" },
  primaryBtn: { background: C.red, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 14.5, fontWeight: 700, cursor: "pointer" },
  statusChip: (bg) => ({ display: "inline-block", background: bg, color: "#fff", borderRadius: 999, padding: "3px 12px", fontSize: 12.5, fontWeight: 700 }),
  handoff: { border: `1.5px solid ${C.red}`, borderRadius: 12, padding: "14px 16px", marginTop: 8 },
  footer: { marginTop: 40, paddingTop: 16, borderTop: `1px solid ${C.line}`, color: C.slate, fontSize: 12.5, lineHeight: 1.5 },
  input: { display: "block", width: "100%", boxSizing: "border-box", border: `1px solid ${C.line}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, marginBottom: 10 },
};

const STATUS_COLORS = { "Ready": C.greenOk, "Mostly ready": "#4E8A1F", "Needs attention": C.red, "Gaps to investigate": C.amber };
const COMPLETION_LABELS = { not_started: "Not started", in_progress: "In progress", complete: "Complete" };

function AiReadinessChecklistsInner() {
  const { isLoggedIn, needsSetup, account, logDownloadEvent } = useAuth();
  const [store, setStore] = useState(() => {
    const saved = loadState();
    if (saved && saved.content_version === checklistData.content_version) return { state: saved, versionNotice: false };
    if (saved) return { state: freshState(), versionNotice: true };
    return { state: freshState(), versionNotice: false };
  });
  const [view, setView] = useState({ screen: "home", doorId: null });
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ name: "", company: "", email: "" });
  const [emailDone, setEmailDone] = useState(false);

  const { answers, routes } = store.state;
  useEffect(() => { saveState(store.state); }, [store.state]);

  const setAnswer = (itemId, value) =>
    setStore((s) => ({ ...s, state: { ...s.state, answers: { ...s.state.answers, [itemId]: value } } }));
  const setRoute = (doorId, branchId) =>
    setStore((s) => ({ ...s, state: { ...s.state, routes: { ...s.state.routes, [doorId]: branchId } } }));

  const steps = useMemo(() => suggestedSteps(routes, answers), [routes, answers]);

  const summaryText = useMemo(() => {
    const lines = ["CDW AI Factory — AI Readiness Checklists summary", ""];
    for (const door of checklistData.doors) {
      const comp = completionOf(door, routes, answers);
      const readiness = readinessOf(door, routes, answers);
      if (comp.state === "complete" && readiness) {
        lines.push(`${door.label}: ${readiness.label}${readiness.detail ? ` (${readiness.detail})` : ""}`);
      } else if (comp.state === "in_progress") {
        lines.push(`${door.label}: In progress, ${comp.answered} of ${comp.total} questions reviewed`);
      } else {
        lines.push(`${door.label}: Not started`);
      }
    }
    if (steps.length) {
      lines.push("", "Suggested next steps:");
      steps.forEach((st, i) => lines.push(`${i + 1}. ${st.step}`));
    }
    return lines.join("\n");
  }, [routes, answers, steps]);

  const door = view.doorId ? doorById(view.doorId) : null;
  const branch = door ? routedBranch(door, routes) : null;
  const doorsComplete = checklistData.doors.filter((d) => completionOf(d, routes, answers).state === "complete").length;

  useAutosaveSnapshot(
    "readiness",
    { routes, answers },
    {
      doorsComplete,
      doorsTotal: checklistData.doors.length,
      suggestedStepCount: steps.length,
    }
  );

  function requestSummary() {
    if (isLoggedIn && !needsSetup && account) {
      setEmailForm({ name: account.name || "", company: account.company || "", email: account.email || "" });
      logDownloadEvent("readiness", {
        doorsComplete,
        doorsTotal: checklistData.doors.length,
        suggestedStepCount: steps.length,
      });
      setEmailDone(true);
    } else {
      setEmailOpen(true);
    }
  }

  const [emailStatus, setEmailStatus] = useState("");
  function submitEmailForm() {
    if (!emailForm.name || !emailForm.email || !emailForm.company) { setEmailStatus("Please fill in all three fields."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.email)) { setEmailStatus("Please enter a valid email address."); return; }
    setEmailStatus("");
    setEmailDone(true);
  }

  return (
    <div style={S.page}>
      <style>{`@media print { .no-print { display: none !important; } }`}</style>
      <div style={S.shell}>
        <header style={S.header}>
          {/* Matches the sub-tool header convention used by the other AI Factory tools. */}
          <a href="/" style={S.homeBlock} aria-label="AI Factory Tools home">
            <img src={cdwLogo} alt="CDW" style={{ height: 36, width: "auto" }} />
            <span>
              <span style={S.eyebrow}>AI FACTORY TOOLS</span>
              <span style={S.toolName}>AI Readiness Checklists</span>
            </span>
          </a>
          <span style={S.protoBadge}>PROTOTYPE v1.0</span>
        </header>

        <div className="no-print" style={{ display: "flex", justifyContent: "flex-end", padding: "8px 0", borderBottom: "1px solid #eee", marginBottom: 12 }}>
          <AuthWidget />
        </div>

        {store.versionNotice && (
          <div style={{ ...S.card, borderColor: C.amber }}>
            The checklists have been updated since your last visit. Your earlier answers were saved against a previous
            version of the content and have been cleared so the summary stays accurate.
          </div>
        )}

        {view.screen === "home" && (
          <>
            <h1 style={S.hero}>Where do you want to start?</h1>
            <p style={S.heroSub}>
              Pick the topic that looks most like your situation. Work through the questions in any order, leave and come
              back, and see where things stand on the summary below.
            </p>
            <div style={S.tileGrid}>
              {checklistData.doors.map((d) => {
                const comp = completionOf(d, routes, answers);
                const readiness = readinessOf(d, routes, answers);
                const chip = comp.state === "complete" && readiness ? readiness.label
                  : comp.state === "in_progress" ? `${comp.answered} of ${comp.total} reviewed`
                  : "Not started";
                return (
                  <button key={d.id} style={S.tile} onClick={() => setView({ screen: routes[d.id] ? "branch" : "picker", doorId: d.id })}>
                    <p style={S.tileTitle}>{d.label}</p>
                    <p style={S.tileBlurb}>{d.hero_blurb}</p>
                    <span style={S.tileChip}>{chip}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ ...S.card, marginTop: 28 }}>
              <h2 style={S.h2}>Summary</h2>
              <p style={S.sub}>Status reflects your own answers on completed checklists. Nothing here is a grade.</p>
              {checklistData.doors.map((d) => {
                const comp = completionOf(d, routes, answers);
                const readiness = readinessOf(d, routes, answers);
                return (
                  <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "9px 0", borderBottom: `1px solid ${C.line}` }}>
                    <div>
                      <strong>{d.label}</strong>
                      {readiness && readiness.detail ? <span style={{ color: C.slate, fontSize: 13.5 }}> — {readiness.detail}</span> : null}
                      {comp.state === "in_progress" ? <span style={{ color: C.slate, fontSize: 13.5 }}> — {comp.answered} of {comp.total} questions reviewed</span> : null}
                    </div>
                    {comp.state === "complete" && readiness
                      ? <span style={S.statusChip(STATUS_COLORS[readiness.label] || C.slate)}>{readiness.label}</span>
                      : <span style={S.statusChip(comp.state === "in_progress" ? C.blue : C.slate)}>{COMPLETION_LABELS[comp.state]}</span>}
                  </div>
                );
              })}

              {steps.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <p style={{ fontWeight: 700, margin: "0 0 8px" }}>Suggested next steps</p>
                  <ol style={{ margin: 0, paddingLeft: 20 }}>
                    {steps.map((st, i) => (
                      <li key={i} style={{ marginBottom: 6, fontSize: 14.5, lineHeight: 1.5 }}>
                        {st.step}{" "}
                        {st.tool_route && <a href={st.tool_route} style={{ color: C.blue }}>Open the tool</a>}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div style={{ marginTop: 20 }}>
                {!emailOpen && !emailDone && (
                  <button className="no-print" style={S.primaryBtn} onClick={requestSummary}>Get my readiness summary</button>
                )}
                {emailOpen && !emailDone && (
                  <div className="no-print" style={{ maxWidth: 420 }}>
                    <input style={S.input} placeholder="Name" value={emailForm.name}
                      onChange={(e) => setEmailForm({ ...emailForm, name: e.target.value })} />
                    <input style={S.input} placeholder="Organization" value={emailForm.company}
                      onChange={(e) => setEmailForm({ ...emailForm, company: e.target.value })} />
                    <input style={S.input} placeholder="Work email" value={emailForm.email}
                      onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })} />
                    {emailStatus && <p style={{ color: C.red, fontSize: 12.5, marginTop: -4, marginBottom: 8 }}>{emailStatus}</p>}
                    <button style={S.primaryBtn} onClick={submitEmailForm}>Show my summary</button>
                  </div>
                )}
                {emailDone && (
                  <div>
                    <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                      <button style={S.primaryBtn} onClick={() => window.print()}>Print / Save as PDF</button>
                      <button style={{ ...S.primaryBtn, background: "#fff", color: C.charcoal, border: `1px solid ${C.line}` }} onClick={() => { setEmailDone(false); setEmailOpen(false); }}>Back</button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <img src={cdwLogo} alt="CDW" style={{ height: 30, width: "auto" }} />
                      <div style={{ fontSize: 10, letterSpacing: 1.5, color: C.slate, textTransform: "uppercase" }}>AI Factory &middot; Readiness Assessment Summary</div>
                    </div>
                    <div style={{ fontSize: 19, fontWeight: 800, margin: "4px 0 2px" }}>
                      Prepared for {emailForm.name || "you"}{emailForm.company ? `, ${emailForm.company}` : ""}
                    </div>
                    <div style={{ fontSize: 12, color: C.slate, marginBottom: 14 }}>{new Date().toLocaleDateString()}</div>
                    <pre style={{ ...S.expand, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{summaryText}</pre>
                    <p style={{ color: C.slate, fontSize: 12.5, marginTop: 8 }}>
                      This assessment reflects your own answers and organizes the gaps -- it doesn't certify, validate,
                      or verify anything, and isn't legal or compliance advice. Confirm with a CDW AI Factory specialist.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {view.screen === "picker" && door && (
          <>
            <div style={S.navRow}>
              <button style={S.linkBtn} onClick={() => setView({ screen: "home", doorId: null })}>← All topics</button>
            </div>
            <h1 style={S.h2}>{door.label}</h1>
            <p style={S.sub}>{door.state_picker.question}</p>
            {door.state_picker.options.map((opt) => (
              <button key={opt.branch} style={S.optionBtn}
                onClick={() => { setRoute(door.id, opt.branch); setView({ screen: "branch", doorId: door.id }); }}>
                {opt.label}
              </button>
            ))}
          </>
        )}

        {view.screen === "branch" && door && branch && (
          <BranchView
            door={door} branch={branch} answers={answers}
            onAnswer={setAnswer}
            onBack={() => setView({ screen: "home", doorId: null })}
            onReroute={() => setView({ screen: "picker", doorId: door.id })}
          />
        )}

        <footer style={S.footer}>
          <p style={{ margin: "0 0 4px" }}>
            These checklists record what you tell them and organize the gaps. They don't certify, validate, or verify anything,
            and they aren't legal or compliance advice — the teams named on each question determine what applies to your organization.
          </p>
          <p style={{ margin: 0 }}>CDW AI Factory · Draft for internal, seller-assisted use · Content version {checklistData.content_version}</p>
        </footer>
      </div>
    </div>
  );
}

function BranchView({ door, branch, answers, onAnswer, onBack, onReroute }) {
  const items = branch.items.map(itemById);
  const answered = items.filter((it) => answers[it.id]).length;
  const complete = answered === items.length;
  const handoffs = (door.handoffs && door.handoffs[branch.id]) || [];
  return (
    <>
      <div style={S.navRow}>
        <button style={S.linkBtn} onClick={onBack}>← All topics</button>
        <span style={{ color: C.line }}>|</span>
        <button style={S.linkBtn} onClick={onReroute}>Change my starting point</button>
      </div>
      <h1 style={S.h2}>{door.label}: {branch.label}</h1>
      <p style={S.sub}>{answered} of {items.length} questions reviewed{complete ? " — complete" : ""}</p>

      {items.map((it) => {
        const val = answers[it.id];
        const expanded = val === "needs_attention" || val === "dont_know";
        return (
          <div key={it.id} style={S.itemCard}>
            <p style={S.itemText}>{it.text}</p>
            <div style={S.segWrap}>
              {STATE_ORDER.map((stateKey) => {
                const tone = stateKey === "in_place" ? C.greenOk : stateKey === "needs_attention" ? C.red : C.amber;
                return (
                  <button key={stateKey} style={S.seg(val === stateKey, tone)} onClick={() => onAnswer(it.id, stateKey)}>
                    {STATE_LABELS[stateKey]}
                  </button>
                );
              })}
            </div>
            {expanded && (
              <div style={S.expand}>
                <p style={S.expandLabel}>Why it matters</p>
                <p style={{ margin: "0 0 10px" }}>{it.why_it_matters}</p>
                <p style={S.expandLabel}>Typical owners</p>
                <p style={{ margin: 0 }}>{it.typical_owners.join(", ")}</p>
              </div>
            )}
          </div>
        );
      })}

      {complete && handoffs.length > 0 && (
        <div style={S.handoff}>
          <p style={{ fontWeight: 800, margin: "0 0 8px" }}>Where this leads</p>
          {handoffs.map((h, i) => (
            <p key={i} style={{ margin: "0 0 6px", fontSize: 14.5 }}>
              <a href={h.tool_route} style={{ color: C.red, fontWeight: 600 }}>{h.link_text}</a>
            </p>
          ))}
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <button style={S.primaryBtn} onClick={onBack}>Back to summary</button>
      </div>
    </>
  );
}

export default function AiReadinessChecklists() {
  return (
    <AuthProvider>
      <AiReadinessChecklistsInner />
    </AuthProvider>
  );
}
