"""
Canonical model identity resolver.

The one structural gap the pre-build review caught: Hugging Face, Artificial
Analysis, and NVIDIA's NIM catalog each use their own identifier scheme for
the same underlying model. Without a canonical mapping, reconciliation
across registries only works by accident (when mocked IDs happen to match).

This module resolves each source's identifier into a canonical_model_id via
data/canonical_models.json, a manually maintained file. Resolution is
deterministic lookup only, exact string match against a known alias, never
fuzzy matching. An identifier with no matching alias is NOT guessed at; it's
reported as unresolved so a human decides whether it's a new model to add to
the registry or a data-quality problem in the source.
"""

import json
from pathlib import Path

CANONICAL_REGISTRY_PATH = Path(__file__).parent / "data" / "canonical_models.json"


class CanonicalRegistry:
    def __init__(self, path: Path = CANONICAL_REGISTRY_PATH):
        with open(path, "r") as f:
            raw = json.load(f)
        self.models = raw["models"]
        self.schema_version = raw["schema_version"]

        # Build reverse lookup indexes per alias type, once, at load time.
        self._by_alias = {"huggingface": {}, "artificial_analysis_slug": {},
                           "artificial_analysis_id": {}, "nvidia_nim": {}}
        for model in self.models:
            canonical_id = model["canonical_model_id"]
            for alias_type, alias_value in model.get("aliases", {}).items():
                if alias_value:
                    self._by_alias.setdefault(alias_type, {})[alias_value] = canonical_id

    def resolve(self, alias_type: str, alias_value: str):
        """
        Exact-match lookup only. Returns the canonical_model_id, or None if
        this alias isn't in the registry yet. Callers are responsible for
        surfacing unresolved aliases rather than silently dropping them.
        """
        if not alias_value:
            return None
        return self._by_alias.get(alias_type, {}).get(alias_value)

    def lifecycle_status(self, canonical_id: str):
        for model in self.models:
            if model["canonical_model_id"] == canonical_id:
                return model.get("lifecycle_status", "active")
        return None


def resolve_with_report(registry: CanonicalRegistry, alias_type: str, source_records: list, id_field: str):
    """
    Resolve a list of source records (each a dict containing id_field) into
    canonical IDs. Returns (resolved_records, unresolved_ids). Records with
    no canonical match get canonical_model_id=None and needs_alias_mapping
    True, they're not dropped, so reconciliation can catch them and a human
    can decide whether to add a new alias.
    """
    resolved = []
    unresolved_ids = []
    for record in source_records:
        source_id = record.get(id_field)
        canonical_id = registry.resolve(alias_type, source_id)
        record = dict(record)  # don't mutate caller's dict
        record["canonical_model_id"] = canonical_id
        record["needs_alias_mapping"] = canonical_id is None
        if canonical_id is None:
            unresolved_ids.append(source_id)
        resolved.append(record)
    return resolved, unresolved_ids
