import fs from "node:fs";

function replaceOnce(source, needle, replacement, label) {
  const index = source.indexOf(needle);
  if (index === -1) throw new Error(`Missing patch target: ${label}`);
  if (source.indexOf(needle, index + needle.length) !== -1) throw new Error(`Patch target not unique: ${label}`);
  return source.slice(0, index) + replacement + source.slice(index + needle.length);
}

function patch(path, updater) {
  const before = fs.readFileSync(path, "utf8");
  const after = updater(before);
  if (before === after) throw new Error(`No changes produced for ${path}`);
  fs.writeFileSync(path, after);
  console.log(`Patched ${path}`);
}

const helper = `\n\n  function openAudit() {\n    if (isLoggedIn && !needsSetup && account) {\n      setLead({ name: account.name || "", company: account.company || "", email: account.email || "" });\n    }\n    setView("audit");\n  }\n`;

patch("src/GpuSizingCalculator.jsx", (s) => {
  s = replaceOnce(s, "\n\n  function requestReport() {", `${helper}\n  function requestReport() {`, "GPU openAudit helper");
  return replaceOnce(
    s,
    `              <button onClick={requestReport} className="mt-3 w-full text-sm font-bold py-2.5 rounded-lg text-white" style={{ background: RED }}>Get the full sizing report</button>`,
    `              <div className="mt-3 flex flex-col sm:flex-row gap-2">\n                <button onClick={requestReport} className="w-full sm:flex-1 text-sm font-bold py-2.5 rounded-lg text-white" style={{ background: RED }}>Get the full sizing report</button>\n                <button onClick={openAudit} className="w-full sm:w-auto text-sm font-semibold py-2.5 px-4 rounded-lg border border-gray-300 bg-white" style={{ color: CHARCOAL }}>Calculation Methodology &amp; Audit Trail</button>\n              </div>`,
    "GPU calculator CTA"
  );
});

patch("src/ModelAdvisor.jsx", (s) => {
  s = replaceOnce(s, "\n\n  function requestReport() {", `${helper}\n  function requestReport() {`, "Model Advisor openAudit helper");
  return replaceOnce(
    s,
    `            {result.cards.length > 0 && (\n              <button\n                onClick={requestReport}\n                className="mt-6 w-full text-sm font-bold py-2.5 rounded-lg text-white"\n                style={{ background: RED }}\n              >\n                Get the full report\n              </button>\n            )}`,
    `            {result.cards.length > 0 && (\n              <div className="mt-6 flex flex-col sm:flex-row gap-2">\n                <button\n                  onClick={requestReport}\n                  className="w-full sm:flex-1 text-sm font-bold py-2.5 rounded-lg text-white"\n                  style={{ background: RED }}\n                >\n                  Get the full report\n                </button>\n                <button\n                  onClick={openAudit}\n                  className="w-full sm:w-auto text-sm font-semibold py-2.5 px-4 rounded-lg border border-gray-300 bg-white"\n                  style={{ color: CHARCOAL }}\n                >\n                  Why these recommendations?\n                </button>\n              </div>\n            )}`,
    "Model Advisor calculator CTA"
  );
});

patch("src/RoiCalculator.jsx", (s) => {
  s = replaceOnce(s, "\n\n  function requestReport() {", `${helper}\n  function requestReport() {`, "ROI openAudit helper");
  return replaceOnce(
    s,
    `                <button\n                  onClick={requestReport}\n                  style={{ width: "100%", marginTop: 14, fontWeight: 700, fontSize: 14, padding: "11px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: RED, color: "#fff" }}\n                >\n                  Get the full ROI report\n                </button>`,
    `                <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 8, marginTop: 14 }}>\n                  <button\n                    onClick={requestReport}\n                    style={{ flex: 1, width: isMobile ? "100%" : "auto", fontWeight: 700, fontSize: 14, padding: "11px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: RED, color: "#fff" }}\n                  >\n                    Get the full ROI report\n                  </button>\n                  <button\n                    onClick={openAudit}\n                    style={{ width: isMobile ? "100%" : "auto", fontWeight: 600, fontSize: 13, padding: "11px 12px", borderRadius: 8, border: "1px solid " + GRAY_BORDER, cursor: "pointer", background: "#fff", color: CHARCOAL }}\n                  >\n                    Calculation Methodology &amp; Audit Trail\n                  </button>\n                </div>`,
    "ROI calculator CTA"
  );
});

patch("src/TcoCalculator.jsx", (s) => {
  s = replaceOnce(s, "\n\n  function requestReport() {", `${helper}\n  function requestReport() {`, "TCO openAudit helper");
  return replaceOnce(
    s,
    `        <button onClick={requestReport}\n          style={{ ...disp, width: "100%", fontWeight: 700, fontSize: 15, padding: "14px", borderRadius: 10,\n            border: "none", cursor: "pointer", background: C.green, color: "#fff", marginBottom: 10 }}>\n          Get the full report (PDF)\n        </button>`,
    `        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>\n          <button onClick={requestReport}\n            style={{ ...disp, flex: "1 1 240px", fontWeight: 700, fontSize: 15, padding: "14px", borderRadius: 10,\n              border: "none", cursor: "pointer", background: C.green, color: "#fff" }}>\n            Get the full report (PDF)\n          </button>\n          <button onClick={openAudit}\n            style={{ ...disp, flex: "1 1 240px", fontWeight: 600, fontSize: 13, padding: "14px", borderRadius: 10,\n              border: "1px solid " + C.line, cursor: "pointer", background: "#fff", color: C.ink }}>\n            Calculation Methodology &amp; Audit Trail\n          </button>\n        </div>`,
    "TCO calculator CTA"
  );
});
