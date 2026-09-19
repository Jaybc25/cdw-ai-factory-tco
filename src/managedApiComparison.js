function positive(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function fraction(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : null;
}

function nonNegative(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}


export const REFERENCE_BLEND_PROFILE = Object.freeze({
  INPUT_70_OUTPUT_30: Object.freeze({
    id: "INPUT_70_OUTPUT_30",
    label: "70/30 input/output reference blend",
    inputShare: 0.70,
    outputShare: 0.30,
    cacheIncluded: false,
    basis: "Published reference convention. Cached-input discounts are excluded so the blend remains workload-agnostic.",
  }),
  INPUT_75_OUTPUT_25: Object.freeze({
    id: "INPUT_75_OUTPUT_25",
    label: "75/25 input/output reference blend",
    inputShare: 0.75,
    outputShare: 0.25,
    cacheIncluded: false,
    basis: "3:1 input/output reference convention. Cached-input discounts are excluded so the blend remains workload-agnostic.",
  }),
});

export function calculateReferenceBlendedRate({
  inputUsdPerMillion,
  outputUsdPerMillion,
  profile,
}) {
  const input = positive(inputUsdPerMillion);
  const output = positive(outputUsdPerMillion);
  const selected =
    typeof profile === "string"
      ? REFERENCE_BLEND_PROFILE[profile]
      : profile;

  const errors = [];
  if (!input) errors.push("inputUsdPerMillion must be > 0.");
  if (!output) errors.push("outputUsdPerMillion must be > 0.");
  if (!selected || !Number.isFinite(selected.inputShare) || !Number.isFinite(selected.outputShare)) {
    errors.push("A valid reference blend profile is required.");
  } else if (Math.abs(selected.inputShare + selected.outputShare - 1) > 1e-9) {
    errors.push("Reference blend input/output shares must sum to 1.");
  }
  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    profileId: selected.id || null,
    label: selected.label || null,
    inputShare: selected.inputShare,
    outputShare: selected.outputShare,
    blendedUsdPerMillion:
      input * selected.inputShare + output * selected.outputShare,
    cacheIncluded: false,
    basis: selected.basis || null,
  };
}

export function calculateManagedApiWorkloadEconomics({
  annualOutputTokens,
  horizonYears,
  demandGrowthRate = 0,
  inputTokensPerOutputToken,
  cachedInputShare = 0,
  rate,
}) {
  const outputY1 = positive(annualOutputTokens);
  const years = positive(horizonYears);
  const inputRatio = positive(inputTokensPerOutputToken);
  const cacheShare = fraction(cachedInputShare);
  const growth = nonNegative(demandGrowthRate);

  const errors = [];
  if (!outputY1) errors.push("annualOutputTokens must be > 0.");
  if (!years) errors.push("horizonYears must be > 0.");
  if (inputRatio == null) errors.push("inputTokensPerOutputToken must be > 0.");
  if (cacheShare == null) errors.push("cachedInputShare must be between 0 and 1.");
  if (growth == null) errors.push("demandGrowthRate must be >= 0.");
  if (!rate?.inputUsdPerMillion || !rate?.outputUsdPerMillion) {
    errors.push("A valid managed API rate record is required.");
  }
  if (cacheShare > 0 && rate?.cachedInputUsdPerMillion == null) {
    errors.push("cachedInputUsdPerMillion is required when cachedInputShare > 0.");
  }
  if (errors.length) return { ok: false, errors };

  const wholeYears = Math.max(1, Math.floor(years));
  const rows = Array.from({ length: wholeYears }, (_, index) => {
    const annualOutput = outputY1 * Math.pow(1 + growth, index);
    const annualInput = annualOutput * inputRatio;
    const cachedInput = annualInput * cacheShare;
    const uncachedInput = annualInput - cachedInput;

    const uncachedInputCost =
      (uncachedInput / 1_000_000) * rate.inputUsdPerMillion;
    const cachedInputCost =
      (cachedInput / 1_000_000) * (rate.cachedInputUsdPerMillion ?? rate.inputUsdPerMillion);
    const outputCost =
      (annualOutput / 1_000_000) * rate.outputUsdPerMillion;

    return {
      year: index + 1,
      annualOutputTokens: annualOutput,
      annualInputTokens: annualInput,
      uncachedInputTokens: uncachedInput,
      cachedInputTokens: cachedInput,
      uncachedInputCostUsd: uncachedInputCost,
      cachedInputCostUsd: cachedInputCost,
      outputCostUsd: outputCost,
      totalApiCostUsd: uncachedInputCost + cachedInputCost + outputCost,
    };
  });

  const horizonOutputTokens = rows.reduce((sum, row) => sum + row.annualOutputTokens, 0);
  const horizonInputTokens = rows.reduce((sum, row) => sum + row.annualInputTokens, 0);
  const horizonApiCostUsd = rows.reduce((sum, row) => sum + row.totalApiCostUsd, 0);

  return {
    ok: true,
    annualRows: rows,
    horizonYears: wholeYears,
    horizonOutputTokens,
    horizonInputTokens,
    horizonApiCostUsd,
    effectiveUsdPerMillionOutputTokens:
      (horizonApiCostUsd / horizonOutputTokens) * 1_000_000,
    assumptions: {
      annualOutputTokensYear1: outputY1,
      inputTokensPerOutputToken: inputRatio,
      cachedInputShare: cacheShare,
      demandGrowthRate: growth,
    },
    rate,
  };
}

export function comparePrivateAndManagedApi({
  privateCostPerMillionOutputTokens,
  managedApiEconomics,
}) {
  const privateCost = positive(privateCostPerMillionOutputTokens);
  if (!privateCost) {
    return { ok: false, errors: ["privateCostPerMillionOutputTokens must be > 0."] };
  }
  if (!managedApiEconomics?.ok) {
    return { ok: false, errors: managedApiEconomics?.errors || ["Valid managed API economics are required."] };
  }

  const apiCost = managedApiEconomics.effectiveUsdPerMillionOutputTokens;
  return {
    ok: true,
    privateUsdPerMillionOutputTokens: privateCost,
    managedApiUsdPerMillionOutputTokens: apiCost,
    managedApiMinusPrivateUsdPerMillionOutputTokens: apiCost - privateCost,
    managedApiToPrivateCostRatio: apiCost / privateCost,
  };
}
