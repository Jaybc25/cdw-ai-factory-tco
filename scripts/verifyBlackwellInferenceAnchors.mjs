import fs from "node:fs";

const gpu = fs.readFileSync("src/GpuSizingCalculator.jsx", "utf8");
const pricing = fs.readFileSync("src/pricingRegistry.js", "utf8");

const required = [
  ['B200 v6.0 anchor', '{ id: "B200", vram: 180, bf16: 2250, fp8: 4500, anchor: 13072'],
  ['GB200 v6.0 anchor', '{ id: "GB200 NVL72", vram: 186, bf16: 2250, fp8: 4500, anchor: 12334'],
  ['B300 v6.0 anchor', '{ id: "B300", vram: 288, bf16: 2250, fp8: 5500, anchor: 14119'],
  ['GB300 v6.0 anchor', '{ id: "GB300 NVL72", vram: 288, bf16: 2250, fp8: 5500, anchor: 15651'],
  ['GB300 node size', 'anchor: 15651, anchorPrecision: "FP4 (NVFP4)", confidence: "LISTED"'],
  ['GB300 system mapping', '"GB300 NVL72": "DGX GB300 NVL-72"'],
];

for (const [name, needle] of required) {
  const haystack = name.includes('mapping') ? pricing : gpu;
  if (!haystack.includes(needle)) throw new Error(`${name} missing or changed`);
}

for (const stale of ['1,100,000 tok/s', '865,000 tok/s', 'Signal65']) {
  if (gpu.includes(stale)) throw new Error(`Stale inference evidence remains: ${stale}`);
}

console.log('Blackwell inference anchors verified: direct NVIDIA MLPerf v6.0 values present; GB300 mapped as 72-GPU class.');
