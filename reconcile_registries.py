"""
Cross-registry reconciliation check, final build.

Runs after all three sync scripts, as its own CI step. Jobs:

1. Staleness / confidence state — reports each registry's confidence state
   (current / degraded / missing) via common.get_confidence_state(). A
   'degraded' registry isn't an error by itself (the app keeps serving it,
   per the agreed degrade-not-fail behavior), but it's surfaced here so a
   human sees the pattern if a registry stays degraded across multiple runs.

2. Coverage drift, now bidirectional (per the pre-build review): flags
   models with capability or NIM data but no spec entry (as before), AND
   flags spec models with no capability data (new) — a model in the
   selectable catalog without capability data can't be meaningfully ranked,
   which is a real completeness gap, not just a data-quality nuisance. A
   spec model with no NIM entry is NOT flagged; that's a legitimate model
   characteristic (not every open-weight model has a NIM deployment
   profile), not a data gap.

3. Unresolved canonical mappings: any record any sync script flagged with
   needs_alias_mapping=True gets surfaced here too, as a single place to
   see everything waiting on a manual alias addition to
   data/canonical_models.json.

Exit code is non-zero on drift or unresolved mappings, so this can gate a
CI pipeline. Degraded-but-not-missing registries are reported but don't by
themselves fail the run, since serving slightly stale data is the intended
behavior, not a bug.
"""

import sys
from pathlib import Path

from common import load_snapshot, get_confidence_state

DATA_DIR = Path(__file__).parent / "data"
REGISTRY_FILES = ["model_specs.json", "model_capability_db.json", "nim_compatibility.json"]


def get_models(snapshot):
    if not snapshot:
        return []
    return snapshot["data"].get("models", [])


def get_canonical_ids(models):
    return {m["canonical_model_id"] for m in models if m.get("canonical_model_id")}


def main():
    blocking_problems = []
    info_notes = []

    # --- Confidence state per registry ---
    for filename in REGISTRY_FILES:
        state = get_confidence_state(DATA_DIR / filename)
        if state == "missing":
            blocking_problems.append(f"MISSING: {filename} has never synced successfully")
        elif state == "degraded":
            info_notes.append(f"DEGRADED (non-blocking): {filename} is past its staleness threshold; "
                               f"app should visibly flag reduced confidence, not fail")

    # --- Coverage drift (bidirectional) ---
    specs = load_snapshot(DATA_DIR / "model_specs.json")
    capability = load_snapshot(DATA_DIR / "model_capability_db.json")
    nim = load_snapshot(DATA_DIR / "nim_compatibility.json")

    spec_models = get_models(specs)
    capability_models = get_models(capability)
    nim_models = get_models(nim)

    spec_ids = get_canonical_ids(spec_models)
    capability_ids = get_canonical_ids(capability_models)
    nim_ids = get_canonical_ids(nim_models)

    for cid in sorted(capability_ids - spec_ids):
        blocking_problems.append(
            f"DRIFT: canonical model '{cid}' has a capability score but no spec entry "
            f"— its recommendation card would be missing param count/context/license"
        )
    for cid in sorted(nim_ids - spec_ids):
        blocking_problems.append(
            f"DRIFT: canonical model '{cid}' has a NIM compatibility entry but no spec entry"
        )
    for cid in sorted(spec_ids - capability_ids):
        blocking_problems.append(
            f"COVERAGE GAP: canonical model '{cid}' is in the selectable catalog (Registry 1) "
            f"but has no capability score (Registry 2) — cannot be meaningfully ranked"
        )
    # Note: spec_ids - nim_ids is intentionally NOT flagged. No NIM profile
    # is a legitimate model characteristic, not a data completeness problem.

    # --- Unresolved canonical mappings ---
    for filename, models in [
        ("model_specs.json", spec_models),
        ("model_capability_db.json", capability_models),
        ("nim_compatibility.json", nim_models),
    ]:
        unresolved = [m.get("model_id") for m in models if m.get("needs_alias_mapping")]
        if unresolved:
            blocking_problems.append(
                f"UNRESOLVED ALIAS: {filename} has {len(unresolved)} record(s) with no canonical "
                f"mapping: {unresolved}. Add to data/canonical_models.json."
            )

    if info_notes:
        print("[reconcile] Non-blocking notes:")
        for n in info_notes:
            print(f"  - {n}")

    if blocking_problems:
        print("[reconcile] Blocking issues found:")
        for p in blocking_problems:
            print(f"  - {p}")
        sys.exit(1)

    print("[reconcile] All registries present, consistent, and fully mapped.")
    sys.exit(0)


if __name__ == "__main__":
    main()
