import {
  PHASE2_DERIVATION,
  PHASE2_SOURCE,
  createPhase2Override,
  fingerprintInputs,
  makeProvenance,
} from "./phase2Contract.js";
import { makeFleetIdentity } from "./phase2Fleet.js";
import { LICENSE_MODE, validateSoftwareStackInputs } from "./softwareStackEngine.js";

function normalizedComponent(row) {
  return {
    id: row.id,
    category: row.category,
    name: row.name,
    mode: row.mode,
    unit: row.unit,
    quantity: row.quantity,
    annualUnitPrice: row.annualUnitPrice,
    supportPct: row.supportPct,
    annualOpsCost: row.annualOpsCost,
    oneTimeCost: row.oneTimeCost,
    entitlementNotes: row.entitlementNotes || "",
    priceSource: row.priceSource || PHASE2_SOURCE.EST,
  };
}

function softwareFleet(result) {
  const gpuQuantities = result.rows
    .filter((row) => String(row.unit || "").toLowerCase() === "gpu" && Number(row.quantity) > 0)
    .map((row) => Number(row.quantity));
  const unique = [...new Set(gpuQuantities)];
  return makeFleetIdentity({ totalGpus: unique.length === 1 ? unique[0] : null, source: "software-stack" });
}

export function softwareStackFingerprint(result) {
  const fleet = softwareFleet(result);
  return fingerprintInputs({
    fleet,
    horizonYears: result.horizonYears,
    annualEscalationPct: result.annualEscalationPct,
    components: result.rows.map(normalizedComponent),
  });
}

export function buildSoftwareStackWritebackBundle(result, inputs) {
  const validation = validateSoftwareStackInputs(inputs);
  if (!validation.valid) {
    throw new Error(`Cannot stage Software write-back: ${validation.errors.join(" ")}`);
  }

  const fleet = softwareFleet(result);
  const fingerprint = softwareStackFingerprint(result);
  const dependencies = {
    softwareStackFingerprint: fingerprint,
    fleet,
    horizonYears: result.horizonYears,
    annualEscalationPct: result.annualEscalationPct,
    components: result.rows.map(normalizedComponent),
  };

  const yearlyOverrides = result.yearlyTotals.map((year) => createPhase2Override({
    id: `software.total.year-${year.year}`,
    target: `tco.software.year${year.year}.total`,
    value: Math.round(year.total),
    unit: "USD/year",
    sourceTool: "software-stack",
    provenance: makeProvenance({
      source: PHASE2_SOURCE.EST,
      derivation: PHASE2_DERIVATION.CALCULATED,
      label: `Itemized Year ${year.year} software total from accepted component-level assumptions`,
    }),
    dependencies,
    referenceValue: null,
  }));

  const rows = result.rows.map((row) => ({
    ...normalizedComponent(row),
    yearly: row.yearly,
    total: row.total,
    warnings: row.warnings,
    provenance: {
      source: row.priceSource || PHASE2_SOURCE.EST,
      derivation: row.mode === LICENSE_MODE.COMMERCIAL ? PHASE2_DERIVATION.CALCULATED : PHASE2_DERIVATION.DIRECT,
    },
  }));

  return {
    schemaVersion: 1,
    sourceTool: "software-stack",
    acceptedAt: new Date().toISOString(),
    fingerprint,
    fleet,
    overrides: yearlyOverrides,
    requirements: {
      horizonYears: result.horizonYears,
      annualEscalationPct: result.annualEscalationPct,
      rows,
      yearlyTotals: result.yearlyTotals,
      totals: result.totals,
      validationWarnings: validation.warnings,
      modelWarnings: result.warnings,
    },
  };
}
