# CDW AI Factory — Cloud → On-Prem AI TCO Calculator (v2.7)

Reverse TCO tool: starts from a customer's current cloud AIaaS spend and outputs
the on-prem NVIDIA fleet required to absorb it, with cost of ownership vs. staying
in cloud over 1/3/5 years. Companion artifacts in /docs: design spec and the
validated Excel model (reproduces NVIDIA DGX TCO tool Test 1 exactly).

## Run locally
    npm install
    npm run dev          # http://localhost:5173

## Production build
    npm run build        # outputs to /dist
    npm run preview      # serve the build locally

## Deploy (when approved — see status below)
Any static host works: Vercel, Netlify, Cloudflare Pages, GitHub Pages.
Point the cdwaifactory.com DNS at the host from your registrar afterward (Cloudflare Pages is a natural fit given the domain lives at Cloudflare). index.html carries
noindex until launch is approved.

## IMPORTANT — approval status (Aug 2026)
- CDW logo: TEMPORARY approval for this draft product artifact only.
- Website publication: NOT approved yet. Do not deploy publicly before
  CDW marketing/legal sign-off (branding + domain).
- Before public launch: gate or strip the editable Rate card section
  (contains partner-derived pricing), and replace demo lead storage.

## Deploy-phase work (not in this package)
- Lead handling: real form endpoint or CRM webhook (demo uses localStorage /
  artifact storage via the adapter in src/App.jsx).
- Emailed PDF: server-side render + email API (e.g., Resend or SendGrid).
- Automated rate feeds: provider pricing APIs (AWS Price List, Azure Retail
  Prices, GCP Billing Catalog), EIA power rates, MLPerf refresh. See spec §5.

## Data provenance
- On-prem defaults: NVIDIA DGX TCO tool (Jul 2026 extract).
- Cloud rates: provider list pricing via public trackers, Jul–Aug 2026,
  estimated cells flagged in-app.
- Performance factors: MLPerf-derived (conservative defaults; NVIDIA claims
  as range upper bounds).
