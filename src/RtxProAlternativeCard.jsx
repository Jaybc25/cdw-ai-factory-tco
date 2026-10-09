import React from "react";

export default function RtxProAlternativeCard({ rtxAlt }) {
  if (!rtxAlt) return null;

  if (!rtxAlt.eligible) {
    return (
      <div className="mb-4 rounded-xl p-4 border border-gray-200 bg-gray-50">
        <div className="text-xs font-bold uppercase tracking-wide text-gray-600 mb-1">Right-sized private AI · RTX PRO evaluation</div>
        <div className="text-xs font-semibold text-gray-700 mb-1">{rtxAlt.status}</div>
        <p className="text-xs text-gray-600">{rtxAlt.reason}</p>
      </div>
    );
  }

  const deployment = rtxAlt.deployment;
  const benchmark = rtxAlt.benchmark;
  const budget = rtxAlt.budget;
  const serverLabel = deployment.servers === 1 ? "server" : "servers";
  const budgetText = Number.isFinite(budget?.amount)
    ? `$${Math.round(budget.amount).toLocaleString("en-US")} configured server hardware · ${budget.confidence}`
    : "Configured system price requires quote / evidence validation";
  const tcoEligible = deployment.servers === 1;
  const tcoParams = new URLSearchParams({
    gpuCount: String(deployment.serverGpuCount),
    model: benchmark.modelId,
    precision: benchmark.precision,
    source: "gpu-sizing",
  });

  return (
    <div className="mb-4 rounded-xl p-4 bg-blue-50 border border-blue-200">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="text-xs font-bold uppercase tracking-wide text-blue-800">Right-sized private AI · RTX PRO production alternative</div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">EVIDENCE-GATED</span>
      </div>
      <div className="text-lg font-bold text-blue-950 mb-1">
        {deployment.totalDeployedGpus} × NVIDIA RTX PRO 6000 Blackwell Server Edition
      </div>
      <p className="text-xs text-blue-900 mb-2">
        {rtxAlt.replicas} independent serving {rtxAlt.replicas === 1 ? "replica" : "replicas"} rounded to {deployment.servers} × {deployment.serverGpuCount}-GPU {serverLabel}. The model fits the autonomous single-GPU memory gate, so this path does not require PCIe model splitting.
      </p>
      <div className="text-xs text-blue-900 mb-1"><strong>Direct benchmark:</strong> {benchmark.throughputTokPerSecPerGpu.toLocaleString()} tok/s/GPU · {benchmark.modelId} · {benchmark.precision} · {benchmark.inputTokens.toLocaleString()} input / {benchmark.outputTokens.toLocaleString()} output tokens.</div>
      <div className="text-xs text-blue-900 mb-1"><strong>Estimated peak utilization:</strong> {Math.round(rtxAlt.utilization * 100)}% of the deployed RTX replica capacity.</div>
      <div className="text-xs text-blue-900"><strong>Hardware budget status:</strong> {budgetText}. Support, NVIDIA software, shared infrastructure, storage, facilities, operations, and transition costs are not included here.</div>
      {tcoEligible ? (
        <a
          href={`/tco/rtx-pro?${tcoParams.toString()}`}
          className="inline-flex mt-3 text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
          style={{ background: "#CC0000" }}
        >
          Continue to RTX PRO TCO
        </a>
      ) : (
        <div className="mt-3 text-xs font-semibold text-blue-900">Multi-server RTX TCO remains project-specific; v1 TCO activation is limited to one physical RTX PRO server.</div>
      )}
    </div>
  );
}
