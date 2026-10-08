# Phase 2 Power Planner Evidence Baseline

**Review date:** 2026-10-08  
**Scope:** Phase 2 Wave 1C validation of current power-design anchors used by the preview Power Planner.  
**Status:** Preview-only. No production merge implied.

## Decisions

### DGX B200
- NVIDIA DGX B200 current datasheet states **~14.3 kW max system power**.
- The earlier Phase 2 plan carried 14.4 kW as an average-load reference. That is not suitable as a design/max value and is slightly above the current datasheet max.
- Wave 1C therefore sets the system profile to **14.3 kW design/max**.
- Until a customer supplies a measured or expected average load, the preview also defaults average load to 14.3 kW. This is intentionally conservative for energy estimation and avoids presenting an unsupported average-load claim.
- The planning density remains **2 systems/rack**. At max system power this is ~28.6 kW of compute per rack before storage/fabric/other rack loads. This is a planning convention, not an NVIDIA rack-density certification.

Primary source: NVIDIA DGX B200 Datasheet, current NVIDIA resource page, reviewed 2026-10-08.

### DGX H200
- NVIDIA DGX H200 datasheet states **10.2 kW max system power** for the standard configuration.
- The same datasheet notes DGX H200 CTS (Custom Thermal Solution) supports **up to 14.3 kW**.
- The Power Planner profile represents the standard configuration at **10.2 kW design/max**. A future CTS-specific profile should be separate rather than silently changing the standard profile.
- The planning density remains **2 systems/rack** (~20.4 kW compute per rack before other loads). This is a planning convention, not an NVIDIA rack-density certification.

Primary source: NVIDIA DGX H200 Datasheet, reviewed 2026-10-08.

### GB200 NVL72
- NVIDIA Mission Control documentation states a GB200 NVL72 rack is approximately **120 kW at full load**, including rack components such as switches/interconnects.
- NVIDIA Dynamic Power Software reference topology uses a **125 kW FloorPDU95 rack envelope** for GB200 NVL72.
- Wave 1C therefore uses **120 kW** as the default full-load/energy planning anchor and **125 kW** as the design-capacity envelope.
- GB200 NVL72 remains **one rack per system** and **liquid-cooling required** for planning purposes.

Primary sources: NVIDIA Mission Control Systems Administration Guide and NVIDIA Dynamic Power Software MaxLPS reference topology, reviewed 2026-10-08.

## Methodology guardrails retained

1. Facility feasibility uses **design/max or provisioned rack power**, not utilization-adjusted average power.
2. Energy expense uses the planner's **average/full-load energy input × PUE × hours × utility rate**.
3. Heat rejection uses **IT design load × 3,412 BTU/hr per kW**. PUE is not multiplied into IT heat rejection.
4. Energy expense remains separate from **facility burden / colocation cost**.
5. Storage and network/head-node power remain explicit dependencies. Network power is provisional until the Fabric Planner supplies it.
6. Systems-per-rack values for DGX B200 and DGX H200 are planning assumptions and must not be labeled as NVIDIA-certified rack densities.
7. The Power Planner remains directional facility planning, not an electrical, structural, mechanical, or site design.

## Remaining evidence work

- Add explicit source metadata/links to the client-facing audit trail when Phase 2 report generation is implemented.
- Validate storage-system power/rack assumptions against selected OEM products when the Storage Sizer is built.
- Replace provisional network/head-node allowance with Fabric Planner output.
- Consider separate DGX H200 CTS profile if live engagements require it.
- Validate any future GB300/Rubin system profile independently before activation.
