# AI Factory Service Inventory

This inventory records the external services, subscriptions, accounts, secrets, operational dependencies, and failure modes used by the CDW AI Factory tool suite.

Use this file for the practical questions: **What external systems does this project depend on, what are they used for, what tier are we on, where is configuration managed, and what breaks if one goes down?**

Never store passwords, API key values, access tokens, database passwords, webhook URLs, or other secret values in this file. Record names and management locations only.

For recurring maintenance procedures, read `MaintenanceRunbook.md`. For architecture/history, read `AiFactoryProjectBrief.md`. For milestone history, read `CHANGELOG.md`.

## 1. Service summary

| Service | Role | Dependency class | Known tier/status | Primary management location |
| --- | --- | --- | --- | --- |
| GitHub | Private source repo, history, Actions, secrets | Production + maintenance | Private repo; exact billing tier not documented here | GitHub repo/settings |
| Vercel | Hosting and deployment | Production-critical | Pro plan per project brief | Vercel project |
| Supabase | Postgres, Auth, account/profile data, snapshots, download events, Edge Functions | Production-critical | Pro organization, Micro compute per project brief | Supabase project `ai-factory` |
| Resend | SMTP delivery for Supabase Auth magic links | Production-critical for login email | Active; exact billing tier not documented here | Resend dashboard + Supabase Auth SMTP settings |
| Cloudflare | Domain registrar and DNS for `cdwaifactory.com` | Domain/DNS | Domain registered; exact plan beyond registrar not documented here | Cloudflare dashboard |
| Slack | Download/report notifications | Operational visibility | Personal workspace `AI Factory Tools`; exact tier not documented here | Slack workspace + Supabase Edge Function secret |
| Hugging Face | Primary model specification metadata source | Data-maintenance-critical | Account + read-only token sufficient; no paid plan required by current design | Hugging Face account + GitHub Actions secret |
| Artificial Analysis | Model capability/speed/token-price data | Data-maintenance-critical | Free API tier | Artificial Analysis account + GitHub Actions secret |
| NVIDIA data/tools | DGX pricing, GPU/product/performance reference inputs, NIM research | Data-maintenance-critical | External/manual sources; no project subscription identified | NVIDIA tools/sites and captured source evidence |
| Managed API provider public pricing pages | Manual first-party evidence for Inference Economics comparison snapshot | Data-maintenance input, not runtime API dependency | Dated rates and provenance stored in `src/managedApiPricingRegistry.js` | Provider pricing pages and repository snapshot |
| Claude Project / Cowork | Primary AI-assisted build/project workspace | Development-only | Subscription/account external to runtime; exact plan not recorded here | Anthropic account / Claude Project |
| ChatGPT | Independent review, audit, GitHub-connected maintenance | Development-only | Subscription/account external to runtime; exact plan not recorded here | OpenAI account / ChatGPT connectors |

The Inference Economics managed API selector reads a checked-in, dated first-party pricing snapshot, not live provider pricing APIs. BenchLM appears only as a future adapter slot in `src/managedApiPricingSource.js`; commercial-use status is unresolved, activation is on hold, and it is not an operational dependency. Recheck snapshot dates and exceptions using the maintenance runbook.

## 2. GitHub

### Purpose

- Private source repository: `Jaybc25/cdw-ai-factory-tco`.
- Default branch: `main`.
- Git history and future releases/tags.
- GitHub Actions for model-data maintenance and reconciliation.
- Weekly read-only maintenance review action: checks registry freshness and Azure Retail Prices API candidates, stores Markdown and JSON artifacts, and maintains one GitHub review issue with dated shadow-observation comments. Its built-in GitHub token needs `issues: write`; it does not write pricing registries or require a provider secret. See `docs/cloud-pricing-shadow-rollout.md` for the observation gate and pending provider coverage.
- GitHub Actions secret storage for external data APIs.
- Connected AI-tool access for repo-backed review and maintenance.

### Known configuration

- Repository visibility: private as of September 1, 2026.
- Current connected ChatGPT GitHub authorization was verified after the privacy change with pull, push, maintain, and admin access.
- Claude Project instructions designate the repo as the source of truth.

### Secret/config names

- `HF_TOKEN`
- `AA_API_KEY`

Do not record their values in the repo.

### What breaks if GitHub is unavailable

- Source fetch/edit/commit workflows are interrupted.
- Scheduled GitHub Actions do not run.
- Automated HF/AA data refresh and registry reconciliation pause.
- Vercel auto-deployment from GitHub may be delayed/unavailable depending on integration state.
- AI collaborators lose the preferred source-of-truth access path.

### Maintenance

- Quarterly: confirm repo remains private and intended integrations retain access.
- Quarterly: confirm Actions are succeeding and required secrets remain valid.
- Before declaring a stable release: ensure `main` is the intended source baseline and create/tag the known-good commit when release discipline is adopted.

## 3. Vercel

### Purpose

- Hosts the live Vite/React application.
- Deploys from the GitHub repository.
- Provides the current live application URL: `https://cdw-ai-factory-tco.vercel.app`.

### Known tier/status

- Vercel Pro plan per the project brief.
- Exact deployment SHA/version should be independently checked when making a live-verification claim.

### Required environment-variable names

Current client source expects:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Do not place values in this file.

### What breaks if Vercel is unavailable

- The live website becomes unavailable or cannot deploy updates.
- Source may remain healthy in GitHub while the live deployment is stale or down.
- This does not by itself affect GitHub source history or scheduled model-data jobs.

### Maintenance

- Quarterly: confirm project remains connected to the intended private repo and `main` branch.
- Quarterly: confirm required environment variables remain configured.
- After meaningful source changes: confirm the expected deployment completed and perform live regression checks.

## 4. Supabase

### Purpose

Project: `ai-factory`.

Used for:

- PostgreSQL database.
- Magic-link authentication.
- Account/profile data.
- `download_events`.
- `tool_snapshots` for My Summary.
- Edge Functions, including Slack notification delivery.

### Known tier/status

- Pro organization.
- Micro compute.
- Database password is maintained outside the repository in the user's password manager. The repo should never contain the password value.

### Important database/permissions history

The project has previously required both RLS policies and explicit PostgreSQL GRANTs. Historical fixes included permissions for authenticated and service roles and a PostgREST schema-cache reload. Treat database permission changes as high-risk and test auth/data flows after modifying them.

### What breaks if Supabase is unavailable

Potentially affected:

- Magic-link authentication/session behavior.
- Account/profile lookup.
- Contact-gate bypass for completed profiles.
- Snapshot autosave and My Summary.
- Download event logging.
- Slack notifications if the Edge Function cannot run.

Core client-side calculator rendering may still load depending on the failure, but authenticated/report workflows can be impaired.

### Maintenance

- Quarterly: review project health, database usage, Auth configuration, and Edge Function status.
- After permission/schema changes: explicitly test RLS/GRANT behavior with authenticated and service-role paths as applicable.
- After domain changes: update Auth Site URL/Redirect URLs before relying on magic links at the new domain.

## 5. Resend

### Purpose

- SMTP provider for Supabase Auth magic-link delivery.
- Sender identity currently associated with `cdwaifactory.com`.

### Known status

- Personal/external email delivery has been confirmed working historically.
- Known unresolved issue: messages to `@cdw.com` have previously returned successful Resend delivery/API behavior but did not arrive, suggesting filtering/allowlisting may be required.
- Exact Resend free/paid tier is not documented in the repo and should be confirmed in the Resend account when billing inventory is reviewed.

### What breaks if Resend is unavailable

- New magic-link login emails may not arrive.
- Existing active sessions can behave differently from new login attempts, so a live site may appear partially healthy while sign-in is broken.

### Maintenance

- Quarterly: send a test magic link to a known-working external address.
- Periodically test the intended CDW address path if/when allowlisting is pursued.
- Review sender-domain/DNS status after any Cloudflare DNS changes.

## 6. Cloudflare

### Purpose

- Registrar and DNS management for `cdwaifactory.com`.
- DNS support for Resend sender verification.
- Future production/custom-domain routing if/when approved.

### Known status

- Domain was purchased in August 2026.
- Domain is verified for Resend.
- The project brief currently records the domain as parked and not connected to Vercel pending publication sign-off.

### What breaks if Cloudflare/domain configuration fails

Depending on configuration state:

- Custom domain resolution can fail.
- Resend sender authentication can be impaired if required DNS records are removed.
- Magic-link redirects can fail if the app moves to the custom domain without corresponding Supabase Auth redirect changes.

### Maintenance

- Confirm domain renewal/auto-renew status at least quarterly and before renewal season.
- Avoid deleting DNS records used by Resend without first understanding their role.
- When connecting the domain to Vercel, coordinate Vercel DNS/domain settings and Supabase Auth Site URL/Redirect URLs in the same change window.

## 7. Slack

### Purpose

- Operational notification channel for report/download events.
- Workspace: `AI Factory Tools`.
- Channel: `#all-ai-factory-tools`.

### Current architecture

A Supabase Edge Function sends notifications through a Slack webhook. Direct invocation from the application/backend flow is currently intentional because the desired Supabase Database Webhook path was blocked by a platform issue in prior work.

### Secret/config names

- `SLACK_WEBHOOK_URL` is stored as a Supabase Edge Function secret.

Do not record the value in this file or GitHub.

### What breaks if Slack is unavailable

- User-facing calculations and reports should continue to function.
- Operational visibility into downloads/summary activity is lost or delayed.
- Download-event database records may still exist even if the Slack notification fails, depending on failure location.

### Maintenance

- Quarterly and after Edge Function changes: trigger a known report/download event and confirm the expected Slack message arrives.
- If the Supabase Database Webhooks platform issue is resolved and architecture changes, update this inventory and the runbook.

## 8. Hugging Face

### Purpose

Primary source for tracked model architecture/specification data including the fields used for hard filtering and GPU-sizing handoff support.

### Known account/tier requirements

- Current design does not require a paid Hugging Face plan.
- A read-only access token is sufficient for the current API use.
- The issuing account must have accepted terms for gated models such as applicable Llama/Gemma repositories.

### Secret/config name

- GitHub Actions secret `HF_TOKEN`.

### What breaks if Hugging Face access fails

- Scheduled model-spec refresh fails.
- Existing committed model snapshot remains available, but grows stale.
- New/changed model metadata cannot be refreshed automatically.

### Maintenance

- Review monthly Action success.
- If a gated model begins returning 401/403, confirm model terms/access for the token-owning account before rotating code or guessing at a data bug.
- Run out of cycle when deliberately adding a new model to the canonical registry.

## 9. Artificial Analysis

### Purpose

Supplies current model intelligence, coding, agentic, speed, and token-pricing data for tracked models.

### Known tier

- Free API tier is intentionally sufficient for the current architecture.
- The project deliberately does not depend on Pro-only fields for hard-filter model metadata.

### Secret/config name

- GitHub Actions secret `AA_API_KEY`.

### What breaks if Artificial Analysis access fails

- Weekly capability refresh fails.
- Existing committed capability snapshot remains available but becomes stale.
- Discovery candidate updates pause.
- Hugging Face-backed hard-filter fields remain architecturally independent.

### Maintenance

- Review weekly Action success.
- Review discovery candidates periodically.
- If the API tier/schema changes, confirm that the fields consumed by the project still exist before upgrading to a paid tier.

## 10. NVIDIA data and tools

### Purpose

Used as primary or authoritative reference material for areas such as:

- DGX/on-prem system pricing inputs.
- Hardware configuration assumptions.
- GPU generation/product information.
- Performance/reference factors and MLPerf-related validation.
- NIM compatibility research.

### Current automation state

- On-prem pricing is manually maintained.
- NIM compatibility sync is manual-only and not production-backed.
- No paid NVIDIA project subscription is documented as required by the current repository architecture.

### What breaks if NVIDIA sources are unavailable

- Existing source values remain in the app, but manual pricing/performance verification cannot be refreshed confidently.
- New hardware/NIM changes may not be incorporated promptly.

### Maintenance

Follow `MaintenanceRunbook.md` for the monthly pricing review, quarterly performance/product review, and NIM endpoint validation criteria.

## 11. Claude Project / Cowork

### Purpose

- Primary AI-assisted implementation/project workspace.
- Persistent project instructions and context.
- GitHub-connected source review/edit workflows where authorized.

### Dependency class

Development-only. The production website does not require Claude to run.

### Current project instruction essentials

- Fetch current repo files before code/data claims.
- Read `AiFactoryProjectBrief.md` for durable context.
- Keep source-verified, live-verified, and externally approved status separate.
- Use actual repo files rather than reconstructing from memory.

### What breaks if Claude access is unavailable

- No production outage.
- AI-assisted build/maintenance workflows through Claude pause.

### Billing

Exact Claude subscription/tier is not stored in the repository. Review separately in the Anthropic account if maintaining a full personal subscription budget.

## 12. ChatGPT

### Purpose

- Independent adversarial reviewer/auditor.
- Cross-check of calculation/model logic.
- GitHub-connected source inspection and documentation maintenance.
- Independent second opinion rather than automatic agreement with implementation output.

### Dependency class

Development-only. The production website does not require ChatGPT to run.

### What breaks if ChatGPT access is unavailable

- No production outage.
- Independent review and GitHub-assisted maintenance through ChatGPT pause.

### Billing

Exact OpenAI subscription/tier should be reviewed in the user's OpenAI account. It is not a production runtime dependency and should not be mixed with infrastructure spend unless the user wants a complete personal project-cost view.

## 13. Credential and configuration map

Record only names and locations, never values.

| Credential/config | Used by | Managed in |
| --- | --- | --- |
| `HF_TOKEN` | Hugging Face model-spec GitHub Action | GitHub Actions secrets |
| `AA_API_KEY` | Artificial Analysis capability GitHub Action | GitHub Actions secrets |
| `VITE_SUPABASE_URL` | Vercel client build/runtime config | Vercel environment variables |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Vercel client build/runtime config | Vercel environment variables |
| `SLACK_WEBHOOK_URL` | Supabase Edge Function | Supabase function secrets |
| Supabase database password | Database administration | External password manager, not repo |
| Resend SMTP credentials | Supabase Auth email delivery | Resend + Supabase Auth SMTP configuration |
| GitHub connector authorization | AI source access | ChatGPT/Claude connector and GitHub App authorization settings |

If any credential is rotated, immediately test the workflow that consumes it rather than assuming successful storage means successful operation.

## 14. Billing and renewal review checklist

Quarterly, check the actual account dashboards and update this file if tiers change.

Confirm:

- GitHub billing tier and any Actions/storage charges.
- Vercel Pro subscription status and usage.
- Supabase Pro organization + compute cost/usage.
- Resend current plan, usage, sender-domain health, and any billing threshold.
- `cdwaifactory.com` renewal/auto-renew state in Cloudflare.
- Slack workspace tier if it changes from free/default behavior.
- Hugging Face remains usable without a paid tier for current API needs.
- Artificial Analysis remains usable on the free API tier for consumed fields.
- Claude subscription if tracking development-tool cost.
- ChatGPT subscription if tracking development/review-tool cost.

Do not guess monthly dollar costs from repository evidence. The account dashboards are authoritative for current billing.

## 15. Dependency criticality

### Production-critical

- Vercel
- Supabase
- Resend for new magic-link login

### Operational/supporting

- Cloudflare/domain/DNS
- Slack notifications
- GitHub for deployment/source continuity

### Data-maintenance-critical but not required for every live page load

- Hugging Face
- Artificial Analysis
- NVIDIA reference sources

### Development-only

- Claude Project / Cowork
- ChatGPT

This distinction matters during incidents. A failed weekly model sync is a data-freshness issue, not automatically a production outage. A Supabase Auth or Vercel failure can directly affect users.
