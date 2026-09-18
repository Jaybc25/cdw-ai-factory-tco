import React, { useMemo, useState } from "react";
import { getDefaultModel, RECOMMENDED_MODELS } from "./modelRegistry.js";
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
  const [hardwareClass, setHardwareClass] = useState("B200");
  const [deployedGpuCount, setDeployedGpuCount] = useState(8);
  const [quant, setQuant] = useState("FP8");
  const [modelId, setModelId] = useState(defaultModel?.id || RECOMMENDED_MODELS[0]?.id);
  const [attributableTcoUsd, setAttributableTcoUsd] = useState("");
  const [horizonYears, setHorizonYears] = useState(3);
  const [productionServingFactor, setProductionServingFactor] = useState("");
  const [activeHoursPerDay, setActiveHoursPerDay] = useState(8);
  const [activeDaysPerYear, setActiveDaysPerYear] = useState(250);
  const [demandBasis, setDemandBasis] = useState(OUTPUT_TOKEN_DEMAND_BASIS.MEASURED_MONTHLY);
  const [monthlyOutputTokens, setMonthlyOutputTokens] = useState("");
  const [annualOutputTokens, setAnnualOutputTokens] = useState("");
  const [requestsPerDay, setRequestsPerDay] = useState("");
  const [avgOutputTokens, setAvgOutputTokens] = useState("");
  const [avgInputTokens, setAvgInputTokens] = useState("");

  const model = RECOMMENDED_MODELS.find((m) => m.id === modelId) || defaultModel;
  const availablePrecisions = PRECISIONS_BY_HARDWARE[hardwareClass] || ["FP8"];

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
      evidenceStatus: "MODELED",
    });

    return { throughput, demand, capacity, economics };
  }, [hardwareClass,deployedGpuCount,quant,model,attributableTcoUsd,horizonYears,productionServingFactor,activeHoursPerDay,activeDaysPerYear,demandBasis,monthlyOutputTokens,annualOutputTokens,requestsPerDay,avgOutputTokens,avgInputTokens]);

  const e = result.economics;
  const t = result.throughput;

  return (
    <main style={{maxWidth:1100,margin:"0 auto",padding:"28px 20px 64px",fontFamily:"Inter,system-ui,sans-serif",color:"#232323"}}>
      <div style={{border:"1px solid #f0b7b7",background:"#fff7f7",borderRadius:10,padding:"14px 16px",marginBottom:20}}>
        <div style={{fontSize:11,fontWeight:900,color:"#CC0000",letterSpacing:".12em"}}>PREVIEW — IE-4</div>
        <div style={{fontSize:14,fontWeight:700,marginTop:4}}>Inference Economics Preview</div>
        <div style={{fontSize:12,lineHeight:1.55,color:"#555",marginTop:4}}>Experimental cost-per-1M-output-tokens modeling. This route is not connected to the production TCO workflow and does not change customer-facing calculations.</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(310px,1fr))",gap:18}}>
        <section style={card}>
          <h2 style={h2}>1. Infrastructure & model</h2>
          <Field label="Hardware">
            <select value={hardwareClass} onChange={e=>handleHardwareChange(e.target.value)} style={input}>{HARDWARE.map(x=><option key={x}>{x}</option>)}</select>
          </Field>
          <Field label="Deployed GPUs"><input type="number" min="1" value={deployedGpuCount} onChange={e=>setDeployedGpuCount(e.target.value)} style={input}/><div style={subnote}>Preview economics currently require the exact source benchmark configuration: 8 GPUs for H200/B200/B300 and 72 GPUs for NVL72 systems.</div></Field>
          <Field label="Model">
            <select value={modelId} onChange={e=>setModelId(e.target.value)} style={input}>{RECOMMENDED_MODELS.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select>
          </Field>
          <Field label="Precision">
            <select value={quant} onChange={e=>setQuant(e.target.value)} style={input}>{availablePrecisions.map(x=><option key={x}>{x}</option>)}</select>
          </Field>
          <div style={note}>Throughput uses the same model and precision methodology as GPU Sizing. No separate IE throughput table is maintained.</div>
        </section>

        <section style={card}>
          <h2 style={h2}>2. Economics & serving window</h2>
          <Field label="Attributable TCO ($)"><input type="number" min="1" placeholder="Enter TCO attributable to this workload" value={attributableTcoUsd} onChange={e=>setAttributableTcoUsd(e.target.value)} style={input}/></Field>
          <Field label="Analysis horizon (years)"><input type="number" min="1" value={horizonYears} onChange={e=>setHorizonYears(e.target.value)} style={input}/></Field>
          <Field label="Active hours / day"><input type="number" min="1" max="24" value={activeHoursPerDay} onChange={e=>setActiveHoursPerDay(e.target.value)} style={input}/></Field>
          <Field label="Active days / year"><input type="number" min="1" max="366" value={activeDaysPerYear} onChange={e=>setActiveDaysPerYear(e.target.value)} style={input}/></Field>
          <Field label="Production-serving factor">
            <input type="number" min=".01" max="1" step=".05" placeholder="Required: 0.01–1.00" value={productionServingFactor} onChange={e=>setProductionServingFactor(e.target.value)} style={input}/>
          </Field>
          <div style={note}>Required assumption. No universal MLPerf Offline → production-serving conversion is assumed. Enter a factor only when you are comfortable defending it for the workload being modeled.</div>
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
        {demandBasis===OUTPUT_TOKEN_DEMAND_BASIS.MEASURED_MONTHLY && <Field label="Measured output tokens / month"><input type="number" min="1" placeholder="Enter measured monthly output tokens" value={monthlyOutputTokens} onChange={e=>setMonthlyOutputTokens(e.target.value)} style={input}/></Field>}
        {demandBasis===OUTPUT_TOKEN_DEMAND_BASIS.ANNUAL_FORECAST && <Field label="Forecast output tokens / year"><input type="number" min="1" placeholder="Enter forecast annual output tokens" value={annualOutputTokens} onChange={e=>setAnnualOutputTokens(e.target.value)} style={input}/></Field>}
        {demandBasis===OUTPUT_TOKEN_DEMAND_BASIS.REQUEST_FORECAST && <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
          <Field label="Requests / day"><input type="number" min="1" placeholder="Enter requests/day" value={requestsPerDay} onChange={e=>setRequestsPerDay(e.target.value)} style={input}/></Field>
          <Field label="Avg output tokens / request"><input type="number" min="1" placeholder="Enter avg output tokens" value={avgOutputTokens} onChange={e=>setAvgOutputTokens(e.target.value)} style={input}/></Field>
          <Field label="Avg input tokens / request"><input type="number" min="1" placeholder="Optional input-token context" value={avgInputTokens} onChange={e=>setAvgInputTokens(e.target.value)} style={input}/></Field>
        </div>}
        <div style={note}>Cost/token currently uses generated output tokens because that matches the loaded throughput evidence. Input tokens are retained for future prefill-aware modeling.</div>
      </section>

      <section style={{...card,marginTop:18,borderTop:"4px solid #CC0000"}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:11,fontWeight:900,color:"#CC0000",letterSpacing:".1em"}}>RESULT</div>
            <h2 style={{margin:"5px 0 2px",fontSize:24}}>Effective private-AI cost</h2>
          </div>
          <span style={{fontSize:11,fontWeight:800,padding:"7px 10px",borderRadius:999,background:"#fff3cd",border:"1px solid #f2d98b"}}>MODELED</span>
        </div>

        {e?.ok ? <>
          <div style={{fontSize:42,fontWeight:900,marginTop:14}}>{money(e.costPerMillionOutputTokens)} <span style={{fontSize:16,fontWeight:700}}>/ 1M output tokens</span></div>
          <div style={metrics}>
            <Metric label="Annual useful demand" value={compact(e.annualDemandOutputTokens)} />
            <Metric label="Annual serving capacity" value={compact(e.annualCapacityOutputTokens)} />
            <Metric label="Demand / modeled serving capacity" value={(e.demandUtilizationOfCapacity*100).toFixed(1)+"%"} />
            <Metric label="Modeled output throughput" value={compact(t?.effectiveThroughputTokPerSec)+" tok/s"} />
          </div>
          <div style={note}>Unused capacity does not lower this result. The denominator is useful demand actually served, not every token the hardware could theoretically produce.</div>
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

function Field({label,children}) {
  return <label style={{display:"block",marginBottom:12}}><span style={{display:"block",fontSize:12,fontWeight:800,marginBottom:5}}>{label}</span>{children}</label>;
}
function Metric({label,value}) {
  return <div><div style={{fontSize:11,color:"#666",fontWeight:700}}>{label}</div><div style={{fontSize:18,fontWeight:850,marginTop:3}}>{value}</div></div>;
}
const card={border:"1px solid #e4e4e4",borderRadius:12,padding:18,background:"#fff",boxShadow:"0 1px 2px rgba(0,0,0,.03)"};
const h2={fontSize:16,margin:"0 0 14px",fontWeight:850};
const input={width:"100%",boxSizing:"border-box",border:"1px solid #cfcfcf",borderRadius:7,padding:"9px 10px",fontSize:13,background:"#fff"};
const note={fontSize:11.5,lineHeight:1.5,color:"#666",background:"#f7f7f7",borderRadius:7,padding:"9px 10px",marginTop:6};
const subnote={fontSize:10.5,lineHeight:1.45,color:"#777",marginTop:6};
const chip={border:"1px solid #bbb",borderRadius:999,padding:"7px 11px",fontSize:12,fontWeight:750,cursor:"pointer"};
const metrics={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:16,marginTop:20,paddingTop:16,borderTop:"1px solid #eee"};
