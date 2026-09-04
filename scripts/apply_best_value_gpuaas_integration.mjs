import fs from "node:fs";

const path = "src/TcoCalculator.jsx";
let source = fs.readFileSync(path, "utf8");

function insertOnce(marker, addition, label) {
  if (source.includes(addition.trim())) {
    console.log(`${label}: already present`);
    return;
  }
  const idx = source.indexOf(marker);
  if (idx < 0) throw new Error(`${label}: marker not found`);
  source = source.slice(0, idx + marker.length) + addition + source.slice(idx + marker.length);
  console.log(`${label}: inserted`);
}

function replaceOnce(marker, replacement, label) {
  if (source.includes(replacement.trim())) {
    console.log(`${label}: already present`);
    return;
  }
  const idx = source.indexOf(marker);
  if (idx < 0) throw new Error(`${label}: marker not found`);
  source = source.slice(0, idx) + replacement + source.slice(idx + marker.length);
  console.log(`${label}: replaced`);
}

insertOnce(
  'import { TCO_MODEL_OPTIONS, getDefaultModel, getModelById, formatModelContext } from "./modelRegistry.js";\n',
  'import BestValueGpuAasPanel from "./BestValueGpuAasPanel.jsx";\nimport { GPUAAS_CONFIDENCE, rankSameClassGpuAas, topGpuAasValues } from "./bestValueGpuaas.js";\n',
  "imports",
);

insertOnce(
  '  const [leadStatus, setLeadStatus] = useState("");\n',
  '  const [bestValueOpen, setBestValueOpen] = useState(false);\n',
  "panel state",
);

insertOnce(
  '  const t = r.tot(horizon);\n',
  `

  // Best-Value GPUaaS v1: Workload Requirement mode only. GPU Sizing owns
  // the technical requirement and rented GPU class; TCO only prices/ranks
  // providers for that exact class. Each candidate uses this same run()
  // engine plus its own provider/class override profile, so there is no
  // duplicate TCO calculation path and no cross-class substitution.
  const bestValueRows = bestValueOpen && r.isWorkloadMode
    ? topGpuAasValues(rankSameClassGpuAas({
        gpuClass,
        providers: PROVIDERS,
        rateRegistry: RATES,
        evaluateProvider: (candidateProvider, candidateRateInfo) => {
          const candidateDefaults = defaultsFor(candidateProvider, gpuClass, ownSys);
          const candidateProfileKey = \`\${candidateProvider}::\${gpuClass}\`;
          const candidateCloudOverride = cloudRateOverrides[candidateProfileKey] ?? {};
          const candidateRc = {
            ...candidateDefaults,
            ...ov,
            ...candidateCloudOverride,
            ...activeOnPremRateOverride,
          };
          const candidateRun = run(inputsObj, candidateRc);
          const candidateTotal = candidateRun.tot(horizon);

          // Confidence follows the rates actually used in the current billing
          // mix. A synthesized reserved rate is EST even when the provider's
          // on-demand row is LISTED; a saved customer-entered relevant rate is
          // surfaced as CUSTOM rather than inheriting registry provenance.
          const usesOnDemand = odShare > 0;
          const usesReserved = odShare < 1;
          const usesCustomRate =
            (usesOnDemand && candidateCloudOverride.instOD != null) ||
            (usesReserved && candidateCloudOverride.instRes != null);
          const usesDerivedReserved =
            usesReserved && candidateRateInfo.res == null && candidateCloudOverride.instRes == null;
          const confidence = usesCustomRate
            ? "CUSTOM"
            : usesDerivedReserved
              ? "EST"
              : (candidateRateInfo.conf ?? "EST");

          return {
            cloudTotal: candidateTotal.cloud,
            monthlyCloudBaseline: candidateRun.monthlyCloudBaseline,
            confidence,
            confidenceLabel: GPUAAS_CONFIDENCE[confidence] ?? confidence,
            rateNote: usesCustomRate
              ? "Uses a saved customer-entered rate for this provider / GPU class."
              : usesDerivedReserved
                ? "The selected billing mix uses a derived 1-year reserved rate (60% of on-demand); validate before customer use."
                : candidateRateInfo.note,
          };
        },
      }), 3)
    : [];
`,
  "ranking integration",
);

const providerBlock = `          <div style={{ fontSize: 11, color: C.green, background: C.greenSoft, borderRadius: 6, padding: "6px 9px" }}>
            {provider} {gpuClass}: $\{rateInfo.od.toFixed(2)}/GPU-hr on-demand · confidence: {rateInfo.conf}
            {rateInfo.conf === "QUOTE" ? " (estimate — verify with provider)" : ""}{rateInfo.note ? \` (\${rateInfo.note})\` : ""} · {rateInfo.res != null ? "reserved = NVIDIA TCO snapshot" : "reserved = 40% off list (est.)"} · rates as of {RATES_ASOF}. Override any rate below.
          </div>
`;

const providerReplacement = providerBlock + `          {r.isWorkloadMode && (
            <>
              <button
                type="button"
                onClick={() => setBestValueOpen((open) => !open)}
                aria-expanded={bestValueOpen}
                style={{ ...disp, width: "100%", marginTop: 8, fontSize: 12, fontWeight: 700, padding: "9px 12px", borderRadius: 8,
                  border: \`1px solid \${C.green}\`, cursor: "pointer", background: bestValueOpen ? C.greenSoft : "#FFFFFF", color: C.green }}
              >
                {bestValueOpen ? "Hide Best-Value GPUaaS" : "Find Best-Value GPUaaS"}
              </button>
              <div style={{ fontSize: 10.5, color: C.sub, marginTop: 4, lineHeight: 1.4 }}>
                Ranks providers for the current {gpuClass} workload using the same TCO engine and billing assumptions. v1 does not substitute another GPU class.
              </div>
              {bestValueOpen && (
                <BestValueGpuAasPanel
                  rows={bestValueRows}
                  gpuClass={gpuClass}
                  horizon={horizon}
                  activeProvider={provider}
                  onUseProvider={setProvider}
                  onClose={() => setBestValueOpen(false)}
                />
              )}
            </>
          )}
`;

replaceOnce(providerBlock, providerReplacement, "provider UI");

fs.writeFileSync(path, source);
console.log("Best-Value GPUaaS TCO integration patch complete");
