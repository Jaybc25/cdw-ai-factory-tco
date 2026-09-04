import fs from "node:fs";

const path = "src/AiReadinessChecklists.jsx";
let source = fs.readFileSync(path, "utf8");

function replaceOnce(from, to, label) {
  if (source.includes(to)) {
    console.log(`${label}: already present`);
    return;
  }
  if (!source.includes(from)) throw new Error(`${label}: marker not found`);
  source = source.replace(from, to);
  console.log(`${label}: applied`);
}

replaceOnce(
  'import checklistData from "./checklists.json";\n',
  'import checklistData from "./checklists.json";\nimport { subscribeToWorkspaceReset } from "./workspaceReset.js";\n',
  "workspace reset import",
);

replaceOnce(
`function saveState(state) {
  memStore.state = state;
  try { window.localStorage.setItem("cdw-readiness", JSON.stringify(state)); } catch (e) { /* memory only */ }
}`,
`function saveState(state) {
  memStore.state = state;
  try {
    const hasMeaningfulState = Object.keys(state.answers || {}).length > 0 || Object.keys(state.routes || {}).length > 0;
    if (hasMeaningfulState) window.localStorage.setItem("cdw-readiness", JSON.stringify(state));
    else window.localStorage.removeItem("cdw-readiness");
  } catch (e) { /* memory only */ }
}`,
  "empty readiness persistence",
);

replaceOnce(
`  const { answers, routes } = store.state;
  useEffect(() => { saveState(store.state); }, [store.state]);
`,
`  const { answers, routes } = store.state;
  useEffect(() => { saveState(store.state); }, [store.state]);

  // If Global Reset is committed from another tab, reset this already-open
  // Readiness UI as well. AuthContext blocks stale snapshot writes; this hook
  // handles Readiness's separate localStorage + in-memory state so continuing
  // to use an old tab cannot recreate the prior checklist scenario.
  useEffect(() => subscribeToWorkspaceReset((event) => {
    if (event.kind !== "committed") return;
    memStore.state = null;
    setStore({ state: freshState(), versionNotice: false });
    setView({ screen: "home", doorId: null });
    setEmailOpen(false);
    setEmailDone(false);
  }), []);
`,
  "readiness reset subscription",
);

fs.writeFileSync(path, source);
