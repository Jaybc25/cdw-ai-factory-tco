import { test, expect } from "@playwright/test";
import blueprintData from "../../src/blueprints.json" with { type: "json" };
import crosswalkData from "../../src/ModelAdvisorCrosswalk.json" with { type: "json" };

test("Use Case Explorer catalog and crosswalk remain one-to-one", async () => {
  const blueprintIds = blueprintData.blueprints.map((row) => row.id).sort();
  const crosswalkIds = crosswalkData.crosswalk.map((row) => row.id).sort();

  expect(blueprintData.meta.blueprint_count).toBe(blueprintData.blueprints.length);
  expect(new Set(blueprintIds).size).toBe(blueprintIds.length);
  expect(new Set(crosswalkIds).size).toBe(crosswalkIds.length);
  expect(crosswalkIds).toEqual(blueprintIds);
});

test("specialized capability batch avoids misleading Model Advisor routing", async () => {
  const byId = Object.fromEntries(crosswalkData.crosswalk.map((row) => [row.id, row]));

  expect(byId["cybersecurity-threat-detection"].routingClass).toBe("specialized-stack");
  expect(byId["cybersecurity-threat-detection"].gpuWorkloadType).toBe("cybersecurity-streaming-analytics");

  expect(byId["predictive-maintenance"].routingClass).toBe("infrastructure-first");
  expect(byId["predictive-maintenance"].gpuWorkloadType).toBe("predictive-maintenance-ml");

  expect(byId["route-optimization-cuopt"].routingClass).toBe("infrastructure-first");
  expect(byId["route-optimization-cuopt"].specializedStack).toBe("NVIDIA cuOpt");

  expect(byId["metropolis-vision-ai"].routingClass).toBe("specialized-stack");
  expect(byId["metropolis-vision-ai"].gpuWorkloadType).toBe("real-time-vision-inference");
  expect(byId["edge-ai-inference"].routingClass).toBe("platform-architecture");
  expect(byId["edge-ai-inference"].gpuWorkloadType).toBe("edge-inference-deployment");

  expect(byId["synthetic-data-generation"].routingClass).toBe("specialized-stack");
  expect(byId["synthetic-data-generation"].gpuWorkloadType).toBe("synthetic-data-generation");

  for (const id of [
    "cybersecurity-threat-detection",
    "predictive-maintenance",
    "route-optimization-cuopt",
    "metropolis-vision-ai",
    "edge-ai-inference",
    "synthetic-data-generation",
  ]) {
    expect(byId[id].modelAdvisorUmbrellas).toEqual([]);
    expect(byId[id].primaryUmbrella).toBeNull();
  }
});
