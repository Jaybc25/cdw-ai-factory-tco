export const SOFTWARE_STACK_COMPONENTS = Object.freeze({
  orchestration: {
    label: "Cluster orchestration / scheduling",
    examples: ["Kubernetes", "Slurm", "Run:ai", "Base Command Manager"],
    defaultUnit: "GPU",
    notes: "Select the operating model and enter quoted or planning license economics. Open-source options may have $0 license but not $0 operating cost.",
  },
  platform: {
    label: "AI platform / enterprise software",
    examples: ["NVIDIA AI Enterprise", "NVIDIA NIM / Blueprints entitlements", "OEM AI platform bundles"],
    defaultUnit: "GPU",
    notes: "Commercial entitlements vary by product, term, support level, and agreement. Use customer quote/price book when available.",
  },
  mlops: {
    label: "MLOps / model operations",
    examples: ["MLflow", "Kubeflow", "Weights & Biases", "Databricks integrations"],
    defaultUnit: "node",
    notes: "May be open-source, SaaS, or enterprise subscription. Keep license and operating/admin effort separate.",
  },
  observability: {
    label: "Monitoring / observability",
    examples: ["Prometheus/Grafana", "DCGM", "OEM monitoring", "enterprise observability"],
    defaultUnit: "node",
    notes: "License can be $0 while operating cost remains non-zero. Commercial observability often prices by node, host, metric, or ingestion.",
  },
  security: {
    label: "Security / governance integration",
    examples: ["secrets", "policy", "container security", "SIEM integration"],
    defaultUnit: "node",
    notes: "This planner captures software economics only; it does not design security architecture or governance controls.",
  },
});

export const LICENSE_MODE = Object.freeze({
  COMMERCIAL: "commercial",
  OPEN_SOURCE: "open-source",
  INCLUDED: "included",
  NONE: "none",
});

function n(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function calculateSoftwareStack(inputs) {
  const horizonYears = Math.max(1, Math.min(7, Math.round(n(inputs.horizonYears, 3))));
  const annualEscalationPct = Math.max(-100, n(inputs.annualEscalationPct));
  const components = Array.isArray(inputs.components) ? inputs.components : [];

  const rows = components.map((component, index) => {
    const mode = Object.values(LICENSE_MODE).includes(component.mode) ? component.mode : LICENSE_MODE.NONE;
    const quantity = Math.max(0, n(component.quantity));
    const annualUnitPrice = Math.max(0, n(component.annualUnitPrice));
    const oneTimeCost = Math.max(0, n(component.oneTimeCost));
    const annualOpsCost = Math.max(0, n(component.annualOpsCost));
    const supportPct = Math.max(0, n(component.supportPct));
    const priceSource = component.priceSource || "EST";

    const baseAnnualLicense = mode === LICENSE_MODE.COMMERCIAL ? quantity * annualUnitPrice : 0;
    const baseAnnualSupport = baseAnnualLicense * (supportPct / 100);
    const yearly = [];
    for (let year = 1; year <= horizonYears; year += 1) {
      const escalationFactor = Math.pow(1 + annualEscalationPct / 100, year - 1);
      const license = baseAnnualLicense * escalationFactor;
      const support = baseAnnualSupport * escalationFactor;
      const operations = annualOpsCost * escalationFactor;
      const implementation = year === 1 ? oneTimeCost : 0;
      yearly.push({ year, license, support, operations, implementation, total: license + support + operations + implementation });
    }

    const total = yearly.reduce((sum, y) => sum + y.total, 0);
    const annualRecurringYear1 = yearly[0]?.license + yearly[0]?.support + yearly[0]?.operations || 0;
    const warnings = [];
    if (mode === LICENSE_MODE.OPEN_SOURCE && annualOpsCost === 0) warnings.push("Open-source selected with $0 operating/admin cost; verify that support, administration, upgrades, and incident response are covered elsewhere.");
    if (mode === LICENSE_MODE.COMMERCIAL && annualUnitPrice === 0) warnings.push("Commercial software selected with $0 unit price; enter a quote/planning price or treat the value as unresolved.");
    if (mode === LICENSE_MODE.INCLUDED && oneTimeCost === 0 && annualOpsCost === 0) warnings.push("Included/bundled software may still carry implementation or operating effort even when no separate license is charged.");

    return {
      id: component.id || `component-${index + 1}`,
      category: component.category || "platform",
      name: component.name || "Unnamed component",
      mode,
      unit: component.unit || "unit",
      quantity,
      annualUnitPrice,
      oneTimeCost,
      annualOpsCost,
      supportPct,
      entitlementNotes: component.entitlementNotes || "",
      priceSource,
      yearly,
      total,
      annualRecurringYear1,
      warnings,
    };
  });

  const yearlyTotals = Array.from({ length: horizonYears }, (_, index) => {
    const year = index + 1;
    const totals = rows.reduce((acc, row) => {
      const y = row.yearly[index];
      acc.license += y.license;
      acc.support += y.support;
      acc.operations += y.operations;
      acc.implementation += y.implementation;
      acc.total += y.total;
      return acc;
    }, { year, license: 0, support: 0, operations: 0, implementation: 0, total: 0 });
    return totals;
  });

  const totalLicense = yearlyTotals.reduce((sum, y) => sum + y.license, 0);
  const totalSupport = yearlyTotals.reduce((sum, y) => sum + y.support, 0);
  const totalOperations = yearlyTotals.reduce((sum, y) => sum + y.operations, 0);
  const totalImplementation = yearlyTotals.reduce((sum, y) => sum + y.implementation, 0);
  const totalCost = yearlyTotals.reduce((sum, y) => sum + y.total, 0);
  const annualRecurringYear1 = rows.reduce((sum, row) => sum + row.annualRecurringYear1, 0);

  const warnings = rows.flatMap((row) => row.warnings.map((warning) => `${row.name}: ${warning}`));
  if (!rows.length) warnings.push("No software components have been added.");

  return {
    horizonYears,
    annualEscalationPct,
    rows,
    yearlyTotals,
    totals: {
      license: totalLicense,
      support: totalSupport,
      operations: totalOperations,
      implementation: totalImplementation,
      total: totalCost,
      annualRecurringYear1,
    },
    warnings,
    methodology: {
      commercial: "quantity × annual unit price, escalated by year, plus optional support percentage",
      openSource: "$0 license is allowed, but operating/admin cost remains a separate explicit input",
      implementation: "one-time implementation cost is recognized in Year 1",
      horizon: `${horizonYears}-year planning horizon with ${annualEscalationPct}% annual escalation`,
    },
  };
}

export function validateSoftwareStackInputs(inputs) {
  const errors = [];
  const warnings = [];
  const horizonYears = n(inputs.horizonYears, 3);
  if (horizonYears < 1 || horizonYears > 7) errors.push("Planning horizon must be between 1 and 7 years.");
  const components = Array.isArray(inputs.components) ? inputs.components : [];
  components.forEach((component, index) => {
    const name = component.name || `Component ${index + 1}`;
    if (!Object.values(LICENSE_MODE).includes(component.mode)) errors.push(`${name}: invalid license mode.`);
    if (n(component.quantity) < 0) errors.push(`${name}: quantity cannot be negative.`);
    if (n(component.annualUnitPrice) < 0) errors.push(`${name}: unit price cannot be negative.`);
    if (n(component.oneTimeCost) < 0) errors.push(`${name}: one-time cost cannot be negative.`);
    if (n(component.annualOpsCost) < 0) errors.push(`${name}: annual operating cost cannot be negative.`);
    if (n(component.supportPct) < 0) errors.push(`${name}: support percentage cannot be negative.`);
    if (component.mode === LICENSE_MODE.COMMERCIAL && n(component.annualUnitPrice) === 0) warnings.push(`${name}: commercial price is unresolved.`);
  });
  return { valid: errors.length === 0, errors, warnings };
}
