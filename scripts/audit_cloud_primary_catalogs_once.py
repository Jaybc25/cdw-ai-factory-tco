#!/usr/bin/env python3
import json, urllib.parse, urllib.request


def get_json(url):
    req = urllib.request.Request(url, headers={"User-Agent": "ai-factory-pricing-audit/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


def azure_prices():
    skus = {
        "A100": ("Standard_ND96amsr_A100_v4", 8),
        "H100": ("Standard_ND96isr_H100_v5", 8),
        "H200": ("Standard_ND96isr_H200_v5", 8),
        "GB200": ("Standard_ND128isr_NDR_GB200_v6", 4),
        "GB300": ("Standard_ND128isr_GB300_v6", 4),
    }
    print("\n=== AZURE RETAIL PRICES API: eastus, Consumption ===")
    for label, (sku, gpus) in skus.items():
        filt = f"serviceName eq 'Virtual Machines' and armRegionName eq 'eastus' and armSkuName eq '{sku}' and priceType eq 'Consumption'"
        url = "https://prices.azure.com/api/retail/prices?" + urllib.parse.urlencode({"$filter": filt})
        data = get_json(url)
        items = [x for x in data.get("Items", []) if "Spot" not in x.get("meterName", "") and "Low Priority" not in x.get("meterName", "")]
        print(f"\n{label} {sku} ({gpus} GPUs): {len(items)} non-spot item(s)")
        for x in items:
            print(json.dumps({
                "retailPrice": x.get("retailPrice"),
                "unitOfMeasure": x.get("unitOfMeasure"),
                "meterName": x.get("meterName"),
                "productName": x.get("productName"),
                "skuName": x.get("skuName"),
                "effectiveStartDate": x.get("effectiveStartDate"),
                "perGpu": (x.get("retailPrice") / gpus) if isinstance(x.get("retailPrice"), (int, float)) else None,
            }, sort_keys=True))


def aws_prices():
    print("\n=== AWS PUBLIC EC2 BULK PRICE CATALOG: us-east-1 ===")
    region_index = get_json("https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/region_index.json")
    entry = region_index["regions"]["us-east-1"]
    offer_url = "https://pricing.us-east-1.amazonaws.com" + entry["currentVersionUrl"]
    print("Offer URL:", offer_url)
    offer = get_json(offer_url)
    targets = {
        "A100-40": ("p4d.24xlarge", 8),
        "A100-80": ("p4de.24xlarge", 8),
        "H100": ("p5.48xlarge", 8),
        "H200": ("p5e.48xlarge", 8),
        "H200-network": ("p5en.48xlarge", 8),
        "B200": ("p6-b200.48xlarge", 8),
        "B300": ("p6-b300.48xlarge", 8),
        "GB200": ("p6e-gb200.36xlarge", 4),
    }
    products = offer.get("products", {})
    terms = offer.get("terms", {}).get("OnDemand", {})
    for label, (instance, gpus) in targets.items():
        matches = []
        for sku, p in products.items():
            a = p.get("attributes", {})
            if a.get("instanceType") != instance:
                continue
            if a.get("operatingSystem") != "Linux":
                continue
            if a.get("tenancy") != "Shared":
                continue
            if a.get("preInstalledSw") not in ("NA", None):
                continue
            if a.get("capacitystatus") not in ("Used", None):
                continue
            sku_terms = terms.get(sku, {})
            for term in sku_terms.values():
                for dim in term.get("priceDimensions", {}).values():
                    usd = dim.get("pricePerUnit", {}).get("USD")
                    if usd is None:
                        continue
                    try:
                        price = float(usd)
                    except ValueError:
                        continue
                    if price <= 0:
                        continue
                    matches.append({
                        "sku": sku,
                        "instanceType": instance,
                        "description": dim.get("description"),
                        "unit": dim.get("unit"),
                        "pricePerInstanceHour": price,
                        "perGpu": price / gpus,
                        "location": a.get("location"),
                    })
        print(f"\n{label} {instance} ({gpus} GPUs): {len(matches)} on-demand match(es)")
        for m in matches:
            print(json.dumps(m, sort_keys=True))


if __name__ == "__main__":
    azure_prices()
    aws_prices()
