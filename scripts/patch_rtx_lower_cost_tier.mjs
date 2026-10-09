import fs from "node:fs";

const path = "src/GpuSizingCalculator.jsx";
let src = fs.readFileSync(path, "utf8");

const lowerCostNeedle = '<ResultCard icon={TrendingDown} title="Lower-cost alternative" gpuClass={result.lowerCost.class} gpus={result.lowerCost.recommended} emptyMessage="No qualifying lower-cost alternative in the current supported catalog." />';
const lowerCostReplacement = '{mode === "Inference" ? <RtxProAlternativeCard rtxAlt={result.rtxAlt} compact /> : <ResultCard icon={TrendingDown} title="Lower-cost alternative" gpuClass={result.lowerCost.class} gpus={result.lowerCost.recommended} emptyMessage="No qualifying lower-cost alternative in the current supported catalog." />}';

const count = src.split(lowerCostNeedle).length - 1;
if (count !== 2) {
  throw new Error(`Expected exactly 2 lower-cost ResultCard occurrences, found ${count}`);
}
src = src.split(lowerCostNeedle).join(lowerCostReplacement);

const duplicateNeedle = '{mode === "Inference" && <RtxProAlternativeCard rtxAlt={result.rtxAlt} />}';
const duplicateCount = src.split(duplicateNeedle).length - 1;
if (duplicateCount !== 2) {
  throw new Error(`Expected exactly 2 standalone RTX card occurrences, found ${duplicateCount}`);
}
src = src.split(duplicateNeedle).join('');

const minNeedle = 'title="Minimum technical"';
const minCount = src.split(minNeedle).length - 1;
if (minCount !== 2) {
  throw new Error(`Expected exactly 2 Minimum technical titles, found ${minCount}`);
}
src = src.split(minNeedle).join('title="Unrounded requirement"');

const subtitleNeedle = 'subtitle="Unrounded workload requirement"';
const subtitleCount = src.split(subtitleNeedle).length - 1;
if (subtitleCount !== 2) {
  throw new Error(`Expected exactly 2 unrounded subtitles, found ${subtitleCount}`);
}
src = src.split(subtitleNeedle).join('subtitle="Technical workload requirement before production-system rounding"');

fs.writeFileSync(path, src);
console.log("RTX lower-cost tier patch applied successfully");
