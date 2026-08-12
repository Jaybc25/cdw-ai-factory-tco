import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage.jsx";
import TcoCalculator from "./TcoCalculator.jsx";
import GpuSizingCalculator from "./GpuSizingCalculator.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/tco" element={<TcoCalculator />} />
        <Route path="/gpu-sizing" element={<GpuSizingCalculator />} />
      </Routes>
    </BrowserRouter>
  );
}
