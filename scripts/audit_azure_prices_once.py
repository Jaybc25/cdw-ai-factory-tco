#!/usr/bin/env python3
import json, urllib.parse, urllib.request

skus = {
    "A100": ("Standard_ND96amsr_A100_v4", 8),
    "H100": ("Standard_ND96isr_H100_v5", 8),
    "H200": ("Standard_ND96isr_H200_v5", 8),
    "GB200": ("Standard_ND128isr_NDR_GB200_v6", 4),
    "GB300": ("Standard_ND128isr_GB300_v6", 4),
}

for region in ["eastus", "southcentralus", "westus3"]:
    print(f"\n=== {region} ===")
    for label, (sku, gpus) in skus.items():
        filt = f"serviceName eq 'Virtual Machines' and armRegionName eq '{region}' and armSkuName eq '{sku}' and priceType eq 'Consumption'"
        url = "https://prices.azure.com/api/retail/prices?" + urllib.parse.urlencode({"$filter": filt})
        req = urllib.request.Request(url, headers={"User-Agent": "ai-factory-pricing-audit/1.0"})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = json.load(r)
        items = [x for x in data.get("Items", []) if "Spot" not in x.get("meterName", "") and "Low Priority" not in x.get("meterName", "")]
        print(f"{label} {sku}: {len(items)}")
        for x in items:
            price = x.get("retailPrice")
            print(json.dumps({"price":price,"perGpu": price/gpus if isinstance(price,(int,float)) else None,"meter":x.get("meterName"),"product":x.get("productName"),"sku":x.get("skuName"),"effective":x.get("effectiveStartDate")}, sort_keys=True))
