import React from "react";
import { RTX_PRO_CLOUD_COMPARATOR, rtxProRegistryStaleness } from "./rtxProServerRegistry.js";

const RED = "#CC0000";

function hourly(value) {
  return Number(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  });
}

export default function RtxProCloudComparatorCard() {
  const row = RTX_PRO_CLOUD_COMPARATOR;
  const freshness = rtxProRegistryStaleness(row.asOf);
  const cpuHourly = row.minimumVcpu * row.cpuRatePerVcpuSecondUSD * 3600;
  const memoryHourly = row.minimumMemoryGiB * row.memoryRatePerGiBSecondUSD * 3600;

  return (
    <section className="max-w-4xl mx-auto px-6 pb-8 no-print" aria-label="Google Cloud RTX PRO reference">
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide" style={{ color: RED }}>Cloud reference floor</div>
            <h3 className="text-lg font-bold text-gray-900 mt-1">Google Cloud Run · RTX PRO 6000 Blackwell</h3>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{hourly(row.minimumInstanceRatePerHourUSD)}/hr</div>
            <div className="text-xs text-gray-500">minimum deployable instance floor</div>
          </div>
        </div>

        <p className="text-sm text-gray-700 mb-4">
          This is a public-list planning reference, not a direct cloud TCO or savings comparison. The floor includes the required GPU, {row.minimumVcpu} vCPU, and {row.minimumMemoryGiB} GiB memory. Networking, storage, other service charges, discounts, and actual runtime are excluded.
        </p>

        <div className="grid sm:grid-cols-3 gap-3 text-xs mb-4">
          <div className="rounded-lg border bg-white p-3">
            <div className="text-gray-500">RTX PRO GPU component</div>
            <div className="font-bold text-gray-900 mt-1">{hourly(row.gpuRatePerHourUSD)}/hr</div>
          </div>
          <div className="rounded-lg border bg-white p-3">
            <div className="text-gray-500">Required {row.minimumVcpu} vCPU</div>
            <div className="font-bold text-gray-900 mt-1">{hourly(cpuHourly)}/hr</div>
          </div>
          <div className="rounded-lg border bg-white p-3">
            <div className="text-gray-500">Required {row.minimumMemoryGiB} GiB memory</div>
            <div className="font-bold text-gray-900 mt-1">{hourly(memoryHourly)}/hr</div>
          </div>
        </div>

        <div className="text-xs text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
          <span><strong>Source:</strong> {row.priceProvenance} · {row.priceDerivation}</span>
          <span><strong>Verified:</strong> {row.asOf}</span>
          <span><strong>Freshness:</strong> {freshness.level.toUpperCase()}</span>
          <span><strong>Scale-to-zero:</strong> supported; actual spend is usage-dependent</span>
        </div>
      </div>
    </section>
  );
}
