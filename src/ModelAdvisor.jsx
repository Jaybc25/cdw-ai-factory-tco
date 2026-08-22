import React, { useState, useMemo } from "react";
import { ChevronDown, X, ArrowRight } from "lucide-react";
import cdwLogo from "./cdw-logo.png";
import { AuthProvider, useAuth, useAutosaveSnapshot } from "./AuthContext";
import AuthWidget from "./AuthWidget";
import {
  getCatalog, CATALOG_META, buildRecommendations, explainCard, explainVerificationCandidate, explainOtherEligible,
  applyHardFilters, METRIC_LABELS,
} from "./modelAdvisorEngine.js";

const RED = "#CC0000";
const CHARCOAL = "#2D2D2D";

const TIPS = {
  workload: (
    <div className="flex flex-col gap-2">
      <div>Which tasks you'll actually use this model for. Check every workload that matters, then tell us which one to prioritize below -- ranking is based on that one, since a model great at coding isn't necessarily great at everything else.</div>
      <ul className="flex flex-col gap-1.5 mt-1">
        <li><strong>General chat / assistant</strong> -- conversational agents, e.g. Ambient Healthcare Agents, AI Virtual Assistant, Digital Human</li>
        <li><strong>RAG / knowledge retrieval</strong> -- grounded document Q&A, e.g. NVIDIA RAG Blueprint, Streaming Data to RAG, AI-Q Research Assistant</li>
        <li><strong>Coding</strong> -- code generation/assistance, e.g. Nsight Copilot</li>
        <li><strong>Summarization & content generation</strong> -- e.g. Retail Catalog Enrichment, PDF to Podcast</li>
        <li><strong>Agentic / tool use</strong> -- autonomous multi-step workflows, e.g. Retail Agentic Commerce, Multi-Agent Warehouse, NemoClaw agents</li>
        <li><strong>Reasoning</strong> -- multi-step analytical work, e.g. Quantitative Signal Discovery</li>
        <li><strong>Classification & extraction</strong> -- structured labeling/extraction (document routing, ticket tagging). No single Explorer Blueprint centers on this alone -- it shows up as a component inside several of the above.</li>
      </ul>
      <div className="text-xs text-gray-500 mt-1">Note: Blueprints outside these seven -- digital twins, simulation, genomics, and similar specialized workloads -- aren't open-weight model selection questions. Those route to GPU Sizing or a specialized-stack page directly from Use Case Explorer, not through this tool.</div>
    </div>
  ),
  primaryWorkload: "Of the workloads you checked, which matters most for this decision? We rank models using the benchmark that best matches this specific workload where one exists.",
  qualityPriority: "How much you're willing to trade raw capability for a smaller, cheaper-to-run model. Frontier-like stays close to the top score; Economical allows a much wider range of models to qualify as \"efficient enough.\"",
  contextWindow: "The largest amount of text (prompt + conversation history) the model needs to handle at once. If you're not sure, 32K covers most chat and document use cases comfortably.",
  multimodal: "Whether you need the model to understand images, not just text. Leave as Text only unless your use case specifically involves image input.",
  reasoningIntensity: "How much complex, multi-step reasoning your workload needs. This helps us understand your use case for future planning -- it doesn't currently affect which models are recommended, since no dedicated reasoning benchmark exists yet in our data.",
  fineTuning: "Whether you plan to fine-tune the model on your own data. This helps inform future deployment planning -- it doesn't currently affect which models are recommended, since we don't yet track fine-tuning support per model.",
  license: "Whether you need clear commercial-use rights, or research-only is fine. If a model's license can't be confidently classified, it's flagged for manual review rather than guessed at.",
  governance: "Whether the model's developer needs to be headquartered in a specific country. This reflects the developing organization's HQ, not necessarily where training took place.",
  dataSensitivity: "How sensitive the data this model will touch is. Regulated or air-gapped answers will prompt you to also set a governance requirement above, since those often go together but aren't automatically the same thing.",
  optimizationPriority: "What matters most when we pick your single best-fit recommendation: raw capability, model size efficiency, or a balance of both.",
};

function TipDot({ tipKey }) {
  const [open, setOpen] = useState(false);
  const boxRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    function handleKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handleOutside, true);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handleOutside, true);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (!TIPS[tipKey]) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="More info"
        className="inline-flex items-center justify-center w-4 h-4 rounded-full border text-[10px] font-bold leading-none ml-1.5 align-middle"
        style={{ borderColor: RED, color: RED }}
      >
        ?
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(45,45,45,0.35)" }}>
          <div ref={boxRef} className="w-full max-w-sm text-sm bg-white rounded-xl shadow-xl p-5" style={{ border: `1.5px solid ${RED}`, color: CHARCOAL }}>
            <div className="flex justify-between items-center gap-3 mb-3">
              <span className="text-xs font-bold uppercase tracking-wide" style={{ color: RED }}>About this field</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 -mr-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div>{TIPS[tipKey]}</div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, hint, tipKey, children }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold mb-1" style={{ color: CHARCOAL }}>
        {label}
        {tipKey && <TipDot tipKey={tipKey} />}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-9 text-sm bg-white focus:outline-none focus:ring-2"
        style={{ "--tw-ring-color": RED }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="w-4 h-4 absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
    </div>
  );
}

const WORKLOAD_OPTIONS = [
  { value: "chat", label: "General chat / assistant" },
  { value: "rag", label: "RAG / knowledge retrieval" },
  { value: "coding", label: "Coding" },
  { value: "summarization", label: "Summarization & content generation" },
  { value: "agentic", label: "Agentic / tool use" },
  { value: "reasoning", label: "Reasoning" },
  { value: "classification", label: "Classification & extraction" },
];

const QUALITY_OPTIONS = [
  { value: "frontier-like", label: "Frontier-like (max capability)" },
  { value: "strong", label: "Strong (moderate tradeoff)" },
  { value: "economical", label: "Economical (widest tradeoff)" },
];

const CONTEXT_OPTIONS = [
  { value: "none", label: "No specific requirement" },
  { value: "8k", label: "8K tokens" },
  { value: "32k", label: "32K tokens" },
  { value: "128k+", label: "128K+ tokens" },
];

const MULTIMODAL_OPTIONS = [
  { value: "none", label: "No preference" },
  { value: "text-only", label: "Text only" },
  { value: "image-text", label: "Image + text" },
];

const REASONING_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "complex", label: "Complex reasoning" },
  { value: "coding-reasoning", label: "Coding-and-reasoning intensive" },
];

const FINETUNE_OPTIONS = [
  { value: "none", label: "No fine-tuning planned" },
  { value: "lora-peft", label: "LoRA / PEFT" },
  { value: "full", label: "Full fine-tune" },
];

const LICENSE_OPTIONS = [
  { value: "need-to-check", label: "Not sure yet / need to check" },
  { value: "permissive-commercial", label: "Permissive commercial use required" },
  { value: "research-only-ok", label: "Research-only is fine" },
];

const GOVERNANCE_OPTIONS = [
  { value: "none", label: "No restriction" },
  { value: "us-only", label: "U.S.-developed only" },
  { value: "approved-vendor-families", label: "Approved vendor families only" },
];

const SENSITIVITY_OPTIONS = [
  { value: "general", label: "General" },
  { value: "confidential", label: "Confidential" },
  { value: "regulated", label: "Regulated" },
  { value: "air-gapped", label: "Air-gapped" },
];

const OPTIMIZATION_OPTIONS = [
  { value: "best-capability", label: "Best capability" },
  { value: "balanced", label: "Balanced" },
  { value: "infrastructure-efficiency", label: "Infrastructure efficiency" },
];

const CONFIDENCE_BADGE = {
  HIGH: { label: "Verified spec", color: "#1a7a3c" },
  MEDIUM: { label: "Size-class estimate", color: "#a66a00" },
};

function labelFor(options, value) {
  return options.find((o) => o.value === value)?.label || value;
}

function RecommendationCard({ card, ranking, inputs }) {
  const model = card.model;
  const conf = CONFIDENCE_BADGE[model.confidence] || CONFIDENCE_BADGE.MEDIUM;
  return (
    <div className="rounded-2xl border-2 p-5 flex flex-col gap-3" style={{ borderColor: RED, background: "white" }}>
      <div className="flex flex-wrap gap-1.5">
        {card.badges.map((b) => (
          <span key={b} className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded" style={{ background: RED, color: "white" }}>{b}</span>
        ))}
      </div>
      <div className="text-lg font-bold" style={{ color: CHARCOAL }}>{model.canonical_model_id}</div>
      <div className="text-sm text-gray-600">{explainCard(card, ranking, inputs)}</div>
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
        <span>{model.param_count_billion != null ? `${model.param_count_billion}B params` : "Param count unverified"}</span>
        <span style={{ color: conf.color }} className="font-semibold">{conf.label}</span>
        <span>{model.license || "License unverified"}</span>
      </div>
      <a
        href={`/gpu-sizing?model=${encodeURIComponent(model.canonical_model_id)}`}
        className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold justify-center py-2 rounded-lg"
        style={{ background: CHARCOAL, color: "white" }}
      >
        Size infrastructure for this model <ArrowRight className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

function OtherEligibleCard({ model, ranking }) {
  const conf = CONFIDENCE_BADGE[model.confidence] || CONFIDENCE_BADGE.MEDIUM;
  return (
    <div className="rounded-xl border border-gray-200 p-4 flex flex-col gap-2" style={{ background: "white" }}>
      <div className="text-base font-bold" style={{ color: CHARCOAL }}>{model.canonical_model_id}</div>
      <div className="text-sm text-gray-600">{explainOtherEligible(model, ranking)}</div>
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
        <span>{model.param_count_billion != null ? `${model.param_count_billion}B params` : "Param count unverified"}</span>
        <span style={{ color: conf.color }} className="font-semibold">{conf.label}</span>
        <span>{model.license || "License unverified"}</span>
      </div>
      <a
        href={`/gpu-sizing?model=${encodeURIComponent(model.canonical_model_id)}`}
        className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold justify-center py-2 rounded-lg border"
        style={{ borderColor: CHARCOAL, color: CHARCOAL }}
      >
        Size infrastructure for this model <ArrowRight className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

const VALID_WORKLOAD_VALUES = ["chat", "rag", "coding", "summarization", "agentic", "reasoning", "classification"];

function getIncomingParams() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search);
}

function getInitialCheckedWorkloads() {
  const params = getIncomingParams();
  const raw = params?.get("workloads");
  if (!raw) return ["chat"];
  const values = raw.split(",").map((s) => s.trim()).filter((v) => VALID_WORKLOAD_VALUES.includes(v));
  return values.length ? values : ["chat"];
}

function getInitialPrimaryWorkload(checked) {
  const params = getIncomingParams();
  const primary = params?.get("primary");
  if (primary && checked.includes(primary)) return primary;
  return checked[0];
}

function getInitialSourceUseCase() {
  const params = getIncomingParams();
  return params?.get("sourceUseCase") || null;
}

function DecisionRow({ label, value, sub }) {
  return (
    <div className="grid grid-cols-2 py-1 text-xs">
      <div className="text-gray-500">{label}{sub && <div className="text-[10px] text-gray-400">{sub}</div>}</div>
      <div className="text-right font-semibold" style={{ color: CHARCOAL }}>{value}</div>
    </div>
  );
}

// Shows one candidate's score against the qualifying threshold for a given
// slot decision -- pass/fail is read directly from the already-computed
// qualified pool (membership check), never re-derived from the margin
// arithmetic itself.
function ScoreCompare({ model, metric, score, threshold, qualified, note }) {
  const pass = qualified;
  return (
    <div className="rounded-lg border p-3 mb-2" style={{ borderColor: pass ? "#1E7A3D" : "#D1D5DB", background: pass ? "#EAF6EE" : "#F9FAFB" }}>
      <div className="flex justify-between text-xs font-semibold mb-1" style={{ color: CHARCOAL }}>
        <span>{model}</span><span>{score != null ? score : "—"}</span>
      </div>
      <div className="text-[11px] text-gray-500">{note}</div>
    </div>
  );
}

function ModelAdvisorInner() {
  const { isLoggedIn, needsSetup, account, logDownloadEvent } = useAuth();
  const catalog = useMemo(() => getCatalog(), []);

  const [checkedWorkloads, setCheckedWorkloads] = useState(getInitialCheckedWorkloads);
  const [primaryWorkload, setPrimaryWorkload] = useState(() => getInitialPrimaryWorkload(getInitialCheckedWorkloads()));
  const [sourceUseCase] = useState(getInitialSourceUseCase);
  const [qualityPriority, setQualityPriority] = useState("strong");
  const [contextWindow, setContextWindow] = useState("none");
  const [multimodal, setMultimodal] = useState("none");
  const [reasoningIntensity, setReasoningIntensity] = useState("normal");
  const [fineTuning, setFineTuning] = useState("none");
  const [license, setLicense] = useState("need-to-check");
  const [governance, setGovernance] = useState("none");
  const [dataSensitivity, setDataSensitivity] = useState("general");
  const [optimizationPriority, setOptimizationPriority] = useState("balanced");

  const [view, setView] = useState("calc"); // calc | report | audit
  const [lead, setLead] = useState({ name: "", company: "", email: "" });
  const [leadStatus, setLeadStatus] = useState("");

  function toggleWorkload(w) {
    setCheckedWorkloads((prev) => {
      const next = prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w];
      if (next.length === 0) return prev;
      if (!next.includes(primaryWorkload)) setPrimaryWorkload(next[0]);
      return next;
    });
  }

  const inputs = {
    primaryWorkload, qualityPriority, contextWindow, multimodal,
    license, governance, optimizationPriority,
  };

  const result = useMemo(
    () => buildRecommendations(catalog, inputs),
    [catalog, primaryWorkload, qualityPriority, contextWindow, multimodal, license, governance, optimizationPriority]
  );

  const showGovernanceNudge = (dataSensitivity === "regulated" || dataSensitivity === "air-gapped") && governance === "none";

  useAutosaveSnapshot(
    "model-advisor",
    { ...inputs, checkedWorkloads: checkedWorkloads.join(",") },
    result.cards[0]
      ? {
          topModel: result.cards[0].model.canonical_model_id,
          topModelLicense: result.cards[0].model.license,
          topModelConfidence: result.cards[0].model.confidence,
          topModelParams: result.cards[0].model.param_count_billion,
          eligibleCount: result.eligibleCount,
          totalCount: result.totalCount,
          otherEligibleCount: result.eligibleCount - result.cards.length,
          verificationCandidateCount: result.verificationCount,
          primaryWorkload,
          qualityPriority,
          optimizationPriority,
        }
      : null
  );


  function requestReport() {
    if (isLoggedIn && !needsSetup && account) {
      setLead({ name: account.name || "", company: account.company || "", email: account.email || "" });
      logDownloadEvent("model-advisor", {
        primaryWorkload,
        workloads: checkedWorkloads.join(","),
        topModel: result.cards[0]?.model.canonical_model_id || null,
        qualityPriority,
        optimizationPriority,
      });
      setView("report");
    } else {
      setView("gate");
    }
  }

  function submitLead() {
    if (!lead.name || !lead.email || !lead.company) { setLeadStatus("Please fill in all three fields."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) { setLeadStatus("Please enter a valid email address."); return; }
    setLeadStatus("");
    setView("report");
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } }`}</style>
      <div className="border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <a href="/" className="flex-shrink-0" aria-label="AI Factory Tools home">
          <img src={cdwLogo} alt="CDW" className="h-9 w-auto" />
        </a>
        <div>
          <div className="text-xs font-bold tracking-wide" style={{ color: RED }}>AI FACTORY TOOLS</div>
          <div className="text-lg font-bold" style={{ color: CHARCOAL }}>Open-Weight Model Advisor</div>
        </div>
        <span className="ml-auto text-xs font-bold px-2 py-1 rounded" style={{ background: RED, color: "white" }}>PROTOTYPE v1.2</span>
      </div>

      <div className="no-print border-b border-gray-100 px-6 py-2 flex items-center justify-end">
        <AuthWidget />
      </div>

      {view === "gate" && (
        <div className="max-w-lg mx-auto px-6 py-10">
          <div className="rounded-xl border border-gray-200 p-6">
            <div className="text-lg font-bold mb-1" style={{ color: CHARCOAL }}>Get the full model advisor report</div>
            <div className="text-xs text-gray-500 mb-4">
              The report includes your selected workloads, the recommended model(s) with ranking rationale,
              licensing and deployment notes, and the next step for infrastructure sizing.
            </div>
            {["name", "company", "email"].map((f) => (
              <input
                key={f}
                placeholder={f === "name" ? "Full name" : f === "company" ? "Company" : "Work email"}
                value={lead[f]}
                type={f === "email" ? "email" : "text"}
                onChange={(e) => setLead({ ...lead, [f]: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm mb-2"
              />
            ))}
            {leadStatus && <div className="text-xs mb-2" style={{ color: RED }}>{leadStatus}</div>}
            <div className="flex gap-2 mt-2">
              <button onClick={submitLead} className="flex-1 text-sm font-bold py-2.5 rounded-lg text-white" style={{ background: RED }}>
                View my report
              </button>
              <button onClick={() => setView("calc")} className="text-sm font-semibold py-2.5 px-4 rounded-lg border border-gray-300 text-gray-600">
                Back
              </button>
            </div>
          </div>
        </div>
      )}

      {view === "report" && (
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="no-print flex gap-2 mb-6">
            <button onClick={() => window.print()} className="flex-1 text-sm font-bold py-2.5 rounded-lg text-white" style={{ background: CHARCOAL }}>
              Print / Save as PDF
            </button>
            <button onClick={() => setView("audit")} className="text-sm font-semibold py-2.5 px-4 rounded-lg border border-gray-300" style={{ color: CHARCOAL }}>
              Recommendation Methodology &amp; Decision Trace
            </button>
            <button onClick={() => setView("calc")} className="text-sm font-semibold py-2.5 px-4 rounded-lg border border-gray-300 text-gray-600">
              Back to advisor
            </button>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <img src={cdwLogo} alt="CDW" className="h-8 w-auto" />
            <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">AI Factory &middot; Open-Weight Model Advisor Report</div>
          </div>
          <div className="text-2xl font-bold mb-1" style={{ color: CHARCOAL }}>
            Prepared for {lead.name || "you"}{lead.company ? `, ${lead.company}` : ""}
          </div>
          <div className="text-xs text-gray-500 mb-6">
            {new Date().toLocaleDateString()} &middot; {result.eligibleCount} of {result.totalCount} tracked models met stated requirements
          </div>

          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Selected workloads</div>
          <div className="rounded-xl border border-gray-200 p-4 mb-6 text-sm" style={{ color: CHARCOAL }}>
            <div className="flex flex-wrap gap-2 mb-2">
              {checkedWorkloads.map((w) => (
                <span
                  key={w}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={w === primaryWorkload ? { background: RED, color: "white" } : { background: "#F2F2F2", color: CHARCOAL }}
                >
                  {labelFor(WORKLOAD_OPTIONS, w)}{w === primaryWorkload ? " (primary)" : ""}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-500">Ranking is based on the primary workload, since a model strong at one task isn't necessarily strong at every task checked.</p>
          </div>

          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Requirements used</div>
          <div className="rounded-xl border border-gray-200 p-4 mb-6 text-sm" style={{ color: CHARCOAL }}>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
              <div className="text-gray-500">Quality priority</div><div>{labelFor(QUALITY_OPTIONS, qualityPriority)}</div>
              <div className="text-gray-500">Context window</div><div>{labelFor(CONTEXT_OPTIONS, contextWindow)}</div>
              <div className="text-gray-500">Multimodal need</div><div>{labelFor(MULTIMODAL_OPTIONS, multimodal)}</div>
              <div className="text-gray-500">License requirement</div><div>{labelFor(LICENSE_OPTIONS, license)}</div>
              <div className="text-gray-500">Governance / origin</div><div>{labelFor(GOVERNANCE_OPTIONS, governance)}</div>
              <div className="text-gray-500">Data sensitivity</div><div>{labelFor(SENSITIVITY_OPTIONS, dataSensitivity)}</div>
              <div className="text-gray-500">Optimization priority</div><div>{labelFor(OPTIMIZATION_OPTIONS, optimizationPriority)}</div>
            </div>
          </div>

          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Recommended model(s) &amp; ranking rationale</div>
          {result.cards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-4 mb-6 text-sm text-gray-500">
              No models met the stated requirements at the time this report was generated. Relax the license, governance, or context window filters and re-run.
            </div>
          ) : (
            <div className="flex flex-col gap-4 mb-6">
              {result.cards.map((c) => (
                <RecommendationCard key={c.model.canonical_model_id} card={c} ranking={result.ranking} inputs={inputs} />
              ))}
            </div>
          )}

          {result.otherEligible.length > 0 && (
            <>
              <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Other models meeting requirements</div>
              <div className="rounded-xl border border-gray-200 p-4 mb-6 text-sm" style={{ color: CHARCOAL }}>
                <div className="flex flex-col gap-1.5">
                  {result.otherEligible.map((m) => {
                    const conf = CONFIDENCE_BADGE[m.confidence] || CONFIDENCE_BADGE.MEDIUM;
                    return (
                      <div key={m.canonical_model_id} className="flex justify-between gap-3">
                        <span className="font-semibold">{m.canonical_model_id}</span>
                        <span className="text-gray-500 text-xs">
                          {m.param_count_billion != null ? `${m.param_count_billion}B` : "unverified"} &middot;{" "}
                          <span style={{ color: conf.color }}>{conf.label}</span> &middot; {m.license || "license unverified"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {result.verificationCandidates.length > 0 && (
            <>
              <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#8A5A00" }}>Potential matches requiring verification</div>
              <div className="mb-6">
                {result.verificationCandidates.map((m) => (
                  <div key={m.canonical_model_id} className="rounded-xl border border-amber-300 bg-amber-50 p-4 mb-2 text-sm">
                    <div className="font-bold mb-1" style={{ color: CHARCOAL }}>{m.canonical_model_id}</div>
                    <div className="text-gray-600">{explainVerificationCandidate(m)}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Caveats</div>
          <div className="text-xs text-gray-500 p-4 bg-gray-50 rounded-lg mb-6 leading-relaxed">
            Model recommendations use periodically refreshed third-party benchmark and model metadata (specs synced{" "}
            {new Date(CATALOG_META.specsSyncedAt).toLocaleDateString()}, capability scores synced{" "}
            {new Date(CATALOG_META.capabilitySyncedAt).toLocaleDateString()}). Verify licensing and deployment
            requirements directly with the model provider before production use. This is a directional shortlist,
            not a final vendor decision -- confirm with a CDW AI Factory specialist.
          </div>

          {result.cards[0] && (
            <a
              href={`/gpu-sizing?model=${encodeURIComponent(result.cards[0].model.canonical_model_id)}`}
              className="no-print inline-flex items-center gap-1.5 text-sm font-bold justify-center py-2.5 px-5 rounded-lg mb-6"
              style={{ background: CHARCOAL, color: "white" }}
            >
              Next: size infrastructure for {result.cards[0].model.canonical_model_id} <ArrowRight className="w-3.5 h-3.5" />
            </a>
          )}

          <div className="border-t-2 pt-4 flex justify-between" style={{ borderColor: CHARCOAL }}>
            <div>
              <div className="text-sm font-bold" style={{ color: CHARCOAL }}>Jay B. Carlile</div>
              <div className="text-xs text-gray-500">AI Solutions Executive &middot; CDW AI Factory</div>
            </div>
            <div className="text-xs text-gray-500 text-right">Next step: bring your actual<br />deployment constraints for a validated shortlist</div>
          </div>
        </div>
      )}

      {view === "audit" && (
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="no-print flex gap-2 mb-6">
            <button onClick={() => window.print()} className="flex-1 text-sm font-bold py-2.5 rounded-lg text-white" style={{ background: CHARCOAL }}>
              Print / Save as PDF
            </button>
            <button onClick={() => setView("report")} className="text-sm font-semibold py-2.5 px-4 rounded-lg border border-gray-300 text-gray-600">
              Back to report
            </button>
          </div>

          <div className="flex items-center gap-3 mb-2">
            <img src={cdwLogo} alt="CDW" className="h-8 w-auto" />
            <div className="text-xs font-bold tracking-widest text-gray-500 uppercase">AI Factory &middot; Recommendation Methodology &amp; Decision Trace</div>
          </div>
          <div className="text-2xl font-bold mb-1" style={{ color: CHARCOAL }}>
            Prepared for {lead.name || "you"}{lead.company ? `, ${lead.company}` : ""}
          </div>
          <div className="text-xs text-gray-500 mb-1">{new Date().toLocaleDateString()} &middot; Why this model, why not the alternatives, and what data this trace relied on</div>
          <div className="text-xs text-gray-500 mb-6 italic">
            This document explains the same recommendation shown in the main report -- it does not re-rank models independently. Every score, threshold, and eligibility outcome below comes from the same engine functions that produced the recommendation on screen.
          </div>

          {/* SECTION 1: YOUR REQUIREMENTS */}
          <div className="text-xs uppercase tracking-wide mb-2 pb-1 border-b-2" style={{ color: CHARCOAL, borderColor: CHARCOAL }}>1. Your Requirements</div>
          <DecisionRow label="Workloads selected" value={checkedWorkloads.map((w) => labelFor(WORKLOAD_OPTIONS, w)).join(", ")} />
          <DecisionRow label="Primary workload (drives ranking)" value={labelFor(WORKLOAD_OPTIONS, primaryWorkload)} sub="Ranking uses only this workload's metric, since a model strong at one task isn't necessarily strong at every task checked" />
          <DecisionRow label="Ranking dimension" value={METRIC_LABELS[result.metric]} sub={`Selected from primary workload: ${primaryWorkload} -> ${result.metric}`} />
          <DecisionRow label="Quality priority" value={labelFor(QUALITY_OPTIONS, qualityPriority)} />
          <DecisionRow label="Optimization priority" value={labelFor(OPTIMIZATION_OPTIONS, optimizationPriority)} sub="Determines which slot fills 'Best Overall Fit'" />
          <DecisionRow label="Context window" value={labelFor(CONTEXT_OPTIONS, contextWindow)} />
          <DecisionRow label="Multimodal need" value={labelFor(MULTIMODAL_OPTIONS, multimodal)} />
          <DecisionRow label="License requirement" value={labelFor(LICENSE_OPTIONS, license)} />
          <DecisionRow label="Governance / origin" value={labelFor(GOVERNANCE_OPTIONS, governance)} />
          <DecisionRow label="Data sensitivity" value={labelFor(SENSITIVITY_OPTIONS, dataSensitivity)} />

          {/* SECTION 2: ELIGIBILITY GATE */}
          {(() => {
            // Re-calls the real, already-exported applyHardFilters with the
            // same catalog and inputs already used for the recommendation --
            // not a re-derivation, the literal same deterministic function,
            // just called once more to see the full FAIL-inclusive list it
            // already computes and (in the main flow) discards after PASS
            // filtering.
            const fullList = applyHardFilters(catalog, inputs);
            const failedModels = fullList.filter((m) => m.filterState === "FAIL");
            const tally = { license: 0, governance: 0, context: 0, modality: 0 };
            failedModels.forEach((m) => {
              if (m.filterDetails.licenseState === "FAIL") tally.license++;
              if (m.filterDetails.govState === "FAIL") tally.governance++;
              if (m.filterDetails.contextState === "FAIL") tally.context++;
              if (m.filterDetails.modalityState === "FAIL") tally.modality++;
            });
            const topModel = result.cards[0]?.model;
            const topDetails = topModel ? fullList.find((m) => m.canonical_model_id === topModel.canonical_model_id)?.filterDetails : null;
            return (
              <>
                <div className="text-xs uppercase tracking-wide mt-5 mb-2 pb-1 border-b-2" style={{ color: CHARCOAL, borderColor: CHARCOAL }}>2. Eligibility Gate</div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="rounded-lg border p-2 text-center" style={{ borderColor: "#1E7A3D" }}>
                    <div className="text-lg font-bold" style={{ color: "#1E7A3D" }}>{result.eligibleCount}</div>
                    <div className="text-[10px] text-gray-500 uppercase">Eligible</div>
                  </div>
                  <div className="rounded-lg border p-2 text-center" style={{ borderColor: "#a66a00" }}>
                    <div className="text-lg font-bold" style={{ color: "#a66a00" }}>{result.verificationCount}</div>
                    <div className="text-[10px] text-gray-500 uppercase">Verification required</div>
                  </div>
                  <div className="rounded-lg border p-2 text-center" style={{ borderColor: RED }}>
                    <div className="text-lg font-bold" style={{ color: RED }}>{failedModels.length}</div>
                    <div className="text-[10px] text-gray-500 uppercase">Excluded</div>
                  </div>
                </div>
                <div className="text-[11px] text-gray-500 mb-3">
                  Of {result.totalCount} tracked models: {result.eligibleCount} clearly satisfy every stated requirement, {result.verificationCount} have data too uncertain to safely treat as eligible without confirmation (never silently treated as passing or failing), and {failedModels.length} have known evidence against a stated requirement.
                </div>
                {failedModels.length > 0 && (
                  <div className="rounded-lg border border-gray-200 p-3 mb-3 text-xs">
                    <div className="font-semibold mb-1" style={{ color: CHARCOAL }}>Excluded, by reason (a model can appear in more than one)</div>
                    {tally.license > 0 && <div className="text-gray-500">License requirement not met: {tally.license}</div>}
                    {tally.governance > 0 && <div className="text-gray-500">Governance/origin requirement not met: {tally.governance}</div>}
                    {tally.context > 0 && <div className="text-gray-500">Context window requirement not met: {tally.context}</div>}
                    {tally.modality > 0 && <div className="text-gray-500">Modality requirement not met: {tally.modality}</div>}
                  </div>
                )}
                {topModel && topDetails && (
                  <div className="text-xs text-gray-500 mb-4">
                    <b style={{ color: CHARCOAL }}>{topModel.canonical_model_id}</b> cleared every check: license {topDetails.licenseState}, governance {topDetails.govState}, context window {topDetails.contextState}, modality {topDetails.modalityState}.
                  </div>
                )}
              </>
            );
          })()}

          {/* SECTION 3: RANKING DECISION */}
          <div className="text-xs uppercase tracking-wide mt-5 mb-2 pb-1 border-b-2" style={{ color: CHARCOAL, borderColor: CHARCOAL }}>3. Ranking Decision</div>
          <div className="text-xs text-gray-500 mb-2">
            Ranked by <b style={{ color: CHARCOAL }}>{METRIC_LABELS[result.metric]}</b> ({result.metric}), a capability index from the tracked capability registry (synced {new Date(CATALOG_META.capabilitySyncedAt).toLocaleDateString()}) -- not an externally standardized benchmark score; see Section 6 for what it does and doesn't represent.
          </div>
          {result.ranking.bestPerformanceIsFallback && (
            <div className="text-xs rounded-lg p-2 mb-2" style={{ background: "#FFF8E6", border: "1px solid #E8CE8A", color: CHARCOAL }}>
              No eligible model has a {METRIC_LABELS[result.metric]} score. Best Performance fell back to ranking by overall capability (intelligence_index) instead.
            </div>
          )}
          {result.ranking.restarted && (
            <div className="text-xs rounded-lg p-2 mb-2" style={{ background: "#FFF8E6", border: "1px solid #E8CE8A", color: CHARCOAL }}>
              No eligible model has a {METRIC_LABELS[result.metric]} score, so the Efficiency and Balanced size decisions restarted using overall capability (intelligence_index) and its own margins, not the {METRIC_LABELS[result.metric]} margins below.
            </div>
          )}
          <div className="text-xs font-semibold mb-1" style={{ color: CHARCOAL }}>Tier 1 -- models with a {METRIC_LABELS[result.metric]} score, ranked</div>
          <div className="overflow-x-auto mb-3">
            <table className="w-full text-xs" style={{ color: CHARCOAL }}>
              <thead>
                <tr className="text-gray-500 border-b" style={{ borderColor: "#D1D5DB" }}>
                  <th className="text-left py-1 pr-2">Model</th>
                  <th className="text-right py-1 pr-2">{METRIC_LABELS[result.metric]}</th>
                  <th className="text-right py-1 pr-2">Params (B)</th>
                  <th className="text-right py-1">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {result.ranking.tier1.map((m) => (
                  <tr key={m.canonical_model_id} className={m.canonical_model_id === result.ranking.bestPerformance?.canonical_model_id ? "font-bold" : ""} style={{ color: m.canonical_model_id === result.ranking.bestPerformance?.canonical_model_id ? RED : CHARCOAL }}>
                    <td className="py-1 pr-2">{m.canonical_model_id}</td>
                    <td className="text-right py-1 pr-2">{m[result.metric]}</td>
                    <td className="text-right py-1 pr-2">{m.param_count_billion ?? "unverified"}</td>
                    <td className="text-right py-1">{m.confidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DecisionRow label={`Quality margin (${qualityPriority})`} value={`${result.ranking.sizeSlotFullMargin} points`} sub={result.ranking.restarted ? "intelligence_index margin (restarted decision)" : `${METRIC_LABELS[result.metric]} margin`} />
          <DecisionRow label="Efficiency qualifying threshold" value={result.ranking.sizeSlotTopScore != null ? `>= ${(result.ranking.sizeSlotTopScore - result.ranking.sizeSlotFullMargin).toFixed(1)}` : "n/a"} sub="Top score minus the full margin above" />
          <DecisionRow label="Balanced qualifying threshold" value={result.ranking.sizeSlotTopScore != null ? `>= ${(result.ranking.sizeSlotTopScore - result.ranking.sizeSlotHalfMargin).toFixed(1)}` : "n/a"} sub="Top score minus half the margin -- a tighter bar than Efficiency" />

          {/* SECTION 4: WHY THESE RECOMMENDATIONS */}
          <div className="text-xs uppercase tracking-wide mt-5 mb-2 pb-1 border-b-2" style={{ color: CHARCOAL, borderColor: CHARCOAL }}>4. Why These Recommendations</div>
          <div className="text-xs text-gray-500 mb-3">Each badge below is traced to its own decision -- a model that lost Best Performance can still be the correct Efficiency or Balanced pick, and vice versa.</div>
          {result.cards.map((card) => (
            <div key={card.model.canonical_model_id} className="mb-4">
              <div className="text-sm font-bold mb-1" style={{ color: CHARCOAL }}>{card.model.canonical_model_id}</div>
              {card.badges.map((badge) => {
                if (badge === "Best Performance") {
                  const runnerUp = result.ranking.tier1[1];
                  return (
                    <div key={badge} className="text-xs text-gray-500 mb-2">
                      <b style={{ color: CHARCOAL }}>Best Performance:</b> {card.model[result.metric]} {METRIC_LABELS[result.metric]}
                      {runnerUp ? <>, ahead of the next-highest eligible model ({runnerUp.canonical_model_id}, {runnerUp[result.metric]}) by {(card.model[result.metric] - runnerUp[result.metric]).toFixed(1)} points.</> : ", the only eligible model with this metric."}
                    </div>
                  );
                }
                if (badge === "Most Efficient Qualifying Model") {
                  const pool = [...result.ranking.efficiencyQualified].sort((a, b) => a.param_count_billion - b.param_count_billion);
                  const nextSmallest = pool.find((m) => m.canonical_model_id !== card.model.canonical_model_id);
                  return (
                    <div key={badge} className="text-xs text-gray-500 mb-2">
                      <b style={{ color: CHARCOAL }}>Most Efficient Qualifying Model:</b> {card.model.param_count_billion}B params, smallest among the {pool.length} model{pool.length === 1 ? "" : "s"} scoring within the quality margin of the top {result.ranking.sizeSlotMetric === "intelligence_index" ? METRIC_LABELS.intelligence_index : METRIC_LABELS[result.metric]} score.
                      {nextSmallest && <> Next smallest qualifying model: {nextSmallest.canonical_model_id} at {nextSmallest.param_count_billion}B.</>}
                    </div>
                  );
                }
                if (badge === "Best Overall Fit") {
                  const basis = optimizationPriority === "best-capability" ? "Best Performance" : optimizationPriority === "infrastructure-efficiency" ? "Most Efficient Qualifying Model" : "Balanced (within half the quality margin)";
                  return (
                    <div key={badge} className="text-xs text-gray-500 mb-2">
                      <b style={{ color: CHARCOAL }}>Best Overall Fit:</b> your optimization priority ({labelFor(OPTIMIZATION_OPTIONS, optimizationPriority)}) maps this slot to the same decision as {basis}
                      {!card.badges.includes(basis) && basis === "Balanced (within half the quality margin)" && (() => {
                        const pool = [...result.ranking.balancedQualified].sort((a, b) => a.param_count_billion - b.param_count_billion);
                        return pool.length ? <> -- {card.model.param_count_billion}B params, smallest among {pool.length} model{pool.length === 1 ? "" : "s"} within half the quality margin.</> : ".";
                      })()}.
                    </div>
                  );
                }
                return null;
              })}
            </div>
          ))}

          {/* SECTION 5: WHY NOT THE ALTERNATIVES */}
          {result.otherEligible.length > 0 && (
            <>
              <div className="text-xs uppercase tracking-wide mt-5 mb-2 pb-1 border-b-2" style={{ color: CHARCOAL, borderColor: CHARCOAL }}>5. Why Not the Alternatives</div>
              {result.otherEligible.map((m) => {
                const score = m[result.metric];
                const inEfficiencyPool = result.ranking.efficiencyQualified.some((e) => e.canonical_model_id === m.canonical_model_id);
                const threshold = result.ranking.sizeSlotTopScore != null ? result.ranking.sizeSlotTopScore - result.ranking.sizeSlotFullMargin : null;
                let reason;
                if (score == null) {
                  reason = `No ${METRIC_LABELS[result.metric]} score on record -- not in Tier 1, so not eligible for any size-based slot regardless of size.`;
                } else if (inEfficiencyPool) {
                  reason = `Scored ${score} (within the quality margin, threshold ${threshold?.toFixed(1)}), but ${m.param_count_billion}B is not the smallest qualifying model, so it lost the Efficiency slot on size.`;
                } else if (threshold != null) {
                  reason = `Scored ${score}, below the ${threshold.toFixed(1)} qualifying threshold for a size-based slot -- ${(threshold - score).toFixed(1)} points short.`;
                } else {
                  reason = `Did not qualify for a size-based slot at this quality priority.`;
                }
                return (
                  <ScoreCompare key={m.canonical_model_id} model={m.canonical_model_id} score={score} qualified={inEfficiencyPool} note={reason} />
                );
              })}
            </>
          )}

          {/* SECTION 6: SOURCES, HEURISTICS & LIMITATIONS */}
          <div className="text-xs uppercase tracking-wide mt-5 mb-2 pb-1 border-b-2" style={{ color: CHARCOAL, borderColor: CHARCOAL }}>6. Sources, Heuristics &amp; Limitations</div>
          <DecisionRow label="Model specs last synced" value={new Date(CATALOG_META.specsSyncedAt).toLocaleDateString()} />
          <DecisionRow label="Capability scores last synced" value={new Date(CATALOG_META.capabilitySyncedAt).toLocaleDateString()} />
          <DecisionRow label="Models tracked" value={CATALOG_META.recordCount} />
          <div className="text-xs text-gray-500 mt-3 mb-2 leading-relaxed">
            <b style={{ color: CHARCOAL }}>Capability scores:</b> intelligence_index, coding_index, and agentic_index are capability indices from the tracked capability registry above -- composite indicators, not a single externally standardized benchmark. Treat point differences as directional, not as a precise, universally comparable scale.
          </div>
          <div className="text-xs text-gray-500 mb-2 leading-relaxed">
            <b style={{ color: CHARCOAL }}>License-permissiveness heuristic:</b> a license is treated as permitting commercial use when its text matches a known-permissive pattern (Apache, MIT, Llama 3.1/3.3/4, Gemma, Mixtral). This is a simplified check, not a legal determination -- Meta's Llama licenses in particular carry a &gt;700M-monthly-active-user commercial exception most customers won't hit, but a customer at that scale would need separate legal review. A license CDW's data doesn't recognize, or has no license on record, is marked "verification required," never silently passed or failed.
          </div>
          <div className="text-xs text-gray-500 mb-2 leading-relaxed">
            <b style={{ color: CHARCOAL }}>Governance / developer-origin check:</b> based on a tracked developer-country field. The "approved vendor families" governance option is informational only in this version -- no specific vendor-family list is enforced.
          </div>
          <div className="text-xs text-gray-500 mb-2 leading-relaxed">
            <b style={{ color: CHARCOAL }}>Missing-data treatment:</b> a requirement is only marked FAIL when known evidence contradicts it. When the underlying data is missing or unverified, the result is "verification required," never collapsed into a pass or a fail.
          </div>
          <div className="text-xs text-gray-500 mb-4 leading-relaxed">
            <b style={{ color: CHARCOAL }}>Confidence tiers:</b> {CONFIDENCE_BADGE.HIGH.label} means the model's spec was independently verified; {CONFIDENCE_BADGE.MEDIUM.label} means it's inferred from the model's size class rather than confirmed directly.
          </div>

          <div className="border-t-2 pt-4 flex justify-between" style={{ borderColor: CHARCOAL }}>
            <div>
              <div className="text-sm font-bold" style={{ color: CHARCOAL }}>Jay B. Carlile</div>
              <div className="text-xs text-gray-500">AI Solutions Executive &middot; CDW AI Factory</div>
            </div>
            <div className="text-xs text-gray-500 text-right">Questions about this trace?<br />Bring your actual deployment constraints for a validated pass</div>
          </div>
        </div>
      )}

      {view === "calc" && (
      <div className="max-w-5xl mx-auto px-6 py-6">
        {sourceUseCase && (
          <div className="mb-6 text-sm rounded-lg px-4 py-3" style={{ background: "#F5F5F5", border: "1px solid #ddd", color: "#444" }}>
            Workloads pre-filled based on your Use Case Explorer selection ({sourceUseCase}). Adjust anything below to refine the recommendation.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Inputs */}
          <div>
            <Field label="Workloads you care about" tipKey="workload">
              <div className="grid grid-cols-2 gap-2">
                {WORKLOAD_OPTIONS.map((w) => (
                  <label key={w.value} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={checkedWorkloads.includes(w.value)} onChange={() => toggleWorkload(w.value)} />
                    {w.label}
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Primary workload (used for ranking)" tipKey="primaryWorkload">
              <Select value={primaryWorkload} onChange={setPrimaryWorkload} options={WORKLOAD_OPTIONS.filter((w) => checkedWorkloads.includes(w.value))} />
            </Field>

            <Field label="Quality priority" tipKey="qualityPriority">
              <Select value={qualityPriority} onChange={setQualityPriority} options={QUALITY_OPTIONS} />
            </Field>

            <Field label="Context window need" tipKey="contextWindow">
              <Select value={contextWindow} onChange={setContextWindow} options={CONTEXT_OPTIONS} />
            </Field>

            <Field label="Multimodal need" tipKey="multimodal">
              <Select value={multimodal} onChange={setMultimodal} options={MULTIMODAL_OPTIONS} />
            </Field>

            <Field label="Reasoning intensity" tipKey="reasoningIntensity" hint="Informational only in V1 -- does not affect ranking.">
              <Select value={reasoningIntensity} onChange={setReasoningIntensity} options={REASONING_OPTIONS} />
            </Field>

            <Field label="Fine-tuning intent" tipKey="fineTuning" hint="Informational only in V1 -- does not affect ranking.">
              <Select value={fineTuning} onChange={setFineTuning} options={FINETUNE_OPTIONS} />
            </Field>

            <Field label="License requirement" tipKey="license">
              <Select value={license} onChange={setLicense} options={LICENSE_OPTIONS} />
            </Field>

            <Field label="Governance / origin restriction" tipKey="governance">
              <Select value={governance} onChange={setGovernance} options={GOVERNANCE_OPTIONS} />
            </Field>

            <Field label="Data sensitivity" tipKey="dataSensitivity">
              <Select value={dataSensitivity} onChange={setDataSensitivity} options={SENSITIVITY_OPTIONS} />
            </Field>
            {showGovernanceNudge && (
              <div className="text-xs rounded-lg px-3 py-2 mb-4 -mt-2" style={{ background: "#FEECEC", color: "#8A1F1F" }}>
                {dataSensitivity === "regulated" ? "Regulated" : "Air-gapped"} data often comes with a governance requirement -- consider setting one above if applicable to your deployment.
              </div>
            )}

            <Field label="Optimization priority" tipKey="optimizationPriority">
              <Select value={optimizationPriority} onChange={setOptimizationPriority} options={OPTIMIZATION_OPTIONS} />
            </Field>
          </div>

          {/* Results */}
          <div>
            <div className="text-sm text-gray-500 mb-3">
              {result.eligibleCount} of {result.totalCount} tracked models meet your stated requirements
              {result.verificationCount > 0 && `, ${result.verificationCount} need verification`}.
            </div>

            {result.cards.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                No models meet your stated requirements. Try relaxing the license, governance, or context window filters.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {result.cards.map((c) => (
                  <RecommendationCard key={c.model.canonical_model_id} card={c} ranking={result.ranking} inputs={inputs} />
                ))}
              </div>
            )}

            {result.otherEligible.length > 0 && (
              <div className="mt-6">
                <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: CHARCOAL, opacity: 0.7 }}>
                  Other models meeting your requirements
                </div>
                <div className="flex flex-col gap-3">
                  {result.otherEligible.map((m) => (
                    <OtherEligibleCard key={m.canonical_model_id} model={m} ranking={result.ranking} />
                  ))}
                </div>
              </div>
            )}

            {result.verificationCandidates.length > 0 && (
              <div className="mt-6">
                <div className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#8A5A00" }}>Potential match requiring verification</div>
                {result.verificationCandidates.map((m) => (
                  <div key={m.canonical_model_id} className="rounded-xl border border-amber-300 bg-amber-50 p-4 mb-2 text-sm">
                    <div className="font-bold mb-1" style={{ color: CHARCOAL }}>{m.canonical_model_id}</div>
                    <div className="text-gray-600">{explainVerificationCandidate(m)}</div>
                  </div>
                ))}
              </div>
            )}

            {result.cards.length > 0 && (
              <button
                onClick={requestReport}
                className="mt-6 w-full text-sm font-bold py-2.5 rounded-lg text-white"
                style={{ background: RED }}
              >
                Get the full report
              </button>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

export default function ModelAdvisor() {
  return (
    <AuthProvider>
      <ModelAdvisorInner />
    </AuthProvider>
  );
}
