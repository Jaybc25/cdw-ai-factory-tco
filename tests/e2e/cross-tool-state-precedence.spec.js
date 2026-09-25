import { test, expect } from "@playwright/test";
import { AUTH_BYPASSED, BYPASS_ONLY_REASON } from "./helpers/auth-context.js";

test.skip(!AUTH_BYPASSED, BYPASS_ONLY_REASON);

const KEYS = {
  advisor: "ai-factory-session:model-advisor",
  gpu: "ai-factory-session:gpu-sizing",
  roi: "ai-factory-session:roi",
};

async function seedSession(page, route, key, patch) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.waitForFunction((storageKey) => !!sessionStorage.getItem(storageKey), key);
  await page.evaluate(({ key: storageKey, patch: statePatch }) => {
    const current = JSON.parse(sessionStorage.getItem(storageKey) || "{}");
    const next = {
      ...current,
      ...statePatch,
      ...(statePatch.inputs ? { inputs: { ...(current.inputs || {}), ...statePatch.inputs } } : {}),
    };
    sessionStorage.setItem(storageKey, JSON.stringify(next));
  }, { key, patch });
}

async function waitForSession(page, key, expected = {}) {
  await page.waitForFunction(
    ({ storageKey, expectedState }) => {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      return Object.entries(expectedState).every(([field, value]) => {
        if (Array.isArray(value)) return JSON.stringify(saved[field]) === JSON.stringify(value);
        return saved[field] === value;
      });
    },
    { storageKey: key, expectedState: expected },
  );
  return page.evaluate((storageKey) => JSON.parse(sessionStorage.getItem(storageKey)), key);
}

test("Use Case Explorer handoff replaces Advisor-owned workload context but preserves Advisor-only assumptions", async ({ page }) => {
  await seedSession(page, "/model-advisor", KEYS.advisor, {
    checkedWorkloads: ["coding"],
    primaryWorkload: "coding",
    qualityPriority: "economical",
    contextWindow: "128k+",
    multimodal: "text-only",
    governance: "us-only",
    optimizationPriority: "infrastructure-efficiency",
    sourceUseCase: "old-use-case",
  });

  await page.goto(
    "/model-advisor?sourceUseCase=new-use-case&workloads=rag,chat&primary=rag&multimodal=image-text",
    { waitUntil: "domcontentloaded" },
  );

  const saved = await waitForSession(page, KEYS.advisor, {
    sourceUseCase: "new-use-case",
    checkedWorkloads: ["rag", "chat"],
    primaryWorkload: "rag",
  });
  expect(saved.qualityPriority).toBe("economical");
  expect(saved.contextWindow).toBe("128k+");
  expect(saved.multimodal).toBe("image-text");
  expect(saved.governance).toBe("us-only");
  expect(saved.optimizationPriority).toBe("infrastructure-efficiency");
  expect(new URL(page.url()).search).toBe("");

  await page.reload({ waitUntil: "domcontentloaded" });
  const afterReload = await waitForSession(page, KEYS.advisor, { sourceUseCase: "new-use-case", primaryWorkload: "rag" });
  expect(afterReload.checkedWorkloads).toEqual(["rag", "chat"]);
  expect(afterReload.qualityPriority).toBe("economical");
});

test("Use Case Explorer handoff changes GPU sizing mode without erasing mode-specific user settings", async ({ page }) => {
  await seedSession(page, "/gpu-sizing", KEYS.gpu, {
    mode: "Inference",
    pathLevel: "advanced",
    infModelId: "deepseek-r1",
    trainModelId: "llama-3.1-405b",
    quant: "FP4",
    concurrentUsers: 321,
    taskType: "LoRA / PEFT",
    precision: "FP8",
    datasetTokensB: 17,
    targetDays: 21,
    mfu: 0.35,
    sourceUseCase: "old-use-case",
  });

  await page.goto(
    "/gpu-sizing?sourceUseCase=new-training-use-case&workloadType=model-training&mode=Training",
    { waitUntil: "domcontentloaded" },
  );

  const saved = await waitForSession(page, KEYS.gpu, {
    mode: "Training",
    sourceUseCase: "new-training-use-case",
  });
  expect(saved.pathLevel).toBe("advanced");
  expect(saved.infModelId).toBe("deepseek-r1");
  expect(saved.trainModelId).toBe("llama-3.1-405b");
  expect(saved.quant).toBe("FP4");
  expect(saved.concurrentUsers).toBe(321);
  expect(saved.taskType).toBe("LoRA / PEFT");
  expect(saved.precision).toBe("FP8");
  expect(saved.datasetTokensB).toBe(17);
  expect(saved.targetDays).toBe(21);
  expect(saved.mfu).toBe(0.35);
  expect(new URL(page.url()).search).toBe("");
});

test("Explorer-set Training mode persists after URL cleanup and refresh", async ({ page }) => {
  await seedSession(page, "/gpu-sizing", KEYS.gpu, {
    mode: "Inference",
    incomingWorkloadType: null,
    incomingRoutingClass: null,
    sourceUseCase: null,
  });

  await page.goto(
    "/gpu-sizing?sourceUseCase=transaction-foundation-model&workloadType=model-training&routingClass=specialized-stack&mode=Training",
    { waitUntil: "domcontentloaded" },
  );

  let saved = await waitForSession(page, KEYS.gpu, {
    mode: "Training",
    sourceUseCase: "transaction-foundation-model",
    incomingWorkloadType: "model-training",
    incomingRoutingClass: "specialized-stack",
  });
  expect(new URL(page.url()).search).toBe("");

  await page.reload({ waitUntil: "domcontentloaded" });

  saved = await waitForSession(page, KEYS.gpu, {
    mode: "Training",
    sourceUseCase: "transaction-foundation-model",
    incomingWorkloadType: "model-training",
    incomingRoutingClass: "specialized-stack",
  });
  expect(saved.mode).toBe("Training");
});

test("fresh Model Advisor handoff updates the active GPU sizing model and supersedes unrelated stale Explorer provenance", async ({ page }) => {
  await seedSession(page, "/gpu-sizing", KEYS.gpu, {
    mode: "Training",
    pathLevel: "advanced",
    infModelId: "deepseek-r1",
    trainModelId: "llama-3.1-70b",
    taskType: "LoRA / PEFT",
    precision: "FP8",
    datasetTokensB: 23,
    targetDays: 19,
    mfu: 0.37,
    sourceUseCase: "unrelated-old-explorer-use-case",
    modelAdvisorRecommendedId: null,
  });

  await page.goto("/gpu-sizing?model=muse-glimmer-30b", { waitUntil: "domcontentloaded" });

  let saved = await waitForSession(page, KEYS.gpu, {
    mode: "Training",
    trainModelId: "muse-glimmer-30b",
    modelAdvisorRecommendedId: "muse-glimmer-30b",
  });
  expect(saved.infModelId).toBe("deepseek-r1");
  expect(saved.sourceUseCase).toBeNull();
  expect(saved.taskType).toBe("LoRA / PEFT");
  expect(saved.precision).toBe("FP8");
  expect(saved.datasetTokensB).toBe(23);
  expect(saved.targetDays).toBe(19);
  expect(saved.mfu).toBe(0.37);
  expect(new URL(page.url()).search).toBe("");
  await expect(page.getByText(/Model pre-set to Meta Muse Glimmer 30B, carried over from Model Advisor/)).toBeVisible();

  // Gemma 3 is now an existing-deployment choice, so an intentional edit to
  // that older model must first opt into the older supported catalog.
  const legacyToggle = page.getByLabel("Include models for existing deployments");
  await legacyToggle.check();
  const modelSelect = page.locator('select').filter({ has: page.locator('option[value="gemma-3-27b"]') }).first();
  await expect(modelSelect).toBeVisible();
  await modelSelect.selectOption("gemma-3-27b");
  saved = await waitForSession(page, KEYS.gpu, { trainModelId: "gemma-3-27b" });
  expect(saved.modelAdvisorRecommendedId).toBe("muse-glimmer-30b");
  await expect(page.getByText(/Model Advisor recommended Meta Muse Glimmer 30B.*currently sizing Gemma 3 27B/i)).toBeVisible();

  await legacyToggle.uncheck();
  await page.reload({ waitUntil: "domcontentloaded" });
  saved = await waitForSession(page, KEYS.gpu, { trainModelId: "gemma-3-27b", modelAdvisorRecommendedId: "muse-glimmer-30b" });
  expect(saved.sourceUseCase).toBeNull();
  await expect(page.getByText(/Model Advisor recommended Meta Muse Glimmer 30B.*currently sizing Gemma 3 27B/i)).toBeVisible();
});

test("pending Model Advisor recommendation survives refresh before visiting the other sizing mode", async ({ page }) => {
  await seedSession(page, "/gpu-sizing", KEYS.gpu, {
    mode: "Training",
    infModelId: "deepseek-r1",
    trainModelId: "llama-3.1-70b",
    modelAdvisorRecommendedId: null,
  });

  await page.goto("/gpu-sizing?model=muse-glimmer-30b", { waitUntil: "domcontentloaded" });

  let saved = await waitForSession(page, KEYS.gpu, {
    mode: "Training",
    trainModelId: "muse-glimmer-30b",
    modelAdvisorRecommendedId: "muse-glimmer-30b",
  });
  expect(saved.infModelId).toBe("deepseek-r1");
  expect(saved.advisorAppliedModes).toEqual({ Inference: false, Training: true });
  expect(new URL(page.url()).search).toBe("");

  await page.reload({ waitUntil: "domcontentloaded" });

  saved = await waitForSession(page, KEYS.gpu, {
    mode: "Training",
    trainModelId: "muse-glimmer-30b",
    modelAdvisorRecommendedId: "muse-glimmer-30b",
  });
  expect(saved.infModelId).toBe("deepseek-r1");
  expect(saved.advisorAppliedModes).toEqual({ Inference: false, Training: true });

  await page.getByRole("button", { name: "Inference sizing" }).click();

  saved = await waitForSession(page, KEYS.gpu, {
    mode: "Inference",
    infModelId: "muse-glimmer-30b",
    modelAdvisorRecommendedId: "muse-glimmer-30b",
  });
  expect(saved.advisorAppliedModes).toEqual({ Inference: true, Training: true });
});

test("fresh TCO handoff replaces ROI investment costs and provenance while preserving ROI business assumptions", async ({ page }) => {
  await seedSession(page, "/roi", KEYS.roi, {
    arrivedFromTco: true,
    tcoOriginalValues: { initialCost: 750000, recurringCost: 400000 },
    tcoPlanningBasis: "spend",
    inputs: {
      people: 411,
      tasksPerDay: 9,
      workingDays: 244,
      minutesPerTask: 17,
      loadedCost: 73,
      reductionPct: 0.31,
      adoptionPct: 0.77,
      realizationPct: 0.58,
      rampPct: 0.82,
      initialCost: 990000,
      recurringCost: 455000,
      horizonYears: 5,
      hoursPerWorkday: 7.5,
    },
  });

  await page.goto(
    "/roi?initialCost=2222222&recurringCost=333333&planningBasis=workload",
    { waitUntil: "domcontentloaded" },
  );

  let saved = await waitForSession(page, KEYS.roi, { arrivedFromTco: true, tcoPlanningBasis: "workload" });
  expect(saved.inputs.initialCost).toBe(2222222);
  expect(saved.inputs.recurringCost).toBe(333333);
  expect(saved.tcoOriginalValues).toEqual({ initialCost: 2222222, recurringCost: 333333 });
  expect(saved.inputs.people).toBe(411);
  expect(saved.inputs.tasksPerDay).toBe(9);
  expect(saved.inputs.workingDays).toBe(244);
  expect(saved.inputs.minutesPerTask).toBe(17);
  expect(saved.inputs.loadedCost).toBe(73);
  expect(saved.inputs.reductionPct).toBe(0.31);
  expect(saved.inputs.adoptionPct).toBe(0.77);
  expect(saved.inputs.realizationPct).toBe(0.58);
  expect(saved.inputs.rampPct).toBe(0.82);
  expect(saved.inputs.horizonYears).toBe(5);
  expect(saved.inputs.hoursPerWorkday).toBe(7.5);
  expect(new URL(page.url()).search).toBe("");

  await page.reload({ waitUntil: "domcontentloaded" });
  saved = await waitForSession(page, KEYS.roi, { arrivedFromTco: true, tcoPlanningBasis: "workload" });
  expect(saved.inputs.initialCost).toBe(2222222);
  expect(saved.inputs.recurringCost).toBe(333333);
  expect(saved.tcoOriginalValues).toEqual({ initialCost: 2222222, recurringCost: 333333 });
  expect(saved.inputs.people).toBe(411);
});



test("retail multimodal use cases carry image-text context into Model Advisor", async ({ page }) => {
  for (const scenario of [
    {
      sourceUseCase: "retail-catalog-enrichment",
      workloads: "summarization",
      primary: "summarization",
    },
    {
      sourceUseCase: "retail-shopping-assistant",
      workloads: "agentic",
      primary: "agentic",
    },
  ]) {
    await seedSession(page, "/model-advisor", KEYS.advisor, {
      checkedWorkloads: ["coding"],
      primaryWorkload: "coding",
      multimodal: "text-only",
      sourceUseCase: "old-use-case",
    });

    const params = new URLSearchParams({
      sourceUseCase: scenario.sourceUseCase,
      workloads: scenario.workloads,
      primary: scenario.primary,
      multimodal: "image-text",
    });
    await page.goto(`/model-advisor?${params.toString()}`, { waitUntil: "domcontentloaded" });

    const saved = await waitForSession(page, KEYS.advisor, {
      sourceUseCase: scenario.sourceUseCase,
      primaryWorkload: scenario.primary,
      multimodal: "image-text",
    });
    expect(saved.checkedWorkloads).toContain(scenario.primary);
    expect(new URL(page.url()).search).toBe("");
  }
});

test("new document extraction use case carries classification and multimodal context into Model Advisor", async ({ page }) => {
  await seedSession(page, "/model-advisor", KEYS.advisor, {
    checkedWorkloads: ["coding"],
    primaryWorkload: "coding",
    multimodal: "text-only",
    qualityPriority: "strong",
    sourceUseCase: "old-use-case",
  });

  await page.goto(
    "/model-advisor?sourceUseCase=multimodal-document-extraction&workloads=classification&primary=classification&multimodal=image-text",
    { waitUntil: "domcontentloaded" },
  );

  const saved = await waitForSession(page, KEYS.advisor, {
    sourceUseCase: "multimodal-document-extraction",
    checkedWorkloads: ["classification"],
    primaryWorkload: "classification",
    multimodal: "image-text",
  });
  expect(saved.qualityPriority).toBe("strong");
  expect(new URL(page.url()).search).toBe("");
});
