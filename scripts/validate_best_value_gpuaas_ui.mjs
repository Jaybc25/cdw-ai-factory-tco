import fs from "node:fs";

const helper = fs.readFileSync("src/bestValueGpuaas.js", "utf8");
const panel = fs.readFileSync("src/BestValueGpuAasPanel.jsx", "utf8");

function need(source, text, message) {
  if (!source.includes(text)) throw new Error(message);
}

need(helper, "if (!rateInfo) continue;", "Missing exact GPU class must make a provider ineligible");
need(helper, "rateRegistry?.[provider]?.[gpuClass]", "Ranking must address the exact provider + GPU class registry entry");
need(helper, "confidence: rateInfo.conf", "Ranking helper must preserve pricing confidence");
need(panel, "row.confidence", "UI must render pricing confidence per provider");
need(panel, "QUOTE, EST, and NODE-NORM", "UI must warn that non-LISTED pricing needs validation");
need(panel, "Best modeled GPUaaS value", "UI must frame result as modeled economic value");
need(panel, "Ranked by modeled cost, not by SLA", "UI must disclose non-price factors that are not modeled");
need(panel, "Use provider", "UI must let the user deliberately apply a ranked provider rather than silently switching it");

console.log("Best-Value GPUaaS UI contract: PASS");
