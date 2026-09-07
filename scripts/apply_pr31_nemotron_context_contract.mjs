import fs from "node:fs";

function patch(path, replacements) {
  let source = fs.readFileSync(path, "utf8");
  for (const [oldText, newText, label] of replacements) {
    const count = source.split(oldText).length - 1;
    if (count !== 1) throw new Error(`${label}: expected one match, found ${count}.`);
    source = source.replace(oldText, newText);
  }
  fs.writeFileSync(path, source);
}

patch("data/model_catalog_tranche_1_qualification.json", [
  [
    "and Nemotron's verified 262,144-token config versus advertised 1M context claim must be reconciled before product exposure.",
    "and Nemotron's context contract is represented explicitly as a 262,144-token verified runtime/config context plus a separately disclosed 1M advertised extended context.",
    "manifest activation reason"
  ],
  [
    '"context_length": 1000000,\n      "modalities": ["text"],\n      "source": "https://research.nvidia.com/labs/nemotron/Nemotron-3-Super/"',
    '"context_length": 262144,\n      "extended_context_length": 1000000,\n      "modalities": ["text"],\n      "source": "https://research.nvidia.com/labs/nemotron/Nemotron-3-Super/"',
    "Nemotron base/extended context"
  ],
]);

patch("data/model_catalog_policy.json", [[
  '{ "canonical_model_id": "nemotron-3-super-120b-a12b", "catalog_status": "staged", "activation_dependency": "context-contract-reconciliation-and-activation-review" }',
  '{ "canonical_model_id": "nemotron-3-super-120b-a12b", "catalog_status": "staged", "activation_dependency": "activation-readiness-review" }',
  "Nemotron activation dependency"
]]);

patch("scripts/validate_model_tranche_1.mjs", [[
  '["nemotron-3-super-120b-a12b", "context-contract-reconciliation-and-activation-review"]',
  '["nemotron-3-super-120b-a12b", "activation-readiness-review"]',
  "Nemotron validator dependency"
]]);

console.log("Applied explicit Nemotron base/extended context contract.");
