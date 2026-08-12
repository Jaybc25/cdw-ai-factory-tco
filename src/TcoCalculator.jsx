import { useState, useMemo } from "react";

/* CDW logo — temporary approval for draft product artifact only (not website publication) */
const CDW_LOGO = "data:image/png;base64,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";

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
  async set(key, value) {
    if (typeof window !== "undefined" && window.storage) return window.storage.set(key, value, true);
    localStorage.setItem(key, value); return { key };
  },
  async list(prefix) {
    if (typeof window !== "undefined" && window.storage) return window.storage.list(prefix, true);
    return { keys: Object.keys(localStorage).filter((k) => k.startsWith(prefix)).sort() };
  },
  async get(key) {
    if (typeof window !== "undefined" && window.storage) return window.storage.get(key, true);
    const v = localStorage.getItem(key); if (v === null) throw new Error("not found");
    return { key, value: v };
  },
};

/* ============ ENGINE (mirrors validated spreadsheet Engine tab; v2.3-lineage, audit-complete after 9 external rounds) ============ */
function run(inp, RC) {
  const blended =
    (inp.odShare * (RC.instOD + RC.nvaieOD) +
      (1 - inp.odShare) * (RC.instRes + RC.nvaieRes)) *
    (1 + RC.paasUplift);
  const computeSpend = inp.bill * inp.computeShare;
  const instHrs = blended > 0 ? computeSpend / blended : 0;
  const gpuHrs = inp.tier3Hrs > 0 ? inp.tier3Hrs : instHrs; // rates are per GPU-hr

  const tgt = SYS_CLASS[inp.ownSys];
  const genTrain = IDX.train[tgt] / IDX.train[inp.gpuClass];
  const genInfer = IDX.infer[tgt] / IDX.infer[inp.gpuClass];
  // v2.0: harmonic (GPU-hour-correct) blend — workload shares are hour shares, so the slower
  // factor consumes proportionally more replacement capacity (audit finding P0-2)
  const genPF = 1 / (inp.trainShare / genTrain + (1 - inp.trainShare) / genInfer);
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
  const oneTime =
    (isRetrofit ? inp.retrofit : 0) + inp.migration + inp.dualRun * inp.bill + exitEgress;

  // v2.0: dynamic fleet trajectory — systems, racks, capex additions and opex recomputed per year
  // as demand growth exhausts capacity (audit finding P0-1). Fleet never shrinks. Storage held static.
  const traj = (npfUsed) => {
    const rows = [];
    let prevSys = 0, prevRacks = 0;
    for (let y = 0; y < 5; y++) {
      const eff = (gpuHrs * Math.pow(1 + inp.growth, y)) / npfUsed;
      const base = gpuHrs > 0 ? Math.max(1, Math.ceil(eff / perSysHrs)) + nPlus : 0;
      const sys = Math.max(prevSys, base);
      const racks = Math.ceil(sys / S.perRack);
      const capexAdd =
        (y === 0 ? RC.cluster + storCapex : 0) +
        (sys - prevSys) * perSys +
        (racks - prevRacks) * S.rackCost;
      const opexMo0 = isEquinix
        ? sys * RC.equinixMo + storSup
        : (sys * RC.sysKw + totPB * RC.kwPerPB) * inp.powerRate +
          RC.netMo + (RC.setupRack * (racks + totPB * RC.racksPerPB)) / 36 +
          ((sys / RC.adminRatio) * RC.opFTE) / 12 + storSup;
      rows.push({ sys, racks, capexAdd, opexMo0, opexYr: 12 * opexMo0 * Math.pow(1 + RC.opsGrowth, y) });
      prevSys = sys; prevRacks = racks;
    }
    return rows;
  };
  const adjT = traj(npf);
  const flrT = traj(1);
  const sysAdj = adjT[0].sys;
  const sysFloor = flrT[0].sys;
  const prodSys = Math.max(1, sysAdj - nPlus); // productive systems: the N+1 spare is failover, not growth capacity (audit round 4)
  const headroom = sysAdj > 0 ? 1 - gpuHrs / npf / (prodSys * perSysHrs) : 0;

  // residual basis excludes professional services (no resale value — audit finding) and cluster/racks/one-time
  const residAt = (T, n) => inp.residPct * (T[n - 1].sys * (perSys - S.prof - S.sw) + storCapex); // hardware only: prof svcs and SW subscriptions have no resale value
  const adj = { capex: adjT[0].capexAdd, opex: adjT[0].opexMo0, resid: residAt(adjT, inp.horizon) };
  const flr = { capex: flrT[0].capexAdd, opex: flrT[0].opexMo0, resid: residAt(flrT, inp.horizon) };

  const cloudYears = [0, 1, 2, 3, 4].map((y) =>
    12 *
    (inp.bill * inp.computeShare * Math.pow(1 + inp.growth, y) +
      inp.bill * (1 - inp.computeShare) * Math.pow(1 + RC.opsGrowth, y))
  );
  const tot = (n) => {
    const cloud = cloudYears.slice(0, n).reduce((a, b) => a + b, 0);
    const onAdj = adjT.slice(0, n).reduce((a, r2) => a + r2.capexAdd + r2.opexYr, 0) + oneTime - residAt(adjT, n);
    const onFlr = flrT.slice(0, n).reduce((a, r2) => a + r2.capexAdd + r2.opexYr, 0) + oneTime - residAt(flrT, n);
    return { cloud, onAdj, onFlr, saveAdj: cloud - onAdj, saveFlr: cloud - onFlr };
  };
  const payback =
    inp.bill - adj.opex > 0 ? (adj.capex + oneTime) / (inp.bill - adj.opex) : null; // SECONDARY static metric
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
  return { blended, gpuHrs, genPF, npf, sysAdj, sysFloor, headroom, adj, flr, cloudStorage, storageBudget, oneTime, exitEgress, tot, payback, crossoverMo, exhaustYrs, perSysHrs, cap,
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

export default function App() {
  const [ov, setOv] = useState({});
  const [bill, setBill] = useState(105000);
  const [provider, setProvider] = useState("AWS");
  const [gpuClass, setGpuClass] = useState("H100");
  const [ownSys, setOwnSys] = useState("DGX B200");
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
    setView("report");
  }

  const defaults = defaultsFor(provider, gpuClass, ownSys);
  const rc = { ...defaults, ...ov };
  const editedCount = Object.keys(ov).length;
  const rateInfo = RATES[provider][gpuClass];

  // Auto mode: size PB so implied cloud storage+egress consumes the non-compute budget (25/75 fast/bulk split)
  const perPBCost = 0.25 * 1e6 * rc.fastGB + 0.75 * 1e6 * rc.bulkGB + 1e6 * egressPct * rc.egressGB;
  const autoPB = perPBCost > 0 ? Math.max(0, (bill * (1 - computeShare)) / perPBCost) : 0;
  const fastPB = storageAuto ? Math.round(autoPB * 0.25 * 100) / 100 : fastPBm;
  const bulkPB = storageAuto ? Math.round(autoPB * 0.75 * 100) / 100 : bulkPBm;
  const setFastPB = (v) => { setStorageAuto(false); setFastPBm(v); if (storageAuto) setBulkPBm(bulkPB); };
  const setBulkPB = (v) => { setStorageAuto(false); setBulkPBm(v); if (storageAuto) setFastPBm(fastPB); };
  const inputsObj = { bill, computeShare, odShare, gpuClass, ownSys, trainShare, util, fastPB, bulkPB, egressPct, growth, facility, powerRate, fNet, fSw, fNvaie, tier3Hrs, retrofit, migration, dualRun, redundancy, residPct, modelSize, quant, horizon };
  const r = useMemo(
    () => run(inputsObj, rc),
    [bill, computeShare, odShare, gpuClass, ownSys, trainShare, util, fastPB, bulkPB, egressPct, storageAuto, growth, facility, powerRate, fNet, fSw, fNvaie, tier3Hrs, retrofit, migration, dualRun, redundancy, residPct, modelSize, quant, horizon, provider, ov]
  );
  const t = r.tot(horizon);
  // Minimum viable spend: smallest monthly bill where on-prem beats cloud at the selected horizon, current settings (spend-based path)
  const minViable = useMemo(() => {
    for (let b = 20000; b <= 2000000; b *= 1.1) {
      const rr = run({ ...inputsObj, bill: Math.round(b), tier3Hrs: 0 }, rc);
      if (rr.tot(horizon).saveAdj > 0) return Math.round(b / 5000) * 5000;
    }
    return null;
  }, [gpuClass, ownSys, trainShare, util, fastPB, bulkPB, egressPct, growth, facility, powerRate, fNet, fSw, fNvaie, retrofit, migration, dualRun, redundancy, residPct, computeShare, odShare, provider, ov, horizon]);
  const tier = tier3Hrs > 0 ? "VALIDATED" : (bill !== 105000 || gpuClass !== "H100") ? "REFINED" : "DIRECTIONAL";
  const maxBar = Math.max(t.cloud, t.onAdj, t.onFlr, 1);
  const isSelf = facility !== "Equinix";

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.ink, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        input[type=range]{height:22px} button:focus-visible{outline:2px solid ${C.green};outline-offset:2px;box-shadow:0 0 0 5px rgba(255,255,255,.85)}
        input[type=number]::-webkit-inner-spin-button{opacity:1}
        @media print { .no-print{display:none!important} body{background:#fff} }`}</style>
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "18px 14px 60px" }}>

        <div style={{ borderBottom: `1px solid ${C.line}`, paddingBottom: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={CDW_LOGO} alt="CDW" style={{ height: 36, width: "auto", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.green, textTransform: "uppercase" }}>AI Factory Tools</div>
              <h1 style={{ ...disp, fontSize: 20, fontWeight: 700, margin: 0, color: C.ink }}>Cloud vs On-Prem TCO Calculator</h1>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 6, background: C.green, color: "#fff", whiteSpace: "nowrap" }}>PROTOTYPE v2.8</span>
          </div>
          <div style={{ fontSize: 13, color: C.sub, marginTop: 8 }}>What your current AIaaS spend buys you if you owned it instead.</div>
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
              <img src={CDW_LOGO} alt="CDW" style={{ height: 34, width: "auto" }} />
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
            <Row label={`Recommended build`} value={`${r.sysAdj} × ${ownSys}${redundancy ? " (incl. N+1)" : ""}`} sub={`${Math.round(r.headroom * 100)}% growth headroom · ${facility}`} />
            <Row label="Total capex + one-time transition" value={fmtM(r.adj.capex + r.oneTime)} sub={`incl. ${fmtM(r.oneTime)} migration, dual-run, and exit costs`} />
            <Row label="Ongoing operations" value={`${fmt(r.adj.opex)}/mo`} sub={facility === "Equinix" ? "Equinix colo bundle incl. managed services" : "power, facility, admin, storage support"} />
            <Row label="Simple payback" value={r.payback ? `${r.payback.toFixed(0)} months` : "—"} sub="capex + one-time vs. current monthly cloud bill" />
            <Row label="Residual value credit" value={`−${fmt(r.adj.resid)}`} sub={`${Math.round(residPct * 100)}% of systems + storage capex at horizon`} />
            {r.cap.fits && <Row label="Serving capacity (est.)" value={`~${r.cap.users.toLocaleString()} users · $${r.cap.perM.toFixed(2)}/1M tok`} sub={`${modelSize} @ ${quant} · rule-of-thumb estimate, not a sizing exercise`} />}
            <Row label="Your current consumption (reconstructed)" value={`${Math.round(r.gpuHrs).toLocaleString()} GPU-hrs/mo`} sub={tier3Hrs > 0 ? "from your invoice" : `from spend at ${provider} ${gpuClass} list rates (${RATES_ASOF})`} />
            <div style={{ fontSize: 11, color: C.sub, marginTop: 12 }}>
              Methodology: cash-flow TCO in nominal dollars (not accounting depreciation, not discounted NPV). Cloud spend normalized to GPU-hours at published list rates; on-prem fleet sized at {Math.round(util * 100)}% target utilization with MLPerf-derived generational performance factors ({r.npf.toFixed(2)}x net, shown alongside a zero-factor floor case). On-prem pricing per NVIDIA DGX TCO reference (Jul 2026). The on-prem fleet expands year by year when demand growth exhausts installed capacity (incremental systems, racks, power, admin, and residual all scale); storage is held static. Mixed training/inference workloads use a harmonic (GPU-hour-correct) blend of the generational factors. Residual value applies to hardware only — professional services and software subscriptions are excluded. Storage defaults to Auto — sized from the non-compute share of the stated bill (making Tier 1 a true two-input model); manual entries are reconciled against that share with a visible warning on mismatch. Crossover is computed from cumulative monthly cash flows (cloud compute grows at the demand rate, non-compute and on-prem opex at 4%/yr; capex charged when incurred; residual excluded until exit); static payback is shown as a secondary metric only. The N+1 spare is excluded from growth headroom — spare capacity is failover, not expansion room. The companion workbook is the auditable reference implementation of the core sizing and TCO formulas; this application extends it with dynamic fleet growth, five-provider rate routing and interface-level validation. Capacity and unit-economics figures are rule-of-thumb estimates (labeled EST) from model memory and throughput classes, not a sizing exercise. Not modeled: hardware refresh cadence beyond residual, NPV discounting, cloud commitment early-termination, hybrid burst. This is a directional analysis — a validated version requires your actual cloud invoice.
            </div>
            <div style={{ marginTop: 14 }}>
              <div style={{ ...mono, fontSize: 10, letterSpacing: 1.2, color: C.sub, marginBottom: 4 }}>APPENDIX — FULL INPUTS & OUTPUTS (for independent reproduction)</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 14px", fontSize: 11 }}>
                {[
                  ["Monthly cloud AI spend", `${fmt(bill)}/mo`],
                  ["Provider / rented GPU class", `${provider} / ${gpuClass} (${RATES[provider][gpuClass].conf})`],
                  ["On-prem target system", ownSys],
                  ["Training / inference mix", `${Math.round(trainShare * 100)}% / ${Math.round((1 - trainShare) * 100)}%`],
                  ["On-demand share", `${Math.round(odShare * 100)}%`],
                  ["Compute share of bill", `${Math.round(computeShare * 100)}%`],
                  ["Fast / bulk storage", `${fastPB.toFixed(2)} / ${bulkPB.toFixed(2)} PB (${storageAuto ? "auto from bill" : "manual"})`],
                  ["Egress", `${Math.round(egressPct * 100)}%/mo`],
                  ["Annual compute growth", `${Math.round(growth * 100)}%`],
                  ["Facility", facility],
                  ["Power rate", `$${powerRate}/kW-mo`],
                  ["Target utilization", `${Math.round(util * 100)}%`],
                  ["Factors net / sw / NVAIE", `${fNet.toFixed(2)}x / ${fSw.toFixed(2)}x / ${fNvaie.toFixed(2)}x`],
                  ["Generational / NPF", `${r.genPF.toFixed(2)}x / ${r.npf.toFixed(2)}x`],
                  ["Tier 3 GPU-hours", tier3Hrs > 0 ? tier3Hrs.toLocaleString() : "not provided"],
                  ["Migration / dual-run / retrofit", `${fmtM(migration)} / ${dualRun}mo / ${facility === "Self-hosted (retrofit)" ? fmtM(retrofit) : "n/a"}`],
                  ["Redundancy / residual", `${redundancy ? "N+1 on" : "off"} / ${Math.round(residPct * 100)}%`],
                  ["Reconstructed GPU-hours", `${Math.round(r.gpuHrs).toLocaleString()}/mo`],
                  ["Systems (adjusted / floor)", `${r.sysAdj} / ${r.sysFloor}`],
                  ["Fleet by year (adjusted)", r.fleetAdj.slice(0, horizon).join(" → ")],
                  ["Capex / one-time / residual credit", `${fmt(r.adj.capex)} / ${fmt(r.oneTime)} / −${fmt(r.adj.resid)}`],
                  ["On-prem opex", `${fmt(r.adj.opex)}/mo`],
                  [`Cloud vs on-prem (${horizon}yr)`, `${fmt(t.cloud)} vs ${fmt(t.onAdj)}`],
                  ["Savings (adjusted / floor)", `${fmt(t.saveAdj)} / ${fmt(t.saveFlr)}`],
                  ["Model / quantization (capacity est.)", `${modelSize} / ${quant}`],
                  ["Est. users / $ per 1M tokens", r.cap.fits ? `${r.cap.users.toLocaleString()} / $${r.cap.perM.toFixed(2)} (vs API $${r.cap.cloudPerM.toFixed(2)})` : "model does not fit fleet"],
                  ["Rate card overrides", editedCount > 0 ? Object.keys(ov).join(", ") : "none — all defaults"],
                  ["Spend/storage reconciliation", `${fmt(r.cloudStorage)}/mo implied vs ${fmt(r.storageBudget)}/mo non-compute budget — ${r.cloudStorage > r.storageBudget * 1.02 ? `OVERALLOCATED by ${fmt(r.cloudStorage - r.storageBudget)}` : "within tolerance"}`],
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
                {(t.cloud > 0 ? (t.saveAdj / t.cloud) * 100 : 0).toFixed(0)}% below cloud · floor case (no perf factors): <span style={{ ...mono, color: "#C9C9C9" }}>{fmtM(t.saveFlr)}</span>
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
            <Bar label={`Stay in cloud (${horizon}yr)`} value={t.cloud} max={maxBar} color={"#8A8A8A"} />
            <Bar label={`Own it — adjusted (${r.sysAdj} × ${ownSys}${redundancy ? " incl. N+1" : ""})`} value={t.onAdj} max={maxBar} color={"#CC0000"} />
            <Bar label={`Own it — floor case (${r.sysFloor} × ${ownSys}${redundancy ? " incl. N+1" : ""})`} value={t.onFlr} max={maxBar} color={"#C9C9C9"} />
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
          <Slider label="Monthly cloud AI spend" value={bill} min={20000} max={2000000} step={5000}
            onChange={setBill} display={fmtM(bill) + "/mo"} tip={TIPS.spend} />
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
            <span style={{ ...mono, fontSize: 9, letterSpacing: 1, color: storageAuto ? "#CC0000" : C.sub, border: `1px solid ${storageAuto ? "#CC0000" : C.line}`, borderRadius: 3, padding: "1px 6px" }}>
              {storageAuto ? "STORAGE: AUTO (scaled to bill)" : "STORAGE: MANUAL"}
            </span>
            {!storageAuto && (
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
          {!storageAuto && r.cloudStorage > r.storageBudget * 1.02 && (
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
          <Row label="Generational (from lookup)" value={`${r.genPF.toFixed(2)}x`}
            sub={`${gpuClass} → ${ownSys}, weighted by workload mix · ${EST_IDX.includes(SYS_CLASS[ownSys]) || EST_IDX.includes(gpuClass) ? "provisional (EST) pending NVIDIA-sourced factors" : "MLPerf-derived"}`} tip={TIPS.genSpeedup} />
          <Slider label="Reference-architecture network" value={fNet} min={1} max={2.5} step={0.05}
            onChange={setFNet} display={`${fNet.toFixed(2)}x`} tip={TIPS.network} />
          <Slider label="AI Factory software (Run:ai / Mission Control)" value={fSw} min={1} max={3} step={0.05}
            onChange={setFSw} display={`${fSw.toFixed(2)}x`} tip={TIPS.runai} />
          <Slider label="NVAIE / NIMs" value={fNvaie} min={1} max={5} step={0.05}
            onChange={setFNvaie} display={`${fNvaie.toFixed(2)}x`} tip={TIPS.nvaie} />
          <Row label="Net Performance Factor" value={`${r.npf.toFixed(2)}x`} sub="Your cloud GPU-hours ÷ NPF = on-prem hours needed" />
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

        <button onClick={() => setView("gate")}
          style={{ ...disp, width: "100%", fontWeight: 700, fontSize: 15, padding: "14px", borderRadius: 10,
            border: "none", cursor: "pointer", background: C.green, color: "#fff", marginBottom: 10 }}>
          Get the full report (PDF)
        </button>
        </div>)}
      </div>
    </div>
  );
}
