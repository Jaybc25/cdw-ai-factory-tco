import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage.jsx";
import TcoCalculator from "./TcoCalculator.jsx"; // <-- this is your existing calculator, renamed (see README-NEXT-STEPS.md)

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/tco" element={<TcoCalculator />} />
        {/* Add a new <Route> here for each future tool, e.g.: */}
        {/* <Route path="/gpu-sizing" element={<GpuSizingTool />} /> */}
      </Routes>
    </BrowserRouter>
  );
}
