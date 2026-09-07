import React from "react";
import { STAGED_TECHNICAL_MODEL_REGISTRY } from "./stagedModelRegistry.js";
import { getInferenceSequenceStateMemory } from "./modelSizingMethodology.js";

const TOKENS = 8192;
const CACHE_BYTES = 2;

export default function HybridSequenceStateTestRoute() {
  const results = STAGED_TECHNICAL_MODEL_REGISTRY.map((model) => ({
    model,
    state: getInferenceSequenceStateMemory(model, TOKENS, CACHE_BYTES),
  }));

  return (
    <main data-testid="hybrid-sequence-state-harness">
      <h1>Hybrid sequence-state E2E harness</h1>
      <div data-testid="fixture-inputs" data-tokens={TOKENS} data-cache-bytes={CACHE_BYTES} />
      {results.map(({ model, state }) => (
        <section
          key={model.id}
          data-testid={`hybrid-state-${model.id}`}
          data-model-id={model.id}
          data-state-type={state.stateType}
          data-total-bytes={String(state.bytesPerSequence)}
          data-token-growing-bytes={String(state.tokenGrowingBytes)}
          data-fixed-bytes={String(state.fixedBytes)}
          data-total-gb={String(state.totalGBPerSequence)}
        >
          <h2>{model.label}</h2>
          <p>{state.basis}</p>
          <ul>
            {state.components.map((component) => (
              <li key={component.name} data-component={component.name} data-bytes={String(component.bytes)}>
                {component.name}: {component.bytes}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}