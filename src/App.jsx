import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import "./print-overrides.css";

const E2E_AUTH_BYPASS = import.meta.env.VITE_E2E_AUTH_BYPASS === "true";

function ToolRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/tco"
        element={(
          <ModelCatalogVisibilityRoute tool="tco">
            <TcoCalculator />
          </ModelCatalogVisibilityRoute>
        )}
      />
      <Route
        path="/gpu-sizing"
        element={(
          <ModelCatalogVisibilityRoute tool="gpu-sizing">
            <GpuSizingCalculator />
          </ModelCatalogVisibilityRoute>
        )}
      />
      <Route path="/model-advisor" element={<ModelAdvisor />} />
      <Route path="/use-cases" element={<UseCaseExplorer />} />
      <Route path="/roi" element={<RoiCalculator />} />
      <Route path="/readiness" element={<AiReadinessChecklists />} />
      <Route path="/summary" element={<CombinedSummary />} />
      {E2E_AUTH_BYPASS && <Route path="/__e2e/hybrid-sequence-state" element={<HybridSequenceStateTestRoute />} />}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LoginFrontDoor>
        <ToolRoutes />
      </LoginFrontDoor>
    </BrowserRouter>
  );
}