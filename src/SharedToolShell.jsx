import React from "react";
import AuthWidget from "./AuthWidget.jsx";
import cdwLogo from "./cdw-logo.png";

const RED = "#CC0000";
const CHARCOAL = "#232323";
const BORDER = "#E4E4E4";

/**
 * Shared presentation shell for authenticated AI Factory tools.
 *
 * This component intentionally owns presentation/navigation only. Tool state,
 * handoff parameters, calculations, methodology, reports, and economics remain
 * inside the existing tool components.
 */
export default function SharedToolShell({
  title,
  backHref = "/",
  backLabel = "All tools",
  toolKey,
  children,
}) {
  return (
    <div className={`shared-tool-shell shared-tool-shell--${toolKey || "default"}`}>
      <style>{`
        .shared-tool-shell { min-height: 100vh; background: #fff; font-family: 'Inter', system-ui, sans-serif; }
        .shared-tool-header { background: #fff; border-bottom: 3px solid #e8e8e8; padding: 12px 24px; display: flex; align-items: center; gap: 12px; }
        .shared-tool-brand { display: flex; align-items: center; flex-shrink: 0; }
        .shared-tool-brand img { height: 36px; width: auto; }
        .shared-tool-title-block { border-left: 1px solid ${BORDER}; padding-left: 12px; display: flex; flex-direction: column; }
        .shared-tool-eyebrow { font-size: 10px; font-weight: 800; color: ${RED}; letter-spacing: .12em; text-transform: uppercase; }
        .shared-tool-title { font-size: 17px; font-weight: 800; color: ${CHARCOAL}; line-height: 1.2; margin: 0; }
        .shared-tool-utility { background: #fff; border-bottom: 1px solid ${BORDER}; padding: 8px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 38px; }
        .shared-tool-back { color: ${RED}; font-size: 12px; font-weight: 700; text-decoration: none; white-space: nowrap; }
        .shared-tool-back:hover { text-decoration: underline; }

        /* Migration selectors suppress only legacy header/account chrome.
           Tool bodies, report controls, breadcrumbs, state and handoffs stay intact. */
        .shared-tool-shell--use-cases .shared-tool-content > main > div:nth-of-type(1),
        .shared-tool-shell--use-cases .shared-tool-content > main > div:nth-of-type(2) { display: none; }

        .shared-tool-shell--model-advisor .shared-tool-content > main > .model-advisor-app-header,
        .shared-tool-shell--model-advisor .shared-tool-content > main > .model-advisor-app-header + div { display: none; }

        .shared-tool-shell--readiness .shared-tool-content header { display: none; }
        .shared-tool-shell--readiness .shared-tool-content header + main > .no-print:first-child { display: none; }

        .shared-tool-shell--gpu-sizing .shared-tool-content > main > .gpu-app-header,
        .shared-tool-shell--gpu-sizing .shared-tool-content > main > .gpu-app-header + div { display: none; }

        .shared-tool-shell--roi .shared-tool-content > main > .roi-app-header,
        .shared-tool-shell--roi .shared-tool-content > main > .roi-app-header + div { display: none; }

        /* TCO keeps its useful one-line explanatory subtitle, while its old
           brand/title and account row are replaced by the common shell. */
        .shared-tool-shell--tco .shared-tool-content .tco-app-header > div:first-child,
        .shared-tool-shell--tco .shared-tool-content .tco-app-header > .no-print { display: none; }
        .shared-tool-shell--tco .shared-tool-content .tco-app-header { padding-top: 0 !important; }

        .shared-tool-shell--summary .shared-tool-content > div > div:nth-of-type(1),
        .shared-tool-shell--summary .shared-tool-content > div > div:nth-of-type(2) { display: none; }

        @media (max-width: 640px) {
          .shared-tool-header { padding: 10px 16px; }
          .shared-tool-utility { padding: 8px 16px; align-items: flex-start; flex-wrap: wrap; }
          .shared-tool-title { font-size: 16px; }
        }

        @media print {
          .shared-tool-header, .shared-tool-utility { display: none !important; }
        }
      `}</style>

      <header className="shared-tool-header">
        <a href="/" className="shared-tool-brand" aria-label="AI Factory Tools home">
          <img src={cdwLogo} alt="CDW" />
        </a>
        <div className="shared-tool-title-block">
          <span className="shared-tool-eyebrow">AI Factory Tools</span>
          <h1 className="shared-tool-title">{title}</h1>
        </div>
      </header>

      <div className="shared-tool-utility no-print">
        <a href={backHref} className="shared-tool-back">← {backLabel}</a>
        <AuthWidget />
      </div>

      <div className="shared-tool-content">{children}</div>
    </div>
  );
}
