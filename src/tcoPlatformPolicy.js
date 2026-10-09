// Platform-aware TCO infrastructure policy seam.
//
// This module intentionally does NOT change current production economics yet.
// It records the existing DGX-shaped infrastructure assumptions as an explicit,
// auditable policy so future platforms (notably RTX PRO 6000 Server Edition)
// can carry different management/control-plane, fabric, rack, services, and
// administration assumptions without silently inheriting DGX defaults.
//
// Source = where the number came from.
// Derivation = how the tool uses/derives it.
// Current values below mirror the production BASE_RC values in TcoCalculator.

export const TCO_PLATFORM_POLICY_VERSION = "2026-10-08.1";

export const LEGACY_DGX_8_GPU_POLICY = Object.freeze({
  id: "legacy-dgx-8gpu",
  appliesTo: "Current 8-GPU DGX planning basis",
  status: "CURRENT_BASELINE",
  source: "Existing validated TCO planning basis",
  derivation: "DIRECT_POLICY",
  values: Object.freeze({
    cluster: 600000,
    fabricC: 54323,
    fabricS: 23443,
    fabricM: 14227,
    profSvcs: 25000,
    adminRatio: 10,
    netMo: 3000,
    setupRack: 2000,
  }),
  notes: Object.freeze({
    cluster: "Fixed shared management/control-plane planning allowance. PR #200 now discloses that 1-3 DGX deployments may require materially less shared infrastructure.",
    fabric: "Existing per-system compute/storage/management fabric planning allowances retained unchanged for DGX baseline parity.",
    services: "Existing professional-services planning allowance retained unchanged for DGX baseline parity.",
    admin: "Existing systems-per-FTE planning ratio retained unchanged for DGX baseline parity.",
  }),
});

export const LEGACY_RACK_SCALE_POLICY = Object.freeze({
  id: "legacy-rack-scale",
  appliesTo: "Current NVL72/rack-scale planning basis",
  status: "CURRENT_BASELINE_DIRECTIONAL",
  source: "Existing validated TCO planning basis plus rack-scale quote/review guardrails",
  derivation: "DIRECT_POLICY",
  values: LEGACY_DGX_8_GPU_POLICY.values,
  notes: Object.freeze({
    coverage: "Current rack-scale results remain directional and require architecture/quote review through tcoInfrastructureCoverage.js.",
  }),
});

export const RTX_PRO_SERVER_POLICY_PLACEHOLDER = Object.freeze({
  id: "rtx-pro-server-v1-pending",
  appliesTo: "RTX PRO 6000 Server Edition 2/4/8-GPU systems",
  status: "PENDING_EVIDENCE",
  source: "Right-Sized Private AI workstream #198",
  derivation: "UNRESOLVED",
  values: null,
  unresolved: Object.freeze([
    "management/control-plane allowance by deployment mode",
    "fabric/network allowance",
    "professional-services allowance",
    "rack/new-rack treatment",
    "administration/FTE treatment",
    "support and NVIDIA software treatment",
  ]),
  note: "Do not substitute zeroes for unresolved values. RTX policy becomes active only after its evidence gates are satisfied.",
});

export function classifyTcoPlatformPolicy(systemName, system) {
  const name = String(systemName || "");
  const gpus = Number(system?.gpus || 0);

  if (name.includes("RTX PRO 6000")) return "RTX_PRO_SERVER";
  if (gpus >= 72 || name.includes("NVL-72") || name.includes("NVL72")) return "RACK_SCALE";
  if (name.startsWith("DGX ") && gpus === 8) return "DGX_8_GPU";
  return "UNCLASSIFIED";
}

export function getTcoPlatformPolicy(systemName, system) {
  const platformClass = classifyTcoPlatformPolicy(systemName, system);
  if (platformClass === "DGX_8_GPU") return LEGACY_DGX_8_GPU_POLICY;
  if (platformClass === "RACK_SCALE") return LEGACY_RACK_SCALE_POLICY;
  if (platformClass === "RTX_PRO_SERVER") return RTX_PRO_SERVER_POLICY_PLACEHOLDER;
  return null;
}

export function assertResolvedTcoPlatformPolicy(policy) {
  if (!policy) throw new Error("No TCO platform policy is defined for this system class.");
  if (!policy.values) {
    throw new Error(`${policy.id} is not economically resolved; do not use it for client-facing TCO.`);
  }
  return policy;
}
