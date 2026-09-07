// Source-verified technical model records that are intentionally NOT yet part
// of the customer-facing MODEL_REGISTRY. PR4 promoted the six runtime-ready
// tranche-1 models into MODEL_REGISTRY. The four remaining tranche candidates
// are methodology-blocked and therefore intentionally have no staged technical
// runtime record until their hybrid state/KV semantics are modeled faithfully.

export const STAGED_TECHNICAL_MODEL_REGISTRY = Object.freeze([]);

const STAGED_BY_ID = new Map();

export function getStagedTechnicalModelById(id) {
  return id ? STAGED_BY_ID.get(id) || null : null;
}
