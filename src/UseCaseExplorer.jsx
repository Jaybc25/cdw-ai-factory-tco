import { useState, useRef, useEffect } from "react";
import cdwLogo from "./cdw-logo.png";
import blueprintData from "./blueprints.json";
import crosswalkData from "./ModelAdvisorCrosswalk.json";

// ─── cross-tool handoff: build param-carrying URLs from the crosswalk ────────
// Maps a crosswalk umbrella label to the exact `value` string Model Advisor's
// WORKLOAD_OPTIONS uses. Vision & Multimodal has no ModelAdvisor equivalent
// yet, so it's intentionally left out -- a blueprint whose only umbrella is
// Vision & Multimodal won't pre-check anything, which is correct until that
// checkbox exists.
const UMBRELLA_TO_WORKLOAD_VALUE = {
  "Chat & Assistants": "chat",
  "RAG & Knowledge Retrieval": "rag",
  "Coding": "coding",
  "Summarization & Content Generation": "summarization",
  "Agentic AI & Tool Use": "agentic",
  "Reasoning & Analysis": "reasoning",
  "Classification & Extraction": "classification",
};

const CROSSWALK_BY_ID = Object.fromEntries(
  crosswalkData.crosswalk.map((row) => [row.id, row])
);

// Builds the three handoff hrefs for a given blueprint. Falls back to a bare
// link with just sourceUseCase if the blueprint isn't in the crosswalk yet
// (new blueprints added to blueprints.json before the crosswalk catches up).
function buildHandoffLinks(bp) {
  const row = CROSSWALK_BY_ID[bp.id];
  const sourceUseCase = encodeURIComponent(bp.id);

  if (!row) {
    return {
      modelAdvisor: `/model-advisor?sourceUseCase=${sourceUseCase}`,
      gpuSizing: `/gpu-sizing?sourceUseCase=${sourceUseCase}`,
      tco: `/tco?sourceUseCase=${sourceUseCase}`,
      showModelAdvisor: true,
      showGpuSizing: true,
      note: null,
    };
  }

  const workloadValues = (row.modelAdvisorUmbrellas || [])
    .map((u) => UMBRELLA_TO_WORKLOAD_VALUE[u])
    .filter(Boolean);
  const primaryValue = UMBRELLA_TO_WORKLOAD_VALUE[row.primaryUmbrella] || workloadValues[0];

  const modelAdvisorParams = new URLSearchParams({ sourceUseCase: row.id });
  if (workloadValues.length) modelAdvisorParams.set("workloads", workloadValues.join(","));
  if (primaryValue) modelAdvisorParams.set("primary", primaryValue);

  const gpuSizingParams = new URLSearchParams({ sourceUseCase: row.id });
  if (row.gpuWorkloadType) gpuSizingParams.set("workloadType", row.gpuWorkloadType);
  if (row.workloadFamily === "Specialized Science" || row.gpuWorkloadType === "model-training") {
    gpuSizingParams.set("mode", "Training");
  }

  const tcoParams = new URLSearchParams({ sourceUseCase: row.id });

  // routingClass decides whether Model Advisor is even a sensible destination.
  // Only general-model-selection blueprints get real workload checkboxes
  // pre-filled there -- everything else (infrastructure-first, specialized-
  // stack, platform-architecture) has an empty modelAdvisorUmbrellas array,
  // so showing that pill would land someone on a screen with nothing checked
  // and no explanation why. Hide it instead, and say why in a note.
  const showModelAdvisor = row.routingClass === "general-model-selection";
  const showGpuSizing = row.routingClass !== "platform-architecture";

  let note = null;
  if (row.routingClass === "infrastructure-first") {
    note = "This use case is infrastructure/compute-driven rather than an open-weight model selection question -- go straight to GPU Sizing.";
  } else if (row.routingClass === "specialized-stack") {
    note = `This use case relies on a specialized NVIDIA stack (${row.specializedStack}) rather than a general-purpose open-weight model, so Model Advisor's rankings don't apply here. GPU Sizing below reflects general compute scale for reference.`;
  } else if (row.routingClass === "platform-architecture") {
    note = `This use case is a platform/architecture consideration (${row.specializedStack}) rather than a model-selection or sizing question. Connect with a CDW AI Factory specialist to scope this one.`;
  }

  return {
    modelAdvisor: `/model-advisor?${modelAdvisorParams.toString()}`,
    gpuSizing: `/gpu-sizing?${gpuSizingParams.toString()}`,
    tco: `/tco?${tcoParams.toString()}`,
    routingClass: row.routingClass,
    showModelAdvisor,
    showGpuSizing,
    note,
  };
}

// ─── design tokens ────────────────────────────────────────────────────────────
const CDW_RED    = "#cc0000";
const CDW_DARK   = "#1a1a1a";
const CDW_BORDER = "#e0e0e0";
const CDW_BG     = "#f5f5f5";

// ─── industry + function lists ────────────────────────────────────────────────
const INDUSTRIES = [
  { id: "education",               label: "Education" },
  { id: "federal-defense",         label: "Federal / Defense Contractors" },
  { id: "financial-services",      label: "Financial Services" },
  { id: "food-cpg-manufacturing",  label: "Food & CPG Manufacturing" },
  { id: "general-manufacturing",   label: "General Manufacturing" },
  { id: "healthcare-life-sciences",label: "Healthcare & Life Sciences" },
  { id: "legal-services",          label: "Legal Services" },
  { id: "oil-gas",                 label: "Oil & Gas" },
  { id: "retail-distribution",     label: "Retail & Distribution" },
  { id: "state-local-government",  label: "State & Local Government" },
  { id: "transportation-logistics",label: "Transportation & Logistics" },
  { id: "utilities-energy",        label: "Utilities & Energy" },
  { id: "general-enterprise",      label: "Other / General Enterprise" },
];

const BUSINESS_FUNCTIONS = [
  { id: "customer-service",      label: "Customer Service",         gov: "Citizen Services / Contact Center" },
  { id: "cybersecurity",         label: "Cybersecurity",            gov: "CISO / Information Security" },
  { id: "data-analytics",        label: "Data & Analytics",         gov: "Data Office / Policy Analytics" },
  { id: "finance",               label: "Finance",                  gov: "Fiscal / Budget / Comptroller" },
  { id: "human-resources",       label: "Human Resources",          gov: "Personnel / HR / CMS" },
  { id: "information-technology",label: "Information Technology",   gov: "DoIT / State CIO / Enterprise IT" },
  { id: "legal-compliance",      label: "Legal & Compliance",       gov: "AG Office / Inspector General / Courts" },
  { id: "marketing",             label: "Marketing",                gov: "Communications / Public Affairs" },
  { id: "operations",            label: "Operations",               gov: "Facilities / Ops / Emergency Mgmt" },
  { id: "research-engineering",  label: "Research & Engineering",   gov: "Policy Research / Public Health Lab" },
  { id: "sales",                 label: "Sales",                    gov: "Economic Development / Procurement" },
  { id: "supply-chain-logistics",label: "Supply Chain & Logistics", gov: "Procurement / Surplus / Warehousing" },
  { id: "communications",        label: "Communications",           gov: "Agency Comms / Governor's Office" },
];

const CATEGORIES = blueprintData.meta.use_case_categories;
const ALL_BLUEPRINTS = blueprintData.blueprints;

// ─── context profiles (26 total: 13 industry + 13 function) ──────────────────
const CONTEXT_PROFILES = {

  // ── INDUSTRIES ──────────────────────────────────────────────────────────────

  "education": {
    headline: "Where AI creates value in Education",
    relevance: "Most relevant when: your institution manages high volumes of student or staff inquiries, runs computationally intensive research, or needs to scale content and knowledge access without proportional staff growth.",
    summary: "Educational institutions manage complex webs of student services, research operations, administrative workflows, and compliance obligations — often with constrained staff and IT resources. AI can help expand access to institutional knowledge, reduce administrative burden on faculty and staff, accelerate research in computationally intensive disciplines, and improve the student experience without proportional headcount growth.",
    benefits: [
      { title: "Student & Staff Services", text: "Make policy, program, and support information easier to find and act on, reducing the volume of routine inquiries that reach staff." },
      { title: "Research Acceleration", text: "Apply GPU-accelerated computing to genomics, simulation, robotics, and scientific computing workloads that require specialized compute capacity." },
      { title: "Operational Efficiency", text: "Reduce time spent on documentation, content creation, and administrative processes so faculty and staff can focus on higher-value work." },
    ],
  },

  "federal-defense": {
    headline: "Where AI creates value in Federal and Defense",
    relevance: "Most relevant when: your organization manages large volumes of program documentation, operates sensitive development environments, or is building or fielding autonomous systems.",
    summary: "Federal agencies and defense contractors operate in environments defined by strict security requirements, complex documentation obligations, and the need to maintain operational advantage. AI can compress the time required for knowledge-intensive tasks, strengthen software and infrastructure security, enable autonomous system development, and support engineering simulation — while preserving the access controls and audit requirements these environments demand.",
    benefits: [
      { title: "Mission & Program Intelligence", text: "Make acquisition documents, technical orders, requirements traceability, and program history queryable so analysts and engineers spend less time hunting and more time acting." },
      { title: "Secure Software & Infrastructure", text: "Accelerate vulnerability triage, container security analysis, and DevSecOps workflows across large and complex software portfolios." },
      { title: "Autonomous Systems & Simulation", text: "Develop, train, and test autonomous vehicle, robotics, and unmanned system capabilities using synthetic data and digital twin environments before physical deployment." },
      { title: "Governed Agent Execution", text: "Deploy AI agents in sandboxed, policy-controlled environments designed to support security review, access control, and audit requirements in sensitive development contexts." },
    ],
  },

  "financial-services": {
    headline: "Where AI creates value in Financial Services",
    relevance: "Most relevant when: your organization manages high transaction volume, faces regulatory scrutiny, or needs to generate insight faster from complex financial data.",
    summary: "Financial services organizations face a combination of high-volume transaction environments, intensifying regulatory scrutiny, and pressure to generate insight faster from increasingly complex data. AI can accelerate research and analysis, detect fraud and anomalies across large transaction datasets, support more frequent portfolio optimization and scenario analysis, and make large volumes of financial knowledge more accessible — while supporting the governance and auditability that regulators expect.",
    benefits: [
      { title: "Faster Analysis & Research", text: "Compress the time analysts spend synthesizing earnings data, regulatory filings, market signals, and internal research into actionable intelligence." },
      { title: "Risk & Fraud Detection", text: "Identify fraud patterns, anomalies, and behavioral signals across large transaction datasets — closer to the point of activity rather than relying solely on retrospective batch review." },
      { title: "Quantitative Operations", text: "Support more frequent portfolio optimization, risk scenario analysis, and signal discovery workloads using GPU-accelerated computation." },
      { title: "Regulatory & Compliance Support", text: "Make policy documents, control evidence, model validation records, and prior regulatory correspondence queryable so compliance teams can respond faster and with more confidence." },
    ],
  },

  "food-cpg-manufacturing": {
    headline: "Where AI creates value in Food & CPG Manufacturing",
    relevance: "Most relevant when: your organization runs high-throughput production, manages complex supplier networks, or is developing robotic or automation capabilities for physical handling tasks.",
    summary: "Food and CPG manufacturers operate high-throughput production environments with complex supplier networks, tight regulatory requirements, and significant labor exposure in repetitive physical tasks. AI can support robotic automation development, improve supply chain visibility, accelerate product content operations, and apply scientific AI to food science and agricultural bioengineering challenges.",
    benefits: [
      { title: "Robotic Automation", text: "Train robotic systems for picking, packing, palletizing, and material handling using synthetic data — accelerating deployment without large volumes of physical demonstration data." },
      { title: "Supply Chain Intelligence", text: "Monitor supplier quality, analyze risk signals, and make procurement and compliance documentation queryable across a complex ingredient and materials network." },
      { title: "Product Content at Scale", text: "Generate and localize product descriptions, nutritional content, and marketing copy across retailers, regions, and languages without proportional content team growth." },
      { title: "Food Science & Bioengineering", text: "Explore protein, molecular, and genomic AI for fermentation, ingredient research, and agricultural biotech use cases alongside traditional lab workflows." },
    ],
  },

  "general-manufacturing": {
    headline: "Where AI creates value in General Manufacturing",
    relevance: "Most relevant when: your organization is developing robotic capabilities, running engineering simulation workloads, or managing large volumes of technical documentation and operational video.",
    summary: "Manufacturers face persistent pressure to reduce downtime, improve throughput, develop robotic capabilities, and extract more value from engineering and operational data. AI can accelerate robot training, enable digital twin simulation, make engineering knowledge more accessible, and apply computer vision to quality and safety — across both discrete and process manufacturing environments.",
    benefits: [
      { title: "Physical AI & Robotics", text: "Train robots to perform complex manipulation tasks using synthetic demonstrations, and test multi-robot deployments in digital environments before touching the production floor." },
      { title: "Engineering Simulation", text: "Apply GPU-accelerated computational fluid dynamics and digital twin environments to thermal, airflow, and process engineering challenges — compressing design cycles." },
      { title: "Engineering Knowledge", text: "Make work instructions, engineering change orders, service bulletins, and failure documentation queryable by engineers and technicians without manual searching." },
      { title: "Video & Operational Intelligence", text: "Detect quality defects, safety violations, and process anomalies across production camera networks without requiring constant human monitoring." },
    ],
  },

  "healthcare-life-sciences": {
    headline: "Where AI creates value in Healthcare & Life Sciences",
    relevance: "Most relevant when: your organization faces clinical documentation burden, runs biomedical research workloads, manages large patient populations, or handles sensitive data that benefits from greater architectural control.",
    summary: "Healthcare and life sciences organizations span clinical operations, biomedical research, drug discovery, and population health — each with distinct AI opportunities and distinct data sensitivity requirements. AI can reduce administrative burden on clinical staff, accelerate research in genomics and molecular biology, strengthen fraud and billing integrity, and improve patient access to care navigation — with deployment architectures that can support tighter control over sensitive data.",
    benefits: [
      { title: "Clinical Workforce Capacity", text: "Reduce the documentation and administrative burden on clinicians so more time goes to patient care rather than charting and coordination tasks." },
      { title: "Biomedical & Drug Discovery Research", text: "Apply GPU-accelerated genomics, protein design, and molecular screening to compress research cycles that previously required longer compute runs." },
      { title: "Patient & Member Services", text: "Improve access to care navigation, benefits information, and post-discharge support without requiring proportional growth in care coordination staff." },
      { title: "Data Integrity & Fraud", text: "Detect billing anomalies, duplicate claims, and inappropriate prescribing patterns across large and complex payer and provider networks." },
    ],
  },

  "legal-services": {
    headline: "Where AI creates value in Legal Services",
    relevance: "Most relevant when: your organization manages large volumes of contracts, case files, regulatory filings, or discovery material where research speed and citation discipline matter.",
    summary: "Legal teams operate in environments defined by the need to find, synthesize, and apply large volumes of precise information quickly — across case files, contracts, precedents, regulations, and matter history. The cost of incomplete or slow research is high. AI can make legal knowledge more accessible, accelerate matter research and document review, and support structured synthesis while maintaining links back to source material.",
    benefits: [
      { title: "Matter Research & Knowledge Retrieval", text: "Make case history, precedent, contracts, and regulatory guidance queryable so attorneys find what they need without manual repository navigation." },
      { title: "Document Review & Synthesis", text: "Accelerate review of discovery, contracts, and correspondence — surfacing relevant clauses, obligations, and chronology with source citations." },
      { title: "Regulatory Intelligence", text: "Monitor and synthesize changing regulatory requirements against internal policies and client obligations faster than manual tracking allows." },
    ],
  },

  "oil-gas": {
    headline: "Where AI creates value in Oil & Gas",
    relevance: "Most relevant when: your organization manages geographically distributed assets, large field workforces, or equipment that operates in hazardous or remote environments.",
    summary: "Oil and gas operators manage geographically distributed assets, complex subsurface data, large field workforces, and equipment that operates in hazardous or remote environments. AI can improve field operational intelligence, accelerate engineering simulation for fluid-intensive systems, support autonomous and robotic inspection capabilities, and make large volumes of structured operational data more queryable — with particular strength in environments where human access is expensive or dangerous.",
    benefits: [
      { title: "Field & Operational Intelligence", text: "Give field technicians and operations teams hands-free access to equipment manuals, procedures, and site-specific guidance — reducing reliance on specialists for routine questions." },
      { title: "Engineering Simulation", text: "Apply GPU-accelerated computational fluid dynamics to reservoir, pipeline, equipment, and facility design challenges that traditionally required specialized HPC infrastructure." },
      { title: "Autonomous Inspection", text: "Develop and train robotic and drone inspection capabilities using synthetic data and video dataset search — reducing human exposure in hazardous environments." },
      { title: "Operational Data Analytics", text: "Accelerate queries over large historical drilling, production, and sensor datasets that are too large for conventional infrastructure to handle interactively." },
    ],
  },

  "retail-distribution": {
    headline: "Where AI creates value in Retail & Distribution",
    relevance: "Most relevant when: your organization manages large SKU catalogs, high-volume fulfillment operations, or customer service interactions at a scale that strains staffing capacity.",
    summary: "Retailers and distributors operate at the intersection of high consumer expectations, complex fulfillment operations, and competitive pressure on margin. AI can improve the customer discovery and purchase experience, automate catalog and content operations at scale, optimize warehouse and fulfillment workflows, and strengthen loss prevention and returns management — without proportional growth in operational headcount.",
    benefits: [
      { title: "Customer Experience", text: "Deploy AI-powered shopping assistance and voice agents that provide expert guidance at scale, whether in-store, online, or through contact centers." },
      { title: "Catalog & Content Operations", text: "Generate product descriptions, extract structured attributes, and localize content across markets automatically — reducing the manual effort of maintaining large SKU catalogs." },
      { title: "Fulfillment & Warehouse Operations", text: "Optimize pick-pack-ship workflows, coordinate robotic and human workers, and surface inventory exceptions using multi-agent AI systems." },
      { title: "Loss Prevention & Exception Investigation", text: "Accelerate review of shrink, returns abuse, and operational exceptions by connecting transaction patterns with relevant video evidence." },
    ],
  },

  "state-local-government": {
    headline: "Where AI creates value in State & Local Government",
    relevance: "Most relevant when: your agency manages high citizen service volume, fragmented institutional knowledge, complex fraud exposure, or physical and operational environments that require ongoing monitoring.",
    summary: "State and local governments manage an unusually broad operational scope — citizen services, public safety, infrastructure, finance, human services, procurement, and regulatory compliance — often with constrained staff and aging technology infrastructure. AI can expand service capacity without proportional headcount growth, make institutional knowledge more accessible across agencies, strengthen fraud detection and cybersecurity, and improve situational awareness across physical and operational environments.",
    benefits: [
      { title: "Citizen Service Capacity", text: "Handle high volumes of routine citizen inquiries through voice and virtual agents, freeing staff for complex cases while improving after-hours accessibility." },
      { title: "Government Workforce Productivity", text: "Make policy, statute, procurement rules, and program guidance queryable by employees across agencies — reducing time spent searching and waiting for answers." },
      { title: "Operations & Infrastructure", text: "Extract insight from video, sensor, radio, and field data streams to support public safety, emergency management, and infrastructure oversight." },
      { title: "Risk, Fraud & Governance", text: "Detect benefits anomalies, billing irregularities, and procurement exceptions closer to the point of activity, and deploy AI with the access controls and audit trails that government security review requires." },
    ],
  },

  "transportation-logistics": {
    headline: "Where AI creates value in Transportation & Logistics",
    relevance: "Most relevant when: your organization generates large volumes of vehicle or terminal video, is developing autonomous or robotic systems, or manages operational data at a scale that conventional reporting cannot answer interactively.",
    summary: "Transportation and logistics operators manage fleets, terminals, yards, and distribution networks where operational exceptions are constant and the cost of delay compounds quickly. AI can accelerate autonomous system development, optimize multi-robot and vehicle fleet operations, improve situational awareness through video and sensor intelligence, and make large operational datasets more queryable.",
    benefits: [
      { title: "Autonomous System Development", text: "Accelerate post-training of autonomous vehicle and robotics stacks using semantic video search over large datasets — finding edge cases that matter without manually reviewing large archives." },
      { title: "Fleet & Terminal Operations", text: "Simulate robot and vehicle fleet behavior in digital environments before physical deployment, reducing commissioning risk and supporting routing and task optimization." },
      { title: "Incident & Exception Intelligence", text: "Surface incidents, safety violations, and operational exceptions from terminal and depot camera networks without requiring constant human monitoring." },
      { title: "Operational Analytics", text: "Query large historical shipment, asset, and telematics datasets interactively to answer operational questions that traditional reporting infrastructure answers too slowly." },
    ],
  },

  "utilities-energy": {
    headline: "Where AI creates value in Utilities & Energy",
    relevance: "Most relevant when: your organization manages distributed infrastructure, large field workforces, or operational datasets that require faster query and analysis than conventional tools support.",
    summary: "Utilities and energy companies manage critical infrastructure across distributed geographic footprints, with high consequences for operational failure and growing pressure to improve efficiency, resilience, and safety. AI can sharpen forecasting, support remote and hazardous inspection with autonomous systems, make operational knowledge more accessible to field workers, and accelerate analysis of the large structured datasets that utility operations generate continuously.",
    benefits: [
      { title: "Grid & Infrastructure Intelligence", text: "Improve forecast accuracy for generation, demand, and severe weather events — enabling earlier operational decisions and more precise resource positioning." },
      { title: "Remote & Autonomous Inspection", text: "Develop inspection drone and robotic capabilities using synthetic training data and large video dataset search — reducing human exposure on transmission lines, substations, and generation facilities." },
      { title: "Field Worker Support", text: "Give field crews hands-free access to equipment manuals, restoration procedures, and troubleshooting guidance — reducing dependency on specialists for routine operational questions." },
      { title: "Operational Data Analytics", text: "Accelerate queries over meter, outage, asset, and sensor event histories that exceed what conventional reporting infrastructure can answer interactively." },
    ],
  },

  "general-enterprise": {
    headline: "Where AI creates value across the Enterprise",
    relevance: "Most relevant when: your organization is building foundational AI infrastructure, or has use cases that span multiple departments rather than belonging clearly to one vertical.",
    summary: "Some AI capabilities deliver value regardless of industry — wherever organizations need to make institutional knowledge more accessible, automate high-volume interactions, govern AI deployments responsibly, or accelerate developer and analytical workflows. These blueprints represent the horizontal foundation that most enterprise AI programs are built on, and often serve as the entry point before more specialized use cases are layered in.",
    benefits: [
      { title: "Enterprise Knowledge Access", text: "Make policy, process, and institutional knowledge queryable across the organization without building separate solutions for each department." },
      { title: "Interaction Automation", text: "Handle high-volume voice and text interactions through AI agents, reducing cost-per-contact and improving accessibility without proportional staffing growth." },
      { title: "AI Platform & Governance", text: "Deploy, route, secure, and monitor AI models and agents across the enterprise with the controls that production use requires." },
      { title: "Developer & Analytical Productivity", text: "Accelerate GPU-aware development, high-volume SQL analytics, and research workflows that benefit from purpose-built AI assistance." },
    ],
  },

  // ── BUSINESS FUNCTIONS ───────────────────────────────────────────────────────

  "customer-service": {
    headline: "Where AI creates value in Customer Service",
    relevance: "Most relevant when: your team handles high inquiry volume, fragmented knowledge bases, or service demand that exceeds available staffing capacity.",
    summary: "Customer service and contact center teams handle high volumes of repetitive inquiries while also managing complex escalations that require human judgment and empathy. The cost of that volume — in staffing, wait times, and inconsistent answers — is visible and measurable. AI can expand capacity for routine interactions, ground agent responses in accurate institutional knowledge, and make service more accessible across channels and hours without proportional headcount growth.",
    benefits: [
      { title: "Interaction Capacity", text: "Handle routine inquiries through voice and virtual agents so human staff can focus on cases that genuinely require judgment, de-escalation, or discretion." },
      { title: "Knowledge-Grounded Responses", text: "Give agents and AI systems access to accurate, cited answers from product, policy, and program documentation — helping reduce inconsistent responses at the point of interaction." },
      { title: "Multilingual & After-Hours Access", text: "Extend service availability and language coverage without requiring corresponding staffing increases for each channel or shift." },
      { title: "Escalation Intelligence", text: "Summarize interaction history and surface relevant context before a case reaches a human agent, reducing repeat explanation burden on customers and handle time for staff." },
    ],
  },

  "cybersecurity": {
    headline: "Where AI creates value in Cybersecurity",
    relevance: "Most relevant when: your team manages more alerts, vulnerabilities, and threat signals than manual review can cover — or is responsible for governing AI deployments in production.",
    summary: "Security teams operate under a structural disadvantage — the volume of alerts, vulnerabilities, and threat signals consistently exceeds the capacity to review them manually. AI can help prioritize what actually requires attention, accelerate investigation of incidents and footage, harden AI agent deployments against adversarial manipulation, and make security documentation and runbook knowledge more accessible to analysts under pressure.",
    benefits: [
      { title: "Vulnerability Prioritization", text: "Accelerate triage of CVEs and container vulnerabilities by using AI to assess exploitability in context, rather than treating every finding as equal priority." },
      { title: "Incident Investigation", text: "Search video, log, and document evidence faster when investigating security events — reducing the time between detection and a clearer picture of what happened." },
      { title: "AI Agent Security", text: "Harden deployed AI agents against prompt injection, unauthorized data access, and tool misuse — with audit logging that supports security review and forensic requirements." },
      { title: "Security Knowledge Access", text: "Make runbooks, incident histories, architecture documentation, and threat intelligence queryable by analysts without requiring them to know exactly where each document lives." },
    ],
  },

  "data-analytics": {
    headline: "Where AI creates value in Data & Analytics",
    relevance: "Most relevant when: your team supports growing analytical demand without proportional engineering growth, or manages AI model infrastructure that needs ongoing governance.",
    summary: "Data and analytics teams are increasingly asked to support more users, more questions, and more data volume — often without proportional growth in engineering or analyst capacity. AI can accelerate query performance over large structured datasets, enable non-technical users to ask analytical questions in natural language, and support the model management infrastructure that keeps AI systems accurate and governable over time.",
    benefits: [
      { title: "High-Volume Query Acceleration", text: "Run analytical queries over large structured datasets at speeds that make exploratory, iterative analysis practical rather than bottlenecked by infrastructure." },
      { title: "Natural Language Analytics", text: "Let business users ask questions about operational data in plain language rather than requiring SQL or analyst intermediation for every query." },
      { title: "Model Lifecycle Management", text: "Maintain the retraining pipelines, evaluation frameworks, and observability tooling that keep production AI models accurate as data and conditions change over time." },
      { title: "Research Synthesis", text: "Accelerate multi-source research and analysis tasks by deploying AI agents that retrieve, synthesize, and cite findings across internal and external data sources." },
    ],
  },

  "finance": {
    headline: "Where AI creates value in Finance",
    relevance: "Most relevant when: your team handles high volumes of financial research, compliance documentation, or transaction data where manual review creates lag or risk.",
    summary: "Finance teams are often the organizational center of gravity for high-stakes analysis, compliance pressure, and large volumes of structured and unstructured data that need to be synthesized quickly. Manual research, document hunting, and spreadsheet-based analysis consume time that could go toward higher-value work. AI can accelerate financial research and reporting, strengthen fraud and anomaly detection, make policy and regulatory documentation more queryable, and support quantitative workflows that previously required specialized infrastructure.",
    benefits: [
      { title: "Research & Reporting Acceleration", text: "Compress the time analysts spend synthesizing earnings data, filings, budget documents, and internal reports — surfacing relevant material with citations rather than requiring manual search." },
      { title: "Fraud & Anomaly Detection", text: "Identify irregular transaction patterns, billing anomalies, and behavioral signals across large financial datasets closer to the point of activity rather than relying solely on retrospective batch review." },
      { title: "Policy & Regulatory Knowledge", text: "Make compliance policies, audit documentation, control evidence, and regulatory correspondence queryable so finance and compliance staff can find and cite the right material faster." },
      { title: "Quantitative Analysis", text: "Support more frequent portfolio optimization, risk scenario analysis, and signal discovery workloads using GPU-accelerated computation." },
    ],
  },

  "human-resources": {
    headline: "Where AI creates value in Human Resources",
    relevance: "Most relevant when: your team handles high volumes of repetitive employee inquiries, manages large policy and benefits documentation, or supports a distributed workforce with varied access to HR resources.",
    summary: "HR teams spend significant time answering the same policy and benefits questions, onboarding new employees into complex information environments, and producing content that needs to be current, accessible, and consistent across a large workforce. AI can make HR knowledge more self-serviceable, extend the reach of HR communications, and reduce the manual work involved in producing and updating workforce-facing content.",
    benefits: [
      { title: "Employee Knowledge Self-Service", text: "Give employees accurate, cited answers to policy, benefits, leave, and onboarding questions without routing every inquiry through HR staff." },
      { title: "HR Communications & Content", text: "Convert dense policy updates, open enrollment materials, and training content into formats employees actually engage with — including audio for distributed or field workforces." },
      { title: "Onboarding Support", text: "Provide new employees with interactive access to organizational knowledge, role-specific guidance, and procedural information during onboarding without requiring dedicated HR staff time for each hire." },
    ],
  },

  "information-technology": {
    headline: "Where AI creates value in Information Technology",
    relevance: "Most relevant when: your team is building or governing an enterprise AI platform, managing developer productivity, or operating a service desk supporting a large internal user base.",
    summary: "IT organizations carry responsibility for an expanding portfolio of infrastructure, applications, AI deployments, and developer enablement — while managing security review, service desk volume, and the growing complexity of governing AI systems in production. AI can accelerate developer productivity, rationalize model serving infrastructure, improve knowledge access for support teams, and provide the governance and observability tooling that responsible AI deployment requires.",
    benefits: [
      { title: "Developer Productivity", text: "Give engineers AI-assisted coding support grounded in GPU architecture and CUDA knowledge, reducing the time required to write, debug, and optimize GPU-accelerated code." },
      { title: "Model Serving & Routing", text: "Deploy a governed, on-premises model serving layer that can route inference requests across available models based on workload requirements — balancing cost, quality, and data control." },
      { title: "Service Desk Knowledge", text: "Make runbooks, architecture documentation, known-issue histories, and technical procedures queryable by support staff so routine questions resolve without unnecessary escalation." },
      { title: "AI Governance & Observability", text: "Monitor deployed AI models for drift and degradation, enforce access and behavior guardrails on AI agents, and maintain the audit infrastructure that security and compliance review requires." },
    ],
  },

  "legal-compliance": {
    headline: "Where AI creates value in Legal & Compliance",
    relevance: "Most relevant when: your team manages large volumes of contracts, regulatory obligations, or discovery material — or is responsible for governing AI deployments that touch sensitive data.",
    summary: "Legal and compliance teams work in environments where the cost of missing something — a regulatory change, a contractual obligation, a relevant precedent — is high. The volume of documents, filings, and correspondence that needs to be monitored and synthesized routinely exceeds what manual processes can cover comprehensively. AI can make legal and regulatory knowledge more accessible, accelerate document and evidence review, and support more structured research synthesis while maintaining the source citation discipline that legal work requires.",
    benefits: [
      { title: "Matter Research & Knowledge Retrieval", text: "Make contracts, precedents, regulatory filings, and matter history queryable so attorneys and compliance staff locate relevant material without manual repository navigation." },
      { title: "Document & Evidence Review", text: "Accelerate review of discovery, correspondence, and audiovisual evidence — surfacing relevant content with citations rather than requiring frame-by-frame or document-by-document review." },
      { title: "Regulatory Change Monitoring", text: "Synthesize changing regulatory requirements against internal policies and obligations faster than manual tracking processes allow." },
      { title: "Controlled Agent Deployment", text: "Deploy AI agents with the access boundaries, audit logging, and governance controls that legal and compliance environments require before AI can be trusted with sensitive matter data." },
    ],
  },

  "marketing": {
    headline: "Where AI creates value in Marketing",
    relevance: "Most relevant when: your team manages large product catalogs, serves multiple regions or languages, or faces pressure to produce more content without proportional growth in creative resources.",
    summary: "Marketing teams are under pressure to produce more content, reach more audiences, and maintain consistency across more channels — without proportional growth in creative and production resources. AI can accelerate content generation and localization, enrich catalog and product information at scale, and enable richer visual and 3D product experiences with less dependence on traditional production workflows.",
    benefits: [
      { title: "Content Production at Scale", text: "Generate product descriptions, campaign copy, and catalog content faster and across more languages and regions without proportional growth in content team headcount." },
      { title: "Catalog Enrichment", text: "Transform basic product imagery and data into rich, structured catalog entries with descriptive text, extracted attributes, and localized variations automatically." },
      { title: "Multilingual Localization", text: "Adapt marketing content, training materials, and product information for new markets and audiences without full manual translation and production cycles." },
      { title: "Visual & 3D Asset Creation", text: "Generate product visualizations and 3D assets from photography or text descriptions — enabling richer digital commerce and campaign experiences with less dependence on traditional production workflows." },
    ],
  },

  "operations": {
    headline: "Where AI creates value in Operations",
    relevance: "Most relevant when: your team manages physical environments, field workforces, or complex multi-step workflows where exceptions and coordination overhead consume significant staff capacity.",
    summary: "Operations teams manage the physical, logistical, and workflow complexity that keeps organizations running — and they do it in environments where exceptions, sensor data, and manual coordination tasks accumulate faster than staff can address them. AI can improve situational awareness from physical and sensor environments, automate routine coordination and exception workflows, make operational knowledge more accessible to field staff, and enable simulation of complex physical environments before changes are made in the real world.",
    benefits: [
      { title: "Physical & Sensor Intelligence", text: "Extract insight from video, sensor, radio, and telemetry feeds without requiring continuous human monitoring — surfacing exceptions and anomalies for staff attention." },
      { title: "Workflow Automation & Exception Management", text: "Coordinate multi-step operational workflows and flag exceptions through AI agents, reducing the manual overhead of routine coordination tasks." },
      { title: "Field Knowledge Access", text: "Give field workers and operators hands-free or conversational access to equipment manuals, procedures, and site-specific guidance — reducing reliance on specialists for routine questions." },
      { title: "Simulation & Digital Twins", text: "Test operational changes, robot deployments, and facility configurations in digital environments before implementing them physically — reducing commissioning risk and downtime." },
    ],
  },

  "research-engineering": {
    headline: "Where AI creates value in Research & Engineering",
    relevance: "Most relevant when: your team runs computationally intensive workloads in genomics, simulation, or physical AI — or develops GPU-accelerated software where specialized coding assistance would reduce iteration time.",
    summary: "Research and engineering teams work at the frontier of what compute and data can produce — and the bottleneck is often how long it takes to process data, iterate on designs, and surface relevant prior work. AI can accelerate computationally intensive research in genomics, molecular biology, and physical simulation, give engineers AI-assisted coding support for GPU-intensive workloads, and help teams search large datasets for the specific scenarios and edge cases that matter most.",
    benefits: [
      { title: "Scientific Computing Acceleration", text: "Apply GPU-accelerated pipelines to genomics, single-cell analysis, protein design, and molecular screening workloads — compressing research cycles that previously required longer compute runs." },
      { title: "Engineering Simulation", text: "Run computational fluid dynamics, physical simulation, and digital twin workloads in workflows designed to support more iterative design and analysis." },
      { title: "Dataset Search & Curation", text: "Search large video and sensor datasets semantically to find specific scenarios, edge cases, and training examples — without manual review of large archives." },
      { title: "Developer & Research Productivity", text: "Give engineers and researchers AI-assisted coding support grounded in GPU architecture knowledge, accelerating development of simulation, vision, and scientific compute code." },
    ],
  },

  "sales": {
    headline: "Where AI creates value in Sales",
    relevance: "Most relevant when: your team manages complex solution portfolios, spends significant time on pre-call research and proposal preparation, or needs to scale expert-quality guidance across a larger buyer base.",
    summary: "Sales teams spend significant time on research, proposal preparation, and navigating complex product and solution knowledge — time that could go toward customer engagement. AI can make product, solution, and account knowledge more accessible to sellers, support proposal, account, and solution research, and enable more guided expert-quality product selection experiences for buyers without requiring a specialist to be present for every conversation.",
    benefits: [
      { title: "Seller Knowledge Access", text: "Give sellers fast access to product documentation, case studies, competitive intelligence, and proposal history without manual repository navigation before calls and meetings." },
      { title: "Proposal, Account & Solution Research", text: "Accelerate the research and synthesis required for complex proposal responses by surfacing relevant prior work and requirements with citations." },
      { title: "Guided Product Selection", text: "Deploy AI-assisted product discovery experiences that guide buyers through complex solution portfolios using natural language — reducing the need for specialist involvement in early-stage conversations." },
      { title: "Voice-Based Field Support", text: "Give field sellers and account teams hands-free access to account history, product specifications, and competitive positioning during customer-facing situations." },
    ],
  },

  "supply-chain-logistics": {
    headline: "Where AI creates value in Supply Chain & Logistics",
    relevance: "Most relevant when: your team manages warehouse operations, complex fulfillment networks, or physical handling workflows where exceptions and coordination delays have direct cost impact.",
    summary: "Supply chain and logistics operations generate continuous streams of inventory, shipment, and operational data — and the cost of exceptions, delays, and coordination failures compounds quickly across complex networks. AI can optimize warehouse and fulfillment operations, make large operational datasets more queryable, improve visibility into exceptions and anomalies, and support the development of robotic capabilities for physical handling tasks.",
    benefits: [
      { title: "Warehouse & Fulfillment Optimization", text: "Coordinate inventory, task assignment, and exception handling across warehouse and fulfillment environments using multi-agent AI — improving throughput without proportional staffing growth." },
      { title: "Operational Data Visibility", text: "Query large shipment, inventory, and asset datasets interactively to answer operational questions that traditional reporting infrastructure answers too slowly." },
      { title: "Exception & Incident Intelligence", text: "Surface shipment exceptions, safety incidents, and operational anomalies from sensor and video feeds without requiring constant human monitoring of every data stream." },
      { title: "Robotic Operations Development", text: "Train robotic picking, sorting, and handling systems using synthetic demonstration data — accelerating deployment without requiring large volumes of physical training examples." },
    ],
  },

  "communications": {
    headline: "Where AI creates value in Communications",
    relevance: "Most relevant when: your team is responsible for making complex organizational information accessible to large, distributed, or multilingual audiences — or produces high volumes of content under resource constraints.",
    summary: "Communications teams are responsible for making complex organizational information — policy updates, program changes, strategic direction, regulatory guidance — accessible and engaging to audiences who are already overloaded. AI can transform dense documents into more accessible formats, support localization for diverse audiences, and give communications staff faster access to the research and synthesis they need to brief stakeholders effectively.",
    benefits: [
      { title: "Document-to-Audio Conversion", text: "Convert policy documents, reports, briefings, and updates into AI-generated audio so audiences can engage with content during commutes and travel rather than deprioritizing attached documents." },
      { title: "Multilingual & Accessible Content", text: "Adapt communications content for different languages, reading levels, and formats without full manual production cycles for each audience segment." },
      { title: "Research & Briefing Support", text: "Give communications staff AI-assisted research tools that synthesize public records, legislative history, and organizational data into structured briefings faster than manual research allows." },
    ],
  },
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function getBlueprintsForIndustry(industryId) {
  return ALL_BLUEPRINTS.filter(bp => bp.industry_fit && bp.industry_fit[industryId])
    .sort((a, b) => {
      const order = { primary: 0, adjacent: 1 };
      const fa = order[a.industry_fit[industryId]] ?? 2;
      const fb = order[b.industry_fit[industryId]] ?? 2;
      return fa - fb || a.name.localeCompare(b.name);
    });
}

function getBlueprintsForFunction(funcId) {
  return ALL_BLUEPRINTS.filter(bp => bp.department_fit && bp.department_fit[funcId])
    .sort((a, b) => {
      const order = { primary: 0, adjacent: 1 };
      const fa = order[a.department_fit[funcId]] ?? 2;
      const fb = order[b.department_fit[funcId]] ?? 2;
      return fa - fb || a.name.localeCompare(b.name);
    });
}

function groupByCategory(blueprints) {
  const groups = {};
  blueprints.forEach(bp => {
    const cat = bp.use_case_category || "Other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(bp);
  });
  return groups;
}

// ─── sub-components ───────────────────────────────────────────────────────────

function FitBadge({ fit }) {
  if (!fit) return null;
  const isPrimary = fit === "primary";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
      textTransform: "uppercase", padding: "2px 7px", borderRadius: 4,
      backgroundColor: isPrimary ? "#fff0f0" : "#fff8f0",
      color: isPrimary ? CDW_RED : "#c45000",
      border: `1px solid ${isPrimary ? "#ffcccc" : "#ffd5aa"}`,
      whiteSpace: "nowrap", flexShrink: 0,
    }}>
      {isPrimary ? "Best Fit" : "Also Relevant"}
    </span>
  );
}

function BlueprintCard({ bp, fit, onSelect }) {
  return (
    <button
      onClick={(e) => onSelect(bp, e.currentTarget)}
      style={{
        background: "#fff", border: `1px solid ${CDW_BORDER}`, borderRadius: 10,
        padding: "14px 16px", cursor: "pointer", textAlign: "left",
        display: "flex", flexDirection: "column", gap: 8, width: "100%",
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)"; e.currentTarget.style.borderColor = CDW_RED; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = CDW_BORDER; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: CDW_DARK, lineHeight: 1.35 }}>{bp.name}</span>
        {fit && <FitBadge fit={fit} />}
      </div>
      {bp.status === "legacy" && (
        <span style={{ fontSize: 10, fontWeight: 700, color: "#92400e", background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 4, padding: "1px 6px", width: "fit-content" }}>LEGACY</span>
      )}
      <p style={{ fontSize: 13, color: "#555", margin: 0, lineHeight: 1.5 }}>{bp.description}</p>
    </button>
  );
}

function CategorySection({ category, blueprints, fit, onSelect, open, onToggle }) {
  const contentId = `cat-${category.replace(/\s+/g, "-")}`;
  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={contentId}
        style={{
          width: "100%", display: "flex", justifyContent: "space-between",
          alignItems: "center", background: CDW_BG, border: `1px solid ${CDW_BORDER}`,
          borderRadius: open ? "8px 8px 0 0" : 8, padding: "10px 14px",
          cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 14, color: CDW_DARK }}>{category}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#666", fontWeight: 500 }}>{blueprints.length} blueprint{blueprints.length !== 1 ? "s" : ""}</span>
          <span style={{ fontSize: 12, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>▶</span>
        </span>
      </button>
      {open && (
        <div id={contentId} style={{ border: `1px solid ${CDW_BORDER}`, borderTop: "none", borderRadius: "0 0 8px 8px", padding: "12px", background: "#fafafa", display: "flex", flexDirection: "column", gap: 10 }}>
          {blueprints.map(bp => (
            <BlueprintCard key={bp.id} bp={bp} fit={fit ? fit[bp.id] : null} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

// ContextProfile renders the "Where AI creates value" section above the blueprint list
function ContextProfile({ contextId }) {
  const profile = CONTEXT_PROFILES[contextId];
  if (!profile) return null;
  return (
    <div style={{ background: "#fff", border: `1px solid ${CDW_BORDER}`, borderRadius: 10, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: CDW_RED, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>AI Value Guide</div>
        <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 800, color: CDW_DARK }}>{profile.headline}</h3>
        <div style={{ fontSize: 12, color: "#888", fontStyle: "italic", marginBottom: 10 }}>{profile.relevance}</div>
        <p style={{ margin: 0, fontSize: 13, color: "#444", lineHeight: 1.65 }}>{profile.summary}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
        {profile.benefits.map(b => (
          <div key={b.title} style={{ background: CDW_BG, borderRadius: 8, padding: "12px 14px", borderLeft: `3px solid ${CDW_RED}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: CDW_DARK, marginBottom: 4 }}>{b.title}</div>
            <div style={{ fontSize: 12, color: "#555", lineHeight: 1.55 }}>{b.text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailModal({ bp, contextLabel, contextDisplayName, contextFit, triggerEl, onClose }) {
  const dialogRef = useRef();
  const closeButtonRef = useRef();
  const titleId = `modal-title-${bp.id}`;

  useEffect(() => { closeButtonRef.current?.focus(); }, []);

  useEffect(() => {
    const handlePointer = e => { if (dialogRef.current && !dialogRef.current.contains(e.target)) onClose(); };
    const handleKey = e => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
        else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
      }
    };
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
      triggerEl?.focus();
    };
  }, [onClose, triggerEl]);

  const practiceText = bp.detail_in_practice?.[contextLabel] || bp.detail_in_practice?.default;
  const handoffLinks = buildHandoffLinks(bp);
  const practiceHeader = contextDisplayName
    ? `What this could look like in ${contextDisplayName}`
    : "What this could look like in practice";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ background: "#fff", borderRadius: 14, maxWidth: 680, width: "100%", maxHeight: "85vh", overflowY: "auto", padding: "28px 28px 24px", display: "flex", flexDirection: "column", gap: 18, boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: CDW_RED, letterSpacing: "0.08em", textTransform: "uppercase" }}>{bp.use_case_category}</span>
            <h2 id={titleId} style={{ margin: 0, fontSize: 20, fontWeight: 700, color: CDW_DARK, lineHeight: 1.3 }}>{bp.name}</h2>
          </div>
          <button ref={closeButtonRef} onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#888", flexShrink: 0, padding: "0 4px" }}>×</button>
        </div>

        {contextFit && <div style={{ display: "flex", gap: 8, alignItems: "center" }}><FitBadge fit={contextFit} /></div>}

        {bp.status === "legacy" && (
          <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#92400e" }}>
            <strong>Legacy blueprint:</strong> NVIDIA no longer actively maintains this Blueprint. It is retained here because the underlying use case remains relevant.
          </div>
        )}

        <div>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, marginTop: 0 }}>What it does</h3>
          <p style={{ margin: 0, fontSize: 14, color: "#333", lineHeight: 1.6 }}>{bp.detail_what_it_does || bp.description}</p>
        </div>

        {practiceText && (
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, marginTop: 0 }}>{practiceHeader}</h3>
            <p style={{ margin: 0, fontSize: 14, color: "#333", lineHeight: 1.6 }}>{practiceText}</p>
          </div>
        )}

        {bp.detail_infrastructure && (
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6, marginTop: 0 }}>What it typically needs</h3>
            <p style={{ margin: 0, fontSize: 14, color: "#333", lineHeight: 1.6 }}>{bp.detail_infrastructure}</p>
          </div>
        )}

        {handoffLinks.note && (
          <div style={{ background: "#FFF8E6", border: "1px solid #F0C040", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#7A5A00" }}>
            {handoffLinks.note}
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, paddingTop: 4 }}>
          {handoffLinks.showModelAdvisor && (
            <a href={handoffLinks.modelAdvisor} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: CDW_RED, color: "#fff", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>Model Advisor →</a>
          )}
          {handoffLinks.showGpuSizing && (
            <a href={handoffLinks.gpuSizing} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: CDW_DARK, color: "#fff", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>GPU Sizing →</a>
          )}
          <a href={handoffLinks.tco} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: CDW_DARK, border: "1px solid #ccc", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>TCO Calculator →</a>
          {bp.nvidia_url && (
            <a href={bp.nvidia_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", color: "#666", border: "1px solid #ccc", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>View on NVIDIA ↗</a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── main component ────────────────────────────────────────────────────────────

export default function UseCaseExplorer() {
  const [view, setView] = useState("home");
  const [selectedIndustry, setSelectedIndustry] = useState(null);
  const [selectedFunction, setSelectedFunction] = useState(null);
  const [activeCategory, setActiveCategory] = useState("All");
  const [modalBp, setModalBp] = useState(null);
  const [modalTrigger, setModalTrigger] = useState(null);
  const [sectionsOpen, setSectionsOpen] = useState({});

  const industryBlueprints = selectedIndustry ? getBlueprintsForIndustry(selectedIndustry.id) : [];
  const functionBlueprints = selectedFunction ? getBlueprintsForFunction(selectedFunction.id) : [];
  const activeBlueprints = view === "industry-results" ? industryBlueprints : functionBlueprints;

  const fitMap = (() => {
    const map = {};
    if (view === "industry-results" && selectedIndustry)
      activeBlueprints.forEach(bp => { map[bp.id] = bp.industry_fit?.[selectedIndustry.id]; });
    else if (view === "function-results" && selectedFunction)
      activeBlueprints.forEach(bp => { map[bp.id] = bp.department_fit?.[selectedFunction.id]; });
    return map;
  })();

  const filteredBlueprints = activeCategory === "All"
    ? activeBlueprints
    : activeBlueprints.filter(bp => bp.use_case_category === activeCategory);

  const grouped = groupByCategory(filteredBlueprints);
  const availableCategories = ["All", ...CATEGORIES.filter(c => activeBlueprints.some(bp => bp.use_case_category === c))];

  const contextId = view === "industry-results" ? selectedIndustry?.id : selectedFunction?.id;
  const contextLabel = contextId;
  const contextDisplayName = view === "industry-results" ? selectedIndustry?.label : selectedFunction?.label;

  useEffect(() => {
    if ((view === "industry-results" || view === "function-results") && activeBlueprints.length > 0) {
      const firstCat = activeBlueprints[0].use_case_category;
      setSectionsOpen({ [firstCat]: true });
    }
  }, [view, selectedIndustry?.id, selectedFunction?.id]);

  useEffect(() => {
    if (activeCategory !== "All") setSectionsOpen({ [activeCategory]: true });
  }, [activeCategory]);

  function toggleSection(cat) { setSectionsOpen(prev => ({ ...prev, [cat]: !prev[cat] })); }
  function expandAll() { const all = {}; Object.keys(grouped).forEach(c => { all[c] = true; }); setSectionsOpen(all); }

  function resetToHome() {
    setView("home"); setSelectedIndustry(null); setSelectedFunction(null);
    setActiveCategory("All"); setSectionsOpen({});
  }

  function selectIndustry(ind) { setSelectedIndustry(ind); setActiveCategory("All"); setView("industry-results"); }
  function selectFunction(fn) { setSelectedFunction(fn); setActiveCategory("All"); setView("function-results"); }

  const pickerTile = { background: "#fff", border: `1px solid ${CDW_BORDER}`, borderRadius: 10, padding: "14px 16px", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, fontWeight: 600, color: CDW_DARK, transition: "border-color 0.15s, background 0.15s" };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh", background: "#f9f9f9" }}>

      {/* header */}
      <div style={{ background: "#fff", borderBottom: "3px solid #e8e8e8", padding: "12px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <img src={cdwLogo} alt="CDW" style={{ height: 36, width: "auto" }} />
        <div style={{ borderLeft: "1px solid #e0e0e0", paddingLeft: 12, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: CDW_RED, letterSpacing: "0.12em", textTransform: "uppercase" }}>AI Factory Tools</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: CDW_DARK, lineHeight: 1.2 }}>AI Use Case Explorer</span>
        </div>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#999", fontWeight: 500, border: "1px solid #e0e0e0", borderRadius: 4, padding: "2px 8px" }}>v2.2</span>
      </div>

      {/* breadcrumb */}
      {view !== "home" && (
        <div style={{ background: "#fff", borderBottom: `1px solid ${CDW_BORDER}`, padding: "10px 24px", display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
          <button onClick={resetToHome} style={{ background: "none", border: "none", cursor: "pointer", color: CDW_RED, fontWeight: 600, padding: 0, fontSize: 13 }}>Home</button>
          <span style={{ color: "#bbb" }}>›</span>
          {(view === "industry-pick" || view === "industry-results") && (
            <>
              <button onClick={() => { setView("industry-pick"); setSelectedIndustry(null); setActiveCategory("All"); }} style={{ background: "none", border: "none", cursor: "pointer", color: view === "industry-pick" ? CDW_DARK : CDW_RED, fontWeight: 600, padding: 0, fontSize: 13 }}>By Industry</button>
              {view === "industry-results" && selectedIndustry && (<><span style={{ color: "#bbb" }}>›</span><span style={{ color: CDW_DARK, fontWeight: 600 }}>{selectedIndustry.label}</span></>)}
            </>
          )}
          {(view === "function-pick" || view === "function-results") && (
            <>
              <button onClick={() => { setView("function-pick"); setSelectedFunction(null); setActiveCategory("All"); }} style={{ background: "none", border: "none", cursor: "pointer", color: view === "function-pick" ? CDW_DARK : CDW_RED, fontWeight: 600, padding: 0, fontSize: 13 }}>By Business Function</button>
              {view === "function-results" && selectedFunction && (<><span style={{ color: "#bbb" }}>›</span><span style={{ color: CDW_DARK, fontWeight: 600 }}>{selectedFunction.label}</span></>)}
            </>
          )}
        </div>
      )}

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px" }}>

        {/* HOME */}
        {view === "home" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{ textAlign: "center" }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: CDW_DARK, margin: "0 0 10px" }}>Explore AI Use Cases</h1>
              <p style={{ fontSize: 15, color: "#666", margin: 0, maxWidth: 540, marginInline: "auto", lineHeight: 1.6 }}>Match NVIDIA AI Blueprints to your organization. Choose how you'd like to explore.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {[
                { label: "By Industry", sub: "What are organizations like mine doing with AI?", count: `${INDUSTRIES.length} industries`, icon: "🏢", action: () => setView("industry-pick") },
                { label: "By Business Function", sub: "What can AI do for my team?", count: `${BUSINESS_FUNCTIONS.length} functions`, icon: "🧩", action: () => setView("function-pick") },
              ].map(card => (
                <button key={card.label} onClick={card.action}
                  style={{ background: "#fff", border: `2px solid ${CDW_BORDER}`, borderRadius: 14, padding: "32px 28px", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 12, transition: "border-color 0.15s, box-shadow 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = CDW_RED; e.currentTarget.style.boxShadow = "0 6px 24px rgba(204,0,0,0.08)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = CDW_BORDER; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <span style={{ fontSize: 32 }}>{card.icon}</span>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: CDW_DARK, marginBottom: 6 }}>{card.label}</div>
                    <div style={{ fontSize: 14, color: "#666", lineHeight: 1.55 }}>{card.sub}</div>
                  </div>
                  <div style={{ fontSize: 12, color: CDW_RED, fontWeight: 700, letterSpacing: "0.05em" }}>{card.count} →</div>
                </button>
              ))}
            </div>
            <p style={{ textAlign: "center", fontSize: 12, color: "#aaa", margin: 0 }}>
              {ALL_BLUEPRINTS.length} NVIDIA AI Blueprints · CDW AI Factory · Last verified {blueprintData.meta.last_verified}
            </p>
          </div>
        )}

        {/* INDUSTRY PICKER */}
        {view === "industry-pick" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: CDW_DARK, margin: "0 0 6px" }}>Choose your industry</h2>
              <p style={{ fontSize: 14, color: "#666", margin: 0 }}>See which NVIDIA AI Blueprints are most relevant to your sector.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {INDUSTRIES.map(ind => (
                <button key={ind.id} onClick={() => selectIndustry(ind)} style={pickerTile}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = CDW_RED; e.currentTarget.style.background = "#fff5f5"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = CDW_BORDER; e.currentTarget.style.background = "#fff"; }}
                >
                  <span>{ind.label}</span>
                  <span style={{ color: "#ccc", fontSize: 12 }}>›</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* FUNCTION PICKER */}
        {view === "function-pick" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: CDW_DARK, margin: "0 0 6px" }}>Choose your business function</h2>
              <p style={{ fontSize: 14, color: "#666", margin: 0 }}>See which NVIDIA AI Blueprints fit your team's work — regardless of industry.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
              {BUSINESS_FUNCTIONS.map(fn => (
                <button key={fn.id} onClick={() => selectFunction(fn)}
                  style={{ ...pickerTile, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4, justifyContent: "flex-start" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = CDW_RED; e.currentTarget.style.background = "#fff5f5"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = CDW_BORDER; e.currentTarget.style.background = "#fff"; }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700, color: CDW_DARK }}>{fn.label}</span>
                  <span style={{ fontSize: 11, color: "#999", fontWeight: 400 }}>Gov: {fn.gov}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* RESULTS */}
        {(view === "industry-results" || view === "function-results") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* context banner */}
            <div style={{ background: CDW_DARK, borderRadius: 10, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 11, color: CDW_RED, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                {view === "industry-results" ? "Industry" : "Business Function"}
              </span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>{contextDisplayName}</span>
              {view === "function-results" && selectedFunction?.gov && (
                <span style={{ fontSize: 12, color: "#aaa" }}>Gov equivalent: {selectedFunction.gov}</span>
              )}
              <span style={{ fontSize: 13, color: "#999", marginTop: 2 }}>
                {activeBlueprints.length} blueprint{activeBlueprints.length !== 1 ? "s" : ""} matched
                &nbsp;·&nbsp;
                {activeBlueprints.filter(bp => (view === "industry-results" ? bp.industry_fit?.[selectedIndustry?.id] : bp.department_fit?.[selectedFunction?.id]) === "primary").length} best fit
                &nbsp;·&nbsp;
                {activeBlueprints.filter(bp => (view === "industry-results" ? bp.industry_fit?.[selectedIndustry?.id] : bp.department_fit?.[selectedFunction?.id]) === "adjacent").length} also relevant
              </span>
            </div>

            {/* context profile — the "so what" layer */}
            <ContextProfile contextId={contextId} />

            {/* category chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              {availableCategories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  style={{ padding: "6px 14px", borderRadius: 20, border: activeCategory === cat ? `1.5px solid ${CDW_RED}` : "1.5px solid #ddd", background: activeCategory === cat ? CDW_RED : "#fff", color: activeCategory === cat ? "#fff" : "#444", fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.12s" }}
                >{cat}</button>
              ))}
              <button onClick={expandAll} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: CDW_RED, fontWeight: 600 }}>Expand all</button>
              <button onClick={() => setSectionsOpen({})} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#888", fontWeight: 600 }}>Collapse all</button>
            </div>

            {/* grouped results */}
            {Object.entries(grouped).map(([cat, bps]) => (
              <CategorySection
                key={cat} category={cat} blueprints={bps} fit={fitMap}
                onSelect={(bp, el) => { setModalBp(bp); setModalTrigger(el); }}
                open={!!sectionsOpen[cat]}
                onToggle={() => toggleSection(cat)}
              />
            ))}

            {filteredBlueprints.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 0", color: "#aaa", fontSize: 14 }}>
                No blueprints in this category for the selected {view === "industry-results" ? "industry" : "function"}.
              </div>
            )}
          </div>
        )}
      </div>

      {/* modal */}
      {modalBp && (
        <DetailModal
          bp={modalBp}
          contextLabel={contextLabel}
          contextDisplayName={contextDisplayName}
          contextFit={fitMap[modalBp.id]}
          triggerEl={modalTrigger}
          onClose={() => { setModalBp(null); setModalTrigger(null); }}
        />
      )}
    </div>
  );
}
