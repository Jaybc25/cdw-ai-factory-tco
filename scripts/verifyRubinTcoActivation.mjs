import { ONPREM_SYSTEMS } from "../src/pricingRegistry.js";
import { RUBIN_PHASE1_TCO_SYSTEMS, isRubinPhase1TcoSystem } from "../src/rubinTcoActivationRegistry.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const nvl8 = RUBIN_PHASE1_TCO_SYSTEMS["DGX Rubin NVL8"];
const nvl72 = RUBIN_PHASE1_TCO_SYSTEMS["DGX Vera Rubin NVL72"];

assert(nvl8 && nvl72, "Expected both Rubin Phase 1 TCO activation systems.");
assert(nvl8.perSys === 1111993, "Rubin NVL8 Phase 1 loaded planning cost drifted.");
assert(nvl72.perSys === 12272632, "Vera Rubin NVL72 Phase 1 loaded planning cost drifted.");
assert(nvl8.hardwareListPrice === 995000 && nvl72.hardwareListPrice === 10500000, "Rubin hardware list prices drifted.");
assert(nvl8.fabricAndInfrastructure === 91993 && nvl72.fabricAndInfrastructure === 1717074, "Rubin Phase 1 fabric allowances drifted.");
assert(nvl8.prof === 25000 && nvl72.prof === 55558, "Rubin Phase 1 PS/install allowances drifted.");
assert(nvl8.sw === 0 && nvl72.sw === 0, "Optional Rubin software must default to NONE / $0.");
assert(nvl8.kW === 24 && nvl72.kW === 136, "Rubin Phase 1 power bases drifted.");
assert(nvl8.powerConfidence === "LISTED", "Rubin NVL8 power should remain LISTED.");
assert(nvl72.powerConfidence === "PROVISIONAL", "Vera Rubin power should remain PROVISIONAL.");
assert(nvl8.generationalCreditAvailable === false && nvl72.generationalCreditAvailable === false, "Rubin must not gain synthetic generational performance credit.");
assert(nvl8.servingCapacityAvailable === false && nvl72.servingCapacityAvailable === false, "Rubin serving/token economics must remain gated until a qualifying inference anchor exists.");
assert(nvl8.highDensityInfrastructureCost === null && nvl72.highDensityInfrastructureCost === null, "Do not invent Rubin high-density infrastructure CAPEX.");
assert(nvl8.highDensityInfrastructureConfidence === "QUOTE" && nvl72.highDensityInfrastructureConfidence === "QUOTE", "Rubin high-density infrastructure must remain quote/customer supplied.");
assert(nvl8.commercialStatus === "LISTED" && nvl8.moq === 1, "Rubin NVL8 commercial status/MOQ drifted.");
assert(nvl72.commercialStatus === "QUOTE_ONLY" && nvl72.moq === 2 && nvl72.moqEnforcedInTco === false, "Vera Rubin quote-only/MOQ policy drifted.");
assert(isRubinPhase1TcoSystem("DGX Rubin NVL8") && isRubinPhase1TcoSystem("DGX Vera Rubin NVL72"), "Rubin activation helper failed.");

// Once customer-facing activation is wired, the shared TCO registry must point
// to these exact derived objects rather than duplicate or separately maintained values.
for (const name of ["DGX Rubin NVL8", "DGX Vera Rubin NVL72"]) {
  assert(ONPREM_SYSTEMS[name] === RUBIN_PHASE1_TCO_SYSTEMS[name], `${name} is not sourced from the derived Rubin activation registry.`);
}

console.log("Rubin Phase 1 TCO activation verification passed.");
