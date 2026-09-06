import React, { useEffect, useState } from "react";
import {
  setGpuSizingModelVisibility,
  setTcoModelVisibility,
} from "./modelRegistry.js";

const VISIBILITY_KEY = "ai-factory-model-catalog:include-existing";

function readSavedSession(tool) {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(sessionStorage.getItem(`ai-factory-session:${tool}`) || "{}");
  } catch {
    return {};
  }
}

function readIncomingModelId() {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("model");
}

function readVisibilityPreference() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(VISIBILITY_KEY) === "true";
}

export default function ModelCatalogVisibilityRoute({ tool, children }) {
  const [includeExisting, setIncludeExisting] = useState(readVisibilityPreference);

  // Re-read the persisted tool state on every wrapper render. When the user
  // toggles visibility off after selecting an existing-deployment model, the
  // latest saved selection must remain visible rather than disappearing from
  // the select as an invalid hidden value.
  const saved = readSavedSession(tool);
  const incoming = readIncomingModelId();
  const selectedIds = tool === "gpu-sizing"
    ? [incoming, saved.infModelId, saved.trainModelId].filter(Boolean)
    : tool === "tco"
      ? [incoming, saved.modelId].filter(Boolean)
      : incoming ? [incoming] : [];

  if (tool === "gpu-sizing") {
    setGpuSizingModelVisibility({ includeExisting, selectedIds });
  } else if (tool === "tco") {
    setTcoModelVisibility({ includeExisting, selectedIds });
  }

  useEffect(() => {
    sessionStorage.setItem(VISIBILITY_KEY, includeExisting ? "true" : "false");
  }, [includeExisting]);

  // `children` is a stable React element created by the route table. Cloning
  // it with a visibility-version prop ensures the calculator itself rerenders
  // after the shared model-option array changes; otherwise the wrapper checkbox
  // rerenders but the already-rendered <select> can keep its old option DOM.
  const toolElement = React.isValidElement(children)
    ? React.cloneElement(children, { modelCatalogVisibilityVersion: includeExisting ? 1 : 0 })
    : children;

  return (
    <>
      <div className="no-print border-b border-gray-100 bg-gray-50 px-6 py-2">
        <label className="mx-auto flex max-w-5xl cursor-pointer items-start gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={includeExisting}
            onChange={(e) => setIncludeExisting(e.target.checked)}
            className="mt-0.5 h-4 w-4"
            aria-label="Include models for existing deployments"
          />
          <span>
            <strong className="text-gray-800">Include models for existing deployments</strong>
            <span className="ml-1">Show older supported models for sizing or cost analysis of environments you already run. They are not recommended for new deployments.</span>
          </span>
        </label>
      </div>
      {toolElement}
    </>
  );
}
