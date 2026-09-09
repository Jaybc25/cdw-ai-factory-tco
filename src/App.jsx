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
import SharedToolShell from "./SharedToolShell.jsx";
import "./print-overrides.css";

const E2E_AUTH_BYPASS = import.meta.env.VITE_E2E_AUTH_BYPASS === "true";

function RouteScrollManager() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const firstRender = useRef(true);

  useEffect(() => {
    // A fresh/direct/reloaded tool visit should start at the top. Preserve the
    // browser's own restoration only for genuine Back/Forward history visits.
    if (firstRender.current) {
      firstRender.current = false;
      const navigationEntry =
        typeof performance !== "undefined" ? performance.getEntriesByType?.("navigation")?.[0] : null;
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

function ToolRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/tco"
        element={(
          <SharedToolShell
            title="Cloud vs On-Prem TCO Calculator"
            backHref="/gpu-sizing"
            backLabel="GPU Sizing"
            toolKey="tco"
          >
            <ModelCatalogVisibilityRoute tool="tco">{React.createElement(TcoCalculator)}</ModelCatalogVisibilityRoute>
          </SharedToolShell>
        )}
      />
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
              {React.createElement(GpuSizingCalculator)}
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
