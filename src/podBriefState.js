import { fingerprintInputs } from "./phase2Contract.js";
import { fleetFromPhase1Snapshot } from "./phase2Fleet.js";

export const POD_BRIEF_STATUS = Object.freeze({
  CURRENT: "CURRENT",
  STALE: "STALE",
});

export function podBriefDependencyFingerprint({ storageBundle, fabricBundle, powerBundle, softwareBundle, phase1Snapshot }) {
  return fingerprintInputs({
    canonicalFleet: fleetFromPhase1Snapshot(phase1Snapshot),
    storage: storageBundle?.fingerprint || storageBundle?.acceptedAt || null,
    storageFleet: storageBundle?.fleet || null,
    fabric: fabricBundle?.fingerprint || fabricBundle?.acceptedAt || null,
    fabricFleet: fabricBundle?.fleet || null,
    power: powerBundle?.requirements?.acceptedAt || powerBundle?.acceptedAt || null,
    powerFleet: powerBundle?.fleet || powerBundle?.requirements?.fleet || null,
    powerStorage: powerBundle?.requirements?.upstreamStorageFingerprint || null,
    powerFabric: powerBundle?.requirements?.upstreamNetworkFingerprint || null,
    software: softwareBundle?.fingerprint || softwareBundle?.acceptedAt || null,
    softwareFleet: softwareBundle?.fleet || null,
    phase1Tco: phase1Snapshot ? {
      updatedAt: phase1Snapshot.updated_at || null,
      horizonYears: phase1Snapshot.summary?.horizonYears ?? null,
      onPremCost: phase1Snapshot.summary?.onPremCost ?? null,
      cloudCost: phase1Snapshot.summary?.cloudCost ?? null,
      recommendedFleet: phase1Snapshot.summary?.recommendedFleet || phase1Snapshot.summary?.gpuSizingFleet || null,
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
    staleReason: "One or more accepted Phase 2 dependencies, fleet identities, or the Phase 1 TCO snapshot changed after this Pod Brief was accepted.",
  };
}
