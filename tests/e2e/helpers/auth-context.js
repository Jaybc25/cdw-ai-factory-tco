// Which authentication context is the target build running in?
//
// Since the Phase 1 authenticated front door landed, a signed-out visitor gets
// the login page on every route, so nothing can drive tool internals unless the
// build under test was compiled with the front door bypassed.
//
// That bypass exists in exactly one place: the dedicated local browser-regression
// build in .github/workflows/quality-gate.yml, which sets VITE_E2E_AUTH_BYPASS at
// build time and serves the result on 127.0.0.1. The job sets E2E_AUTH_BYPASS for
// the Playwright run so the specs know which surface they are pointed at.
//
// E2E_AUTH_BYPASS is read only here, by tests. It is not a Vite variable and is
// never inlined into an application bundle, so it cannot affect what preview or
// production serve. Vercel preview and production builds set neither variable and
// therefore always enforce the front door.
export const AUTH_BYPASSED = process.env.E2E_AUTH_BYPASS === "true";

export const BYPASS_ONLY_REASON =
  "Needs tool routes to render. Exercised against the local auth-bypassed PR build, not the authenticated preview or production deployment.";

export const FRONT_DOOR_ONLY_REASON =
  "Asserts the authenticated front door. Only meaningful against a build that enforces it, not the local auth-bypassed build.";
