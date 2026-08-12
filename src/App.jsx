import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./LandingPage.jsx";
import TcoCalculator from "./TcoCalculator.jsx";
import GpuSizingCalculator from "./GpuSizingCalculator.jsx";
import ModelAdvisor from "./ModelAdvisor.jsx";
import UseCaseExplorer from "./UseCaseExplorer.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/tco" element={<TcoCalculator />} />
        <Route path="/gpu-sizing" element={<GpuSizingCalculator />} />
        <Route path="/model-advisor" element={<ModelAdvisor />} />
        <Route path="/use-cases" element={<UseCaseExplorer />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
