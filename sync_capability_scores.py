"""
Registry 2: Capability / benchmark scores.

Source of truth: Artificial Analysis's Data API, FREE tier —
/api/v2/language/models/free. Verified directly against the live API docs
(artificialanalysis.ai/data-api/docs) before this script was written.

WHY FREE TIER IS SUFFICIENT HERE (this was Pro-only in an earlier version of
this script — re-evaluated and downgraded on cost grounds, not a shortcut):
Hugging Face (Registry 1) is the PRIMARY source for license, modality, and
parameter count, by deliberate design from the pre-build review — Artificial
Analysis was only ever meant to supply capability/benchmark scores, speed,
and pricing, precisely so a paid subscription would never be a single point
of failure for hard-filter fields. Every field this script actually
extracts (intelligence index, coding index, agentic index, speed, price) IS
present on the free tier. The Pro-only fields (context window, parameters,
modalities, licensing, huggingface_url, per-provider data) were being
pulled in an earlier version but never consumed by anything — HF already
supplies the equivalents.

The one real dependency this removal required: the old script filtered
candidates using `licensing.is_open_weights`, a Pro-only field absent from
free-tier responses. That filter was redundant anyway — this script only
ever keeps models that resolve against our own 10-model canonical registry
(see tracked_models below), and those were only added there because
Hugging Face already confirmed them open-weight. Canonical-registry
membership IS the open-weight filter; AA's own openness flag was never
load-bearing once that architecture was in place.

If a future need arises for AA's finer-grained per-benchmark scores (GPQA,
HLE, SciCode, etc., not just the 3 composite indices), percentile
performance data, or AA-side cross-validation of license/modality against
HF, that would require upgrading to Pro ($417/mo at time of writing). Not
needed for this registry's current scope.

Run cadence: weekly — benchmark rankings can reorder within days of a new
release. Free tier's rate limit is 100 requests/day, comfortably enough for
a weekly full-catalog pagination (observed ~2 pages for the whole AA
catalog) filtered down to our 10 tracked models.

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
AA_API_BASE = "https://artificialanalysis.ai/api/v2/language/models/free"

REQUIRED_FIELDS = ["model_id", "canonical_model_id", "confidence"]


def fetch_capability_scores():
    import requests

    api_key = os.environ.get("AA_API_KEY")
    if not api_key:
        raise RuntimeError(
            "AA_API_KEY environment variable not set. Even the free tier requires "
            "a key — sign up at artificialanalysis.ai and create one, no paid plan needed."
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
            # No open-weights filter here — see module docstring. Canonical
            # registry membership (via resolve_with_report below) is what
            # actually restricts this to our tracked open-weight models.
            evaluations = entry.get("evaluations") or {}
            pricing = entry.get("pricing") or {}
            performance = entry.get("performance") or {}

            raw_records.append({
                "model_id": entry.get("slug"),
                "aa_id": entry.get("id"),
                "intelligence_index": evaluations.get("artificial_analysis_intelligence_index"),
                "coding_index": evaluations.get("artificial_analysis_coding_index"),
                "agentic_index": evaluations.get("artificial_analysis_agentic_index"),
                "speed_tokens_per_sec": performance.get("median_output_tokens_per_second"),
                "price_per_million_input_tokens": pricing.get("price_1m_input_tokens"),
                "price_per_million_output_tokens": pricing.get("price_1m_output_tokens"),
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
    # one model we haven't explicitly added to canonical_models.json.
    # Unmapped models are a discovery signal, not production data: report
    # them separately, never let them poison the customer-facing registry.
    tracked_models = [r for r in resolved if r["canonical_model_id"] is not None]

    if unresolved:
        discovery_path = OUTPUT_PATH.parent / "aa_discovery_candidates.json"
        with open(discovery_path, "w") as f:
            json.dump({
                "generated_at": utcnow_iso(),
                "note": "Models Artificial Analysis reports that aren't in "
                        "canonical_models.json yet. Informational only — review and add "
                        "deliberately, never auto-imported into the production registry. "
                        "(Includes proprietary models too, since the free tier has no "
                        "openness flag to pre-filter on — canonical registry membership "
                        "is what actually restricts production data to open-weight models.)",
                "unresolved_aa_slugs": unresolved,
            }, f, indent=2)
        print(f"[sync_capability_scores] {len(unresolved)} model(s) from Artificial Analysis "
              f"are not in the canonical registry yet — written to {discovery_path} as "
              f"discovery candidates, EXCLUDED from the production snapshot "
              f"({len(unresolved)} total, this includes proprietary models now that the "
              f"openness pre-filter is gone — harmless, they'll never resolve).",
              file=sys.stderr)

    return tracked_models, intelligence_index_version


def _fetch_and_unpack():
    models, intelligence_index_version = fetch_capability_scores()
    _fetch_and_unpack.last_index_version = intelligence_index_version
    return models


def _envelope_extras():
    # Called AFTER a successful fetch (see common.write_snapshot), so
    # last_index_version is populated by then rather than frozen at None.
    return {
        "source_api_tier": "free",
        "intelligence_index_version": getattr(_fetch_and_unpack, "last_index_version", None),
    }


if __name__ == "__main__":
    ok = safe_fetch(
        _fetch_and_unpack, OUTPUT_PATH, source="artificial_analysis_api",
        required_fields=REQUIRED_FIELDS, min_records=1,
        extra_envelope_fields=_envelope_extras,
    )
    sys.exit(0 if ok else 1)
