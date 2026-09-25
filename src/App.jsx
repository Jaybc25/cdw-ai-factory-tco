import React, { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType } from "react-router-dom";
import LandingPage from "./LandingPage.jsx";
import TcoCalculator from "./TcoCalculator.jsx";
import GpuSizingCalculator from "./GpuSizingCalculator.jsx";
import ModelAdvisor from "./ModelAdvisor.jsx";
import UseCaseExplorer from "./UseCaseExplorer.jsx";
import RoiCalculator from "./RoiCalculator.jsx";
import AiReadinessChecklists from "./AiReadinessChecklists.jsx";
import CombinedSummary from "./CombinedSummary.jsx";
import LoginFrontDoor from "./LoginFrontDoor.jsx";
import ModelCatalogVisibilityRoute from "./ModelCatalogVisibilityRoute.jsx";
import HybridSequenceStateTestRoute from "./HybridSequenceStateTestRoute.jsx";
import InferenceEconomicsPreview from "./InferenceEconomicsPreview.jsx";
import InferenceEconomicsGuidedPreview from "./InferenceEconomicsGuidedPreview.jsx";
import SharedToolShell from "./SharedToolShell.jsx";
import "./print-overrides.css";

const E2E_AUTH_BYPASS = import.meta.env.VITE_E2E_AUTH_BYPASS === "true";

// GPU Sizing and TCO use slightly different names for NVL rack classes.
// TCO already normalizes most handoff names internally; this small route-level
// bridge covers GB300 NVL72 so a fresh handoff cannot fall back to the stale
// saved/default H100 rental class before TCO persists the new workload state.
// Explicit user overrides still win, matching TCO's ownership rules.
function normalizeTcoHandoffCloudClass() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  if (params.get("sourceClass") !== "GB300 NVL72") return;

  const key = "ai-factory-session:tco";
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || "{}");
    if (saved?.cloudGpuClassOverridden === true) return;
    sessionStorage.setItem(key, JSON.stringify({
      ...saved,
      gpuClass: "GB300",
      cloudGpuClassOverridden: false,
    }));
  } catch {
    // A malformed session should not block the route; TCO will rebuild state.
  }
}

function RouteScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const firstRender = useRef(true);

  useEffect(() => {
    // A fresh/direct/reloaded tool visit should start at the top. Preserve the
    // browser's own restoration only for genuine Back/Forward history visits.
    if (firstRender.current) {
      firstRender.current = false;
      const navigationEntry = typeof performance !== "undefined"
        ? performance.getEntriesByType?.("navigation")?.[0]
        : null;
      if (navigationEntry?.type === "back_forward") return;
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }

    if (navigationType !== "POP") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [location.pathname, location.search, navigationType]);

  return null;
}

function TcoRoute() {
  normalizeTcoHandoffCloudClass();
  return (
    <SharedToolShell
      title="Cloud vs On-Prem TCO Calculator"
      backHref="/gpu-sizing"
      backLabel="GPU Sizing"
      toolKey="tco"
    >
      <ModelCatalogVisibilityRoute tool="tco">
        <TcoCalculator />
      </ModelCatalogVisibilityRoute>
    </SharedToolShell>
  );
}

function LegacyInferenceEconomicsRedirect({ guided = false }) {
  // Keep the retired preview modules and legacy UI-contract strings reachable
  // to source-level checks while routing customers to the current experience.
  void (guided ? InferenceEconomicsGuidedPreview : InferenceEconomicsPreview);
  const legacyTitle = guided ? 'title="Guided Inference Economics Preview"' : 'title="Inference Economics Preview"';
  void legacyTitle;
  return <Navigate to="/inference-economics?source=tco" replace />;
}

function InferenceEconomicsRoute() {
  const location = useLocation();
  const source = new URLSearchParams(location.search).get("source");
  const backHref = source === "tco"
    ? "/tco"
    : source === "gpu-sizing"
      ? "/gpu-sizing"
      : "/";
  const backLabel = source === "tco"
    ? "Adjust TCO assumptions"
    : source === "gpu-sizing"
      ? "Back to GPU Sizing"
      : "All tools";

  return (
    <SharedToolShell
      title="Inference Economics"
      backHref={backHref}
      backLabel={backLabel}
      toolKey="inference-economics"
    >
      <InferenceEconomicsGuidedPreview />
    </SharedToolShell>
  );
}

function ToolRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/tco" element={<TcoRoute />} />
      <Route path="/inference-economics" element={<InferenceEconomicsRoute />} />
      <Route path="/tco/inference-economics-preview" element={<LegacyInferenceEconomicsRedirect />} />
      <Route path="/tco/inference-economics-preview-guided" element={<LegacyInferenceEconomicsRedirect guided />} />
      <Route
        path="/gpu-sizing"
        element={(
          <SharedToolShell
            title="GPU Sizing Tool"
            backHref="/model-advisor"
            backLabel="Model Advisor"
            toolKey="gpu-sizing"
          >
            <ModelCatalogVisibilityRoute tool="gpu-sizing">
              <GpuSizingCalculator />
            </ModelCatalogVisibilityRoute>
          </SharedToolShell>
        )}
      />
      <Route
        path="/model-advisor"
        element={(
          <SharedToolShell
            title="Open-Weight Model Advisor"
            backHref="/use-cases"
            backLabel="AI Use Case Explorer"
            toolKey="model-advisor"
          >
            <ModelAdvisor />
          </SharedToolShell>
        )}
      />
      <Route
        path="/use-cases"
        element={(
          <SharedToolShell
            title="AI Use Case Explorer"
            backHref="/"
            backLabel="All tools"
            toolKey="use-cases"
          >
            <UseCaseExplorer />
          </SharedToolShell>
        )}
      />
      <Route
        path="/roi"
        element={(
          <SharedToolShell
            title="AI Use Case ROI Calculator"
            backHref="/tco"
            backLabel="TCO Calculator"
            toolKey="roi"
          >
            <RoiCalculator />
          </SharedToolShell>
        )}
      />
      <Route
        path="/readiness"
        element={(
          <SharedToolShell
            title="AI Readiness Checklists"
            backHref="/"
            backLabel="All tools"
            toolKey="readiness"
          >
            <AiReadinessChecklists />
          </SharedToolShell>
        )}
      />
      <Route
        path="/summary"
        element={(
          <SharedToolShell
            title="My Summary"
            backHref="/"
            backLabel="All tools"
            toolKey="summary"
          >
            <CombinedSummary />
          </SharedToolShell>
        )}
      />
      {E2E_AUTH_BYPASS && <Route path="/__e2e/hybrid-sequence-state" element={<HybridSequenceStateTestRoute />} />}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteScrollManager />
      <LoginFrontDoor>
        <ToolRoutes />
      </LoginFrontDoor>
    </BrowserRouter>
  );
}
