import React, { useMemo, useState } from "react";
import { getDefaultModel, getModelById, RECOMMENDED_MODELS } from "./modelRegistry.js";
import { parseInferenceEconomicsPreviewHandoff } from "./inferenceEconomicsConnector.js";
import { deriveInferenceEconomicsThroughput } from "./inferenceEconomicsThroughput.js";
import {
  OUTPUT_TOKEN_DEMAND_BASIS,
  calculateAnnualOutputTokenDemand,
  calculateAnnualServingCapacity,
  calculateDemandBoundInferenceEconomics,
} from "./inferenceEconomicsWorkload.js";

const HARDWARE = ["H200", "B200", "GB200 NVL72", "B300", "GB300 NVL72"];
const PRECISIONS_BY_HARDWARE = {
  H200: ["FP8"],
  B200: ["FP4", "FP8", "FP16"],
  "GB200 NVL72": ["FP4", "FP8", "FP16"],
  B300: ["FP4", "FP8", "FP16"],
  "GB300 NVL72": ["FP4", "FP8", "FP16"],
};

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
function money(v) {
  return Number.isFinite(v) ? new Intl.NumberFormat("en-US", { style:"currency", currency:"USD", maximumFractionDigits:2 }).format(v) : "—";
}
function compact(v) {
  return Number.isFinite(v) ? new Intl.NumberFormat("en-US", { notation:"compact", maximumFractionDigits:2 }).format(v) : "—";
}

export default function InferenceEconomicsPreview() {
  const defaultModel = getDefaultModel();
  const handoff = useMemo(
    () => (typeof window !== "undefined" ? parseInferenceEconomicsPreviewHandoff(window.location.search) : null),
    []
  );
  const initialModel = handoff?.modelId ? getModelById(handoff.modelId) : null;
  const modelOptions = useMemo(() => {
    const options = [...RECOMMENDED_MODELS];
    if (initialModel && !options.some((m) => m.id === initialModel.id)) options.push(initialModel);
    return options;
  }, [initialModel]);

  const [hardwareClass, setHardwareClass] = useState(handoff?.hardwareClass || "B200");
  const [deployedGpuCount, setDeployedGpuCount] = useState(handoff?.gpuCount || 8);
  const [quant, setQuant] = useState(handoff?.quant || "FP8");
  const [modelId, setModelId] = useState(handoff?.modelId || defaultModel?.id || RECOMMENDED_MODELS[0]?.id);
  const [attributableTcoUsd, setAttributableTcoUsd] = useState(handoff?.attributableTcoUsd || "");
  const [horizonYears, setHorizonYears] = useState(handoff?.horizonYears || 3);
  const [productionServingFactor, setProductionServingFactor] = useState("");
  const [measuredSustainedOutputTokPerSec, setMeasuredSustainedOutputTokPerSec] = useState("");
  const [activeHoursPerDay, setActiveHoursPerDay] = useState(handoff?.activeHoursPerDay || 8);
  const [activeDaysPerYear, setActiveDaysPerYear] = useState(250);
  const [demandGrowthRate, setDemandGrowthRate] = useState(handoff?.demandGrowthRate ?? 0);
  const [demandBasis, setDemandBasis] = useState(OUTPUT_TOKEN_DEMAND_BASIS.MEASURED_MONTHLY);
  const [monthlyOutputTokens, setMonthlyOutputTokens] = useState("");
  const [annualOutputTokens, setAnnualOutputTokens] = useState("");
  const [requestsPerDay, setRequestsPerDay] = useState("");
  const [avgOutputTokens, setAvgOutputTokens] = useState("");
  const [avgInputTokens, setAvgInputTokens] = useState("");

  const model = modelOptions.find((m) => m.id === modelId) || defaultModel;
  const customParamsB = handoff?.modelId === "custom" ? handoff?.modelParamsB : null;
  const availablePrecisions = PRECISIONS_BY_HARDWARE[hardwareClass] || (quant ? [quant] : ["FP8"]);
  const inherited = handoff?.source === "tco";

  function handleHardwareChange(nextHardware) {
    setHardwareClass(nextHardware);
    const nextPrecisions = PRECISIONS_BY_HARDWARE[nextHardware] || ["FP8"];
    if (!nextPrecisions.includes(quant)) setQuant(nextPrecisions[0]);
    if (nextHardware.includes("NVL72")) setDeployedGpuCount(72);
    else setDeployedGpuCount(8);
  }

  const result = useMemo(() => {
    const throughput = deriveInferenceEconomicsThroughput({
      hardwareClass,
      deployedGpuCount: n(deployedGpuCount),
      quant,
      model,
      customParamsB,
    });

    if (!throughput.ok) return { throughput };

    const demand = calculateAnnualOutputTokenDemand({
      basis: demandBasis,
      measuredMonthlyOutputTokens: n(monthlyOutputTokens),
      annualOutputTokens: n(annualOutputTokens),
      requestsPerDay: n(requestsPerDay),
      averageOutputTokensPerRequest: n(avgOutputTokens),
      averageInputTokensPerRequest: n(avgInputTokens),
      activeDaysPerYear: n(activeDaysPerYear),
    });

    const capacity = calculateAnnualServingCapacity({
      effectiveOutputThroughputTokPerSec: throughput.effectiveThroughputTokPerSec,
      productionServingFactor: n(productionServingFactor),
      activeHoursPerDay: n(activeHoursPerDay),
      activeDaysPerYear: n(activeDaysPerYear),
    });

    const economics = calculateDemandBoundInferenceEconomics({
      attributableTcoUsd: n(attributableTcoUsd),
      horizonYears: n(horizonYears),
      demand,
      servingCapacity: capacity,
      demandGrowthRate: n(demandGrowthRate),
      evidenceStatus: "MODELED",
    });

    return { throughput, demand, capacity, economics };
  }, [hardwareClass,deployedGpuCount,quant,model,attributableTcoUsd,horizonYears,productionServingFactor,activeHoursPerDay,activeDaysPerYear,demandGrowthRate,demandBasis,monthlyOutputTokens,annualOutputTokens,requestsPerDay,avgOutputTokens,avgInputTokens]);

  const e = result.economics;
  const t = result.throughput;
  const derivedServingFactor =
    t?.ok && n(measuredSustainedOutputTokPerSec) > 0
      ? n(measuredSustainedOutputTokPerSec) / t.effectiveThroughputTokPerSec
      : null;

  return (
    <main style={{maxWidth:1100,margin:"0 auto",padding:"28px 20px 64px",fontFamily:"Inter,system-ui,sans-serif",color:"#232323"}}>
      <div style={{border:"1px solid #f0b7b7",background:"#fff7f7",borderRadius:10,padding:"14px 16px",marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:900,color:"#CC0000",letterSpacing:".12em"}}>PREVIEW — IE-5.2</div>
        <div style={{fontSize:14,fontWeight:700,marginTop:4}}>Inference Economics Preview</div>
        <div style={{fontSize:12,lineHeight:1.55,color:"#555",marginTop:4}}>Experimental cost-per-1M-output-tokens modeling. The connector only carries context from TCO into this Preview; it does not change TCO calculations, reports, or recommendations.</div>
      </div>
      {inherited && (
        <div style={{border:"1px solid #d8d8d8",background:"#f7f7f7",borderRadius:10,padding:"12px 14px",marginBottom:18,fontSize:12,lineHeight:1.55}}>
          <b>Inherited from TCO:</b> hardware, deployed GPU count, model, precision, horizon, workload growth{handoff?.activeHoursPerDay ? ", active hours/day" : ""}{handoff?.attributableTcoUsd ? ", and a modeled inference-attributable TCO allocation" : ""}.
          {handoff?.attributableTcoUsd && handoff?.allocationMethod === "WORKLOAD_SHARE_MODELED" ? (
            <div style={{marginTop:6,color:"#555"}}>
              <b>Modeled TCO allocation:</b> {money(handoff.attributableTcoUsd)} = {money(handoff.fullTcoUsd)} × {Math.round((handoff.inferenceShare || 0) * 100)}% inference share from the TCO workload mix. Override only if you have a better defensible allocation basis.
            </div>
          ) : null}
          {handoff?.blockers?.length ? (
            <div style={{marginTop:6,color:"#7a2d00"}}>
              <b>Connector guardrail:</b> {handoff.blockers.includes("FLEET_GROWTH_NOT_MODELED") ? "TCO adds systems during the selected horizon; the Preview will not infer multi-system inference scaling without qualified evidence. " : ""}{handoff.blockers.includes("UNSUPPORTED_HARDWARE") ? "This TCO hardware does not yet have qualifying inference-economics evidence. " : ""}{handoff.blockers.includes("CUSTOM_MODEL_SIZE_MISSING") ? "Custom model size is missing. " : ""}{handoff.blockers.includes("NO_INFERENCE_SHARE") ? "The TCO workload mix contains no inference share to allocate. " : ""}
            </div>
          ) : null}
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(310px,1fr))",gap:18}}>
        <section style={card}>
          <h2 style={h2}>1. Infrastructure & model</h2>
          <Field label="Hardware" help="The on-prem GPU system used for this inference workload. If you arrived from TCO, this is inherited and locked so the Preview stays tied to the same scenario.">
            <select value={hardwareClass} onChange={e=>handleHardwareChange(e.target.value)} style={input} disabled={inherited}>{[...new Set([...(hardwareClass ? [hardwareClass] : []), ...HARDWARE])].map(x=><option key={x}>{x}</option>)}</select>
          </Field>
          <Field label="Deployed GPUs" help="The total GPU count in the modeled deployment. This Preview currently supports only the exact GPU count used by the source benchmark: 8 GPUs for H200/B200/B300 and 72 GPUs for NVL72 systems."><input type="number" min="1" value={deployedGpuCount} onChange={e=>setDeployedGpuCount(e.target.value)} style={input} disabled={inherited}/><div style={subnote}>Preview economics currently require the exact source benchmark configuration: 8 GPUs for H200/B200/B300 and 72 GPUs for NVL72 systems.</div></Field>
          <Field label="Model" help="The language model being served. Model size changes expected throughput. If inherited from TCO, keep it locked to preserve the same scenario.">
            <select value={modelId} onChange={e=>setModelId(e.target.value)} style={input} disabled={inherited}>{modelOptions.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select>
          </Field>
          <Field label="Precision" help="The numeric precision or quantization used for inference, such as FP8 or FP4. Lower precision can increase throughput, but only evidence-backed adjustments are used here.">
            <select value={quant} onChange={e=>setQuant(e.target.value)} style={input} disabled={inherited}>{[...new Set([...(quant ? [quant] : []), ...availablePrecisions])].map(x=><option key={x}>{x}</option>)}</select>
          </Field>
          <div style={note}>Throughput uses the same model and precision methodology as GPU Sizing. No separate IE throughput table is maintained.</div>
        </section>

        <section style={card}>
          <h2 style={h2}>2. Economics & serving window</h2>
          <Field label="Attributable TCO ($)" help="The portion of on-prem total cost assigned to this inference workload. For mixed workloads, the connector can prefill a modeled allocation using the TCO inference share. Shared and fixed costs may not scale perfectly with workload share, so override the modeled allocation only when you have a better defensible basis."><input type="number" min="1" placeholder="Enter TCO attributable to this workload" value={attributableTcoUsd} onChange={e=>setAttributableTcoUsd(e.target.value)} style={input} disabled={handoff?.allocationMethod === "DIRECT_INFERENCE_WORKLOAD"}/>{handoff?.allocationMethod === "WORKLOAD_SHARE_MODELED" ? <div style={subnote}>Prefilled as a MODELED allocation from the TCO workload mix and intentionally overrideable.</div> : handoff?.attributableTcoUsd ? <div style={subnote}>Inherited from an inference-specific TCO workload and locked to that scenario.</div> : inherited ? <div style={subnote}>Not inherited. Enter an explicitly attributable inference TCO only if you can defend the allocation.</div> : null}</Field>
          <Field label="Analysis horizon (years)" help="The number of years over which the TCO numerator and useful token demand are compared. When inherited from TCO, this remains locked to the same horizon."><input type="number" min="1" value={horizonYears} onChange={e=>setHorizonYears(e.target.value)} style={input} disabled={inherited}/></Field>
          <Field label="Active hours / day" help="How many hours in a typical day this inference service is expected to accept production demand. This limits serving capacity; it does not reduce ownership cost."><input type="number" min="1" max="24" value={activeHoursPerDay} onChange={e=>setActiveHoursPerDay(e.target.value)} style={input} disabled={Boolean(handoff?.activeHoursPerDay)}/></Field>
          <Field label="Active days / year" help="How many days each year this workload is expected to operate. Use the real operating calendar if known; for a business-hours service this may be closer to working days than 365."><input type="number" min="1" max="366" value={activeDaysPerYear} onChange={e=>setActiveDaysPerYear(e.target.value)} style={input}/></Field>
          <Field label="Production-serving factor" help="The share of modeled benchmark throughput you expect to sustain in real production while meeting latency and service requirements. 1.0 means 100% of modeled throughput, not 100% GPU utilization. Do not guess if you have no defensible basis.">
            <input type="number" min=".01" max="1" step=".05" placeholder="Required: 0.01–1.00" value={productionServingFactor} onChange={e=>setProductionServingFactor(e.target.value)} style={input}/>
          </Field>
          <div style={note}>Required assumption. No universal MLPerf Offline → production-serving conversion is assumed. Enter a factor only when you are comfortable defending it for the workload being modeled.</div>
          <details style={{marginTop:8}}>
            <summary style={{cursor:"pointer",fontSize:11.5,fontWeight:800,color:"#444"}}>How do I determine the production-serving factor?</summary>
            <div style={{...note,marginTop:8}}>
              If you have a measured sustained output-token rate from production or a representative load test, enter it below. The helper divides that measured rate by the Preview's modeled output throughput. Example: 20,000 measured tok/s ÷ 52,000 modeled tok/s ≈ 0.38.
              <div style={{display:"grid",gridTemplateColumns:"minmax(180px,1fr) auto",gap:8,alignItems:"end",marginTop:10}}>
                <Field label="Measured sustained output tok/s" help="Use a sustained production or representative load-test output-token rate that meets your latency/SLO target. Do not use a one-request burst or theoretical peak.">
                  <input type="number" min="1" placeholder="Optional: measured sustained tok/s" value={measuredSustainedOutputTokPerSec} onChange={e=>setMeasuredSustainedOutputTokPerSec(e.target.value)} style={input}/>
                </Field>
                <button
                  type="button"
                  disabled={!derivedServingFactor || derivedServingFactor <= 0 || derivedServingFactor > 1}
                  onClick={()=>setProductionServingFactor(Number(derivedServingFactor.toFixed(4)))}
                  style={{...chip,marginBottom:12,opacity:(!derivedServingFactor || derivedServingFactor <= 0 || derivedServingFactor > 1)?0.45:1}}
                >
                  {derivedServingFactor ? `Use ${Math.min(derivedServingFactor, 9.99).toFixed(2)} factor` : "Calculate factor"}
                </button>
              </div>
              {derivedServingFactor > 1 ? <div style={{fontSize:11,color:"#8a1c1c"}}>Measured throughput is above the modeled benchmark basis. Do not apply a factor above 1.0; validate the benchmark/model assumptions instead.</div> : null}
            </div>
          </details>
          <div style={subnote}>The serving window changes feasibility/capacity only. It does not automatically recalculate the TCO numerator in this standalone Preview.</div>
        </section>
      </div>

      <section style={{...card,marginTop:18}}>
        <h2 style={h2}>3. Useful output-token demand</h2>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
          {[
            [OUTPUT_TOKEN_DEMAND_BASIS.MEASURED_MONTHLY,"Measured monthly"],
            [OUTPUT_TOKEN_DEMAND_BASIS.REQUEST_FORECAST,"Request forecast"],
            [OUTPUT_TOKEN_DEMAND_BASIS.ANNUAL_FORECAST,"Annual forecast"],
          ].map(([v,l])=><button key={v} onClick={()=>setDemandBasis(v)} style={{...chip,background:demandBasis===v?"#232323":"#fff",color:demandBasis===v?"#fff":"#232323"}}>{l}</button>)}
        </div>
        <Field label="Annual demand growth" help="Expected year-over-year growth in useful output-token demand. When inherited from TCO, this uses the same workload-growth assumption so the token denominator and TCO horizon stay aligned.">
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <input type="number" min="0" max="5" step=".05" value={demandGrowthRate} onChange={e=>setDemandGrowthRate(e.target.value)} style={input} disabled={inherited}/>
            <span style={{fontSize:12,fontWeight:800,whiteSpace:"nowrap"}}>{Math.round(n(demandGrowthRate)*100)}% / yr</span>
          </div>
        </Field>
        {demandBasis===OUTPUT_TOKEN_DEMAND_BASIS.MEASURED_MONTHLY && <Field label="Measured output tokens / month" help="Generated/output tokens actually served in a typical month. Best source: inference gateway, API, observability, or serving logs. If you do not have this measurement, use Request forecast instead."><input type="number" min="1" placeholder="Enter measured monthly output tokens" value={monthlyOutputTokens} onChange={e=>setMonthlyOutputTokens(e.target.value)} style={input}/></Field>}
        {demandBasis===OUTPUT_TOKEN_DEMAND_BASIS.ANNUAL_FORECAST && <Field label="Forecast output tokens / year" help="Expected generated/output tokens for a full year. Use this only when you already have a defensible annual token forecast."><input type="number" min="1" placeholder="Enter forecast annual output tokens" value={annualOutputTokens} onChange={e=>setAnnualOutputTokens(e.target.value)} style={input}/></Field>}
        {demandBasis===OUTPUT_TOKEN_DEMAND_BASIS.REQUEST_FORECAST && <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
          <Field label="Requests / day" help="Total inference requests expected per active day. Include requests from people, applications, copilots, agents, automations, and sub-agents—not just human users."><input type="number" min="1" placeholder="Enter requests/day" value={requestsPerDay} onChange={e=>setRequestsPerDay(e.target.value)} style={input}/></Field>
          <Field label="Avg output tokens / request" help="Average number of tokens the model generates in each response. If available, use measured serving logs; otherwise estimate from representative responses."><input type="number" min="1" placeholder="Enter avg output tokens" value={avgOutputTokens} onChange={e=>setAvgOutputTokens(e.target.value)} style={input}/></Field>
          <Field label="Avg input tokens / request" help="Average prompt/context tokens sent into the model. This is retained for future prefill-aware modeling and does not currently enter the cost-per-output-token denominator."><input type="number" min="1" placeholder="Optional input-token context" value={avgInputTokens} onChange={e=>setAvgInputTokens(e.target.value)} style={input}/></Field>
        </div>}
        <div style={note}>Cost/token currently uses generated output tokens because that matches the loaded throughput evidence. Input tokens are retained for future prefill-aware modeling.</div>
      </section>

      <section style={{...card,marginTop:18,borderTop:"4px solid #CC0000"}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:11,fontWeight:900,color:"#CC0000",letterSpacing:".1em"}}>RESULT</div>
            <h2 style={{margin:"5px 0 2px",fontSize:24}}>Effective private-AI cost</h2>
          </div>
          <ConfidenceBadge />
        </div>

        {e?.ok ? <>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",fontSize:42,fontWeight:900,marginTop:14}}>{money(e.costPerMillionOutputTokens)} <span style={{fontSize:16,fontWeight:700}}>/ 1M output tokens</span><InlineHelp text="Inference-attributable TCO divided by useful output tokens expected to be served across the selected horizon. The denominator follows your demand forecast and inherited growth—not theoretical maximum GPU output." /></div>
          <div style={metrics}>
            <Metric label="Year 1 useful demand" value={compact(e.annualDemandOutputTokens)} help="Useful output tokens the workload is expected to require in Year 1. Later years grow by the annual demand-growth assumption shown above." />
            <Metric label="Annual serving capacity" value={compact(e.annualCapacityOutputTokens)} help="Maximum useful output-token volume this configuration is modeled to serve in one year during the selected operating window, after applying the production-serving factor." />
            <Metric label="Year 1 demand / serving capacity" value={(e.demandUtilizationOfCapacity*100).toFixed(1)+"%"} help="Year 1 useful demand divided by modeled annual serving capacity. This is a capacity-consumption ratio, not measured GPU utilization. The remaining percentage is modeled Year 1 serving headroom." />
            <Metric label="Benchmark-adjusted throughput ceiling" value={compact(t?.effectiveThroughputTokPerSec)+" tok/s"} help="Benchmark output-token throughput after model and precision adjustments, before the production-serving factor de-rates it for real production. This is a modeled ceiling, not an observed workload rate." />
          </div>
          <div style={note}>Unused capacity does not lower this result. The denominator is useful demand actually served, not every token the hardware could theoretically produce.{e.demandGrowthRate > 0 ? ` Demand grows ${Math.round(e.demandGrowthRate*100)}%/yr; final-year demand is ${compact(e.finalYearDemandOutputTokens)} and peak modeled capacity use is ${(e.peakDemandUtilizationOfCapacity*100).toFixed(1)}%.` : ""}</div>
        </> : <>
          <div style={{fontSize:24,fontWeight:850,marginTop:14,color:"#8a1c1c"}}>{e?.reason==="UNDERSIZED_FOR_DEMAND" ? "Configuration does not meet stated demand" : "Result unavailable"}</div>
          <div style={{fontSize:13,color:"#555",marginTop:8}}>{e?.errors?.join(" ") || result.demand?.errors?.join(" ") || result.capacity?.errors?.join(" ") || result.throughput?.errors?.join(" ")}</div>
        </>}

        {t?.ok && <details style={{marginTop:18}}>
          <summary style={{cursor:"pointer",fontWeight:800,fontSize:13}}>Evidence & methodology</summary>
          <div style={{fontSize:12,lineHeight:1.6,color:"#555",marginTop:10}}>
            <div><b>Benchmark anchor:</b> {compact(t.sourceThroughputTokPerSec)} tok/s on {t.benchmarkGpuCount} × {t.hardwareClass}</div>
            <div><b>Model factor:</b> {t.modelScale.factor.toFixed(4)}×</div>
            <div><b>Precision factor:</b> {t.precisionScale.factor.toFixed(4)}×</div>
            <div><b>Deployment factor:</b> {t.deploymentScale.toFixed(4)}× (exact benchmark-count match required)</div>
            <div><b>Evidence source:</b> {t.evidence.sourceLabel}</div>
            <div><b>Scenario:</b> {t.evidence.scenario}; interactive serving remains modeled.</div>
          </div>
        </details>}
      </section>
    </main>
  );
}

function Field({label,help,children}) {
  const [open,setOpen] = useState(false);
  return <div style={{display:"block",marginBottom:12}}>
    <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,fontWeight:800,marginBottom:5}}>
      <span>{label}</span>
      {help ? <HelpDot open={open} onClick={()=>setOpen(!open)} /> : null}
    </div>
    {open && help ? <TipBox text={help} /> : null}
    {children}
  </div>;
}
function HelpDot({open,onClick}) {
  return <button type="button" onClick={onClick} aria-label="What is this?" aria-expanded={open}
    style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:17,height:17,boxSizing:"border-box",border:\"1.5px solid #CC0000\",borderRadius:"50%",color:open?"#fff":"#CC0000",fontSize:11,fontWeight:900,lineHeight:1,cursor:"pointer",background:open?"#CC0000":"#fff",padding:0}}>?</button>;
}
function TipBox({text}) {
  return <div style={{fontSize:12,color:"#2D2D2D",background:"#fff",border:"1px solid #DCDCDC",borderLeft:"3px solid #CC0000",borderRadius:6,padding:"8px 10px",margin:"6px 0 8px",lineHeight:1.45}}>{text}</div>;
}
function InlineHelp({text}) {
  const [open,setOpen] = useState(false);
  return <span style={{display:"inline-block",fontSize:12,fontWeight:400}}>
    <HelpDot open={open} onClick={()=>setOpen(!open)} />
    {open ? <span style={{display:"block",maxWidth:680}}><TipBox text={text} /></span> : null}
  </span>;
}
function Metric({label,value,help}) {
  const [open,setOpen] = useState(false);
  return <div>
    <div style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#666",fontWeight:700}}><span>{label}</span>{help ? <HelpDot open={open} onClick={()=>setOpen(!open)} /> : null}</div>
    {open && help ? <TipBox text={help} /> : null}
    <div style={{fontSize:18,fontWeight:850,marginTop:3}}>{value}</div>
  </div>;
}
function ConfidenceBadge() {
  const [open,setOpen] = useState(false);
  return <div>
    <button type="button" onClick={()=>setOpen(!open)} aria-expanded={open} style={{fontSize:11,fontWeight:800,padding:"7px 10px",borderRadius:999,background:"#fff3cd",border:"1px solid #f2d98b",cursor:"pointer"}}>MODELED ?</button>
    {open ? <div style={{maxWidth:360}}><TipBox text="This result combines qualified benchmark evidence with explicit workload and serving assumptions. It is not a measured, workload-specific production result." /></div> : null}
  </div>;
}
const card={border:"1px solid #e4e4e4",borderRadius:12,padding:18,background:"#fff",boxShadow:"0 1px 2px rgba(0,0,0,.03)"};
const h2={fontSize:16,margin:"0 0 14px",fontWeight:850};
const input={width:"100%",boxSizing:"border-box",border:"1px solid #cfcfcf",borderRadius:7,padding:"9px 10px",fontSize:13,background:"#fff"};
const note={fontSize:11.5,lineHeight:1.5,color:"#666",background:"#f7f7f7",borderRadius:7,padding:"9px 10px",marginTop:6};
const subnote={fontSize:10.5,lineHeight:1.45,color:"#777",marginTop:6};
const chip={border:"1px solid #bbb",borderRadius:999,padding:"7px 11px",fontSize:12,fontWeight:750,cursor:"pointer"};
const metrics={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:16,marginTop:20,paddingTop:16,borderTop:"1px solid #eee"};
