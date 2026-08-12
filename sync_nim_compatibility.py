"""
Registry 3: Hardware / deployment compatibility.

Source of truth: NVIDIA's NIM catalog. Per the pre-build review, a NIM entry
means "NVIDIA-validated deployment path for this model on this GPU class,"
not "this model can/cannot run on NVIDIA hardware" — those are different
claims, and only the first one is what this registry actually asserts.

Used as a FILTER/FLAG in the Model Advisor's output, not a scoring input.

Run cadence: every 2 weeks.

NOTE: confirm the exact endpoint, auth, and response shape against NVIDIA's
current build.nvidia.com / NIM catalog API at implementation time — the URL
and field names below are placeholders, this one was not independently
verified against live docs the way the Artificial Analysis endpoint was.

Cannot run inside this sandbox (no network access to nvidia.com).
"""

import json
import sys
from pathlib import Path

from common import safe_fetch, utcnow_iso
from canonical_registry import CanonicalRegistry, resolve_with_report

SCRIPT_DIR = Path(__file__).parent
OUTPUT_PATH = SCRIPT_DIR / "data" / "nim_compatibility.json"

# UNRESOLVED — this endpoint was investigated and could NOT be confirmed as
# real. Unlike the Artificial Analysis endpoint (independently verified
# against live docs before this build), no documented catalog-wide bulk
# export with GPU compatibility data was found for NVIDIA's NIM catalog.
# What IS documented publicly: per-container /v1/models on a deployed NIM
# instance (lists what THAT container serves, not the full catalog), and
# individual model pages on build.nvidia.com (browsable, not an obvious
# bulk API). The URL below is UNCONFIRMED and likely wrong — do not run
# this script against production before someone with NGC/build.nvidia.com
# API access confirms the actual catalog-wide endpoint, or this becomes a
# scraping job against model pages instead of an API sync.
NIM_CATALOG_URL = "https://build.nvidia.com/api/catalog"  # UNCONFIRMED, see note above

REQUIRED_FIELDS = ["model_id", "canonical_model_id", "nim_supported"]


def fetch_nim_compatibility():
    import requests

    registry = CanonicalRegistry()
    resp = requests.get(NIM_CATALOG_URL, timeout=20)
    resp.raise_for_status()
    raw = resp.json()

    raw_records = []
    for profile in raw.get("profiles", []):
        raw_records.append({
            "model_id": profile.get("model_id"),
            "nim_supported": True,  # this registry: NVIDIA-validated deployment path, not universal compatibility
            "validated_gpu_classes": profile.get("gpu_classes", []),
            "recommended_quantization": profile.get("quantization"),
        })

    resolved, unresolved = resolve_with_report(registry, "nvidia_nim", raw_records, id_field="model_id")

    # Same discovery-not-poison contract as sync_capability_scores.py: the
    # full NIM catalog will almost certainly be larger than our 10-model
    # canonical registry, and every unresolved record has
    # canonical_model_id=None, which safe_fetch()'s schema validation
    # rejects. Only tracked models go into the production snapshot;
    # unmapped ones are a discovery signal, not production data.
    tracked_models = [r for r in resolved if r["canonical_model_id"] is not None]

    if unresolved:
        discovery_path = OUTPUT_PATH.parent / "nim_discovery_candidates.json"
        with open(discovery_path, "w") as f:
            json.dump({
                "generated_at": utcnow_iso(),
                "note": "Models NVIDIA's NIM catalog reports that aren't in "
                        "canonical_models.json yet. Informational only — review and add "
                        "deliberately, never auto-imported into the production registry.",
                "unresolved_nim_ids": unresolved,
            }, f, indent=2)
        print(f"[sync_nim_compatibility] {len(unresolved)} model(s) from the NIM catalog are not in "
              f"the canonical registry yet — written to {discovery_path} as discovery candidates, "
              f"EXCLUDED from the production snapshot: {unresolved[:10]}"
              f"{'...' if len(unresolved) > 10 else ''}", file=sys.stderr)

    return tracked_models


if __name__ == "__main__":
    ok = safe_fetch(
        fetch_nim_compatibility, OUTPUT_PATH, source="nvidia_nim_catalog",
        required_fields=REQUIRED_FIELDS, min_records=1,
    )
    sys.exit(0 if ok else 1)
