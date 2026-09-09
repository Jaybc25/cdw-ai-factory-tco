import fs from "node:fs";

const landing = fs.readFileSync("src/LandingPage.jsx", "utf8");
const reset = fs.readFileSync("src/workspaceReset.js", "utf8");
const auth = fs.readFileSync("src/AuthContext.jsx", "utf8");
const session = fs.readFileSync("src/sessionState.js", "utf8");
const readiness = fs.readFileSync("src/AiReadinessChecklists.jsx", "utf8");

function need(source, text, message) {
  if (!source.includes(text)) throw new Error(message);
}

need(landing, "Reset all AI Factory tools?", "Approved confirmation headline is missing");
need(landing, "Your account and profile will not be affected.", "Account-preservation reassurance is missing");
need(landing, "Workspace reset. You're ready to start a new scenario.", "Reset success confirmation is missing");
need(landing, "Nothing to reset", "Empty-workspace reset state is missing");

need(reset, '.from("tool_snapshots")', "Reset must operate on saved tool snapshots");
need(reset, ".delete()", "Reset must delete current server-side snapshots");
need(reset, "verifySnapshotsEmpty", "Reset must verify server-side snapshots are gone");
if (
  !/await deleteSnapshotsForAccount\(userId\);\s*await wait\(POST_DELETE_SETTLE_MS\);\s*await deleteSnapshotsForAccount\(userId\);/.test(
    reset
  )
) {
  throw new Error("Reset must drain in-flight snapshot writes with a second delete pass");
}
need(reset, "clearLocalWorkspaceState();", "Reset must clear browser scenario persistence");
need(reset, "WORKSPACE_RESET_EPOCH_KEY", "Reset must publish a cross-tab epoch");
if (reset.includes('.from("download_events").delete'))
  throw new Error("Reset must preserve historical download_events");
if (reset.includes('.from("accounts").delete')) throw new Error("Reset must preserve account/profile rows");

need(auth, "snapshotWritesBlockedRef", "Autosave must have a reset write barrier");
need(auth, "subscribeToWorkspaceReset", "Autosave must listen for cross-tab reset events");
need(
  auth,
  "if (!session?.user?.id || snapshotWritesBlockedRef.current) return;",
  "saveSnapshot must refuse stale writes during reset"
);
need(session, "syncWorkspaceResetEpoch", "Session state must invalidate stale-tab data after reset");
need(session, "clearAllSessionState", "Session state needs a prefix-wide clear helper");
need(readiness, "subscribeToWorkspaceReset", "Readiness's separate localStorage state must respond to Global Reset");
need(
  readiness,
  'window.localStorage.removeItem("cdw-readiness")',
  "Empty Readiness state must not recreate persistence after reset"
);

console.log("Global Reset contract: PASS");
