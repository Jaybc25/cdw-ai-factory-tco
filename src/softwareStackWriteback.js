import {
  PHASE2_DERIVATION,
  PHASE2_SOURCE,
  createPhase2Override,
  fingerprintInputs,
  makeProvenance,
} from "./phase2Contract.js";
import { makeFleetIdentity } from "./phase2Fleet.js";
import { LICENSE_MODE, SOFTWARE_TCO_TREATMENT, validateSoftwareStackInputs } from "./softwareStackEngine.js";

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
    tcoTreatment: row.tcoTreatment || SOFTWARE_TCO_TREATMENT.REVIEW_REQUIRED,
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
  const unresolvedCommercial = result.rows.filter((row) => row.mode === LICENSE_MODE.COMMERCIAL && !(Number(row.annualUnitPrice) > 0));
  const unresolvedOverlap = result.rows.filter((row) => Number(row.total) > 0 && row.tcoTreatment === SOFTWARE_TCO_TREATMENT.REVIEW_REQUIRED);
  const pricingResolved = unresolvedCommercial.length === 0;
  const overlapResolved = unresolvedOverlap.length === 0;
  const costResolved = pricingResolved && overlapResolved;
  const dependencies = {
    softwareStackFingerprint: fingerprint,
    fleet,
    horizonYears: result.horizonYears,
    annualEscalationPct: result.annualEscalationPct,
    components: result.rows.map(normalizedComponent),
  };

  const tcoEligibleYearlyTotals = result.tcoEligibleYearlyTotals || result.yearlyTotals;
  const yearlyOverrides = costResolved ? tcoEligibleYearlyTotals.map((year) => createPhase2Override({
    id: `software.total.year-${year.year}`,
    target: `tco.software.year${year.year}.total`,
    value: Math.round(year.total),
    unit: "USD/year",
    sourceTool: "software-stack",
    provenance: makeProvenance({
      source: PHASE2_SOURCE.EST,
      derivation: PHASE2_DERIVATION.CALCULATED,
      label: `Itemized Year ${year.year} incremental software total after Phase 1 overlap treatment`,
    }),
    dependencies,
    referenceValue: null,
  })) : [];

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

  const overlapSummary = {
    additiveComponents: result.rows.filter((row) => row.tcoTreatment === SOFTWARE_TCO_TREATMENT.ADDITIVE).map((row) => row.name),
    includedInPhase1Components: result.rows.filter((row) => row.tcoTreatment === SOFTWARE_TCO_TREATMENT.INCLUDED_IN_PHASE1).map((row) => row.name),
    reviewRequiredComponents: unresolvedOverlap.map((row) => row.name),
    tcoEligibleTotal: Number(result.totals?.tcoEligibleTotal || 0),
    grossSoftwareTotal: Number(result.totals?.total || 0),
  };

  let costNote = "Software economics are eligible for Phase 2 TCO comparison from the accepted component assumptions.";
  if (!pricingResolved) {
    costNote = `Software requirement is accepted, but no annual TCO overrides are eligible until commercial pricing is supplied for: ${unresolvedCommercial.map((row) => row.name).join(", ")}.`;
  } else if (!overlapResolved) {
    costNote = `Software requirement is accepted, but no annual TCO overrides are eligible until Phase 1 overlap is resolved for: ${unresolvedOverlap.map((row) => row.name).join(", ")}.`;
  } else if (overlapSummary.includedInPhase1Components.length > 0) {
    costNote = `Software economics are resolved. Components marked included in Phase 1 are retained in the stack record but excluded from incremental Phase 2 TCO write-back: ${overlapSummary.includedInPhase1Components.join(", ")}.`;
  }

  return {
    schemaVersion: 2,
    sourceTool: "software-stack",
    acceptedAt: new Date().toISOString(),
    fingerprint,
    fleet,
    costResolved,
    pricingResolved,
    phase1OverlapResolved: overlapResolved,
    costStatus: costResolved ? "EST" : "UNRESOLVED",
    unresolvedCommercialComponents: unresolvedCommercial.map((row) => row.name),
    unresolvedPhase1OverlapComponents: unresolvedOverlap.map((row) => row.name),
    overlapSummary,
    overrides: yearlyOverrides,
    requirements: {
      horizonYears: result.horizonYears,
      annualEscalationPct: result.annualEscalationPct,
      rows,
      yearlyTotals: result.yearlyTotals,
      tcoEligibleYearlyTotals,
      totals: result.totals,
      overlapSummary,
      validationWarnings: validation.warnings,
      modelWarnings: result.warnings,
      costNote,
    },
  };
}
