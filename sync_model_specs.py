"""
Registry 1: Model architecture specs.

Source of truth: the public Hugging Face Hub API (config.json per model).
Per the pre-build review, HF remains the PRIMARY source for license,
context length, architecture, and modality, even though Artificial
Analysis's Pro tier now also exposes some of these fields. Artificial
Analysis is used as a secondary validation source (see
sync_capability_scores.py's cross-check note), not a replacement, so a
single paid subscription never becomes a single point of failure for
hard-filter fields.

dell.huggingface.co is used only as a discovery layer for which model IDs
belong on the tracked list, never as the data source itself.

AUTHENTICATION REQUIRED: several tracked models (Llama, Gemma) are GATED on
Hugging Face — Meta and Google require an authenticated request from an
account that has accepted each model's license terms, even just to read
basic model info. Anonymous requests fail with a 401. Set HF_TOKEN
(a Hugging Face access token, read-only scope is enough) as an environment
variable / GitHub secret. Before the token will actually work, the account
that created it must visit each gated model's page while logged in and
accept the license (usually instant, sometimes requires filling out a form).

FIELD-LEVEL PROVENANCE: license and param_count_billion carry a nested
provenance object (value/source/verified_at/verification_method), per the
review's scoped-provenance decision — these are the two Registry-1 fields
where a wrong value has material consequences (a wrong license wrongly
admits or excludes a model; a wrong param count corrupts the GPU sizing
handoff). Everything else in this registry relies on registry-level
provenance (the envelope's source + synced_at).

Run cadence: monthly, or on-demand when a new model release is flagged.

Cannot run inside this sandbox (no network access to huggingface.co).
Intended to run locally or in CI.
"""

import os
import sys
from pathlib import Path

from common import safe_fetch, utcnow_iso
from canonical_registry import CanonicalRegistry, resolve_with_report

SCRIPT_DIR = Path(__file__).parent
OUTPUT_PATH = SCRIPT_DIR / "data" / "model_specs.json"
HF_API_BASE = "https://huggingface.co/api/models"

REQUIRED_FIELDS = ["model_id", "canonical_model_id", "license", "confidence", "lifecycle_status"]

# Curated tracking list, fed by dell.huggingface.co as a discovery layer.
TRACKED_MODEL_IDS = [
    "meta-llama/Llama-3.1-8B",
    "meta-llama/Llama-3.1-70B",
    "meta-llama/Llama-3.1-405B",
    "meta-llama/Llama-3.3-70B-Instruct",
    "mistralai/Mixtral-8x7B-v0.1",
    "meta-llama/Llama-4-Scout-17B-16E-Instruct",
    "meta-llama/Llama-4-Maverick-17B-128E-Instruct",
    "deepseek-ai/DeepSeek-V3",
    "deepseek-ai/DeepSeek-R1",
    "google/gemma-3-27b-it",
    "meta-models/Muse-Glimmer-30B",
]

# Manually verified param counts for the full-detail tier. Anything not
# listed falls back to a size-class-bucket / MEDIUM confidence entry.
KNOWN_PARAM_COUNTS_BILLION = {
    "Llama-3.1-8B": 8, "Llama-3.1-70B": 70, "Llama-3.1-405B": 405,
    "Llama-3.3-70B": 70, "Mixtral-8x7B-v0.1": 46.7,
    # Added after the initial build — these 5 were previously unverified
    # (param_count_billion.value = null in production), which turned out to
    # affect HALF the tracked catalog and made the Most Efficient Qualifying
    # Model / Balanced slots unusable for any of them. All figures are TOTAL
    # parameter count (matching the Mixtral convention above), verified
    # against each model's technical report / official model card:
    # - Llama 4 Scout: 109B total, 17B active (MoE) — Meta's Llama 4 blog
    # - Llama 4 Maverick: 402B total, 17B active (MoE) — Meta's Llama 4 blog
    # - DeepSeek V3: 671B total, 37B active (MoE) — DeepSeek-V3 Technical Report
    # - DeepSeek R1: 671B total, 37B active (MoE, same base arch as V3) — DeepSeek-R1 paper
    # - Gemma 3 27B: 27B total (dense, not MoE) — stated directly in the model name/card
    "Llama-4-Scout-17B-16E-Instruct": 109, "Llama-4-Maverick-17B-128E-Instruct": 402,
    "DeepSeek-V3": 671, "DeepSeek-R1": 671, "gemma-3-27b-it": 27,
    # Added 2026-08-12 -- Muse Glimmer, released 2026-08-10 by Meta
    # Superintelligence Labs, first Meta open-weight release since Llama 4.
    # ~29.6B dense (not MoE) per Meta's own model card (rounds to 30B in most
    # (Meta/HF launch blog, MarkTechPost, Phoronix) plus Artificial
    # Analysis's own model page.
    "Muse-Glimmer-30B": 29.6,
}


def _license_provenance(value: str, model_id: str):
    return {
        "value": value,
        "source": f"huggingface_hub_api:{model_id}:cardData.license",
        "verified_at": utcnow_iso(),
        "verification_method": "automated_api_sync",
    }


def _param_count_provenance(value, model_id: str):
    if value is not None:
        return {
            "value": value,
            "source": "manually verified, see KNOWN_PARAM_COUNTS_BILLION in this script",
            "verified_at": utcnow_iso(),
            "verification_method": "manual",
        }
    return {
        "value": None,
        "source": f"no manual entry for {model_id}, falls back to size-class-bucket estimate at the app layer",
        "verified_at": utcnow_iso(),
        "verification_method": "unverified",
    }


def fetch_model_specs():
    import requests  # deferred import, only needed at real run time

    hf_token = os.environ.get("HF_TOKEN")
    if not hf_token:
        raise RuntimeError(
            "HF_TOKEN environment variable not set. Several tracked models "
            "(Llama, Gemma) are GATED on Hugging Face — reading even basic "
            "model info requires an authenticated request from an account "
            "that has accepted each model's license terms. Anonymous "
            "requests get a 401. See README for how to create a token and "
            "accept the gated licenses."
        )
    headers = {"Authorization": f"Bearer {hf_token}"}

    registry = CanonicalRegistry()
    raw_records = []

    for model_id in TRACKED_MODEL_IDS:
        info_resp = requests.get(f"{HF_API_BASE}/{model_id}", headers=headers, timeout=15)
        info_resp.raise_for_status()
        info = info_resp.json()

        config_resp = requests.get(
            f"https://huggingface.co/{model_id}/raw/main/config.json", headers=headers, timeout=15
        )
        config = config_resp.json() if config_resp.ok else {}

        license_value = info.get("cardData", {}).get("license", "unknown")
        param_count = _extract_param_count(model_id)

        raw_records.append({
            "model_id": model_id,
            "license": _license_provenance(license_value, model_id),
            "param_count_billion": _param_count_provenance(param_count, model_id),
            "context_length": config.get("max_position_embeddings"),
            "architecture": (config.get("architectures") or ["unknown"])[0],
            "modality": "multimodal" if _looks_multimodal(config) else "text",
            "confidence": "HIGH" if param_count is not None else "MEDIUM",
        })

    resolved, unresolved = resolve_with_report(registry, "huggingface", raw_records, id_field="model_id")

    for record in resolved:
        if record["canonical_model_id"]:
            record["lifecycle_status"] = registry.lifecycle_status(record["canonical_model_id"])
        else:
            record["lifecycle_status"] = "unmapped"

    if unresolved:
        print(f"[sync_model_specs] WARNING: {len(unresolved)} model(s) have no canonical mapping yet: "
              f"{unresolved}. Add them to data/canonical_models.json before they'll resolve cleanly.",
              file=sys.stderr)

    return resolved


def _looks_multimodal(config: dict) -> bool:
    # Still a heuristic (flagged in the pre-build review as fragile for a
    # hard-filter field). Left as-is for HF's own config data, but the
    # capability registry's modalities object (Artificial Analysis Pro) is
    # the preferred source for the multimodal filter where both exist —
    # the matching logic should prefer that field when present.
    return "vision" in str(config).lower()


def _extract_param_count(model_id: str):
    for key, val in KNOWN_PARAM_COUNTS_BILLION.items():
        if key in model_id:
            return val
    return None


if __name__ == "__main__":
    ok = safe_fetch(
        fetch_model_specs, OUTPUT_PATH, source="huggingface_hub_api",
        required_fields=REQUIRED_FIELDS, min_records=5,
    )
    sys.exit(0 if ok else 1)
