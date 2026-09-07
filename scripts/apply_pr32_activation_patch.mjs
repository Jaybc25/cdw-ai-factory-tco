import fs from "node:fs";

function patchFile(path, replacements) {
  let source = fs.readFileSync(path, "utf8");
  for (const [oldText, newText, label] of replacements) {
    const count = source.split(oldText).length - 1;
    if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}.`);
    source = source.replace(oldText, newText);
  }
  fs.writeFileSync(path, source);
}

patchFile(new URL("../src/modelRegistry.js", import.meta.url), [
  [
    'import catalogPolicyData from "../data/model_catalog_policy.json" with { type: "json" };',
    'import catalogPolicyData from "../data/model_catalog_policy.json" with { type: "json" };\nimport { STAGED_TECHNICAL_MODEL_REGISTRY } from "./stagedModelRegistry.js";',
    "model registry staged import"
  ],
  [
    'export const MODEL_REGISTRY = TECHNICAL_MODEL_REGISTRY.map((model) => ({',
    'export const MODEL_REGISTRY = [...TECHNICAL_MODEL_REGISTRY, ...STAGED_TECHNICAL_MODEL_REGISTRY].map((model) => ({',
    "model registry promotion"
  ],
]);

patchFile(new URL("../src/modelAdvisorEngine.js", import.meta.url), [
  [
    'const PERMISSIVE_LICENSE_KEYWORDS = ["apache", "mit", "llama3.1", "llama3.3", "llama4", "gemma", "mixtral"];',
    'const PERMISSIVE_LICENSE_KEYWORDS = ["apache", "mit", "llama3.1", "llama3.3", "llama4", "gemma", "mixtral", "nvidia-open-model"];',
    "NVIDIA permissive license handling"
  ],
]);

console.log("Applied PR32 runtime promotion and NVIDIA license handling.");
