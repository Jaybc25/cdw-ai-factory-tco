export function cloudGpuUnitPriceFactor(annualTrend, yearIndex) {
  const trend = Number(annualTrend);
  const year = Number(yearIndex);
  if (!Number.isFinite(trend) || !Number.isFinite(year) || year <= 0) return 1;
  return Math.pow(1 + trend, year);
}

export function trendCloudGpuCompute(baseMonthlyCompute, annualWorkloadGrowth, annualUnitPriceTrend, yearIndex) {
  const base = Number(baseMonthlyCompute);
  if (!Number.isFinite(base)) return 0;
  const growth = Number.isFinite(Number(annualWorkloadGrowth)) ? Number(annualWorkloadGrowth) : 0;
  const year = Number.isFinite(Number(yearIndex)) ? Number(yearIndex) : 0;
  return base * Math.pow(1 + growth, Math.max(0, year)) * cloudGpuUnitPriceFactor(annualUnitPriceTrend, year);
}
