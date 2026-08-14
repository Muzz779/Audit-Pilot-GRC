# AuditPilot — Roadmap to Sellable v1

This document defines the remaining work to reach a launchable v1, for Claude Code to execute.
Read CLAUDE.md first for full project context, principles, and gotchas.

## Definition of "sellable v1"
A South African business can: sign up, add POPIA, upload their real compliance documents,
run a full audit, get accurate cited draft findings, review/accept them, see a compliance
score driven by those findings, and export a board-ready report. Billing works. Deployed live.
The regulation data has been reviewed by a qualified person before any paying customer.

---

## PHASE 4 — Compliance Score from Accepted Findings  ✅ DONE (validated on real data)
Implemented: `gap→not_started`; shared `recalcFrameworkScore` helper in `src/lib/compliance/score.ts` (reused by the manual control-status route); accept-hook in `src/app/api/findings/route.ts`; "from audit" tag on the Compliance page. Recompute-from-scratch keeps re-accepts idempotent.

**Goal:** Close the loop so accepted findings drive the dashboard compliance %, instead of it being based only on manually-set control statuses.

**Why it matters:** Right now findings and the compliance score are disconnected. A customer who runs an audit and accepts findings expects their score to reflect that. This is the payoff of the findings engine.

**Build:**
1. When a finding is ACCEPTED, update the linked control's status based on the determination:
   - `satisfied` → control status `implemented`
   - `partial` → control status `in_progress`
   - `gap` → control status `not_started` (or a new `gap` status if cleaner)
   - Dismissed findings do not change control status.
2. Recalculate the framework compliance_score using the existing logic (implemented / applicable controls) after each accepted finding — reuse the recalc already in `src/app/api/compliance/controls/[id]/route.ts`.
3. Dashboard and Compliance page should reflect the updated score automatically (they already read compliance_score).
4. Add a small indicator on the Compliance page showing which control statuses came from an accepted finding vs set manually (e.g. a small "from audit" tag), so it's transparent.

**Test plan for the human:**
- Accept a "satisfied" finding → confirm the linked control flips to implemented and the framework score rises.
- Accept a "gap" finding → confirm control shows not started/gap and score reflects it.
- Dismiss a finding → confirm no score change.
- Confirm dashboard compliance % matches the Compliance page.

**Watch out:** Don't let a re-run or re-accept double-count. Accepting the same finding twice must be idempotent.

---

## PHASE 5 — Board-Ready Report Export (PDF)  ✅ DONE (validated)
Implemented as printable HTML route `src/app/reports/[frameworkId]/page.tsx` (browser print-to-PDF, no new deps). Accepted findings only, grouped by severity, document+page citations, DRAFT + always-on unverified-regulation disclaimers; "Board Report" button on the Findings page.

**Goal:** Turn accepted findings + compliance state into a formatted executive report a customer can present to their board or an auditor.

**Why it matters:** This is the tangible deliverable that justifies the subscription. It's what a customer shows their boss to prove value.

**Build:**
1. A "Generate Report" action on the Findings page (or a new Reports page), scoped to a framework.
2. Report contents (in this order):
   - Cover: org name, framework, date, "DRAFT — pending internal review" watermark/notice
   - Executive summary: overall compliance %, counts of satisfied/partial/gap, # accepted vs pending findings
   - Compliance score visual (can be a simple bar or table — keep it robust, not fancy)
   - Findings detail: grouped by severity (critical first), each showing control, determination, confidence, evidence cited (document + page), reasoning, recommendation
   - Appendix: list of evidence documents analyzed, and a clear disclaimer that regulation data is unverified pending legal review and findings are decision-support not legal advice
3. Output as PDF. Prefer a server-side HTML→PDF approach that works on Vercel serverless. Options: `@react-pdf/renderer` (React-native PDF, reliable on serverless) OR render an HTML report route and let the user print-to-PDF (simplest, zero new heavy deps). RECOMMEND starting with a clean printable HTML report route (`/reports/[frameworkId]`) with print CSS — no new dependency, works everywhere — and only add a PDF library if the human specifically wants a direct download.
4. Only ACCEPTED findings appear in the formal report by default; pending/dismissed excluded (or clearly separated). Include the unverified-regulation disclaimer prominently.

**Test plan for the human:**
- Generate a report after accepting several findings → confirm it shows the right findings, correct scores, citations with page numbers, and the disclaimer.
- Confirm dismissed/pending findings are excluded from the formal section.
- Confirm it prints cleanly to PDF from the browser.

**Watch out:** Do NOT overstate certainty in the report language. It's a draft decision-support document, not a certificate of compliance. Keep the disclaimer prominent. Never remove the unverified-regulation notice.

---

## PHASE 6 — Pre-Launch Hardening  ✅ MOSTLY DONE
Done: security pass (signed URLs, secrets/service-role audit, RLS on findings tables VERIFIED org-scoped); fabricated dashboard trend replaced with real control breakdown; double-submit guard on finding review; first-run onboarding checklist; metered monthly AI cost cap (`src/lib/usage/quota.ts`, `STARTER_AI_MONTHLY_CAP`). Deferred to the final fresh-account walkthrough: mobile/responsive check + setting the real cap value. NOTE: the AI findings engine is NOT yet gated to POPIA-only — see the framework/regulation coverage gap in CLAUDE.md (fix before launch).

**Goal:** The unglamorous but essential polish before real users touch it.

**Build / verify:**
1. **Empty states & errors**: every page handles "no data yet" gracefully (no crashes, helpful prompts). Every API failure shows a human-readable message, not a stack trace.
2. **Rate/cost guards**: confirm batch audit and analyze have sensible limits so a user can't accidentally rack up huge API bills. Consider a simple per-org monthly usage cap on AI operations for the free tier.
3. **Loading states**: every async action (analyze, run audit, generate report, accept finding) shows clear progress and disables double-submit.
4. **Mobile/responsive check** of the main flows (dashboard, findings, ask).
5. **Security pass**: confirm RLS on every table (findings, audit_runs, finding_history, document_chunks all org-scoped), confirm no public storage URLs, confirm service-role key only used server-side, confirm no secrets leak to the client bundle.
6. **Onboarding**: a first-run experience that guides a new org to (1) add POPIA, (2) upload a document, (3) analyze it, (4) run an audit. Even a simple checklist on the dashboard.

**Test plan for the human:** Create a brand-new org from scratch and go through the entire flow as a first-time user with no data. Note every point of confusion or breakage.

---

## NON-CODE GATES (human must do these — Claude Code cannot)
1. **Legal review of POPIA regulation data** by a qualified SA data protection practitioner/attorney. Until done, keep all `is_verified: false` and keep the unverified warnings. This is non-negotiable before a paying customer.
2. **Domain**: register auditpilot.co.za, connect to Vercel.
3. **PayFast**: switch sandbox → live credentials once ready to take real payment.
4. **Terms of Service / disclaimer**: get proper T&Cs and a liability disclaimer written (the product makes compliance suggestions — you need legal protection). An attorney should draft this.
5. **Final env vars in Vercel**: all keys set for production (Supabase, Anthropic, Voyage, PayFast live, ANTHROPIC_MODEL, app URL).

---

## Suggested build order
Phase 4 (score) → Phase 5 (report) → Phase 6 (hardening) → non-code gates in parallel → launch.
Phases 4 and 5 are the real remaining product work. 6 is polish. The gates are what actually
protect you legally and let you take money.

## Explicitly OUT of scope for v1 (do NOT build these yet)
More frameworks (ISO/GDPR/etc.), scanned-PDF OCR, XLSX ingestion, CAPA tracking, continuous
monitoring, external auditor access, multi-subsidiary. All valuable, all post-launch, several
gated on legal review. Adding them now delays launch and multiplies liability.
