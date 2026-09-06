import React, { useEffect, useMemo, useState } from "react";
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

  // Preserve currently selected historical models even when the broad legacy
  // toggle is off. This keeps saved sessions and deep links valid without
  // re-exposing the full existing-deployment catalog to greenfield users.
  const selectedIds = useMemo(() => {
    const saved = readSavedSession(tool);
    const incoming = readIncomingModelId();
    if (tool === "gpu-sizing") {
      return [incoming, saved.infModelId, saved.trainModelId].filter(Boolean);
    }
    if (tool === "tco") {
      return [incoming, saved.modelId].filter(Boolean);
    }
    return incoming ? [incoming] : [];
  }, [tool]);

  if (tool === "gpu-sizing") {
    setGpuSizingModelVisibility({ includeExisting, selectedIds });
  } else if (tool === "tco") {
    setTcoModelVisibility({ includeExisting, selectedIds });
  }

  useEffect(() => {
    sessionStorage.setItem(VISIBILITY_KEY, includeExisting ? "true" : "false");
  }, [includeExisting]);

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
      {children}
    </>
  );
}
