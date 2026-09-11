export function cloudGpuUnitPriceFactor(annualTrendPercent, yearIndex) {
  const trendPercent = Number(annualTrendPercent);
  const year = Number(yearIndex);
  if (!Number.isFinite(trendPercent) || !Number.isFinite(year) || year <= 0) return 1;
  const trendRate = trendPercent / 100;
  return Math.pow(1 + trendRate, year);
}

export function trendCloudGpuCompute(baseMonthlyCompute, annualWorkloadGrowth, annualUnitPriceTrendPercent, yearIndex) {
  const base = Number(baseMonthlyCompute);
  if (!Number.isFinite(base)) return 0;
  const growth = Number.isFinite(Number(annualWorkloadGrowth)) ? Number(annualWorkloadGrowth) : 0;
  const year = Number.isFinite(Number(yearIndex)) ? Number(yearIndex) : 0;
  return base * Math.pow(1 + growth, Math.max(0, year)) * cloudGpuUnitPriceFactor(annualUnitPriceTrendPercent, year);
}
