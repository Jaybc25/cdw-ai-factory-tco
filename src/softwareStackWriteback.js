import {
  PHASE2_DERIVATION,
  PHASE2_SOURCE,
  PHASE2_TCO_TREATMENT,
  createPhase2Override,
  fingerprintInputs,
  makePhase2TcoTreatment,
  makeProvenance,
} from "./phase2Contract.js";
import { makeFleetIdentity } from "./phase2Fleet.js";
import { LICENSE_MODE, SOFTWARE_TCO_TREATMENT, validateSoftwareStackInputs } from "./softwareStackEngine.js";

function normalizePriceSource(source) {
  return Object.values(PHASE2_SOURCE).includes(source) ? source : PHASE2_SOURCE.EST;
}

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
    priceSource: normalizePriceSource(row.priceSource),
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

function softwareOverrideTreatment() {
  return makePhase2TcoTreatment({
    mode: PHASE2_TCO_TREATMENT.ADDITIVE,
    phase1LineFamily: null,
    note: "Only software components explicitly classified as additive after Phase 1 overlap review contribute to this override. Components classified as included in Phase 1 are excluded; review-required components block the bundle before overrides are created.",
  });
}

function contributingRows(result) {
  return result.rows.filter((row) => row.tcoTreatment === SOFTWARE_TCO_TREATMENT.ADDITIVE && Number(row.total) > 0);
}

function aggregateSoftwareProvenance(result) {
  const sources = [...new Set(contributingRows(result).map((row) => normalizePriceSource(row.priceSource)))].sort();
  if (sources.length === 1) {
    return { source: sources[0], sources, mixed: false };
  }
  // The shared Phase 2 provenance contract intentionally has no MIXED enum.
  // For a composite total, fail conservatively to EST while retaining the exact
  // component-source list in the label/requirements instead of falsely claiming
  // the total is wholly QUOTE, CUSTOMER, or LISTED sourced.
  return { source: PHASE2_SOURCE.EST, sources, mixed: sources.length > 1 };
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
  const tcoTreatment = softwareOverrideTreatment();
  const aggregateProvenance = aggregateSoftwareProvenance(result);
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
      source: aggregateProvenance.source,
      derivation: PHASE2_DERIVATION.CALCULATED,
      label: aggregateProvenance.mixed
        ? `Itemized Year ${year.year} incremental software total after Phase 1 overlap treatment; contributing component sources are mixed (${aggregateProvenance.sources.join(", ")}), represented conservatively as EST at the aggregate override while row-level provenance is retained`
        : `Itemized Year ${year.year} incremental software total after Phase 1 overlap treatment; contributing source ${aggregateProvenance.source}`,
    }),
    dependencies,
    referenceValue: null,
    tcoTreatment,
  })) : [];

  const rows = result.rows.map((row) => ({
    ...normalizedComponent(row),
    yearly: row.yearly,
    total: row.total,
    warnings: row.warnings,
    provenance: {
      source: normalizePriceSource(row.priceSource),
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
    costNote = `Software economics are resolved. Components marked included in Phase 1 are retained in the stack record but excluded from incremental Phase 2 TCO write-back: ${overlapSummary.includedInPhase1Components.join(", ")}. Remaining overrides are explicitly additive after that overlap treatment.`;
  } else {
    costNote = "Software economics are resolved. All staged software overrides are explicitly additive because each contributing component has been classified as incremental to Phase 1.";
  }

  return {
    schemaVersion: 3,
    sourceTool: "software-stack",
    acceptedAt: new Date().toISOString(),
    fingerprint,
    fleet,
    costResolved,
    pricingResolved,
    phase1OverlapResolved: overlapResolved,
    costStatus: costResolved ? aggregateProvenance.source : "UNRESOLVED",
    aggregatePricingSources: aggregateProvenance.sources,
    aggregatePricingMixed: aggregateProvenance.mixed,
    unresolvedCommercialComponents: unresolvedCommercial.map((row) => row.name),
    unresolvedPhase1OverlapComponents: unresolvedOverlap.map((row) => row.name),
    overlapSummary,
    tcoTreatment,
    overrides: yearlyOverrides,
    requirements: {
      horizonYears: result.horizonYears,
      annualEscalationPct: result.annualEscalationPct,
      rows,
      yearlyTotals: result.yearlyTotals,
      tcoEligibleYearlyTotals,
      totals: result.totals,
      overlapSummary,
      aggregatePricingSources: aggregateProvenance.sources,
      aggregatePricingMixed: aggregateProvenance.mixed,
      tcoTreatment,
      validationWarnings: validation.warnings,
      modelWarnings: result.warnings,
      costNote,
    },
  };
}
