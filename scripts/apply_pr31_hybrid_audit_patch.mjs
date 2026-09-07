import fs from "node:fs";

const path = new URL("../src/GpuSizingCalculator.jsx", import.meta.url);
let source = fs.readFileSync(path, "utf8");

function replaceExact(oldText, newText, label) {
  const count = source.split(oldText).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}.`);
  source = source.replace(oldText, newText);
}

function replaceCount(oldText, newText, expected, label) {
  const count = source.split(oldText).length - 1;
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, found ${count}.`);
  source = source.split(oldText).join(newText);
}

replaceExact(
  'kvBytesPerElement: "Precision used for the KV cache specifically (separate from the model weights). 2 bytes (FP16) is the safe default; dropping to 1 (FP8) saves memory but needs backend support to be accurate.",',
  'kvBytesPerElement: "Precision used for token-growing attention/KV cache state (separate from the model weights). 2 bytes (FP16) is the safe default; dropping to 1 (FP8) needs backend support, and source-defined recurrent/compression state may retain its own precision instead of following this control.",',
  "KV precision tooltip"
);

replaceCount("KV cache precision", "Attention/KV cache precision", 4, "KV precision labels");
replaceCount("weights + KV cache + overhead", "weights + inference sequence state + overhead", 2, "inference memory summary copy");

replaceExact(
`            const m = result.model;
            const isMLA = m.attentionType === "MLA";
            const avgTokens = avgInputTokens + avgOutputTokens;`,
`            const m = result.model;
            const state = result.sequenceStateMemory;
            const isMLA = state.stateType === "mla";
            const isStandardKv = state.stateType === "standard-kv";
            const avgTokens = avgInputTokens + avgOutputTokens;`,
  "audit state setup"
);

replaceExact(
`                {isMLA ? (
                  <AuditFormula label="KV cache bytes/token (MLA attention)" formula="kvBytesPerToken = layers × (kvLoraRank + qkRopeHeadDim) × bytesPerElement" substituted={\`= \${m.layers} × (\${m.kvLoraRank} + \${m.qkRopeHeadDim}) × \${kvBytesPerElement}\`} result={\`\${result.kvBytesPerToken.toLocaleString()} bytes/token\`} />
                ) : (
                  <AuditFormula label="KV cache bytes/token (standard attention)" formula="kvBytesPerToken = 2 × layers × kvHeads × headDim × bytesPerElement" substituted={\`= 2 × \${m.layers} × \${m.kvHeads} × \${m.headDim} × \${kvBytesPerElement}\`} result={\`\${result.kvBytesPerToken.toLocaleString()} bytes/token\`} />
                )}
                <AuditFormula label="KV cache per sequence" formula="kvCacheGBPerSeq = (kvBytesPerToken × avgTokens) ÷ 1e9" substituted={\`= (\${result.kvBytesPerToken.toLocaleString()} × \${avgTokens.toLocaleString()}) ÷ 1e9\`} result={\`\${result.kvCacheGBPerSeq.toFixed(4)} GB\`} />
                <AuditFormula label="Total KV cache" formula="kvCacheTotalGB = kvCacheGBPerSeq × concurrentUsers" substituted={\`= \${result.kvCacheGBPerSeq.toFixed(4)} × \${concurrentUsers.toLocaleString()}\`} result={\`\${result.kvCacheTotalGB.toFixed(1)} GB\`} />`,
`                {isMLA ? (
                  <AuditFormula label="KV cache bytes/token (MLA attention)" formula="kvBytesPerToken = layers × (kvLoraRank + qkRopeHeadDim) × bytesPerElement" substituted={\`= \${m.layers} × (\${m.kvLoraRank} + \${m.qkRopeHeadDim}) × \${kvBytesPerElement}\`} result={\`\${result.kvBytesPerToken.toLocaleString()} bytes/token\`} />
                ) : isStandardKv ? (
                  <AuditFormula label="KV cache bytes/token (standard attention)" formula="kvBytesPerToken = 2 × layers × kvHeads × headDim × bytesPerElement" substituted={\`= 2 × \${m.layers} × \${m.kvHeads} × \${m.headDim} × \${kvBytesPerElement}\`} result={\`\${result.kvBytesPerToken.toLocaleString()} bytes/token\`} />
                ) : (
                  <AuditFormula label={\`Inference sequence state (\${state.stateType})\`} formula="sequenceStateGBPerSeq = sum(source-qualified persistent state components) ÷ 1e9" substituted={state.components.map((component) => \`\${component.name}: \${(component.bytes / 1e9).toFixed(4)} GB\`).join(" + ")} result={\`\${state.totalGBPerSequence.toFixed(4)} GB/sequence\`} />
                )}
                {(isMLA || isStandardKv) && (
                  <AuditFormula label="KV cache per sequence" formula="kvCacheGBPerSeq = (kvBytesPerToken × avgTokens) ÷ 1e9" substituted={\`= (\${result.kvBytesPerToken.toLocaleString()} × \${avgTokens.toLocaleString()}) ÷ 1e9\`} result={\`\${result.kvCacheGBPerSeq.toFixed(4)} GB\`} />
                )}
                <AuditFormula label={isMLA || isStandardKv ? "Total KV cache" : "Total inference sequence state"} formula="sequenceStateTotalGB = stateGBPerSeq × concurrentUsers" substituted={\`= \${result.kvCacheGBPerSeq.toFixed(4)} × \${concurrentUsers.toLocaleString()}\`} result={\`\${result.kvCacheTotalGB.toFixed(1)} GB\`} />`,
  "audit sequence-state formulas"
);

replaceExact(
  '{m.attentionType === "MLA" ? <AuditRow label="KV configuration" value={`MLA -- kvLoraRank ${m.kvLoraRank}, qkRopeHeadDim ${m.qkRopeHeadDim}, ${m.layers} layers`} /> : <AuditRow label="KV configuration" value={m.kvHeads != null ? `${m.layers} layers, ${m.kvHeads} KV heads, ${m.headDim} head dim` : "not applicable to training sizing"} />}',
  '{mode === "Inference" && m.sequenceStateType ? <AuditRow label="Inference state contract" value={result.sequenceStateMemory.stateType} sub={result.sequenceStateMemory.basis} /> : m.attentionType === "MLA" ? <AuditRow label="KV configuration" value={`MLA -- kvLoraRank ${m.kvLoraRank}, qkRopeHeadDim ${m.qkRopeHeadDim}, ${m.layers} layers`} /> : <AuditRow label="KV configuration" value={m.kvHeads != null ? `${m.layers} layers, ${m.kvHeads} KV heads, ${m.headDim} head dim` : "not applicable to training sizing"} />}',
  "source/audit state contract"
);

fs.writeFileSync(path, source);
console.log("Applied PR31 hybrid-aware GPU sizing audit/report patch.");
