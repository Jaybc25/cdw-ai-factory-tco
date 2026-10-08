import { fingerprintInputs } from "./phase2Contract.js";

export const POD_BRIEF_STATUS = Object.freeze({
  CURRENT: "CURRENT",
  STALE: "STALE",
});

export function podBriefDependencyFingerprint({ storageBundle, fabricBundle, powerBundle, softwareBundle, phase1Snapshot }) {
  return fingerprintInputs({
    storage: storageBundle?.fingerprint || storageBundle?.acceptedAt || null,
    fabric: fabricBundle?.fingerprint || fabricBundle?.acceptedAt || null,
    power: powerBundle?.requirements?.acceptedAt || powerBundle?.acceptedAt || null,
    powerStorage: powerBundle?.requirements?.upstreamStorageFingerprint || null,
    powerFabric: powerBundle?.requirements?.upstreamFabricFingerprint || null,
    software: softwareBundle?.fingerprint || softwareBundle?.acceptedAt || null,
    phase1Tco: phase1Snapshot ? {
      updatedAt: phase1Snapshot.updated_at || null,
      horizonYears: phase1Snapshot.summary?.horizonYears ?? null,
      onPremCost: phase1Snapshot.summary?.onPremCost ?? null,
      cloudCost: phase1Snapshot.summary?.cloudCost ?? null,
    } : null,
  });
}

export function createAcceptedPodBriefRecord({ brief, dependencies, phase1Snapshot = null }) {
  return {
    schemaVersion: 1,
    acceptedAt: new Date().toISOString(),
    state: POD_BRIEF_STATUS.CURRENT,
    dependencyFingerprint: podBriefDependencyFingerprint({ ...dependencies, phase1Snapshot }),
    phase1SnapshotUpdatedAt: phase1Snapshot?.updated_at || null,
    brief,
    staleReason: null,
  };
}

export function evaluateAcceptedPodBrief(record, { dependencies, phase1Snapshot = null }) {
  if (!record) return null;
  const currentFingerprint = podBriefDependencyFingerprint({ ...dependencies, phase1Snapshot });
  if (currentFingerprint === record.dependencyFingerprint) {
    return { ...record, state: POD_BRIEF_STATUS.CURRENT, currentDependencyFingerprint: currentFingerprint, staleReason: null };
  }
  return {
    ...record,
    state: POD_BRIEF_STATUS.STALE,
    currentDependencyFingerprint: currentFingerprint,
    staleReason: "One or more accepted Phase 2 dependencies or the Phase 1 TCO snapshot changed after this Pod Brief was accepted.",
  };
}
