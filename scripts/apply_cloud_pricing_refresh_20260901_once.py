#!/usr/bin/env python3
from pathlib import Path
import re


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


def regex_once(path, pattern, replacement, flags=0):
    p = Path(path)
    text = p.read_text(encoding="utf-8")
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{path}: expected one regex match, found {count}")
    p.write_text(updated, encoding="utf-8")


# TCO cloud rate registry: Cloud Pricing Refresh #1, 2026-09-01.
p = Path("src/TcoCalculator.jsx")
text = p.read_text(encoding="utf-8")
pattern = r"const RATES = \{\n.*?\n\};\n\n/\* Own-side registry"
new_rates = '''const RATES = {
  /*
   * Cloud Pricing Refresh #1, verified 2026-09-01.
   * Canonical basis by provider:
   * - AWS: Linux EC2 On-Demand, us-east-1, normalized by physical GPU count.
   * - Azure: Linux Pay-As-You-Go Retail Prices API, canonical US SKU/region, normalized by GPU count.
   * - GCP: Iowa/us-central1 accelerator-optimized On-Demand. When On-Demand is unavailable, an explicitly named public proxy is used.
   * - OCI: Oracle Pay As You Go GPU-per-hour Global Price List.
   * - CoreWeave: North America On-Demand node price normalized by GPU count.
   * Confidence tiers: LISTED > NODE-NORM > EST > QUOTE. QUOTE rows retain a numeric planning placeholder but must be verified commercially before customer-specific contracting decisions.
   */
  AWS: {
    A100:       { od:3.43, conf:"LISTED", note:"A100 80GB: p4de.24xlarge $27.44705/8, AWS EC2 public price catalog, us-east-1" },
    H100:       { od:6.88, conf:"LISTED", note:"p5.48xlarge $55.04/8, AWS EC2 public price catalog, us-east-1" },
    H200:       { od:7.91, conf:"LISTED", note:"p5en.48xlarge $63.296/8, AWS EC2 public price catalog, us-east-1; p5e had no standard On-Demand catalog row" },
    "B200-class":{ od:14.24, res:8.545, conf:"LISTED", note:"p6-b200.48xlarge $113.9328/8 On-Demand; reserved snapshot $68.36/8 GPUs" },
    B300:       { od:17.80, conf:"LISTED", note:"p6-b300.48xlarge $142.416/8, AWS EC2 public price catalog, us-east-1" },
    GB200:      { od:27.50, conf:"QUOTE", note:"No standard p6e-gb200 On-Demand catalog row found in 2026-09-01 AWS audit; retain planning placeholder pending quote" },
    GB300:      { od:30.00, conf:"QUOTE", note:"No canonical standard On-Demand GB300 catalog row verified 2026-09-01; retain planning placeholder pending quote" },
  },
  Azure: {
    A100:       { od:4.10, conf:"LISTED", note:"Standard_ND96amsr_A100_v4 Linux $32.77/8, Azure Retail Prices API, East US" },
    H100:       { od:12.29, conf:"LISTED", note:"Standard_ND96isr_H100_v5 Linux $98.32/8, Azure Retail Prices API, East US" },
    H200:       { od:10.60, conf:"LISTED", note:"Standard_ND96isr_H200_v5 Linux $84.80/8, Azure Retail Prices API, West US 3" },
    "B200-class":{ od:27.04, conf:"QUOTE", note:"No direct canonical Azure B200 retail SKU verified 2026-09-01; numeric placeholder retained, verify quote" },
    B300:       { od:15.00, conf:"QUOTE", note:"No canonical Azure B300 Pay-As-You-Go retail SKU verified 2026-09-01; retain planning placeholder pending quote" },
    GB200:      { od:27.04, conf:"LISTED", note:"Standard_ND128isr_NDR_GB200_v6 Linux $108.16/4, Azure Retail Prices API, East US/West US 3" },
    GB300:      { od:40.00, conf:"QUOTE", note:"No canonical Azure GB300 Pay-As-You-Go retail SKU verified 2026-09-01; retain planning placeholder pending quote" },
  },
  GCP: {
    A100:       { od:5.07, conf:"LISTED", note:"A100 80GB: a2-ultragpu-1g On-Demand $5.06879789, Iowa/us-central1" },
    H100:       { od:11.06, conf:"LISTED", note:"a3-highgpu-8g On-Demand $88.490000119/8, Iowa/us-central1" },
    H200:       { od:10.60, conf:"LISTED", note:"a3-ultragpu-8g On-Demand $84.806908493/8, Iowa/us-central1" },
    "B200-class":{ od:11.28, conf:"NODE-NORM", note:"Standard On-Demand is N/A; DWS Calendar Mode public proxy $90.22/8, Iowa/us-central1" },
    B300:       { od:15.00, conf:"QUOTE", note:"No canonical public GCP B300 On-Demand SKU verified 2026-09-01; retain planning placeholder pending quote" },
    GB200:      { od:27.50, conf:"QUOTE", note:"No canonical public GCP GB200 On-Demand SKU verified 2026-09-01; retain planning placeholder pending quote" },
    GB300:      { od:30.00, conf:"QUOTE", note:"No canonical public GCP GB300 On-Demand SKU verified 2026-09-01; retain planning placeholder pending quote" },
  },
  OCI: {
    A100:       { od:4.00, conf:"LISTED", note:"A100-v2 80GB Pay As You Go, Oracle Global Price List, GPU per hour" },
    H100:       { od:10.00, conf:"LISTED", note:"Oracle Global Price List, GPU per hour" },
    H200:       { od:10.00, conf:"LISTED", note:"Oracle Global Price List, GPU per hour" },
    "B200-class":{ od:14.00, conf:"LISTED", note:"Oracle Global Price List, GPU per hour" },
    B300:       { od:15.00, conf:"LISTED", note:"Oracle Global Price List, GPU per hour" },
    GB200:      { od:16.00, conf:"LISTED", note:"Oracle Global Price List, GPU per hour" },
    GB300:      { od:18.00, conf:"LISTED", note:"Oracle Global Price List, GPU per hour" },
  },
  CoreWeave: {
    A100:       { od:2.70, conf:"LISTED", note:"North America On-Demand $21.60/8" },
    H100:       { od:6.16, conf:"LISTED", note:"North America On-Demand $49.24/8 = $6.155" },
    H200:       { od:6.31, conf:"LISTED", note:"North America On-Demand $50.44/8 = $6.305" },
    "B200-class":{ od:8.60, conf:"LISTED", note:"North America On-Demand $68.80/8" },
    B300:       { od:8.00, conf:"QUOTE", note:"CoreWeave public On-Demand price is Contact sales; retain prior planning placeholder, verify quote" },
    GB200:      { od:10.50, conf:"LISTED", note:"North America On-Demand $42.00/4" },
    GB300:      { od:12.00, conf:"QUOTE", note:"CoreWeave public On-Demand price is Contact sales; retain prior planning placeholder, verify quote" },
  },
};

/* Own-side registry'''
updated, count = re.subn(pattern, new_rates, text, count=1, flags=re.S)
if count != 1:
    raise SystemExit(f"TcoCalculator.jsx: could not replace RATES block ({count})")
p.write_text(updated, encoding="utf-8")

# Pricing provenance: the cloud table was fully reviewed on 2026-09-01, including explicit QUOTE/proxy rows.
replace_once(
    "src/pricingProvenance.js",
    'export const CLOUD_RATES_VERIFIED_AT = "2026-08-07"; // TCO\'s RATES table ($/GPU-hr, AWS/Azure/GCP/OCI/CoreWeave)',
    'export const CLOUD_RATES_VERIFIED_AT = "2026-09-01"; // Full provider-by-provider review of TCO RATES table; public list/proxy/QUOTE status re-verified',
)

# Add canonical provider policy to runbook before the cloud pricing procedure.
runbook_anchor = "### 4.2 Cloud GPU pricing\n\nProviders currently represented in TCO include AWS, Azure, GCP, OCI, and CoreWeave.\n"
runbook_replacement = '''### 4.2 Cloud GPU pricing

Providers currently represented in TCO include AWS, Azure, GCP, OCI, and CoreWeave.

#### Canonical provider pricing basis

Use the following basis consistently so monthly refreshes do not mix incomparable purchasing models:

| Provider | Canonical `od` basis | Primary source | Special handling |
| --- | --- | --- | --- |
| AWS | Linux EC2 standard On-Demand in `us-east-1`, normalized by physical GPU count | AWS public EC2 price catalog | Capacity Blocks are a cross-check, not a substitute for standard On-Demand. If no standard On-Demand catalog row exists, retain `QUOTE` or an explicitly documented proxy. |
| Azure | Linux Pay-As-You-Go retail price for a canonical GPU VM SKU in a documented US region, normalized by GPU count | Azure Retail Prices API | Region availability differs. Use the documented canonical region for each SKU and do not substitute Windows pricing. |
| GCP | Explicitly labeled accelerator-optimized On-Demand in Iowa `us-central1`, normalized by GPU count | Google Cloud accelerator-optimized pricing | If On-Demand is `N/A`, use only an explicitly named public proxy such as DWS Calendar Mode and label it accordingly, or use `QUOTE`. Never silently substitute Spot or CUD pricing. |
| OCI | Pay As You Go GPU-per-hour rate | Oracle Cloud PaaS and IaaS Global Price List | Oracle already publishes normalized GPU-per-hour rates, so no node normalization is needed. |
| CoreWeave | North America On-Demand node price divided by GPU count | CoreWeave public pricing page | If On-Demand says `Contact sales`, keep the row `QUOTE`; do not substitute Spot pricing. |

Cloud Pricing Refresh #1 was completed on September 1, 2026 using this policy. Confidence labels remain part of the data model: `LISTED` for directly supported public prices, `NODE-NORM` for a transparent public node/proxy normalization, `EST` for a defensible estimate, and `QUOTE` when a dependable public rate is unavailable. A `QUOTE` row may retain a numeric planning placeholder so the calculator can run, but the placeholder must not be represented as a current provider list price.
'''
replace_once("MaintenanceRunbook.md", runbook_anchor, runbook_replacement)

# Record refresh in CHANGELOG under Unreleased.
changelog_anchor = "### Current maintenance state\n"
changelog_entry = '''### Cloud Pricing Refresh #1 - 2026-09-01

- Completed the first formal provider-by-provider cloud GPU pricing refresh using a canonical purchasing basis for AWS, Azure, GCP, OCI, and CoreWeave.
- AWS public EC2 catalog directly confirmed A100 80GB (`p4de`), H100 (`p5`), H200 (`p5en`), B200 (`p6-b200`), and B300 (`p6-b300`) On-Demand rates in `us-east-1`; GB200/GB300 remain `QUOTE` where a canonical standard On-Demand catalog row was not verified.
- Azure Retail Prices API directly confirmed Linux A100, H100, H200, and GB200 rates; B200, B300, and GB300 remain `QUOTE` where no canonical retail SKU was verified.
- GCP H100 and H200 On-Demand rates were reconfirmed. A100 was normalized to the A100 80GB A2 Ultra class. B200 standard On-Demand is currently `N/A`, so the tool now uses the explicitly disclosed DWS Calendar Mode public proxy rather than presenting the prior value as `LISTED` On-Demand.
- OCI was reconciled to Oracle's current GPU-per-hour Global Price List, correcting A100, H200, B200, B300, and GB300 values while retaining matching H100 and GB200 values.
- CoreWeave H200 was updated to the current North America On-Demand node-normalized rate, while B300 and GB300 were reclassified to `QUOTE` because public On-Demand pricing is currently `Contact sales`.
- Updated `CLOUD_RATES_VERIFIED_AT` to `2026-09-01` after the complete table review. Quote/proxy rows remain explicitly disclosed rather than being treated as verified list prices.

### Current maintenance state
'''
replace_once("CHANGELOG.md", changelog_anchor, changelog_entry)

# Guard against prohibited dash characters in changed project writing files.
for path in ["src/TcoCalculator.jsx", "src/pricingProvenance.js", "MaintenanceRunbook.md", "CHANGELOG.md"]:
    txt = Path(path).read_text(encoding="utf-8")
    if "—" in txt or "–" in txt:
        # Existing source historically contains these characters in UI prose, so only fail docs.
        if path.endswith(".md"):
            raise SystemExit(f"{path}: prohibited dash character found")

print("Applied Cloud Pricing Refresh #1")
