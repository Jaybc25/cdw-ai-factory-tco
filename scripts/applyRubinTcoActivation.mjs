import fs from "node:fs";

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, text) { fs.writeFileSync(path, text); }
function replaceOnce(text, from, to, label) {
  const first = text.indexOf(from);
  if (first < 0) throw new Error(`Missing anchor: ${label}`);
  if (text.indexOf(from, first + from.length) >= 0) throw new Error(`Non-unique anchor: ${label}`);
  return text.slice(0, first) + to + text.slice(first + from.length);
}

// ---- Shared pricing registry: expose only the derived Phase 1 Rubin objects. ----
{
  const path = "src/pricingRegistry.js";
  let s = read(path);
  s = replaceOnce(
    s,
    "// Commercial/customer-facing eligibility for GPUaaS providers.",
    "import { RUBIN_PHASE1_TCO_SYSTEMS } from \"./rubinTcoActivationRegistry.js\";\n\n// Commercial/customer-facing eligibility for GPUaaS providers.",
    "pricing Rubin import"
  );
  s = replaceOnce(s, "export const ONPREM_SYSTEMS = {", "const CURRENT_ONPREM_SYSTEMS = {", "pricing current registry rename");
  const marker = "\n};\n\nexport const GPU_SIZING_SYSTEM_MAP = {";
  const registryStart = s.indexOf("const CURRENT_ONPREM_SYSTEMS = {");
  const markerAt = s.indexOf(marker, registryStart);
  if (markerAt < 0) throw new Error("Missing ONPREM_SYSTEMS closing anchor");
  s = s.slice(0, markerAt + 3) +
    "\n\n// Rubin entries are derived from current commercial evidence plus explicitly\n// labeled Phase 1 planning assumptions. Do not duplicate their numbers here.\nexport const ONPREM_SYSTEMS = Object.freeze({\n  ...CURRENT_ONPREM_SYSTEMS,\n  ...RUBIN_PHASE1_TCO_SYSTEMS,\n});" +
    s.slice(markerAt + 3);
  write(path, s);
}

// ---- GPU Sizing: training/memory Rubin recommendations may now hand off to TCO. ----
{
  const path = "src/GpuSizingCalculator.jsx";
  let s = read(path);
  s = replaceOnce(
    s,
    "  B300: \"DGX B300\",\n};",
    "  B300: \"DGX B300\",\n  \"Rubin NVL8\": \"DGX Rubin NVL8\",\n  \"Vera Rubin NVL72\": \"DGX Vera Rubin NVL72\",\n};",
    "GPU Sizing Rubin TCO mappings"
  );
  write(path, s);
}

// ---- TCO: activate ownership economics while preserving Rubin inference gates. ----
{
  const path = "src/TcoCalculator.jsx";
  let s = read(path);
  s = replaceOnce(
    s,
    "import { CLOUD_GPU_RATES as RATES, ONPREM_SYSTEMS as SYSTEMS } from \"./pricingRegistry.js\";",
    "import { CLOUD_GPU_RATES as RATES, ONPREM_SYSTEMS as SYSTEMS } from \"./pricingRegistry.js\";\nimport { isRubinPhase1TcoSystem } from \"./rubinTcoActivationRegistry.js\";",
    "TCO Rubin import"
  );
  s = replaceOnce(
    s,
    "const SYS_CLASS = { \"DGX H200\": \"H200\", \"DGX B200\": \"B200-class\", \"DGX B300\": \"B300\", \"DGX GB200 NVL-72\": \"GB200\", \"DGX GB300 NVL-72\": \"GB300\" };",
    "const SYS_CLASS = { \"DGX H200\": \"H200\", \"DGX B200\": \"B200-class\", \"DGX B300\": \"B300\", \"DGX GB200 NVL-72\": \"GB200\", \"DGX GB300 NVL-72\": \"GB300\", \"DGX Rubin NVL8\": \"Rubin NVL8\", \"DGX Vera Rubin NVL72\": \"Vera Rubin NVL72\" };",
    "TCO Rubin class identities"
  );
  s = replaceOnce(
    s,
    "  return { ...BASE_RC, instOD: +r.od.toFixed(2), instRes: r.res ?? +(r.od * RES_MULT).toFixed(2),\n    perSysCost: S.perSys, sysKw: S.kW };",
    "  return { ...BASE_RC, instOD: +r.od.toFixed(2), instRes: r.res ?? +(r.od * RES_MULT).toFixed(2),\n    perSysCost: S.perSys, sysKw: S.kW, setupRack: S.rackPlanningBasis ? 0 : BASE_RC.setupRack };",
    "Rubin logical-rack setup suppression"
  );
  s = replaceOnce(
    s,
    "function computeGenPF(ownSys, gpuClass, trainShare) {\n  const tgt = SYS_CLASS[ownSys];",
    "function computeGenPF(ownSys, gpuClass, trainShare) {\n  // Rubin has no qualifying absolute inference throughput anchor yet. Phase 1\n  // economics therefore receive zero generational performance credit rather\n  // than manufacturing a factor from peak FLOPS or relative marketing claims.\n  if (isRubinPhase1TcoSystem(ownSys)) return 1;\n  const tgt = SYS_CLASS[ownSys];",
    "Rubin genPF gate"
  );
  s = replaceOnce(
    s,
    "function run(inp, RC) {\n  const isWorkloadMode = inp.mode === \"workload\" && !!inp.gpuSizingCount;",
    "function run(inp, RC) {\n  const isWorkloadMode = inp.mode === \"workload\" && !!inp.gpuSizingCount;\n  const isRubinPhase1 = isRubinPhase1TcoSystem(inp.ownSys);",
    "Rubin run flag"
  );
  s = replaceOnce(
    s,
    "  const npf = genPF * inp.fNet * inp.fSw * inp.fNvaie;",
    "  // Keep Rubin deliberately conservative until inference evidence qualifies:\n  // no generational, network, scheduling, or inference-stack performance credit.\n  const npf = isRubinPhase1 ? 1 : genPF * inp.fNet * inp.fSw * inp.fNvaie;",
    "Rubin NPF gate"
  );

  const capFrom = `  // v1.9 capacity & unit economics (rule-of-thumb, EST) — based on the year-0 fleet\n  const q = QUANT[inp.quant];\n  const modelB = inp.modelParamsB;\n  const gpusPerReplica = Math.max(1, Math.ceil((modelB * q.bytes * KV_OVERHEAD) / S.vram));\n  const totalGPUs = sysAdj * S.gpus;\n  const replicas = Math.floor(totalGPUs / gpusPerReplica);\n  const tokPerGPU = BASE_TOK * IDX.infer[SYS_CLASS[inp.ownSys]] * q.mult * (70 / modelB);\n  const fleetTokSec = replicas * gpusPerReplica * tokPerGPU * inp.util;\n  const monthlyTokM = (fleetTokSec * 2628000) / 1e6;\n  const onPremMonthly = (adj.capex + oneTime - adj.resid) / (inp.horizon * 12) + adj.opex;\n  const cap = {\n    gpusPerReplica, replicas, fits: replicas > 0,\n    users: Math.floor(fleetTokSec / TOK_PER_USER),\n    monthlyTokM,\n    perM: monthlyTokM > 0 ? onPremMonthly / monthlyTokM : null,\n    perUserOn: fleetTokSec >= TOK_PER_USER ? onPremMonthly / Math.floor(fleetTokSec / TOK_PER_USER) : null,\n    perUserCloud: ((TOK_PER_USER * 2628000) / 1e6) * RC.cloudTok,\n    cloudPerM: RC.cloudTok, onPremMonthly,\n  };`;
  const capTo = `  // v1.9 capacity & unit economics. Rubin remains intentionally unavailable\n  // here until a qualifying absolute inference-throughput benchmark exists.\n  let cap;\n  if (isRubinPhase1) {\n    cap = {\n      available: false, fits: false,\n      reason: \"Awaiting a qualifying absolute per-GPU Rubin inference throughput benchmark; no token/user economics are estimated from peak FLOPS or relative claims.\",\n    };\n  } else {\n    const q = QUANT[inp.quant];\n    const modelB = inp.modelParamsB;\n    const gpusPerReplica = Math.max(1, Math.ceil((modelB * q.bytes * KV_OVERHEAD) / S.vram));\n    const totalGPUs = sysAdj * S.gpus;\n    const replicas = Math.floor(totalGPUs / gpusPerReplica);\n    const tokPerGPU = BASE_TOK * IDX.infer[SYS_CLASS[inp.ownSys]] * q.mult * (70 / modelB);\n    const fleetTokSec = replicas * gpusPerReplica * tokPerGPU * inp.util;\n    const monthlyTokM = (fleetTokSec * 2628000) / 1e6;\n    const onPremMonthly = (adj.capex + oneTime - adj.resid) / (inp.horizon * 12) + adj.opex;\n    cap = {\n      available: true, gpusPerReplica, replicas, fits: replicas > 0,\n      users: Math.floor(fleetTokSec / TOK_PER_USER),\n      monthlyTokM,\n      perM: monthlyTokM > 0 ? onPremMonthly / monthlyTokM : null,\n      perUserOn: fleetTokSec >= TOK_PER_USER ? onPremMonthly / Math.floor(fleetTokSec / TOK_PER_USER) : null,\n      perUserCloud: ((TOK_PER_USER * 2628000) / 1e6) * RC.cloudTok,\n      cloudPerM: RC.cloudTok, onPremMonthly,\n    };\n  }`;
  s = replaceOnce(s, capFrom, capTo, "Rubin capacity gate");

  s = replaceOnce(
    s,
    "    isWorkloadMode, technicalSystems, monthlyCloudBaseline, sourceConversion, cloudYear1, cumulativeByYear,",
    "    isWorkloadMode, isRubinPhase1, technicalSystems, monthlyCloudBaseline, sourceConversion, cloudYear1, cumulativeByYear,",
    "Rubin result disclosure flag"
  );
  s = replaceOnce(
    s,
    "const GPU_SIZING_CLASS_TO_TCO_CLASS = { \"B200\": \"B200-class\", \"GB200 NVL72\": \"GB200\" };",
    "const GPU_SIZING_CLASS_TO_TCO_CLASS = { \"B200\": \"B200-class\", \"GB200 NVL72\": \"GB200\", \"Rubin NVL8\": \"Rubin NVL8\", \"Vera Rubin NVL72\": \"Vera Rubin NVL72\" };",
    "Rubin handoff class normalization"
  );
  s = replaceOnce(
    s,
    "  const [ownSys, setOwnSys] = useState(() => (arrivedFromGpuSizing ? getInitialOwnSys() : saved?.ownSys ?? getInitialOwnSys()));",
    "  const [ownSys, setOwnSys] = useState(() => (arrivedFromGpuSizing ? getInitialOwnSys() : saved?.ownSys ?? getInitialOwnSys()));\n  const isRubinPhase1 = isRubinPhase1TcoSystem(ownSys);",
    "Rubin UI flag"
  );
  s = replaceOnce(
    s,
    "  const [facility, setFacility] = useState(saved?.facility ?? \"Self-hosted (AI-ready)\");",
    "  const [facility, setFacility] = useState(saved?.facility ?? \"Self-hosted (AI-ready)\");\n  useEffect(() => {\n    // Existing Equinix bundle is calibrated to older systems and is not a\n    // defensible Rubin high-density colo quote. Do not silently reuse it.\n    if (isRubinPhase1 && facility === \"Equinix\") setFacility(\"Self-hosted (AI-ready)\");\n  }, [isRubinPhase1, facility]);",
    "Rubin Equinix guard"
  );
  s = replaceOnce(
    s,
    "          <Seg options={OWN_TARGETS} value={ownSys} onChange={setOwnSys} />",
    `          <Seg options={OWN_TARGETS} value={ownSys} onChange={setOwnSys} />\n          {isRubinPhase1 && (\n            <div style={{ fontSize: 11, color: C.ink, background: \"#FFF8E6\", border: \"1px solid #E8CE8A\", borderRadius: 8, padding: \"9px 11px\", marginTop: 8 }}>\n              <b>Rubin Phase 1 planning basis:</b> hardware pricing is current NVIDIA commercial evidence; fabric and installation/PS are editable EST planning allowances; optional NVIDIA AI Enterprise and Mission Control are excluded by default; high-density rack/liquid-cooling infrastructure remains quote/customer supplied. No Rubin performance credit or token-throughput estimate is applied until a qualifying absolute inference benchmark is available.{ownSys === \"DGX Vera Rubin NVL72\" ? \" NVIDIA commercial status is QUOTE ONLY with MOQ 2; this TCO does not automatically impose a $21M minimum.\" : \"\"}\n            </div>\n          )}`,
    "Rubin customer-facing planning disclosure"
  );
  s = replaceOnce(
    s,
    "          <Seg options={FACILITIES} value={facility} onChange={setFacility} />",
    "          <Seg options={isRubinPhase1 ? FACILITIES.filter((f) => f !== \"Equinix\") : FACILITIES} value={facility} onChange={setFacility} />\n          {isRubinPhase1 && <div style={{ fontSize: 11, color: C.sub, marginTop: 4 }}>Rubin colo/high-density facility economics require a customer or partner quote; the legacy Equinix bundle is intentionally unavailable for Rubin.</div>}",
    "Rubin facility guard UI"
  );
  s = replaceOnce(
    s,
    "          {r.isWorkloadMode && (\n            <div style={{ fontSize: 11, color: C.sub, background: \"#F5F5F5\", borderRadius: 6, padding: \"6px 9px\", marginBottom: 6 }}>",
    "          {isRubinPhase1 && (\n            <div style={{ fontSize: 11, color: C.ink, background: \"#FFF8E6\", borderRadius: 6, padding: \"6px 9px\", marginBottom: 6 }}>Rubin Phase 1 holds all performance credit at 1.00x. The controls below remain visible for methodology continuity but do not change Rubin economics until qualifying inference evidence is activated.</div>\n          )}\n          {r.isWorkloadMode && !isRubinPhase1 && (\n            <div style={{ fontSize: 11, color: C.sub, background: \"#F5F5F5\", borderRadius: 6, padding: \"6px 9px\", marginBottom: 6 }}>",
    "Rubin performance-factor disclosure"
  );
  s = replaceOnce(
    s,
    "            sub={`${gpuClass} → ${ownSys}, weighted by workload mix · ${EST_IDX.includes(SYS_CLASS[ownSys]) || EST_IDX.includes(gpuClass) ? \"provisional (EST) pending NVIDIA-sourced factors\" : \"MLPerf-derived\"} · benchmark-derived, directional -- not a universal physical conversion constant`} tip={TIPS.genSpeedup} />",
    "            sub={isRubinPhase1 ? `${gpuClass} → ${ownSys} · held at 1.00x; qualifying absolute Rubin inference throughput benchmark not yet available` : `${gpuClass} → ${ownSys}, weighted by workload mix · ${EST_IDX.includes(SYS_CLASS[ownSys]) || EST_IDX.includes(gpuClass) ? \"provisional (EST) pending NVIDIA-sourced factors\" : \"MLPerf-derived\"} · benchmark-derived, directional -- not a universal physical conversion constant`} tip={TIPS.genSpeedup} />",
    "Rubin generational-factor label"
  );
  s = replaceOnce(
    s,
    "          {!r.cap.fits ? (",
    "          {r.cap.available === false ? (\n            <div style={{ fontSize: 12, color: C.ink, background: \"#FFF8E6\", borderRadius: 6, padding: \"8px 10px\", marginTop: 6 }}>\n              Rubin serving-capacity and token-cost estimates are unavailable pending a qualifying absolute per-GPU inference-throughput benchmark. Ownership TCO above remains available and assumes no Rubin performance advantage.\n            </div>\n          ) : !r.cap.fits ? (",
    "Rubin capacity UI disclosure"
  );
  s = replaceOnce(
    s,
    "          <div style={{ fontSize: 11, color: C.sub, marginBottom: 6 }}>\n            Cloud instance rates auto-fill from the {provider} × {gpuClass} list table (as of {RATES_ASOF}); on-prem defaults = NVIDIA DGX TCO tool (Jul 2026). Edits stick until reset, including across provider switches.\n          </div>",
    "          <div style={{ fontSize: 11, color: C.sub, marginBottom: 6 }}>\n            Cloud instance rates auto-fill from the {provider} × {gpuClass} list table (as of {RATES_ASOF}); {isRubinPhase1 ? \"Rubin on-prem defaults combine current NVIDIA commercial evidence with explicitly labeled Phase 1 EST/PROVISIONAL planning inputs\" : \"on-prem defaults = NVIDIA DGX TCO tool reference\"}. Edits stick until reset, including across provider switches.\n          </div>",
    "Rubin rate-card provenance"
  );
  s = replaceOnce(
    s,
    "          <div style={{ ...disp, fontSize: 12, fontWeight: 600, margin: \"10px 0 2px\", color: C.sub }}>ON-PREM HARDWARE · NVIDIA TCO tool capture, Aug 2026</div>",
    "          <div style={{ ...disp, fontSize: 12, fontWeight: 600, margin: \"10px 0 2px\", color: C.sub }}>ON-PREM HARDWARE · {isRubinPhase1 ? \"NVIDIA commercial evidence + Phase 1 planning assumptions\" : \"NVIDIA TCO reference\"}</div>",
    "Rubin rate-card header"
  );
  s = replaceOnce(
    s,
    "          <RateField k=\"perSysCost\" label={`${ownSys} loaded cost $ (system + SW + fabrics + svcs; excl. cluster & racks)`}",
    "          <RateField k=\"perSysCost\" label={isRubinPhase1 ? `${ownSys} loaded planning cost $ (hardware + EST fabric + EST install/PS; optional software & quoted high-density infrastructure excluded)` : `${ownSys} loaded cost $ (system + SW + fabrics + svcs; excl. cluster & racks)`}",
    "Rubin loaded-cost label"
  );
  s = replaceOnce(
    s,
    "          <RateField k=\"sysKw\" label={`Power kW per ${ownSys} (avg load)`}",
    "          <RateField k=\"sysKw\" label={isRubinPhase1 ? `Phase 1 planning power kW per ${ownSys}${SYSTEMS[ownSys].powerConfidence ? ` (${SYSTEMS[ownSys].powerConfidence})` : \"\"}` : `Power kW per ${ownSys} (avg load)`}",
    "Rubin power label"
  );
  s = replaceOnce(
    s,
    "            {r.cap.fits && <Row label=\"Serving capacity (est.)\"",
    "            {r.cap.available !== false && r.cap.fits && <Row label=\"Serving capacity (est.)\"",
    "Rubin report serving gate"
  );
  s = replaceOnce(
    s,
    '"model does not fit fleet"',
    'r.cap.available === false ? "unavailable — Rubin inference benchmark pending" : "model does not fit fleet"',
    "Rubin appendix serving disclosure"
  );
  s = replaceOnce(
    s,
    "            {SYS_CLASS[ownSys] === gpuClass ? (",
    "            {isRubinPhase1 ? (\n              <div style={{ fontSize: 11, color: C.sub, marginBottom: 10, background: \"#FFF8E6\", borderRadius: 6, padding: \"8px 10px\" }}><b>Rubin performance evidence gate:</b> generational conversion factor is deliberately held at 1.00×. No absolute Rubin per-GPU inference throughput benchmark has qualified yet, so the TCO gives Rubin no performance credit.</div>\n            ) : SYS_CLASS[ownSys] === gpuClass ? (",
    "Rubin audit generational disclosure"
  );
  s = s.replace(
    "converted into rented {gpuClass} hours using ONLY the hardware generational capability factor ({r.genPF.toFixed(2)}x, benchmark-derived from MLPerf-class throughput ratios for {ownSys} vs {gpuClass} -- directional and workload-normalized, not a universal physical conversion constant).",
    "converted into rented {gpuClass} hours using ONLY the hardware generational capability factor ({r.genPF.toFixed(2)}x, {isRubinPhase1 ? \"held at 1.00x with no Rubin performance credit because absolute inference throughput is not yet verified\" : `benchmark-derived from MLPerf-class throughput ratios for ${ownSys} vs ${gpuClass} -- directional and workload-normalized, not a universal physical conversion constant`})."
  );
  s = s.replace(
    "with MLPerf-derived generational performance factors ({r.npf.toFixed(2)}x net, shown alongside a zero-factor floor case).",
    "with a net performance factor of {r.npf.toFixed(2)}x. Rubin Phase 1 scenarios intentionally hold this at 1.00x until qualifying inference evidence is available; non-Rubin scenarios use the existing MLPerf-derived factor model."
  );
  write(path, s);
}

console.log("Rubin TCO customer activation codemod applied successfully.");
