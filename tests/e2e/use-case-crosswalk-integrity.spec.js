import { test, expect } from "@playwright/test";
import fs from "node:fs";
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


test("consolidated use cases keep one customer-facing entry per capability", async () => {
  const blueprintById = Object.fromEntries(blueprintData.blueprints.map((row) => [row.id, row]));
  const crosswalkById = Object.fromEntries(crosswalkData.crosswalk.map((row) => [row.id, row]));

  expect(blueprintById["nemoclaw-hermes"].name).toBe("Governed Workflow & Autonomous Agents");
  expect(blueprintById["nemoclaw-langchain"]).toBeUndefined();
  expect(blueprintById["nemoclaw-openclaw"]).toBeUndefined();
  expect(crosswalkById["nemoclaw-langchain"]).toBeUndefined();
  expect(crosswalkById["nemoclaw-openclaw"]).toBeUndefined();

  expect(blueprintById["mega-multi-robot-fleet"].name).toBe("Factory & Operational Digital Twin");
  expect(blueprintById["digital-twin-fluid-simulation"].name).toBe("Real-Time CAE Digital Twins");
});


test("education taxonomy has no legacy generic education examples", async () => {
  for (const blueprint of blueprintData.blueprints) {
    expect(blueprint.detail_in_practice?.education).toBeUndefined();
  }
});

test("federal contractor label preserves non-defense federal contractor scope", async () => {
  const explorerSource = fs.readFileSync(new URL("../../src/UseCaseExplorer.jsx", import.meta.url), "utf8");
  expect(explorerSource).toContain('label: "Federal & Defense Contractors"');
  expect(explorerSource).not.toContain('label: "Federal / Defense Contractors"');
});


test("AI coding agent is a distinct customer-facing capability", async () => {
  const blueprintById = Object.fromEntries(blueprintData.blueprints.map((row) => [row.id, row]));
  const crosswalkById = Object.fromEntries(crosswalkData.crosswalk.map((row) => [row.id, row]));

  expect(blueprintById["ai-coding-agent"].name).toBe("AI-Assisted Coding & Software Engineering Agent");
  expect(blueprintById["ai-coding-agent"].department_fit["information-technology"]).toBe("primary");
  expect(crosswalkById["ai-coding-agent"].routingClass).toBe("general-model-selection");
  expect(crosswalkById["ai-coding-agent"].primaryUmbrella).toBe("Coding");
  expect(crosswalkById["ai-coding-agent"].modelAdvisorUmbrellas).toContain("Agentic AI & Tool Use");
});

test("Earth-2 is not mapped to K-12", async () => {
  const blueprintById = Object.fromEntries(blueprintData.blueprints.map((row) => [row.id, row]));
  expect(blueprintById["earth2-weather-analytics"].industry_fit["k12-education"]).toBeUndefined();
  expect(blueprintById["earth2-weather-analytics"].industry_fit["higher-education"]).toBe("adjacent");
});
