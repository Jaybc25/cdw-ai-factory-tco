"""
Registry 2: Capability / benchmark scores.

Source of truth: Artificial Analysis's Data API, /api/v2/language/models.
Verified directly against the live API docs (artificialanalysis.ai/data-api/docs)
before this script was written, since the pre-build review's original claims
about field names needed correcting.

COMMERCIAL DEPENDENCY, DOCUMENTED EXPLICITLY: the fields this registry
actually needs (parameters, modalities, licensing, context_window_tokens,
huggingface_url) are Pro-tier-only. The free tier
(/api/v2/language/models/free) only returns composite evaluation indices,
median performance, and input/output pricing, none of the fields this
registry is built around. This script requires a paid Artificial Analysis
Pro subscription and an x-api-key. Do not budget this as a free integration.

Per the pre-build review, Artificial Analysis is used here for capability
scores, performance, pricing, and as a SECONDARY validation source for
parameters/modalities/licensing, not as a replacement for Hugging Face
(Registry 1), which remains primary for those fields. This avoids making a
single paid subscription a single point of failure for hard-filter fields.

Run cadence: weekly, benchmark rankings can reorder within days of a new
release.

Cannot run inside this sandbox (no network access to artificialanalysis.ai).
Intended to run locally or in CI on a scheduled job.
"""

import json
import os
import sys
from pathlib import Path

from common import safe_fetch, utcnow_iso
from canonical_registry import CanonicalRegistry, resolve_with_report

SCRIPT_DIR = Path(__file__).parent
OUTPUT_PATH = SCRIPT_DIR / "data" / "model_capability_db.json"
AA_API_BASE = "https://artificialanalysis.ai/api/v2/language/models"

REQUIRED_FIELDS = ["model_id", "canonical_model_id", "confidence"]


def fetch_capability_scores():
    import requests

    api_key = os.environ.get("AA_API_KEY")
    if not api_key:
        raise RuntimeError(
            "AA_API_KEY environment variable not set. This registry requires a paid "
            "Artificial Analysis Pro subscription — see the module docstring."
        )

    registry = CanonicalRegistry()
    raw_records = []
    page = 1
    intelligence_index_version = None

    while True:
        resp = requests.get(
            AA_API_BASE, headers={"x-api-key": api_key}, params={"page": page}, timeout=20
        )
        resp.raise_for_status()
        body = resp.json()
        intelligence_index_version = body.get("intelligence_index_version")

        for entry in body.get("data", []):
            licensing = entry.get("licensing") or {}
            if not licensing.get("is_open_weights", False):
                continue  # this registry only tracks open-weight models

            evaluations = entry.get("evaluations") or {}
            pricing = entry.get("pricing") or {}
            performance = entry.get("performance") or {}
            parameters = entry.get("parameters") or {}

            raw_records.append({
                "model_id": entry.get("slug"),
                "aa_id": entry.get("id"),
                "huggingface_url": entry.get("huggingface_url"),
                "intelligence_index": evaluations.get("artificial_analysis_intelligence_index"),
                "coding_index": evaluations.get("artificial_analysis_coding_index"),
                "agentic_index": evaluations.get("artificial_analysis_agentic_index"),
                "speed_tokens_per_sec": performance.get("median_output_tokens_per_second"),
                "price_per_million_input_tokens": pricing.get("price_1m_input_tokens"),
                "price_per_million_output_tokens": pricing.get("price_1m_output_tokens"),
                "context_window_tokens": entry.get("context_window_tokens"),
                "param_count_total_billion": parameters.get("total"),
                "param_count_active_billion": parameters.get("active"),
                "modalities": entry.get("modalities"),
                "confidence": "HIGH",  # directly present in Artificial Analysis's tracked set
            })

        pagination = body.get("pagination", {})
        if not pagination.get("has_more"):
            break
        page += 1

    resolved, unresolved = resolve_with_report(
        registry, "artificial_analysis_slug", raw_records, id_field="model_id"
    )

    # CRITICAL: only models that resolved to a canonical ID go into the
    # production snapshot. safe_fetch()'s schema validation requires
    # canonical_model_id to be non-null, and Artificial Analysis's catalog
    # is far larger than our 10-model canonical registry — feeding it the
    # full resolved list (including unmapped records) would reject the
    # ENTIRE snapshot on the first real sync, the moment AA returns even
    # one open-weight model we haven't explicitly added to
    # canonical_models.json. Unmapped models are a discovery signal, not
    # production data: report them separately, never let them poison the
    # customer-facing registry. New models enter the advisor only when
    # someone deliberately adds them to the canonical registry.
    tracked_models = [r for r in resolved if r["canonical_model_id"] is not None]

    if unresolved:
        discovery_path = OUTPUT_PATH.parent / "aa_discovery_candidates.json"
        with open(discovery_path, "w") as f:
            json.dump({
                "generated_at": utcnow_iso(),
                "note": "Open-weight models Artificial Analysis reports that aren't in "
                        "canonical_models.json yet. Informational only — review and add "
                        "deliberately, never auto-imported into the production registry.",
                "unresolved_aa_slugs": unresolved,
            }, f, indent=2)
        print(f"[sync_capability_scores] {len(unresolved)} open-weight model(s) from Artificial "
              f"Analysis are not in the canonical registry yet — written to {discovery_path} as "
              f"discovery candidates, EXCLUDED from the production snapshot: {unresolved[:10]}"
              f"{'...' if len(unresolved) > 10 else ''}", file=sys.stderr)

    return tracked_models, intelligence_index_version


def _fetch_and_unpack():
    models, intelligence_index_version = fetch_capability_scores()
    _fetch_and_unpack.last_index_version = intelligence_index_version
    return models


def _envelope_extras():
    # Called AFTER a successful fetch (see common.write_snapshot), so
    # last_index_version is populated by then rather than frozen at None.
    return {
        "source_api_tier": "pro",
        "intelligence_index_version": getattr(_fetch_and_unpack, "last_index_version", None),
    }


if __name__ == "__main__":
    ok = safe_fetch(
        _fetch_and_unpack, OUTPUT_PATH, source="artificial_analysis_api",
        required_fields=REQUIRED_FIELDS, min_records=1,
        extra_envelope_fields=_envelope_extras,
    )
    sys.exit(0 if ok else 1)
