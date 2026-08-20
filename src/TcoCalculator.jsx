import { useState, useMemo } from "react";
import cdwLogo from "./cdw-logo.png";
import { AuthProvider, useAuth, useAutosaveSnapshot } from "./AuthContext";
import AuthWidget from "./AuthWidget";

/* ============ CLOUD RATES: per-GPU-hour LIST prices, by provider x GPU class ============
   Sources: provider pricing pages via trackers (gpucloudcost.com, Silicon Analysts,
   Thunder Compute, Spheron, Jarvislabs), Jul-Aug 2026. est = estimated/interpolated.
   Reserved (1-yr) = 40% off list unless noted — matches AWS B200 exactly
   ($113.93 -> $68.36/instance in the NVIDIA TCO tool). */
const RATES = {
  /* conf tiers: LISTED > NODE-NORM > EST > QUOTE (QUOTE = verify with provider). Midpoints per rate-expansion spec Aug 2026. */
  AWS:       { A100:{od:4.10,conf:"LISTED"}, H100:{od:6.88,conf:"LISTED"}, H200:{od:10.00,conf:"LISTED"}, "B200-class":{od:14.24,conf:"LISTED"}, B300:{od:17.80,conf:"NODE-NORM"}, GB200:{od:27.50,conf:"QUOTE"}, GB300:{od:30.00,conf:"QUOTE"} },
  Azure:     { A100:{od:3.40,conf:"EST"}, H100:{od:12.29,conf:"LISTED"}, H200:{od:10.60,conf:"LISTED"}, "B200-class":{od:27.04,conf:"LISTED",note:"4-GPU config list"}, B300:{od:15.00,conf:"QUOTE"}, GB200:{od:27.00,conf:"LISTED"}, GB300:{od:40.00,conf:"QUOTE"} },
  GCP:       { A100:{od:3.28,conf:"LISTED"}, H100:{od:11.06,conf:"LISTED"}, H200:{od:10.60,conf:"EST"}, "B200-class":{od:18.53,conf:"LISTED"}, B300:{od:15.00,conf:"QUOTE"}, GB200:{od:27.50,conf:"QUOTE"}, GB300:{od:30.00,conf:"QUOTE"} },
  OCI:       { A100:{od:3.05,conf:"EST"}, H100:{od:10.00,conf:"LISTED"}, H200:{od:10.30,conf:"LISTED"}, "B200-class":{od:15.00,conf:"EST"}, B300:{od:5.00,conf:"EST"}, GB200:{od:16.00,conf:"LISTED"}, GB300:{od:30.00,conf:"QUOTE"} },
  CoreWeave: { A100:{od:2.70,conf:"LISTED"}, H100:{od:6.16,conf:"LISTED"}, H200:{od:6.50,conf:"EST"}, "B200-class":{od:8.60,conf:"LISTED"}, B300:{od:8.00,conf:"EST"}, GB200:{od:10.50,conf:"LISTED"}, GB300:{od:12.00,conf:"EST"} },
};

/* Own-side registry — NVIDIA TCO tool loaded costs (Aug 2026 capture). perSys EXCLUDES the $600K
   per-CLUSTER mgmt nodes and rack cost: cluster-level costs are fixed overhead that amortizes
   across fleet size; racks are added per ceiling(n / perRack). */
const SYSTEMS = {
  "DGX H200":         { gpus: 8,  perSys: 549764,  kW: 10.2, perRack: 2, rackCost: 15000, vram: 141, prof: 25000, sw: 99000 },
  "DGX B200":         { gpus: 8,  perSys: 744793,  kW: 14.4, perRack: 2, rackCost: 15000, vram: 192, prof: 25000, sw: 142800 },
  "DGX B300":         { gpus: 8,  perSys: 846885,  kW: 14.4, perRack: 2, rackCost: 15000, vram: 288, prof: 25000, sw: 142800 },
  "DGX GB200 NVL-72": { gpus: 72, perSys: 7841432, kW: 120,  perRack: 1, rackCost: 0, vram: 186, prof: 55558, sw: 1468800 },
  "DGX GB300 NVL-72": { gpus: 72, perSys: 8741432, kW: 120,  perRack: 1, rackCost: 0, vram: 288, prof: 55558, sw: 1468800 },
};
const OWN_TARGETS = Object.keys(SYSTEMS);
/* Per-GPU capability indices (B200 = 1.0). Established classes derived from MLPerf pairs;
   Blackwell-Ultra/NVL entries are provisional (EST) pending NVIDIA-sourced factors. */
const IDX = {
  train: { A100: 0.227, H100: 0.455, H200: 0.667, "B200-class": 1.0, B300: 1.5, GB200: 1.4, GB300: 1.65 },
  infer: { A100: 0.083, H100: 0.25,  H200: 0.345, "B200-class": 1.0, B300: 1.5, GB200: 1.4, GB300: 1.65 },
};
const SYS_CLASS = { "DGX H200": "H200", "DGX B200": "B200-class", "DGX B300": "B300", "DGX GB200 NVL-72": "GB200", "DGX GB300 NVL-72": "GB300" };
const EST_IDX = ["B300", "GB200", "GB300"];


/* v1.9 capacity layer constants — rule-of-thumb serving math, all EST and disclosed in-app */
const QUANT = { "FP16": { bytes: 2, mult: 1.0 }, "FP8": { bytes: 1, mult: 1.6 }, "FP4": { bytes: 0.5, mult: 2.4 } };
const MODELS = { "8B": 8, "70B": 70, "405B": 405, "671B": 671 };
const BASE_TOK = 300;         // tok/s per GPU, 70B @ FP16 on B200-class (EST anchor)
const KV_OVERHEAD = 1.2;      // memory overhead for KV cache / activations (EST)
const TOK_PER_USER = 10;      // sustained tok/s per concurrent interactive user (EST)

const RES_MULT = 0.60; // 1-yr reserved = 40% off list (estimated for all; exact for AWS B200)
const RATES_ASOF = "Jul–Aug 2026";

const BASE_RC = {
  nvaieOD: 1.0, nvaieRes: 0.36,
  fastGB: 0.14, bulkGB: 0.02, egressGB: 0.05, egressPct: 0.05,
  cloudFTE: 189000, billingSW: 5000, cloudAdminFTE: 0.01, paasUplift: 0,
  gpusPerInstance: 8,
  sysCost: 485000, swSuite: 142800, fabricC: 54323, fabricS: 23443, fabricM: 14227,
  cluster: 600000, profSvcs: 25000, rack: 15000, sysPerRack: 2, kwPerSys: 14.4,
  fastPB: 1200000, fastSupPB: 100000, bulkPB: 500000, bulkSupPB: 33333,
  kwPerPB: 10, racksPerPB: 1, netMo: 3000, setupRack: 2000,
  adminRatio: 10, opFTE: 189000, equinixMo: 11387,
  hrsMo: 730, opsGrowth: 0.04, gpusPerSystem: 8,
  cloudTok: 8.00, // managed-API blended $/1M tokens (EST — editable)
};
function defaultsFor(provider, gpuClass, ownSys) {
  const r = RATES[provider][gpuClass];
  const S = SYSTEMS[ownSys];
  return { ...BASE_RC, instOD: +r.od.toFixed(2), instRes: +(r.od * RES_MULT).toFixed(2),
    perSysCost: S.perSys, sysKw: S.kW };
}
const PROVIDERS = Object.keys(RATES);
const FACILITIES = ["Self-hosted (AI-ready)", "Self-hosted (retrofit)", "Equinix"];


/* ============ v1.6 TOOLTIP COPY — approved batches from website thread (verbatim, pending laptop nitpicks) ============ */
const TIPS = {
  spend: `Your approximate total monthly bill for cloud AI: GPU compute, AI platform services (SageMaker, Azure ML, Vertex), and the storage supporting those workloads. When unsure whether something counts, include it. A rough number is fine, and if you only know the annual figure, divide by 12.`,
  provider: `Where that spend currently goes: AWS, Azure, Google Cloud, Oracle, or CoreWeave. This matters because each provider charges different GPU rates, so it determines how much compute your dollars are actually buying. If spend is split across providers, pick the largest one.`,
  gpuClass: `The generation of NVIDIA GPU behind your cloud instances: A100 (older), H100 (most common today), H200, or B200 (newest). Not sure? H100 is the safe assumption for most workloads running in 2026; it's the default. Your cloud bill or instance names (like p5, ND H100) reveal it if you want to check.`,
  fastStorage: `High-performance storage feeding your GPUs during training and inference: your active datasets, model checkpoints, and working files. If unsure, leave the default; it's scaled to be typical for your spend level, and most teams overestimate how much of their data is truly 'fast.'`,
  bulkStorage: `Everything else: archived datasets, older model versions, raw data waiting to be processed. It's far cheaper per terabyte than fast storage in both cloud and on-prem. If unsure, leave the default.`,
  egress: `The share of your stored data that leaves the cloud each month, going to users, other systems, or your own facilities. Cloud providers charge for every gigabyte out; on-prem doesn't. The industry-typical default is 5% monthly, so leave it unless you know you're a heavy data mover.`,
  facility: `Where the equipment would physically live. 'AI-ready' means you have a data center with power and cooling for high-density racks today. 'Retrofit' means you have space but it needs upgrades, which adds a one-time buildout cost. 'Equinix' means renting space in a ready facility with cooling and management bundled in. If unsure, Equinix is the conservative pick since it requires nothing from your building.`,
  redundancy: `Adds one spare system beyond what the workload needs, so a hardware failure never stops your work. Cloud gives you this implicitly; buying it on-prem is a real cost this toggle makes visible. Turn it on if your AI workloads are production-critical, off if they're research and development that can tolerate a pause.`,
  migration: `One-time cost of the engineering work to move workloads from cloud to your own systems: replatforming, testing, and cutover. The default of $100K represents a typical mid-size migration; complex environments with many custom pipelines run higher. If unsure, leave the default.`,
  dualRun: `How many months you'd pay for both cloud and on-prem while migrating, since you can't switch off the cloud the day hardware arrives. Each month adds one full cloud bill to the transition cost. Typical is 2 to 3 months; leave the default unless you know your cutover will be unusually fast or slow.`,
  exitEgress: `The one-time cost of downloading your data out of the cloud when you leave, charged per gigabyte by most providers. It's calculated automatically from your storage inputs at roughly $50K per petabyte. Note: some providers now waive exit fees entirely, which the tool reflects where applicable.`,
  factorsGroup: `These factors adjust for on-prem hardware doing more work per hour than the cloud instances you're renting. They're the reason the adjusted estimate beats the floor case. Defaults are NVIDIA's published 'reasonable' values; drag any slider to 1.0 to assume zero benefit and stress-test the savings yourself.`,
  genSpeedup: `How much faster a current DGX system runs your workloads than the cloud GPUs you're on today, mostly reflecting generation gap: if you're renting A100s, new B200s deliver several times the work per hour. The default of 3x is NVIDIA's typical cross-generation figure; set it near 1.2x if your cloud instances are already latest-generation.`,
  network: `Gain from the purpose-built networking inside a DGX cluster versus general-purpose cloud networking, which matters most when training runs span multiple GPUs and they wait on each other. Default 1.5x is NVIDIA's reference figure; use 1.05x if your workloads are mostly single-GPU jobs that rarely talk to each other.`,
  runai: `How much more of your GPUs' time does useful work when jobs are packed efficiently instead of sitting idle between tasks. Cloud GPU utilization is notoriously low; scheduling software recovers those wasted hours. Default 1.3x is conservative; teams with poor current utilization see far more.`,
  nvaie: `Gain from optimized inference engines and libraries that squeeze more throughput from the same GPU than off-the-shelf frameworks. Default 1.3x; most relevant if you run heavy inference workloads, closer to 1.1x if you're purely training with already-tuned code.`,
  trainShare: `Roughly what percent of your GPU hours go to training models versus running them (inference). Training benefits most from new-generation hardware, so this gates the speedup math. If unsure, leave the default; most production shops are inference-heavy.`,
  odShare: `What portion of your cloud GPUs are billed at on-demand rates versus cheaper 1-year reserved pricing. On-demand costs roughly 40 to 60% more per hour. Check your bill if you can; otherwise the default assumes mostly reserved, which is the conservative choice.`,
  computeShare: `How much of your total monthly AI spend is GPU compute, as opposed to storage, networking, and platform fees. The 50% default is a typical decomposition; leave it unless you have your actual bill breakdown handy.`,
  growth: `How fast your AI usage is growing year over year. This matters because owned hardware absorbs growth for free until you fill it, while cloud bills scale with every added hour. 25% is a moderate default; AI-first teams often run 50% or higher.`,
  powerRate: `What you pay per kilowatt-month for data center power, including cooling overhead, not just the utility rate. The default reflects a typical enterprise fully-loaded cost; leave it unless your facilities team has given you a real number. NVIDIA's default is $300 (~$0.41/kWh); SLED and municipal power often lands $150–200.`,
  util: `What percent of your owned systems' capacity you realistically expect to use, accounting for maintenance windows, scheduling gaps, and uneven demand. NVIDIA's math implicitly assumes 100%, which nobody hits; the 85% default is an honest de-rate. Lower it if your workloads are bursty; raising it above 90% is optimistic.`,
  tier3: `If you have a real invoice showing GPU-hours consumed, enter it here and the tool uses your actual number instead of estimating it from spend, making everything downstream more accurate. This is optional; leave it at 'not provided' and the spend-based estimate stands. Ask your cloud admin for a usage report if you want this precision.`,
  modelSize: `The largest AI model you plan to serve, in parameters. Bigger models need more GPU memory per copy and produce fewer tokens per second, so this drives the capacity estimates below. If unsure, 70B is the common enterprise workhorse.`,
  quant: `The numeric precision the model runs at. Lower precision (FP8, FP4) halves memory and boosts speed with modest quality trade-offs; most 2026 production serving runs FP8. If unsure, leave FP8.`,
  capGroup: `Rule-of-thumb serving math, clearly estimated: model memory determines GPUs per copy, published throughput classes determine tokens per second, and your fleet cost divides across that capacity. Use it for direction and conversation, not capacity planning — a real sizing exercise comes with the CDW engagement.`,
  ownSys: `The NVIDIA system you'd buy to run these workloads yourself. Newer systems cost more per box but do far more work per GPU-hour, so the best value is often not the cheapest system. If unsure, DGX B200 is the proven mainstream pick.`,
};

function TipDot({ open, onClick }) {
  return (
    <button onClick={onClick} aria-label="What is this?"
      style={{ width: 16, height: 16, boxSizing: "border-box", borderRadius: 8, border: "1.5px solid #CC0000", background: open ? "#CC0000" : "transparent",
        color: open ? "#fff" : "#CC0000", fontSize: 10, fontWeight: 700, lineHeight: "13px", padding: 0, marginLeft: 6,
        cursor: "pointer", flexShrink: 0, fontFamily: "'Inter', system-ui, sans-serif" }}>?</button>
  );
}
function TipBox({ text }) {
  return (
    <div style={{ fontSize: 12, color: "#2D2D2D", background: "#FFF", border: "1px solid #DCDCDC", borderLeft: "3px solid #CC0000",
      borderRadius: 6, padding: "8px 10px", margin: "6px 0 8px", lineHeight: 1.45 }}>{text}</div>
  );
}
function TipLabel({ text, tip, style }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", ...(style || { fontSize: 13, marginTop: 6 }) }}>
        <span>{text}</span>{tip && <TipDot open={open} onClick={() => setOpen(!open)} />}
      </div>
      {open && tip && <TipBox text={tip} />}
    </div>
  );
}


/* Storage adapter: artifact storage API when present; localStorage fallback standalone. */
const store = {
  // set-only in the prototype: leads are written best-effort; there is no
  // read path in the UI (the demo-admin viewer was removed after external review)
  async set(key, value) {
    if (typeof window !== "undefined" && window.storage) return window.storage.set(key, value);
    localStorage.setItem(key, value);
    return { key, value };
  },
};

/* ============ v2.9: WORKLOAD-MODE ENGINE PIECES ============
   Added for the GPU-Sizing handoff: a second, workload-driven comparison mode
   alongside the original spend-derived bake-off mode below. Reviewed against
   an external methodology pass (Aug 2026) before being built. Key decisions
   from that review, reflected here:
   - genPF is a benchmark-derived, workload-normalized generational capability
     factor (from MLPerf-class throughput ratios), NOT a raw/universal physical
     hardware constant -- it already carries some system/software effect from
     how the underlying benchmarks are run, so it's directional, not exact.
   - Only genPF (hardware generation capability) converts technical GPU-hours
     into rented-class-equivalent hours. fNet/fSw/fNvaie (network, scheduling,
     inference-stack gains) are deliberately EXCLUDED from this conversion --
     those are advantages of OWNING infrastructure, not something a cloud
     renter gets, so folding them into a rental-cost estimate would be
     circular (using "how much better owning is" to price renting).
   - Full npf = genPF x fNet x fSw x fNvaie remains scoped to the existing
     bake-off methodology below, unchanged.
   - A future "operational efficiency" layer (showing what fNet/fSw/fNvaie
     could additionally save) is an intentionally separate v2.10 addition,
     not part of this base workload comparison -- kept structurally separate
     here (hardwareEquivalentCloudCost) so that layer can be added later
     without touching this function. */

// Benchmark-derived generational capability factor: how much more work the
// target/own-side GPU class does per hour than the rented class, blended by
// workload mix. Directional (MLPerf-class throughput ratios), not a
// universal physical conversion constant -- treat it as workload-normalized.
function computeGenPF(ownSys, gpuClass, trainShare) {
  const tgt = SYS_CLASS[ownSys];
  const genTrain = IDX.train[tgt] / IDX.train[gpuClass];
  const genInfer = IDX.infer[tgt] / IDX.infer[gpuClass];
  return 1 / (trainShare / genTrain + (1 - trainShare) / genInfer);
}

// Converts a technical GPU-hour requirement (already expressed at the target/
// own GPU class) into an estimated cloud cost at the rented class, using ONLY
// the hardware capability ratio (genPF). Deliberately does not apply fNet/
// fSw/fNvaie -- see note above. genPFUsed=1 gives the floor case (no
// generational credit assumed, the conservative/no-crossover-biased estimate).
function hardwareEquivalentCloudCost(technicalGpuHrs, genPFUsed, blended) {
  const rentedGpuHrsEquivalent = technicalGpuHrs * genPFUsed;
  return { rentedGpuHrsEquivalent, monthlyCompute: rentedGpuHrsEquivalent * blended };
}

// Generalized fleet trajectory: shared by both modes. baseHrsFn(y) supplies
// the demand hours for year y (rented-hours/npf in spend mode, technical
// GPU-hours directly in workload mode -- already the right units by the time
// this is called, so this function itself is mode-agnostic). Fleet never
// shrinks; technicalFloorSys (workload mode only) sets a hard floor so the
// fleet is never sized below the known technical requirement.
function buildTrajectory(baseHrsFn, perSysHrs, S, RC, nPlus, storCapex, storSup, totPB, isEquinix, powerRate, technicalFloorSys) {
  const rows = [];
  let prevSys = 0, prevRacks = 0;
  for (let y = 0; y < 5; y++) {
    const eff = baseHrsFn(y);
    let base = eff > 0 ? Math.max(1, Math.ceil(eff / perSysHrs)) + nPlus : 0;
    if (technicalFloorSys) base = Math.max(base, technicalFloorSys);
    const sys = Math.max(prevSys, base);
    const racks = Math.ceil(sys / S.perRack);
    const capexAdd =
      (y === 0 ? RC.cluster + storCapex : 0) +
      (sys - prevSys) * RC.perSysCost +
      (racks - prevRacks) * S.rackCost;
    const opexMo0 = isEquinix
      ? sys * RC.equinixMo + storSup
      : (sys * RC.sysKw + totPB * RC.kwPerPB) * powerRate +
        RC.netMo + (RC.setupRack * (racks + totPB * RC.racksPerPB)) / 36 +
        ((sys / RC.adminRatio) * RC.opFTE) / 12 + storSup;
    rows.push({ sys, racks, capexAdd, opexMo0, opexYr: 12 * opexMo0 * Math.pow(1 + RC.opsGrowth, y) });
    prevSys = sys; prevRacks = racks;
  }
  return rows;
}

/* ============ ENGINE (mirrors validated spreadsheet Engine tab; v2.3-lineage, audit-complete after 9 external rounds) ============ */
function run(inp, RC) {
  const isWorkloadMode = inp.mode === "workload" && !!inp.gpuSizingCount;

  const blended =
    (inp.odShare * (RC.instOD + RC.nvaieOD) +
      (1 - inp.odShare) * (RC.instRes + RC.nvaieRes)) *
    (1 + RC.paasUplift);

  const genPF = computeGenPF(inp.ownSys, inp.gpuClass, inp.trainShare);
  // v2.0: harmonic (GPU-hour-correct) blend — workload shares are hour shares, so the slower
  // factor consumes proportionally more replacement capacity (audit finding P0-2). npf stays
  // scoped to bake-off mode (see v2.9 note above) -- workload mode uses genPF alone.
  const npf = genPF * inp.fNet * inp.fSw * inp.fNvaie;

  const S = SYSTEMS[inp.ownSys];
  const perSysHrs = S.gpus * RC.hrsMo * inp.util;
  const nPlus = inp.redundancy ? 1 : 0;

  const isEquinix = inp.facility === "Equinix";
  const isRetrofit = inp.facility === "Self-hosted (retrofit)";
  const fast = inp.fastPB;
  const bulk = inp.bulkPB;
  const totPB = fast + bulk;
  const cloudStorage =
    fast * 1e6 * RC.fastGB + bulk * 1e6 * RC.bulkGB +
    totPB * 1e6 * inp.egressPct * RC.egressGB;

  const perSys = RC.perSysCost;
  const storCapex = fast * RC.fastPB + bulk * RC.bulkPB;
  const storSup = (fast * RC.fastSupPB + bulk * RC.bulkSupPB) / 12;
  const exitEgress = totPB * 1e6 * RC.egressGB;

  let gpuHrs, gpuHrsCloud, adjT, flrT, cloudYears, cloudYearsFloor, technicalSystems = null, monthlyCloudBaseline, sourceConversion = null;

  if (isWorkloadMode) {
    // Workload mode: technical GPU requirement drives BOTH sides. Fleet size is fixed by the
    // requirement, not derived from any performance factor, so adjusted/floor fleets are
    // identical -- the floor/adjusted split instead lives on the CLOUD side (genPF-adjusted vs
    // genPF=1, i.e. no generational credit assumed).

    // Cross-class correction: GPU Sizing's count is only expressed in the TARGET class's terms
    // when its source class matches the target (B200->DGX B200, B300->DGX B300, etc). A100 and
    // H100 both map to DGX H200 (a more capable class TCO actually sells), so a raw pass-through
    // would overstate the H200 fleet -- 40 H100-equivalent GPUs is NOT 40 H200s. Normalize using
    // the same genPF machinery, just between (target, source) instead of (target, rented).
    const tgtClass = SYS_CLASS[inp.ownSys];
    const srcClassNormalized = inp.sourceClass ? normalizeSourceClass(inp.sourceClass) : tgtClass;
    let technicalGpuCount = inp.gpuSizingCount;
    if (srcClassNormalized !== tgtClass && IDX.train[srcClassNormalized] != null) {
      sourceConversion = computeGenPF(inp.ownSys, srcClassNormalized, inp.trainShare);
      technicalGpuCount = Math.max(1, Math.ceil(inp.gpuSizingCount / sourceConversion));
    }

    // Fleet-sizing hours: how many physical GPUs must be present, independent of duty cycle --
    // owned hardware sits there whether the workload is running or not, so this correctly uses
    // full-month capacity at target utilization (util cancels against perSysHrs below, leaving
    // fleet size = technicalGpuCount / node size, node-rounded).
    const technicalGpuHrsForFleet = technicalGpuCount * RC.hrsMo * inp.util;
    gpuHrs = technicalGpuHrsForFleet;

    // Cloud-pricing hours: how many hours/month you'd actually be renting capacity for. Uses GPU
    // Sizing's own workingDayHours (business-hours duty cycle) when available -- distinct from
    // TCO's util slider, which represents owned-capacity efficiency, not workload demand pattern.
    // Falls back to util x hrsMo (this mode's prior behavior) when duty-cycle data isn't present
    // (training handoffs, or an older link without the param).
    const cloudHrsPerMonth = inp.workingDayHours ? inp.workingDayHours * 30.44 : RC.hrsMo * inp.util;
    const technicalGpuHrsForCloud = technicalGpuCount * cloudHrsPerMonth;
    gpuHrsCloud = technicalGpuHrsForCloud;

    technicalSystems = Math.max(1, Math.ceil(technicalGpuHrsForFleet / perSysHrs));
    adjT = buildTrajectory((y) => technicalGpuHrsForFleet * Math.pow(1 + inp.growth, y), perSysHrs, S, RC, nPlus, storCapex, storSup, totPB, isEquinix, inp.powerRate, technicalSystems);
    flrT = adjT;
    const adjCloud = hardwareEquivalentCloudCost(technicalGpuHrsForCloud, genPF, blended);
    const flrCloud = hardwareEquivalentCloudCost(technicalGpuHrsForCloud, 1, blended);
    cloudYears = [0, 1, 2, 3, 4].map((y) => 12 * (adjCloud.monthlyCompute * Math.pow(1 + inp.growth, y) + cloudStorage * Math.pow(1 + RC.opsGrowth, y)));
    cloudYearsFloor = [0, 1, 2, 3, 4].map((y) => 12 * (flrCloud.monthlyCompute * Math.pow(1 + inp.growth, y) + cloudStorage * Math.pow(1 + RC.opsGrowth, y)));
    monthlyCloudBaseline = adjCloud.monthlyCompute + cloudStorage; // the actual comparable figure in this mode, not the entered bill
  } else {
    // Bake-off mode: unchanged from v2.8 -- spend backward-derives gpuHrs, cloud cost is the
    // entered bill escalated by growth, fleet trajectory divides by full npf (genPF x the three
    // operational factors), and floor forces npf to 1.
    const computeSpend = inp.bill * inp.computeShare;
    const instHrs = blended > 0 ? computeSpend / blended : 0;
    gpuHrs = inp.tier3Hrs > 0 ? inp.tier3Hrs : instHrs;
    adjT = buildTrajectory((y) => (gpuHrs * Math.pow(1 + inp.growth, y)) / npf, perSysHrs, S, RC, nPlus, storCapex, storSup, totPB, isEquinix, inp.powerRate, null);
    flrT = buildTrajectory((y) => (gpuHrs * Math.pow(1 + inp.growth, y)) / 1, perSysHrs, S, RC, nPlus, storCapex, storSup, totPB, isEquinix, inp.powerRate, null);
    cloudYears = [0, 1, 2, 3, 4].map((y) =>
      12 * (inp.bill * inp.computeShare * Math.pow(1 + inp.growth, y) + inp.bill * (1 - inp.computeShare) * Math.pow(1 + RC.opsGrowth, y))
    );
    cloudYearsFloor = cloudYears;
    monthlyCloudBaseline = inp.bill;
  }

  const oneTime =
    (isRetrofit ? inp.retrofit : 0) + inp.migration + inp.dualRun * monthlyCloudBaseline + exitEgress;

  const sysAdj = adjT[0].sys;
  const sysFloor = flrT[0].sys;
  const prodSys = Math.max(1, sysAdj - nPlus); // productive systems: the N+1 spare is failover, not growth capacity (audit round 4)
  const headroom = isWorkloadMode
    ? (sysAdj > 0 ? 1 - gpuHrs / (prodSys * perSysHrs) : 0) // already target-class hours -- no capability conversion needed
    : (sysAdj > 0 ? 1 - gpuHrs / npf / (prodSys * perSysHrs) : 0);

  // residual basis excludes professional services (no resale value — audit finding) and cluster/racks/one-time
  const residAt = (T, n) => inp.residPct * (T[n - 1].sys * (perSys - S.prof - S.sw) + storCapex); // hardware only: prof svcs and SW subscriptions have no resale value
  const adj = { capex: adjT[0].capexAdd, opex: adjT[0].opexMo0, resid: residAt(adjT, inp.horizon) };
  const flr = { capex: flrT[0].capexAdd, opex: flrT[0].opexMo0, resid: residAt(flrT, inp.horizon) };

  const tot = (n) => {
    const cloud = cloudYears.slice(0, n).reduce((a, b) => a + b, 0);
    const cloudFloor = cloudYearsFloor.slice(0, n).reduce((a, b) => a + b, 0);
    const onAdj = adjT.slice(0, n).reduce((a, r2) => a + r2.capexAdd + r2.opexYr, 0) + oneTime - residAt(adjT, n);
    const onFlr = flrT.slice(0, n).reduce((a, r2) => a + r2.capexAdd + r2.opexYr, 0) + oneTime - residAt(flrT, n);
    return { cloud, cloudFloor, onAdj, onFlr, saveAdj: cloud - onAdj, saveFlr: cloudFloor - onFlr };
  };
  const payback =
    monthlyCloudBaseline - adj.opex > 0 ? (adj.capex + oneTime) / (monthlyCloudBaseline - adj.opex) : null; // SECONDARY static metric
  // v2.2: crossover from cumulative monthly cash flows (audit round 4) — capex charged at the
  // start of the year it's incurred (incl. growth-driven fleet additions); residual excluded
  let crossoverMo = null;
  {
    let cc = 0, oc = oneTime;
    for (let m = 1; m <= 60 && !crossoverMo; m++) {
      const y = Math.floor((m - 1) / 12);
      if (m === y * 12 + 1) oc += adjT[y].capexAdd;
      cc += cloudYears[y] / 12;
      oc += adjT[y].opexYr / 12;
      if (cc >= oc) crossoverMo = m;
    }
  }
  const exhaustYrs =
    inp.growth > 0 && headroom > 0 && headroom < 1
      ? Math.log(1 / (1 - headroom)) / Math.log(1 + inp.growth)
      : null;

  // v1.9 capacity & unit economics (rule-of-thumb, EST) — based on the year-0 fleet
  const q = QUANT[inp.quant];
  const modelB = MODELS[inp.modelSize];
  const gpusPerReplica = Math.max(1, Math.ceil((modelB * q.bytes * KV_OVERHEAD) / S.vram));
  const totalGPUs = sysAdj * S.gpus;
  const replicas = Math.floor(totalGPUs / gpusPerReplica);
  const tokPerGPU = BASE_TOK * IDX.infer[SYS_CLASS[inp.ownSys]] * q.mult * (70 / modelB);
  const fleetTokSec = replicas * gpusPerReplica * tokPerGPU * inp.util;
  const monthlyTokM = (fleetTokSec * 2628000) / 1e6;
  const onPremMonthly = (adj.capex + oneTime - adj.resid) / (inp.horizon * 12) + adj.opex;
  const cap = {
    gpusPerReplica, replicas, fits: replicas > 0,
    users: Math.floor(fleetTokSec / TOK_PER_USER),
    monthlyTokM,
    perM: monthlyTokM > 0 ? onPremMonthly / monthlyTokM : null,
    perUserOn: fleetTokSec >= TOK_PER_USER ? onPremMonthly / Math.floor(fleetTokSec / TOK_PER_USER) : null,
    perUserCloud: ((TOK_PER_USER * 2628000) / 1e6) * RC.cloudTok,
    cloudPerM: RC.cloudTok, onPremMonthly,
  };
  const storageBudget = inp.bill * (1 - inp.computeShare);
  return { blended, gpuHrs, gpuHrsCloud, genPF, npf, sysAdj, sysFloor, headroom, adj, flr, cloudStorage, storageBudget, oneTime, exitEgress, tot, payback, crossoverMo, exhaustYrs, perSysHrs, cap,
    isWorkloadMode, technicalSystems, monthlyCloudBaseline, sourceConversion,
    fleetAdj: adjT.map((r2) => r2.sys), fleetFlr: flrT.map((r2) => r2.sys) };
}

/* ============ UI ============ */
const fmtM = (v) =>
  Math.abs(v) >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : `$${Math.round(v / 1000)}K`;
const fmt = (v) => `$${Math.round(v).toLocaleString()}`;

const C = {
  // CDW palette: red #CC0000 (digital core red), white, charcoal
  bg: "#FFFFFF", ink: "#2D2D2D", sub: "#6B6B6B", line: "#E5E7EB",
  panel: "#FFFFFF", green: "#CC0000", greenSoft: "#FBEAEA",
  slate: "#7A7A7A", amber: "#5A5A5A", amberSoft: "#EFEFEF",
};
const mono = { fontFamily: "'Inter', system-ui, sans-serif", fontVariantNumeric: "tabular-nums", letterSpacing: 0.2 };
const disp = { fontFamily: "'Inter', system-ui, sans-serif" };

function Section({ title, children, defaultOpen = true, badge, badgeColor }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, marginBottom: 12 }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "12px 14px", background: "none", border: "none", cursor: "pointer" }}>
        <span style={{ ...disp, fontWeight: 600, fontSize: 14, color: C.ink, letterSpacing: 0.2, textAlign: "left" }}>
          {title}{badge && <span style={{ ...mono, fontSize: 10, color: badgeColor || C.sub, marginLeft: 8, border: `1px solid ${badgeColor || C.line}`, borderRadius: 4, padding: "1px 5px" }}>{badge}</span>}
        </span>
        <span style={{ color: C.sub, fontSize: 12 }}>{open ? "−" : "+"}</span>
      </button>
      {open && <div style={{ padding: "2px 14px 14px" }}>{children}</div>}
    </div>
  );
}

function Row({ label, value, sub, flag, tip }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ padding: "7px 0", borderTop: `1px solid ${C.line}` }}>
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 13, color: C.ink }}>{label}{flag && <span style={{ ...mono, fontSize: 9, color: "#CC0000", marginLeft: 6, border: "1px solid #CC0000", borderRadius: 3, padding: "0 4px" }}>EDITED</span>}</div>
        {sub && <div style={{ fontSize: 11, color: C.sub }}>{sub}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <div style={{ ...mono, fontSize: 13, color: C.ink, textAlign: "right", whiteSpace: "nowrap", marginLeft: 10 }}>{value}</div>
        {tip && <TipDot open={open} onClick={() => setOpen(!open)} />}
      </div>
    </div>
    {open && tip && <TipBox text={tip} />}
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, display, hint, tip }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ margin: "10px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: C.ink, display: "flex", alignItems: "center" }}>{label}{tip && <TipDot open={open} onClick={() => setOpen(!open)} />}</span>
        <span style={{ ...mono, fontSize: 13, color: C.green, fontWeight: 600 }}>{display}</span>
      </div>
      {open && tip && <TipBox text={tip} />}
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: C.green }} aria-label={label} />
      {hint && <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function Seg({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0" }}>
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)}
          style={{ ...disp, fontSize: 13, padding: "9px 14px", borderRadius: 10, cursor: "pointer",
            border: "none",
            background: value === o ? C.green : "#F3F4F6",
            color: value === o ? "#FFFFFF" : C.ink, fontWeight: 600,
            transition: "background .15s" }}>
          {o}
        </button>
      ))}
    </div>
  );
}

function Bar({ label, value, max, color }) {
  const w = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div style={{ margin: "8px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
        <span style={{ color: "#B5B5B5" }}>{label}</span>
        <span style={{ ...mono, color: "#FFFFFF", fontWeight: 600 }}>{fmtM(value)}</span>
      </div>
      <div style={{ height: 14, background: "#151515", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${w}%`, height: "100%", background: color, borderRadius: 4, transition: "width .3s" }} />
      </div>
    </div>
  );
}

function RateField({ k, label, eff, defaults, ov, setOv, fmt: f, step }) {
  const edited = k in ov;
  const ratio = defaults[k] > 0 ? eff[k] / defaults[k] : 1;
  const unusual = ratio > 10 || (eff[k] > 0 && ratio < 0.1);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderTop: `1px solid ${C.line}` }}>
      <div style={{ fontSize: 12, color: C.ink, paddingRight: 8 }}>
        {label}
        {edited && <span style={{ ...mono, fontSize: 9, color: "#CC0000", marginLeft: 5, border: "1px solid #CC0000", borderRadius: 3, padding: "0 4px" }}>EDITED</span>}
        {unusual && <span style={{ ...mono, fontSize: 9, color: "#B4530A", marginLeft: 5, border: "1px solid #B4530A", borderRadius: 3, padding: "0 4px" }}>CHECK VALUE</span>}
        {edited && (
          <button onClick={() => { const n = { ...ov }; delete n[k]; setOv(n); }}
            style={{ ...mono, fontSize: 9, marginLeft: 5, color: C.sub, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
            reset ({f ? f(defaults[k]) : defaults[k]})
          </button>
        )}
      </div>
      <input type="number" value={eff[k]} step={step || 1} inputMode="decimal"
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!Number.isNaN(v) && v >= 0) setOv({ ...ov, [k]: v });
        }}
        style={{ ...mono, fontSize: 12, width: 96, boxSizing: "border-box", padding: "6px 8px", borderRadius: 8, textAlign: "right",
          border: `1px solid ${edited ? "#CC0000" : "#D1D5DB"}`, background: edited ? "#FBEAEA" : "#FFFFFF", color: C.ink }}
        aria-label={label} />
    </div>
  );
}

function getIncomingParams() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search);
}

function getInitialOwnSys() {
  const params = getIncomingParams();
  const raw = params?.get("ownSys");
  return raw && OWN_TARGETS.includes(raw) ? raw : "DGX B200";
}

// GPU Sizing's node-rounded GPU count for the recommended class, e.g. 24 for
// "24 x B300". Distinct from ownSys: this is the technical requirement, not
// a target system pick. In bake-off mode it's informational only. In
// workload mode (v2.9+) it directly drives fleet sizing and cloud pricing --
// see run().
function getInitialGpuCount() {
  const params = getIncomingParams();
  const raw = params?.get("gpuCount");
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

// The GPU class the handoff's count was actually computed at (GPU Sizing's
// naming, e.g. "H100", "B200", "GB200 NVL72"). Needed because ownSys's
// underlying class isn't always the same class the count was sized for --
// A100 and H100 both map to DGX H200 (TCO doesn't sell them new), which is a
// more capable class than either. Without this, workload mode would treat an
// H100-sized count as an H200 requirement and overstate the fleet.
function getInitialSourceClass() {
  return getIncomingParams()?.get("sourceClass") || null;
}

// Hours/day GPU Sizing's inference workload actually sees business-hours
// load (its workingDayHours), distinct from TCO's util slider (owned-
// capacity efficiency, not workload duty cycle). Only present for inference
// handoffs; absent for training handoffs or bake-off-only visits, in which
// case workload mode falls back to util x hrsMo for the cloud-hours estimate.
function getInitialWorkingDayHours() {
  const params = getIncomingParams();
  const raw = params?.get("workingDayHours");
  const n = raw ? parseFloat(raw) : NaN;
  return Number.isFinite(n) && n > 0 && n <= 24 ? n : null;
}

// Normalizes GPU Sizing's class naming to TCO's IDX/rate-table naming, where
// they differ (B200 -> B200-class, GB200 NVL72 -> GB200). Identity otherwise.
const GPU_SIZING_CLASS_TO_TCO_CLASS = { "B200": "B200-class", "GB200 NVL72": "GB200" };
function normalizeSourceClass(sourceClass) {
  return GPU_SIZING_CLASS_TO_TCO_CLASS[sourceClass] || sourceClass;
}

function AppInner() {
  const { isLoggedIn, needsSetup, account, logDownloadEvent } = useAuth();
  const [ov, setOv] = useState({});
  const [bill, setBill] = useState(105000);
  const [provider, setProvider] = useState("AWS");
  const [gpuClass, setGpuClass] = useState("H100");
  const [ownSys, setOwnSys] = useState(getInitialOwnSys);
  const [arrivedFromGpuSizing] = useState(() => !!getIncomingParams()?.get("ownSys"));
  const [gpuSizingCount] = useState(getInitialGpuCount);
  const [sourceClass] = useState(getInitialSourceClass);
  const [workingDayHours] = useState(getInitialWorkingDayHours);
  const [mode, setMode] = useState(() => gpuSizingCount ? "workload" : "spend"); // v2.9: bake-off (spend-derived) vs workload (technical-requirement-driven)
  const [trainShare, setTrainShare] = useState(0.5);
  const [odShare, setOdShare] = useState(0);
  const [storageAuto, setStorageAuto] = useState(true); // v2.3: Tier 1 derives storage from the bill; manual entry = Tier 2/3
  const [fastPBm, setFastPBm] = useState(0.25);
  const [bulkPBm, setBulkPBm] = useState(0.75);
  const [egressPct, setEgressPct] = useState(0.05);
  const [computeShare, setComputeShare] = useState(0.5);
  const [growth, setGrowth] = useState(0.25);
  const [facility, setFacility] = useState("Self-hosted (AI-ready)");
  const [powerRate, setPowerRate] = useState(300);
  const [util, setUtil] = useState(0.85);
  const [fNet, setFNet] = useState(1.0);
  const [fSw, setFSw] = useState(1.3);
  const [fNvaie, setFNvaie] = useState(1.3);
  const [tier3Hrs, setTier3Hrs] = useState(0);
  const [horizon, setHorizon] = useState(3);
  const [retrofit, setRetrofit] = useState(300000);
  const [migration, setMigration] = useState(100000);
  const [dualRun, setDualRun] = useState(2);
  const [redundancy, setRedundancy] = useState(false);
  const [residPct, setResidPct] = useState(0.15);
  const [modelSize, setModelSize] = useState("70B");
  const [quant, setQuant] = useState("FP8");
  const [view, setView] = useState("calc"); // calc | gate | report
  const [lead, setLead] = useState({ name: "", company: "", email: "" });
  const [leadStatus, setLeadStatus] = useState("");

  async function submitLead() {
    if (!lead.name || !lead.email || !lead.company) { setLeadStatus("Please fill in all three fields."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) { setLeadStatus("Please enter a valid email address."); return; }
    setLeadStatus("");
    try {
      const key = "leads:" + Date.now();
      await store.set(key, JSON.stringify({ ...lead, at: new Date().toISOString(), bill, provider, gpuClass, horizon }));
    } catch (e) { /* storage is best-effort in the prototype */ }
    logDownloadEvent("tco", { bill, provider, gpuClass, horizon });
    setView("report");
  }

  function requestReport() {
    if (isLoggedIn && !needsSetup && account) {
      // Logged-in users skip the contact gate entirely -- their info is already known.
      setLead({ name: account.name || "", company: account.company || "", email: account.email || "" });
      logDownloadEvent("tco", { bill, provider, gpuClass, horizon });
      setView("report");
    } else {
      setView("gate");
    }
  }

  const defaults = defaultsFor(provider, gpuClass, ownSys);
  const rc = { ...defaults, ...ov };
  const editedCount = Object.keys(ov).length;
  const rateInfo = RATES[provider][gpuClass];

  // Auto mode: size PB so implied cloud storage+egress consumes the non-compute budget (25/75 fast/bulk split)
  // v2.9: workload mode has no bill to derive storage from, so it's always manual there regardless of the toggle.
  const effectiveStorageAuto = storageAuto && mode !== "workload";
  const perPBCost = 0.25 * 1e6 * rc.fastGB + 0.75 * 1e6 * rc.bulkGB + 1e6 * egressPct * rc.egressGB;
  const autoPB = perPBCost > 0 ? Math.max(0, (bill * (1 - computeShare)) / perPBCost) : 0;
  const fastPB = effectiveStorageAuto ? Math.round(autoPB * 0.25 * 100) / 100 : fastPBm;
  const bulkPB = effectiveStorageAuto ? Math.round(autoPB * 0.75 * 100) / 100 : bulkPBm;
  const setFastPB = (v) => { setStorageAuto(false); setFastPBm(v); if (effectiveStorageAuto) setBulkPBm(bulkPB); };
  const setBulkPB = (v) => { setStorageAuto(false); setBulkPBm(v); if (effectiveStorageAuto) setFastPBm(fastPB); };
  const inputsObj = { bill, computeShare, odShare, gpuClass, ownSys, trainShare, util, fastPB, bulkPB, egressPct, growth, facility, powerRate, fNet, fSw, fNvaie, tier3Hrs, retrofit, migration, dualRun, redundancy, residPct, modelSize, quant, horizon, mode, gpuSizingCount, sourceClass, workingDayHours };
  const r = useMemo(
    () => run(inputsObj, rc),
    [bill, computeShare, odShare, gpuClass, ownSys, trainShare, util, fastPB, bulkPB, egressPct, storageAuto, growth, facility, powerRate, fNet, fSw, fNvaie, tier3Hrs, retrofit, migration, dualRun, redundancy, residPct, modelSize, quant, horizon, provider, ov, mode, gpuSizingCount, sourceClass, workingDayHours]
  );
  const t = r.tot(horizon);

  // GPU Sizing's technical recommendation, expressed in the same "X x system"
  // shape as the fleet display. In bake-off mode this is informational only
  // (computed independently, never fed into the spend-derived math below). In
  // workload mode (v2.9+) the equivalent, source-class-corrected figure IS
  // what drives run() -- see r.technicalSystems, which this should match.
  // Applies the same cross-class correction as run() (A100/H100 -> DGX H200
  // isn't a 1:1 GPU count) so this display figure doesn't itself understate
  // the same bug the engine now corrects for.
  const gpuSizingSystems = gpuSizingCount ? (() => {
    const tgtClass = SYS_CLASS[ownSys];
    const srcClassNormalized = sourceClass ? normalizeSourceClass(sourceClass) : tgtClass;
    if (srcClassNormalized !== tgtClass && IDX.train[srcClassNormalized] != null) {
      const conv = computeGenPF(ownSys, srcClassNormalized, trainShare);
      return Math.max(1, Math.ceil(Math.ceil(gpuSizingCount / conv) / SYSTEMS[ownSys].gpus));
    }
    return Math.max(1, Math.ceil(gpuSizingCount / SYSTEMS[ownSys].gpus));
  })() : null;
  const fleetsDisagree = gpuSizingSystems !== null && gpuSizingSystems !== r.sysAdj;

  // Minimum viable spend: smallest monthly bill where on-prem beats cloud at the selected horizon (bake-off mode only -- workload mode's cost isn't driven by the bill, so this question doesn't apply there)
  const minViable = useMemo(() => {
    if (mode === "workload") return null;
    for (let b = 20000; b <= 2000000; b *= 1.1) {
      const rr = run({ ...inputsObj, bill: Math.round(b), tier3Hrs: 0 }, rc);
      if (rr.tot(horizon).saveAdj > 0) return Math.round(b / 5000) * 5000;
    }
    return null;
  }, [gpuClass, ownSys, trainShare, util, fastPB, bulkPB, egressPct, growth, facility, powerRate, fNet, fSw, fNvaie, retrofit, migration, dualRun, redundancy, residPct, computeShare, odShare, provider, ov, horizon, mode]);
  const tier = tier3Hrs > 0 ? "VALIDATED" : (bill !== 105000 || gpuClass !== "H100") ? "REFINED" : "DIRECTIONAL";
  const maxBar = Math.max(t.cloud, t.cloudFloor, t.onAdj, t.onFlr, 1);
  const isSelf = facility !== "Equinix";

  useAutosaveSnapshot("tco", inputsObj, {
    savings: t.saveAdj,
    floorCaseSavings: t.saveFlr,
    cloudCost: t.cloud,
    onPremCost: t.onAdj,
    recommendedFleet: `${r.sysAdj} x ${ownSys}`,
    gpuSizingFleet: gpuSizingSystems ? `${gpuSizingSystems} x ${ownSys}` : null,
    planningBasis: mode === "workload" ? "Workload Requirement" : "Existing Cloud Spend",
    facility,
    capexPlusOneTime: r.adj.capex + r.oneTime,
    monthlyOpex: r.adj.opex,
    residualCredit: r.adj.resid,
    paybackMonths: r.payback,
    confidence: tier,
    horizonYears: horizon,
    provider,
    gpuClass,
    monthlyBill: bill,
  });


  return (
    <div className="tco-root" style={{ background: C.bg, minHeight: "100vh", color: C.ink, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`        .tco-root, .tco-root *{box-sizing:border-box} input[type=range]{height:22px} button:focus-visible{outline:2px solid ${C.green};outline-offset:2px;box-shadow:0 0 0 5px rgba(255,255,255,.85)}
        input[type=number]::-webkit-inner-spin-button{opacity:1}
        @media print { .no-print{display:none!important} body{background:#fff} }`}</style>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "18px 14px 60px" }}>

        <div style={{ borderBottom: `1px solid ${C.line}`, paddingBottom: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a href="/" style={{ display: "flex", alignItems: "center", flexShrink: 0 }} aria-label="AI Factory Tools home">
              <img src={cdwLogo} alt="CDW" style={{ height: 36, width: "auto" }} />
            </a>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.green, textTransform: "uppercase" }}>AI Factory Tools</div>
              <h1 style={{ ...disp, fontSize: 20, fontWeight: 700, margin: 0, color: C.ink }}>Cloud vs On-Prem TCO Calculator</h1>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 6, background: C.green, color: "#fff", whiteSpace: "nowrap" }}>PROTOTYPE v2.8</span>
          </div>
          <div style={{ fontSize: 13, color: C.sub, marginTop: 8 }}>What your current AIaaS spend buys you if you owned it instead.</div>
          <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
            <AuthWidget />
          </div>
        </div>


        {view === "gate" && (
          <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <div style={{ ...disp, fontWeight: 700, fontSize: 17, marginBottom: 4 }}>Get the full TCO report</div>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 10 }}>
              The report includes the fleet build, full assumption ledger with sources, and the floor-case analysis. On the production site this will also be emailed to you as a PDF.
            </div>
            {["name", "company", "email"].map((f) => (
              <input key={f} placeholder={f === "name" ? "Full name" : f === "company" ? "Company" : "Work email"}
                value={lead[f]} type={f === "email" ? "email" : "text"}
                onChange={(e) => setLead({ ...lead, [f]: e.target.value })}
                style={{ width: "100%", boxSizing: "border-box", fontSize: 14, padding: "11px 12px", marginBottom: 8,
                  borderRadius: 8, border: "1px solid #D1D5DB", background: "#FFFFFF", color: C.ink }} />
            ))}
            {leadStatus && <div style={{ fontSize: 12, color: C.amber, marginBottom: 6 }}>{leadStatus}</div>}
            <div style={{ fontSize: 10, color: C.sub, marginBottom: 10 }}>
              Prototype note: in this demo, what you enter is saved only in your own browser — it is not sent to CDW and no one can retrieve it. Use demo data. The production site will submit securely to the CDW team.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={submitLead} style={{ ...disp, flex: 1, fontWeight: 700, fontSize: 14, padding: "12px", borderRadius: 8, border: "none", cursor: "pointer", background: C.green, color: "#fff" }}>View my report</button>
              <button onClick={() => setView("calc")} style={{ ...disp, fontSize: 14, padding: "12px 14px", borderRadius: 8, border: `1px solid ${C.line}`, cursor: "pointer", background: C.panel, color: C.sub }}>Back</button>
            </div>
          </div>
        )}

        {view === "report" && (
          <div style={{ background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: 18, marginBottom: 14 }}>
            <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button onClick={() => window.print()} style={{ ...disp, flex: 1, fontWeight: 700, fontSize: 13, padding: "10px", borderRadius: 8, border: "none", cursor: "pointer", background: C.ink, color: "#fff" }}>Print / Save as PDF</button>
              <button onClick={() => setView("calc")} style={{ ...disp, fontSize: 13, padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.line}`, cursor: "pointer", background: "#fff", color: C.sub }}>Back to calculator</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <img src={cdwLogo} alt="CDW" style={{ height: 34, width: "auto" }} />
              <div style={{ ...mono, fontSize: 10, letterSpacing: 1.5, color: C.sub }}>AI FACTORY · CLOUD-TO-ON-PREM AI TCO ANALYSIS</div>
            </div>
            <div style={{ ...disp, fontSize: 21, fontWeight: 700, margin: "4px 0 2px" }}>Prepared for {lead.name || "you"}{lead.company ? `, ${lead.company}` : ""}</div>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 12 }}>{new Date().toLocaleDateString()} · Confidence: {tier} · {provider} · {gpuClass} workloads</div>
            {t.saveAdj > 0 ? (
              <div style={{ background: C.greenSoft, borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
                <div style={{ ...mono, fontSize: 11, color: C.green }}>{horizon}-YEAR PROJECTED SAVINGS</div>
                <div style={{ ...mono, fontSize: 32, fontWeight: 600, color: C.green }}>{fmtM(t.saveAdj)}</div>
                <div style={{ fontSize: 12, color: C.ink }}>vs. staying in cloud ({fmtM(t.cloud)}) · even with zero performance credit (floor case): {fmtM(t.saveFlr)}</div>
              </div>
            ) : (
              <div style={{ background: "#F1F1F1", borderLeft: "3px solid #CC0000", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
                <div style={{ ...mono, fontSize: 11, color: C.ink }}>{`NO COST CROSSOVER WITHIN THE SELECTED ${horizon}-YEAR HORIZON`}</div>
                <div style={{ fontSize: 12, color: C.ink, marginTop: 4 }}>
                  At the stated consumption, staying in cloud is cheaper over {horizon} year{horizon > 1 ? "s" : ""} by {fmtM(-t.saveAdj)}. Fixed cluster overhead and transition costs dominate at this scale and horizon; a longer horizon may still cross{r.crossoverMo && r.crossoverMo > horizon * 12 ? ` (projected around month ${r.crossoverMo})` : ""}.{minViable && minViable > bill ? ` On-prem begins to pencil around ${fmtM(minViable)}/mo at these settings.` : ""}
                </div>
              </div>
            )}
            <Row label="Planning basis" value={r.isWorkloadMode ? "Workload Requirement" : "Existing Cloud Spend"} sub={r.isWorkloadMode ? "both sides costed from the GPU Sizing technical requirement" : "on-prem sized from your reported cloud spend"} />
            <Row label={`Recommended build`} value={`${r.sysAdj} × ${ownSys}${redundancy ? " (incl. N+1)" : ""}`} sub={r.isWorkloadMode ? `fixed to the workload's technical requirement · ${facility}` : `${Math.round(r.headroom * 100)}% growth headroom · ${facility}`} />
            <Row label="Total capex + one-time transition" value={fmtM(r.adj.capex + r.oneTime)} sub={`incl. ${fmtM(r.oneTime)} migration, dual-run, and exit costs`} />
            <Row label="Ongoing operations" value={`${fmt(r.adj.opex)}/mo`} sub={facility === "Equinix" ? "Equinix colo bundle incl. managed services" : "power, facility, admin, storage support"} />
            <Row label="Simple payback" value={r.payback ? `${r.payback.toFixed(0)} months` : "—"} sub={r.isWorkloadMode ? "capex + one-time vs. estimated workload-equivalent cloud cost" : "capex + one-time vs. current monthly cloud bill"} />
            <Row label="Residual value credit" value={`−${fmt(r.adj.resid)}`} sub={`${Math.round(residPct * 100)}% of systems + storage capex at horizon`} />
            {r.cap.fits && <Row label="Serving capacity (est.)" value={`~${r.cap.users.toLocaleString()} users · $${r.cap.perM.toFixed(2)}/1M tok`} sub={`${modelSize} @ ${quant} · rule-of-thumb estimate, not a sizing exercise`} />}
            {r.isWorkloadMode ? (
              <>
                <Row label="Technical workload requirement" value={`${r.sysAdj} × ${ownSys}`} sub={`${gpuSizingCount} GPUs${r.sourceConversion ? ` at ${sourceClass} (normalized ${r.sourceConversion.toFixed(2)}x)` : ` at ${ownSys}`} -- fleet size is duty-cycle-independent`} />
                <Row label="Cloud-pricing basis" value={`${Math.round(r.gpuHrsCloud).toLocaleString()} GPU-hrs/mo`} sub={workingDayHours ? `${workingDayHours} hrs/day duty cycle from GPU Sizing (not 24/7)` : `no duty-cycle data from GPU Sizing -- assumes ${Math.round(util * 100)}% of all hours, likely an overstatement`} />
              </>
            ) : (
              <>
                <Row label="Your current consumption (reconstructed)" value={`${Math.round(r.gpuHrs).toLocaleString()} GPU-hrs/mo`} sub={tier3Hrs > 0 ? "from your invoice" : `from spend at ${provider} ${gpuClass} list rates (${RATES_ASOF})`} />
                {gpuSizingSystems && (
                  <Row label="GPU Sizing technical recommendation" value={`${gpuSizingSystems} × ${ownSys}`} sub={`${gpuSizingCount} GPUs, node-rounded -- workload requirement, not spend-derived${fleetsDisagree ? "; differs from the build above" : ""}`} />
                )}
              </>
            )}
            <div style={{ fontSize: 11, color: C.sub, marginTop: 12 }}>
              {r.isWorkloadMode ? (
                <>
                  Methodology (Workload Requirement mode, v2.9): cash-flow TCO in nominal dollars (not accounting depreciation, not discounted NPV). The on-prem fleet is sized directly to the GPU Sizing technical requirement ({gpuSizingCount} GPUs{r.sourceConversion ? ` at ${sourceClass}, normalized to ${ownSys} using a ${r.sourceConversion.toFixed(2)}x generational capability ratio since the recommended class isn't sold new as that system` : ` at ${ownSys}`}), not derived from spend, and grows year over year on the same growth rate applied to that requirement; fleet size is independent of duty cycle, since owned hardware must be present whether or not it's continuously in use. The cloud-side estimate instead uses {workingDayHours ? `a ${workingDayHours}-hour/day duty cycle from GPU Sizing's own workload timing` : `the on-prem target utilization (${Math.round(util * 100)}%) as a fallback, since no duty-cycle data came through with this handoff -- likely an overstatement for a business-hours workload`}, converted into rented {gpuClass} hours using ONLY the hardware generational capability factor ({r.genPF.toFixed(2)}x, benchmark-derived from MLPerf-class throughput ratios for {ownSys} vs {gpuClass} -- directional and workload-normalized, not a universal physical conversion constant). Network, scheduling, and inference-stack efficiency factors (fNet/fSw/fNvaie) are deliberately excluded from this conversion, since those are advantages of owning infrastructure, not something a cloud renter gets; applying them to price a rental would be circular. The floor case instead assumes zero generational credit (1.00x), the conservative case if that capability ratio is overstated. Storage is a direct input (no bill to auto-scale it from). On-prem pricing per NVIDIA DGX TCO reference (Jul 2026); residual value applies to hardware only. This is a directional analysis for a workload that may not yet exist at this scale in your current cloud environment.
                </>
              ) : (
                <>
                  Methodology: cash-flow TCO in nominal dollars (not accounting depreciation, not discounted NPV). Cloud spend normalized to GPU-hours at published list rates; on-prem fleet sized at {Math.round(util * 100)}% target utilization with MLPerf-derived generational performance factors ({r.npf.toFixed(2)}x net, shown alongside a zero-factor floor case). On-prem pricing per NVIDIA DGX TCO reference (Jul 2026). The on-prem fleet expands year by year when demand growth exhausts installed capacity (incremental systems, racks, power, admin, and residual all scale); storage is held static. Mixed training/inference workloads use a harmonic (GPU-hour-correct) blend of the generational factors. Residual value applies to hardware only — professional services and software subscriptions are excluded. Storage defaults to Auto — sized from the non-compute share of the stated bill (making Tier 1 a true two-input model); manual entries are reconciled against that share with a visible warning on mismatch. Crossover is computed from cumulative monthly cash flows (cloud compute grows at the demand rate, non-compute and on-prem opex at 4%/yr; capex charged when incurred; residual excluded until exit); static payback is shown as a secondary metric only. The N+1 spare is excluded from growth headroom — spare capacity is failover, not expansion room. The companion workbook is the auditable reference implementation of the core sizing and TCO formulas; this application extends it with dynamic fleet growth, five-provider rate routing and interface-level validation. Capacity and unit-economics figures are rule-of-thumb estimates (labeled EST) from model memory and throughput classes, not a sizing exercise. Not modeled: hardware refresh cadence beyond residual, NPV discounting, cloud commitment early-termination, hybrid burst. This is a directional analysis — a validated version requires your actual cloud invoice.
                </>
              )}
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ ...mono, fontSize: 10, letterSpacing: 1.2, color: C.sub, marginBottom: 4 }}>APPENDIX — FULL INPUTS & OUTPUTS (for independent reproduction)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 14px", fontSize: 11 }}>
                {[
                  ["Planning basis", r.isWorkloadMode ? "Workload Requirement (v2.9)" : "Existing Cloud Spend"],
                  [r.isWorkloadMode ? "Reported monthly cloud spend (context only)" : "Monthly cloud AI spend", `${fmt(bill)}/mo`],
                  ["Provider / rented GPU class", `${provider} / ${gpuClass} (${RATES[provider][gpuClass].conf})`],
                  ["On-prem target system", ownSys],
                  ["Training / inference mix", `${Math.round(trainShare * 100)}% / ${Math.round((1 - trainShare) * 100)}%`],
                  ["On-demand share", `${Math.round(odShare * 100)}%`],
                  ["Compute share of bill", `${Math.round(computeShare * 100)}%`],
                  ["Fast / bulk storage", `${fastPB.toFixed(2)} / ${bulkPB.toFixed(2)} PB (${effectiveStorageAuto ? "auto from bill" : "manual"})`],
                  ["Egress", `${Math.round(egressPct * 100)}%/mo`],
                  ["Annual compute growth", `${Math.round(growth * 100)}%`],
                  ["Facility", facility],
                  ["Power rate", `$${powerRate}/kW-mo`],
                  ["Target utilization", `${Math.round(util * 100)}%`],
                  ...(r.isWorkloadMode
                    ? [["Generational capability factor (genPF)", `${r.genPF.toFixed(2)}x -- benchmark-derived, directional; fNet/fSw/fNvaie excluded (see methodology)`]]
                    : [["Factors net / sw / NVAIE", `${fNet.toFixed(2)}x / ${fSw.toFixed(2)}x / ${fNvaie.toFixed(2)}x`],
                       ["Generational / NPF", `${r.genPF.toFixed(2)}x / ${r.npf.toFixed(2)}x`]]),
                  ["Tier 3 GPU-hours", tier3Hrs > 0 ? tier3Hrs.toLocaleString() : "not provided"],
                  ["Migration / dual-run / retrofit", `${fmtM(migration)} / ${dualRun}mo / ${facility === "Self-hosted (retrofit)" ? fmtM(retrofit) : "n/a"}`],
                  ["Redundancy / residual", `${redundancy ? "N+1 on" : "off"} / ${Math.round(residPct * 100)}%`],
                  [r.isWorkloadMode ? "Technical GPU-hours (target class)" : "Reconstructed GPU-hours", `${Math.round(r.gpuHrs).toLocaleString()}/mo`],
                  ["Systems (adjusted / floor)", `${r.sysAdj} / ${r.sysFloor}`],
                  ...(gpuSizingSystems && !r.isWorkloadMode ? [["GPU Sizing technical recommendation", `${gpuSizingSystems} × ${ownSys} (${gpuSizingCount} GPUs, node-rounded)`]] : []),
                  ["Fleet by year (adjusted)", r.fleetAdj.slice(0, horizon).join(" → ")],
                  ["Capex / one-time / residual credit", `${fmt(r.adj.capex)} / ${fmt(r.oneTime)} / −${fmt(r.adj.resid)}`],
                  ["On-prem opex", `${fmt(r.adj.opex)}/mo`],
                  [`Cloud vs on-prem (${horizon}yr)`, `${fmt(t.cloud)} vs ${fmt(t.onAdj)}${r.isWorkloadMode ? ` (floor cloud: ${fmt(t.cloudFloor)})` : ""}`],
                  ["Savings (adjusted / floor)", `${fmt(t.saveAdj)} / ${fmt(t.saveFlr)}`],
                  ["Model / quantization (capacity est.)", `${modelSize} / ${quant}`],
                  ["Est. users / $ per 1M tokens", r.cap.fits ? `${r.cap.users.toLocaleString()} / $${r.cap.perM.toFixed(2)} (vs API $${r.cap.cloudPerM.toFixed(2)})` : "model does not fit fleet"],
                  ["Rate card overrides", editedCount > 0 ? Object.keys(ov).join(", ") : "none — all defaults"],
                  ...(r.isWorkloadMode ? [] : [["Spend/storage reconciliation", `${fmt(r.cloudStorage)}/mo implied vs ${fmt(r.storageBudget)}/mo non-compute budget — ${r.cloudStorage > r.storageBudget * 1.02 ? `OVERALLOCATED by ${fmt(r.cloudStorage - r.storageBudget)}` : "within tolerance"}`]]),
                  ["Crossover (cumulative) / static payback", `${r.crossoverMo ? `month ${r.crossoverMo}` : "none ≤60mo"} / ${r.payback ? r.payback.toFixed(0) + " mo" : "n/a"}`],
                  ["— APPLIED RATES (snapshot) —", ""],
                  ["Cloud $/GPU-hr OD / reserved", `$${rc.instOD} / $${rc.instRes} (${RATES[provider][gpuClass].conf})`],
                  ["NVAIE $/GPU-hr OD / reserved", `$${rc.nvaieOD} / $${rc.nvaieRes}`],
                  ["Cloud storage fast / bulk $/GB-mo", `$${rc.fastGB} / $${rc.bulkGB}`],
                  ["Egress $/GB · API $/1M tok", `$${rc.egressGB} · $${rc.cloudTok}`],
                  ["System loaded cost / kW", `${fmt(rc.perSysCost)} / ${rc.sysKw} kW`],
                  ["Cluster fixed / Equinix bundle", `${fmt(rc.cluster)} / ${fmt(rc.equinixMo)}/sys/mo`],
                  ["On-prem storage fast / bulk $/PB", `${fmt(rc.fastPB)} / ${fmt(rc.bulkPB)}`],
                  ["Admin ratio / FTE / ops growth", `${rc.adminRatio}/FTE · ${fmt(rc.opFTE)} · ${Math.round(rc.opsGrowth * 100)}%/yr`],
                  ["Engine version", "v2.8 (UI restyle only — engine unchanged from v2.3; reference workbook audit-complete after 9 external rounds — see docs/ for the audited xlsx and spec)"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${C.line}`, padding: "2px 0" }}>
                    <span style={{ color: C.sub }}>{k}</span><span style={{ ...mono }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ borderTop: `2px solid ${C.ink}`, marginTop: 14, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ ...disp, fontWeight: 700, fontSize: 13 }}>Jay B. Carlile</div>
                <div style={{ fontSize: 11, color: C.sub }}>AI Solutions Executive · CDW AI Factory</div>
              </div>
              <div style={{ fontSize: 11, color: C.sub, textAlign: "right" }}>Next step: bring your cloud invoice<br/>for a validated analysis</div>
            </div>
          </div>
        )}


        {view === "calc" && (<div>
        {arrivedFromGpuSizing && gpuSizingSystems && (
          <div style={{ background: "#F5F5F5", border: "1px solid #ddd", borderRadius: 10, padding: "12px 16px", marginBottom: 14, fontSize: 13, color: "#444" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span style={{ ...mono, fontSize: 10, letterSpacing: 1, color: "#888" }}>PLANNING BASIS</span>
              <div style={{ display: "flex", gap: 4 }}>
                {[["workload", "Workload Requirement"], ["spend", "Existing Cloud Spend"]].map(([mv, label]) => (
                  <button key={mv} onClick={() => setMode(mv)}
                    style={{ ...disp, fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 8, cursor: "pointer",
                      border: mode === mv ? "none" : "1px solid #ccc", background: mode === mv ? "#CC0000" : "transparent",
                      color: mode === mv ? "#fff" : "#666" }}>{label}</button>
                ))}
              </div>
            </div>
            {mode === "workload" ? (
              <>
                Comparing <strong>{r.sysAdj} x {ownSys}</strong> ({gpuSizingCount} {sourceClass || ownSys}-class GPUs, your GPU Sizing recommendation)
                against the estimated cloud cost of running that <em>same workload</em>, not your entered spend. Storage is
                now a direct input below (no bill to auto-derive it from). Switch to "Existing Cloud Spend" above for the
                original bake-off against what you're paying today.
                <div style={{ marginTop: 6, color: "#666" }}>
                  {r.sourceConversion ? (
                    <>Recommendation was sized at {sourceClass} ({gpuSizingCount} GPUs); normalized to {r.sysAdj} × {ownSys} using
                    a {r.sourceConversion.toFixed(2)}x generational capability ratio, since {ownSys} isn't the same class the
                    count was computed for. </>
                  ) : null}
                  {workingDayHours ? (
                    <>Cloud side priced for a {workingDayHours}-hour/day duty cycle (from GPU Sizing), not 24/7 -- a business-hours
                    workload shouldn't be priced as continuous rental. </>
                  ) : (
                    <>No duty-cycle data came through from GPU Sizing (training handoff, or an older link), so the cloud side
                    assumes the same utilization as the on-prem target ({Math.round(util * 100)}% of all hours) -- likely an
                    overstatement for a business-hours workload. </>
                  )}
                  Cloud alternative priced at <strong>{provider} {gpuClass}</strong> -- change this under Tier 2 if that's not what
                  you'd actually rent.
                </div>
              </>
            ) : (
              <>
                Target system pre-set to <strong>{ownSys}</strong>, based on your GPU Sizing recommendation of{" "}
                <strong>{gpuSizingSystems} x {ownSys}</strong> ({gpuSizingCount} GPUs). Enter your current monthly cloud
                spend below to see whether owning it costs less than what you're paying today.
                {fleetsDisagree ? (
                  <div style={{ marginTop: 6, color: "#666" }}>
                    The fleet size below is derived from your cloud spend, not this technical recommendation, so it may
                    differ. Cloud spend reflects your current usage and pricing; GPU Sizing reflects the workload's
                    technical requirement -- they can legitimately disagree. Switch to "Workload Requirement" above for
                    a fair comparison based on what the workload actually needs.
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}
        {/* RESULTS */}
        <div style={{ background: C.ink, borderRadius: 14, padding: "16px 16px 12px", marginBottom: 14, color: "#FFFFFF" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ ...mono, fontSize: 10, letterSpacing: 1.5, color: "#ABABAB" }}>
              {horizon}-YEAR SAVINGS · {tier}{editedCount > 0 ? ` · ${editedCount} RATE${editedCount > 1 ? "S" : ""} EDITED` : ""}
            </span>
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 3, 5].map((h) => (
                <button key={h} onClick={() => setHorizon(h)}
                  style={{ ...disp, fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 8, cursor: "pointer",
                    border: horizon === h ? "none" : "1px solid #4A4A4A", background: horizon === h ? C.green : "transparent",
                    color: horizon === h ? "#FFFFFF" : "#ABABAB" }}>{h}yr</button>
              ))}
            </div>
          </div>
          {t.saveAdj > 0 ? (
            <>
              <div style={{ ...mono, fontSize: 40, fontWeight: 600, color: "#FFFFFF", margin: "6px 0 0", borderBottom: "3px solid #CC0000", display: "inline-block", paddingBottom: 2 }}>
                {fmtM(t.saveAdj)}
              </div>
              <div style={{ fontSize: 12, color: "#D0D0D0", marginBottom: 10 }}>
                {(t.cloud > 0 ? (t.saveAdj / t.cloud) * 100 : 0).toFixed(0)}% below cloud · floor case ({r.isWorkloadMode ? "no generational credit" : "no perf factors"}): <span style={{ ...mono, color: "#C9C9C9" }}>{fmtM(t.saveFlr)}</span>
              </div>
            </>
          ) : (
            <div style={{ background: "#3A3A3A", borderLeft: "3px solid #CC0000", borderRadius: 6, padding: "10px 12px", margin: "8px 0 10px" }}>
              <div style={{ ...mono, fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>{`NO COST CROSSOVER WITHIN THE SELECTED ${horizon}-YEAR HORIZON`}</div>
              <div style={{ fontSize: 12, color: "#D0D0D0", marginTop: 4 }}>
                At these settings, staying in cloud is cheaper over {horizon} year{horizon > 1 ? "s" : ""} by {fmtM(-t.saveAdj)} — the fixed cluster overhead and transition costs outweigh the ownership advantage at this scale and horizon. A longer horizon may still cross — check the 3yr and 5yr views.{r.crossoverMo && r.crossoverMo > horizon * 12 ? ` Cumulative cash flows project crossover around month ${r.crossoverMo}.` : ""}
                {minViable && minViable > bill ? ` On-prem starts to pencil around ${fmtM(minViable)}/mo at these settings.` : ""} An honest tool says so.
              </div>
            </div>
          )}
          <div style={{ background: "#1F1F1F", borderRadius: 8, padding: "10px 12px" }}>
            {r.isWorkloadMode ? (
              <>
                <Bar label={`Stay in cloud — adjusted (workload-equivalent)`} value={t.cloud} max={maxBar} color={"#8A8A8A"} />
                <Bar label={`Stay in cloud — floor case (no generational credit)`} value={t.cloudFloor} max={maxBar} color={"#C9C9C9"} />
                <Bar label={`Own it (${r.sysAdj} × ${ownSys}${redundancy ? " incl. N+1" : ""}, fixed by workload requirement)`} value={t.onAdj} max={maxBar} color={"#CC0000"} />
              </>
            ) : (
              <>
                <Bar label={`Stay in cloud (${horizon}yr)`} value={t.cloud} max={maxBar} color={"#8A8A8A"} />
                <Bar label={`Own it — adjusted (${r.sysAdj} × ${ownSys}${redundancy ? " incl. N+1" : ""})`} value={t.onAdj} max={maxBar} color={"#CC0000"} />
                <Bar label={`Own it — floor case (${r.sysFloor} × ${ownSys}${redundancy ? " incl. N+1" : ""})`} value={t.onFlr} max={maxBar} color={"#C9C9C9"} />
              </>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 10 }}>
            {[
              ["FLEET", `${r.sysAdj} sys`, r.fleetAdj[horizon - 1] > r.sysAdj ? `${Math.round(r.headroom * 100)}% headroom → ${r.fleetAdj[horizon - 1]} sys by yr ${horizon}` : `${Math.round(r.headroom * 100)}% headroom`],
              ["CAPEX + 1-TIME", fmtM(r.adj.capex + r.oneTime), `${fmtM(r.oneTime)} transition`],
              ["CROSSOVER", r.crossoverMo ? `mo ${r.crossoverMo}` : "none ≤60mo", `static payback ${r.payback ? r.payback.toFixed(0) + "mo" : "n/a"} · ${t.onAdj > 0 ? Math.round((t.saveAdj / t.onAdj) * 100) : 0}% ROI`],
            ].map(([k, v, s]) => (
              <div key={k} style={{ background: "#1F1F1F", borderRadius: 8, padding: "8px 10px" }}>
                <div style={{ ...mono, fontSize: 9, letterSpacing: 1.2, color: "#ABABAB" }}>{k}</div>
                <div style={{ ...mono, fontSize: 15, fontWeight: 600, color: "#FFFFFF" }}>{v}</div>
                <div style={{ fontSize: 10, color: "#ABABAB" }}>{s}</div>
              </div>
            ))}
          </div>
        </div>

        {/* TIER 1 */}
        <Section title="Start here" badge="TIER 1">
          <Slider label={mode === "workload" ? "Reported monthly cloud spend (context only)" : "Monthly cloud AI spend"} value={bill} min={20000} max={2000000} step={5000}
            onChange={setBill} display={fmtM(bill) + "/mo"} tip={TIPS.spend} />
          {mode === "workload" && (
            <div style={{ fontSize: 11, color: C.sub, background: "#F5F5F5", borderRadius: 6, padding: "6px 9px", marginTop: -2, marginBottom: 6 }}>
              In workload mode this isn't used to size anything — it's shown only so you can compare it against the estimated
              cost of actually running this workload in the cloud: <strong>{fmtM(r.monthlyCloudBaseline)}/mo</strong>.
              {r.monthlyCloudBaseline > bill * 1.5 ? " That's substantially higher than the reported spend, which likely means this workload isn't fully running in the cloud today at this scale." : ""}
            </div>
          )}
          <TipLabel text="Primary provider" tip={TIPS.provider} />
          <Seg options={PROVIDERS} value={provider} onChange={setProvider} />
          <div style={{ fontSize: 11, color: C.green, background: C.greenSoft, borderRadius: 6, padding: "6px 9px" }}>
            {provider} {gpuClass}: ${rateInfo.od.toFixed(2)}/GPU-hr on-demand · confidence: {rateInfo.conf}
            {rateInfo.conf === "QUOTE" ? " (estimate — verify with provider)" : ""}{rateInfo.note ? ` (${rateInfo.note})` : ""} · reserved = 40% off list (est.) · rates as of {RATES_ASOF}. Override any rate below.
          </div>
        </Section>

        {/* TIER 2 */}
        <Section title="Refine when known" badge="TIER 2" defaultOpen={false}>
          <TipLabel text="GPU class they rent today" tip={TIPS.gpuClass} style={{ fontSize: 13 }} />
          <Seg options={Object.keys(IDX.train)} value={gpuClass} onChange={setGpuClass} />
          <div style={{ fontSize: 11, color: C.sub, marginTop: -2 }}>
            Sets both the performance factor AND the rate used to reconstruct their GPU-hours from spend.
          </div>
          <TipLabel text="On-prem target system" tip={TIPS.ownSys} />
          <Seg options={OWN_TARGETS} value={ownSys} onChange={setOwnSys} />
          <Slider label="Workload mix — training share" value={trainShare} min={0} max={1} step={0.05}
            onChange={setTrainShare} display={`${Math.round(trainShare * 100)}% train`} tip={TIPS.trainShare} />
          <Slider label="On-demand share of billing" value={odShare} min={0} max={1} step={0.05}
            onChange={setOdShare} display={`${Math.round(odShare * 100)}% OD`} tip={TIPS.odShare} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <span style={{ ...mono, fontSize: 9, letterSpacing: 1, color: effectiveStorageAuto ? "#CC0000" : C.sub, border: `1px solid ${effectiveStorageAuto ? "#CC0000" : C.line}`, borderRadius: 3, padding: "1px 6px" }}>
              {effectiveStorageAuto ? "STORAGE: AUTO (scaled to bill)" : mode === "workload" ? "STORAGE: MANUAL (workload mode — no bill to scale from)" : "STORAGE: MANUAL"}
            </span>
            {!effectiveStorageAuto && mode !== "workload" && (
              <button onClick={() => setStorageAuto(true)} style={{ border: `1px solid ${C.line}`, background: "transparent", color: C.sub, borderRadius: 4, padding: "1px 8px", fontSize: 11, cursor: "pointer" }}>
                back to auto
              </button>
            )}
          </div>
          <Slider label="Fast storage" value={fastPB} min={0} max={3} step={0.05}
            onChange={setFastPB} display={`${fastPB.toFixed(2)} PB`} tip={TIPS.fastStorage} />
          <Slider label="Bulk storage" value={bulkPB} min={0} max={10} step={0.25}
            onChange={setBulkPB} display={`${bulkPB.toFixed(2)} PB`} tip={TIPS.bulkStorage} />
          <Slider label="Egress" value={egressPct} min={0} max={0.3} step={0.01}
            onChange={setEgressPct} display={`${Math.round(egressPct * 100)}% /mo`} tip={TIPS.egress} />
          {mode !== "workload" && !storageAuto && r.cloudStorage > r.storageBudget * 1.02 && (
            <div style={{ fontSize: 12, color: "#B4530A", background: "#FBF3EC", borderRadius: 6, padding: "8px 10px", margin: "4px 0 8px" }}>
              The entered storage implies {fmt(r.cloudStorage)}/mo of cloud storage + egress, but only {fmt(r.storageBudget)}/mo of the stated bill is non-compute. Reduce storage, raise the bill, or{" "}
              <button onClick={() => {
                const scale = r.cloudStorage > 0 ? r.storageBudget / r.cloudStorage : 1;
                setFastPB(Math.max(0, Math.round((fastPB * scale) / 0.05) * 0.05));
                setBulkPB(Math.max(0, Math.round((bulkPB * scale) / 0.25) * 0.25));
              }} style={{ border: "1px solid #B4530A", background: "transparent", color: "#B4530A", borderRadius: 4, padding: "1px 8px", fontSize: 11, cursor: "pointer" }}>
                fit storage to bill
              </button>
            </div>
          )}
          <Slider label="Compute share of the bill" value={computeShare} min={0.2} max={0.9} step={0.05}
            onChange={setComputeShare} display={`${Math.round(computeShare * 100)}%`} tip={TIPS.computeShare} />
          <Slider label="Annual compute growth" value={growth} min={0} max={1} step={0.05}
            onChange={setGrowth} display={`${Math.round(growth * 100)}%/yr`} tip={TIPS.growth} />
          <TipLabel text="Facility readiness" tip={TIPS.facility} />
          <Seg options={FACILITIES} value={facility} onChange={setFacility} />
          {facility === "Self-hosted (retrofit)" && (
            <Slider label="Facility retrofit (one-time)" value={retrofit} min={0} max={2000000} step={50000}
              onChange={setRetrofit} display={fmtM(retrofit)}
              hint="2 DGX/rack = ~29 kW/rack, beyond most legacy DCs. Typical buildout $10-15K per kW of new capacity." />
          )}
          {isSelf && (
            <Slider label="Power rate (fully loaded)" value={powerRate} min={100} max={450} step={25}
              onChange={setPowerRate} display={`$${powerRate}/kW-mo`} tip={TIPS.powerRate} />
          )}
          <Slider label="Target on-prem utilization" value={util} min={0.5} max={1} step={0.05}
            onChange={setUtil} display={`${Math.round(util * 100)}%`} tip={TIPS.util} />
        </Section>

        {/* ONE-TIME & RESILIENCE */}
        <Section title="Transition & resilience" badge="v1.2" defaultOpen={false}>
          <Slider label="Migration engineering (one-time)" value={migration} min={0} max={500000} step={25000}
            onChange={setMigration} display={fmtM(migration)} tip={TIPS.migration} />
          <Slider label="Dual-run period" value={dualRun} min={0} max={6} step={1}
            onChange={setDualRun} display={`${dualRun} mo`} tip={TIPS.dualRun} />
          <TipLabel text="N+1 redundancy" tip={TIPS.redundancy} />
          <Seg options={["Off", "On (+1 system)"]} value={redundancy ? "On (+1 system)" : "Off"}
            onChange={(v) => setRedundancy(v !== "Off")} />
          <div style={{ fontSize: 11, color: C.sub, marginTop: -2 }}>
            A 1-system fleet has zero failover; cloud embeds redundancy in its price. Alternative: cloud-burst fallback (hybrid conversation).
          </div>
          <Row label="Cloud exit egress (auto)" value={fmt(r.exitEgress)} sub="computed from your storage inputs" tip={TIPS.exitEgress} />
          <Slider label="Residual value at horizon" value={residPct} min={0} max={0.4} step={0.05}
            onChange={setResidPct} display={`${Math.round(residPct * 100)}%`}
            hint="Credit on systems + storage capex at horizon end. Flat % simplification; partial answer to the refresh objection." />
        </Section>

        {/* FACTORS */}
        <Section title="Performance factors" badge="RANGE · DEFAULT · BREAKEVEN" defaultOpen={false}>
          <TipLabel text="What these factors are" tip={TIPS.factorsGroup} style={{ fontSize: 12, color: "#6B6B6B", marginBottom: 4 }} />
          {r.isWorkloadMode && (
            <div style={{ fontSize: 11, color: C.sub, background: "#F5F5F5", borderRadius: 6, padding: "6px 9px", marginBottom: 6 }}>
              In Workload Requirement mode, only the generational capability factor below is used. The three sliders
              (network, scheduling, NVAIE) are ownership-side operational advantages, not rental-pricing inputs, so
              they don't affect this comparison -- see the report methodology for why.
            </div>
          )}
          <Row label="Generational (from lookup)" value={`${r.genPF.toFixed(2)}x`}
            sub={`${gpuClass} → ${ownSys}, weighted by workload mix · ${EST_IDX.includes(SYS_CLASS[ownSys]) || EST_IDX.includes(gpuClass) ? "provisional (EST) pending NVIDIA-sourced factors" : "MLPerf-derived"} · benchmark-derived, directional -- not a universal physical conversion constant`} tip={TIPS.genSpeedup} />
          <Slider label="Reference-architecture network" value={fNet} min={1} max={2.5} step={0.05}
            onChange={setFNet} display={`${fNet.toFixed(2)}x`} tip={TIPS.network} />
          <Slider label="AI Factory software (Run:ai / Mission Control)" value={fSw} min={1} max={3} step={0.05}
            onChange={setFSw} display={`${fSw.toFixed(2)}x`} tip={TIPS.runai} />
          <Slider label="NVAIE / NIMs" value={fNvaie} min={1} max={5} step={0.05}
            onChange={setFNvaie} display={`${fNvaie.toFixed(2)}x`} tip={TIPS.nvaie} />
          {r.isWorkloadMode ? (
            <Row label="Net Performance Factor" value="not used in this mode" sub="workload mode uses the generational factor alone -- see methodology" />
          ) : (
            <Row label="Net Performance Factor" value={`${r.npf.toFixed(2)}x`} sub="Your cloud GPU-hours ÷ NPF = on-prem hours needed" />
          )}
        </Section>

        {/* CAPACITY & UNIT ECONOMICS (v1.9) */}
        <Section title="Capacity & unit economics" badge="EST" defaultOpen={false}>
          <TipLabel text="How these estimates work" tip={TIPS.capGroup} style={{ fontSize: 12, color: "#6B6B6B", marginBottom: 4 }} />
          <TipLabel text="Model size" tip={TIPS.modelSize} style={{ fontSize: 13 }} />
          <Seg options={Object.keys(MODELS)} value={modelSize} onChange={setModelSize} />
          <TipLabel text="Quantization" tip={TIPS.quant} style={{ fontSize: 13 }} />
          <Seg options={Object.keys(QUANT)} value={quant} onChange={setQuant} />
          {!r.cap.fits ? (
            <div style={{ fontSize: 12, color: "#B4530A", background: "#FBF3EC", borderRadius: 6, padding: "8px 10px", marginTop: 6 }}>
              A {modelSize} model at {quant} needs {r.cap.gpusPerReplica} GPUs per copy, but the current fleet has {r.sysAdj * SYSTEMS[ownSys].gpus}. Add systems, pick a smaller model, or lower the precision.
            </div>
          ) : (
            <>
              <Row label="GPUs per model copy / copies in fleet" value={`${r.cap.gpusPerReplica} / ${r.cap.replicas}`} sub={`${modelSize} @ ${quant} on ${ownSys} (${SYSTEMS[ownSys].vram} GB/GPU, ×${KV_OVERHEAD} overhead)`} />
              <Row label="Concurrent interactive users (est.)" value={r.cap.users.toLocaleString()} sub={`at ${TOK_PER_USER} tok/s per user, ${Math.round(util * 100)}% utilization`} />
              <Row label="Token throughput (est.)" value={`${r.cap.monthlyTokM >= 1000 ? (r.cap.monthlyTokM / 1000).toFixed(1) + "B" : Math.round(r.cap.monthlyTokM) + "M"} tokens/mo`} sub="fleet-wide at target utilization" />
              <Row label="Cost per 1M tokens" value={`$${r.cap.perM.toFixed(2)} vs $${r.cap.cloudPerM.toFixed(2)}`} sub="on-prem all-in vs managed-API blended list (editable in Rate card)" />
              <Row label="Cost per user / month" value={`$${Math.round(r.cap.perUserOn).toLocaleString()} vs $${Math.round(r.cap.perUserCloud).toLocaleString()}`} sub="on-prem vs cloud API at the same usage" />
            </>
          )}
        </Section>

        {/* TIER 3 */}
        <Section title="Validated analysis" badge="TIER 3" defaultOpen={false}>
          <Slider label="Actual monthly GPU-hours (from invoice)" value={tier3Hrs} min={0} max={100000} step={500}
            onChange={setTier3Hrs} display={tier3Hrs > 0 ? tier3Hrs.toLocaleString() : "not provided"}
            tip={TIPS.tier3} />
        </Section>

        {/* RATE CARD */}
        <Section title="Rate card" badge={editedCount > 0 ? `${editedCount} EDITED` : "EDITABLE"}
          badgeColor={editedCount > 0 ? "#CC0000" : undefined} defaultOpen={false}>
          <div style={{ fontSize: 11, color: C.sub, marginBottom: 6 }}>
            Cloud instance rates auto-fill from the {provider} × {gpuClass} list table (as of {RATES_ASOF}); on-prem defaults = NVIDIA DGX TCO tool (Jul 2026). Edits stick until reset, including across provider switches.
          </div>
          {editedCount > 0 && (
            <button onClick={() => setOv({})}
              style={{ ...mono, fontSize: 11, padding: "7px 12px", borderRadius: 7, cursor: "pointer",
                border: "1px solid #CC0000", background: "#FBEAEA", color: "#CC0000", marginBottom: 8, fontWeight: 700 }}>
              Reset all {editedCount} to defaults
            </button>
          )}
          <div style={{ ...disp, fontSize: 12, fontWeight: 600, margin: "8px 0 2px", color: C.sub }}>CLOUD — {provider} {gpuClass} ($/GPU-hr) · {rateInfo.conf} · as of {RATES_ASOF}</div>
          <RateField k="instRes" label="Cloud $/GPU-hr, 1-yr reserved" eff={rc} defaults={defaults} ov={ov} setOv={setOv} step={0.01} fmt={(v)=>`$${v}`} />
          <RateField k="instOD" label="Cloud $/GPU-hr, on-demand" eff={rc} defaults={defaults} ov={ov} setOv={setOv} step={0.01} fmt={(v)=>`$${v}`} />
          <RateField k="nvaieRes" label="NVAIE support $/GPU-hr, reserved" eff={rc} defaults={defaults} ov={ov} setOv={setOv} step={0.01} fmt={(v)=>`$${v}`} />
          <RateField k="nvaieOD" label="NVAIE support $/GPU-hr, on-demand" eff={rc} defaults={defaults} ov={ov} setOv={setOv} step={0.01} fmt={(v)=>`$${v}`} />
          <RateField k="fastGB" label="Fast storage $/GB/mo" eff={rc} defaults={defaults} ov={ov} setOv={setOv} step={0.01} fmt={(v)=>`$${v}`} />
          <RateField k="bulkGB" label="Bulk storage $/GB/mo" eff={rc} defaults={defaults} ov={ov} setOv={setOv} step={0.01} fmt={(v)=>`$${v}`} />
          <RateField k="cloudTok" label="Managed API blended $/1M tokens (EST)" eff={rc} defaults={defaults} ov={ov} setOv={setOv} step={0.5} fmt={(v)=>`$${v}`} />
          <RateField k="egressGB" label="Egress $/GB" eff={rc} defaults={defaults} ov={ov} setOv={setOv} step={0.01} fmt={(v)=>`$${v}`} />
          <div style={{ ...disp, fontSize: 12, fontWeight: 600, margin: "10px 0 2px", color: C.sub }}>ON-PREM HARDWARE · NVIDIA TCO tool capture, Aug 2026</div>
          <RateField k="perSysCost" label={`${ownSys} loaded cost $ (system + SW + fabrics + svcs; excl. cluster & racks)`} eff={rc} defaults={defaults} ov={ov} setOv={setOv} step={1000} fmt={fmt} />
          <RateField k="cluster" label="Cluster mgmt nodes $ (fixed per cluster — amortizes across fleet)" eff={rc} defaults={defaults} ov={ov} setOv={setOv} step={10000} fmt={fmt} />
          <RateField k="fastPB" label="Fast storage $/PB" eff={rc} defaults={defaults} ov={ov} setOv={setOv} step={10000} fmt={fmt} />
          <RateField k="bulkPB" label="Bulk storage $/PB" eff={rc} defaults={defaults} ov={ov} setOv={setOv} step={10000} fmt={fmt} />
          <div style={{ ...disp, fontSize: 12, fontWeight: 600, margin: "10px 0 2px", color: C.sub }}>OPERATIONS · NVIDIA TCO tool, Jul 2026 (Equinix bundle Aug 2026)</div>
          <RateField k="sysKw" label={`Power kW per ${ownSys} (avg load)`} eff={rc} defaults={defaults} ov={ov} setOv={setOv} step={0.1} />
          <RateField k="equinixMo" label="Equinix bundle $/system/mo" eff={rc} defaults={defaults} ov={ov} setOv={setOv} step={100} fmt={fmt} />
          <RateField k="adminRatio" label="Systems per admin FTE" eff={rc} defaults={defaults} ov={ov} setOv={setOv} step={1} />
          <RateField k="opFTE" label="Admin FTE loaded $/yr" eff={rc} defaults={defaults} ov={ov} setOv={setOv} step={1000} fmt={fmt} />
          <RateField k="netMo" label="Network/VPN/firewall $/mo" eff={rc} defaults={defaults} ov={ov} setOv={setOv} step={100} fmt={fmt} />
        </Section>

        {/* LEDGER */}
        <Section title="Methodology & assumptions" defaultOpen={false}>
          <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.5, marginBottom: 8 }}>
            <b>How this works:</b> your cloud spend is converted to GPU-hours at published per-GPU rates for your provider and GPU class; an on-prem fleet is sized to supply those hours at your target utilization; both paths are costed over 1/3/5 years. <b>This is cash-flow TCO in nominal dollars</b> — not accounting depreciation and not discounted NPV. <b>Performance equivalence:</b> the floor case holds cloud and on-prem exactly performance-equivalent, hour for hour; only the adjusted case applies performance factors, all of which you can drag to 1.0. Cloud rates carry per-cell confidence labels (LISTED / NODE-NORM / EST / QUOTE); on-prem costs are NVIDIA DGX TCO tool captures (Jul–Aug 2026). The on-prem fleet expands year by year when demand growth exhausts installed capacity (incremental systems, racks, power, admin, and residual all scale); storage is held static. Mixed training/inference workloads use a harmonic (GPU-hour-correct) blend of the generational factors. Residual value applies to hardware only — professional services and software subscriptions are excluded. Storage defaults to Auto — sized from the non-compute share of the stated bill (making Tier 1 a true two-input model); manual entries are reconciled against that share with a visible warning on mismatch. Crossover is computed from cumulative monthly cash flows (cloud compute grows at the demand rate, non-compute and on-prem opex at 4%/yr; capex charged when incurred; residual excluded until exit); static payback is shown as a secondary metric only. The N+1 spare is excluded from growth headroom — spare capacity is failover, not expansion room. The companion workbook is the auditable reference implementation of the core sizing and TCO formulas; this application extends it with dynamic fleet growth, five-provider rate routing and interface-level validation. Capacity and unit-economics figures are rule-of-thumb estimates (labeled EST) from model memory and throughput classes, not a sizing exercise. Not modeled: hardware refresh cadence beyond the residual assumption, NPV discounting, cloud commitment early-termination fees, stranded-capacity risk, hybrid burst.
          </div>
          <Row label="Reconstructed cloud GPU-hours" value={`${Math.round(r.gpuHrs).toLocaleString()}/mo`}
            sub={tier3Hrs > 0 ? "customer invoice" : `spend ÷ ${provider} ${gpuClass} blended rate $${r.blended.toFixed(2)}/instance-hr`} />
          <Row label={`GPU-hours one ${ownSys} supplies`} value={`${Math.round(r.perSysHrs).toLocaleString()}/mo`} sub={`${SYSTEMS[ownSys].gpus} GPUs × 730 hrs × ${Math.round(util * 100)}% utilization`} />
          <Row label="One-time transition & exit" value={fmt(r.oneTime)}
            sub={`migration ${fmtM(migration)} + dual-run ${dualRun}mo × bill + exit egress ${fmt(r.exitEgress)}${facility === "Self-hosted (retrofit)" ? ` + retrofit ${fmtM(retrofit)}` : ""}`} />
          <Row label="Residual credit at horizon (adjusted fleet)" value={`−${fmt(r.adj.resid)}`}
            sub={`${Math.round(residPct * 100)}% of systems + storage capex · flat % simplification`} />
          <Row label="Cloud storage + egress spend displaced" value={`${fmt(r.cloudStorage)}/mo`} sub="egress disappears on-prem; storage cost moves into the on-prem storage lines above" flag={"fastGB" in ov || "bulkGB" in ov || "egressGB" in ov} />
          <Row label="On-prem opex" value={`${fmt(r.adj.opex)}/mo`} sub={facility === "Equinix" ? (SYSTEMS[ownSys].gpus > 8 ? "Equinix bundle + storage support — bundle rate calibrated for 8-GPU systems; NVL-72 colo pricing TBD" : "Equinix bundle + storage support") : "power + facility + admin + storage support"} flag={"equinixMo" in ov || "opFTE" in ov || "adminRatio" in ov} />
          <Row label="Fixed cluster cost in capex" value={fmt(rc.cluster)} sub="mgmt server nodes — why bigger bills pencil better" flag={"cluster" in ov} />
          <div style={{ fontSize: 11, color: C.sub, marginTop: 10 }}>
            {editedCount > 0
              ? `Running on a modified rate card (${editedCount} value${editedCount > 1 ? "s" : ""} edited).`
              : `Running on list rates (${provider} ${gpuClass}, ${RATES_ASOF}) + NVIDIA TCO tool on-prem defaults (Jul 2026) + MLPerf-derived factors.`}
            {" "}OCI note: egress is $0 on OCI as of Feb 2026 — zero the egress rate when modeling OCI exits. Still excluded: refresh cadence beyond residual, NPV, commitment early-termination, stranded capacity, hybrid burst. Saved rate profiles and auto-scaling fleet: v2.
          </div>
        </Section>

        <div style={{ marginBottom: 10, borderRadius: 10, border: `1px solid ${C.line}`, background: "#F7F7F7", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: C.sub, textTransform: "uppercase", marginBottom: 2 }}>Next: task-level ROI</div>
            <div style={{ fontSize: 12, color: "#444" }}>
              Send this infrastructure cost ({fmt(r.adj.capex + r.oneTime)} upfront, {fmt(r.adj.opex * 12)}/yr ongoing) into the ROI Calculator as the AI cost side of a task-automation business case.
              {r.isWorkloadMode ? " Based on the Workload Requirement fleet, not your reported cloud spend." : " Based on your reported cloud spend."}
            </div>
          </div>
          <a
            href={`/roi?initialCost=${Math.round(r.adj.capex + r.oneTime)}&recurringCost=${Math.round(r.adj.opex * 12)}&planningBasis=${r.isWorkloadMode ? "workload" : "spend"}`}
            style={{ ...disp, fontSize: 12, fontWeight: 700, padding: "9px 14px", borderRadius: 8, background: C.green, color: "#fff", textDecoration: "none", flexShrink: 0, whiteSpace: "nowrap" }}
          >
            Send to ROI Calculator
          </a>
        </div>

        <button onClick={requestReport}
          style={{ ...disp, width: "100%", fontWeight: 700, fontSize: 15, padding: "14px", borderRadius: 10,
            border: "none", cursor: "pointer", background: C.green, color: "#fff", marginBottom: 10 }}>
          Get the full report (PDF)
        </button>
        </div>)}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
