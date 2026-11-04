# AuditPilot — Project Context for Claude Code

## What this is
AuditPilot is an AI-powered Governance, Risk & Compliance (GRC) SaaS platform for South African businesses. Its core differentiator: it acts as an **evidence-based AI auditor** — businesses upload their compliance documents, and the system produces traceable, cited findings against regulations (starting with POPIA), not just generic chat answers.

## Guiding principles (do not violate these)
1. **Never hallucinate compliance answers.** Every answer/finding must be grounded in retrieved evidence and cite its source (document + page, or regulation section). If evidence is insufficient, say so — never guess.
2. **Human-in-the-loop.** All AI-generated findings are DRAFTS requiring human review/acceptance. Never auto-finalize a compliance determination.
3. **Regulation data is legally unverified.** The POPIA knowledge base was AI-drafted from public text and is marked `is_verified: false`. It must show an "unverified" warning everywhere it's used, until a qualified attorney reviews it. Do not remove these warnings.
4. **Conservative over impressive.** This is a compliance product — a wrong "you're compliant" finding has real legal/financial consequences for customers and liability for us. Favor accuracy and honesty over features that look good.
5. **Validate before expanding.** Each phase is tested on real documents (by the human, with real API keys) before building the next. "It compiles" is NOT "it works."

## Tech stack
- Next.js 15.1.3 (App Router), TypeScript strict mode
- Supabase (Postgres, Auth, Storage, pgvector) — private `evidence` storage bucket, signed URLs (NOT public URLs)
- Anthropic Claude API — model via `ANTHROPIC_MODEL` env var, default `claude-sonnet-4-6` (the old `claude-sonnet-4-20250514` is DEPRECATED — do not use it). NOTE: `ANTHROPIC_MODEL` is respected in `findings/engine.ts` + `rag/extraction.ts`, but the 4 AI Tools in `src/lib/anthropic/index.ts` still hardcode `claude-sonnet-4-6` (default matches; env override doesn't reach them yet).
- AI cost cap — `STARTER_AI_MONTHLY_CAP` env var (default 100) caps monthly AI operations for the free/`starter` tier; enforced in every AI route via `src/lib/usage/quota.ts` (`checkAiQuota`/`logAiUsage`), metered through `ai_interactions`.
- Voyage AI (`voyage-3-lite`, 1536 dims) for embeddings — separate API key `VOYAGE_API_KEY`
- unpdf (PDF.js engine) for PDF text extraction — REPLACED pdf-parse, which failed on valid PDFs with "bad xref entry". Do not reintroduce pdf-parse.
- PayFast (ZAR) for billing, sandbox mode currently
- Vercel for deployment — functions pinned to Frankfurt (`"regions": ["fra1"]` in `vercel.json`), next to the Supabase database. Check the `X-Vercel-Id` header if this ever matters.
- **Where data goes:** database, files and server code are in Frankfurt. Supabase has no South African region, and document text also goes to Anthropic and Voyage, so data can't be kept inside South Africa. The Security page says this; keep it accurate.
- Repo: github.com/Muzz779/Audit-Pilot-GRC (branch: main)

## Hard-won gotchas (these cost real debugging time — respect them)
- **Vercel strict TypeScript**: every API route needs `const body: any = await req.json()`. Every `.map/.filter/.reduce` callback needs explicit param types (e.g. `(c: any)`). Dynamic route params are `Promise<{id:string}>` and must be awaited (Next 15).
- **Vector search threshold is 0.25**, NOT 0.5. voyage-3-lite produces lower cosine similarities; 0.5 filtered out all real matches. Tuned and validated at 0.25.
- **Private storage bucket**: files are downloaded server-side via service-role client using the stored storage PATH, not fetched via public URL. `file_url` stores the path, not a public URL.
- **unpdf splits by real page** (`mergePages: false`) — this is what makes citations page-accurate. Critical; don't break it.
- **Re-analyzing a document must delete old chunks first** or chunks accumulate and eventually blow Voyage's token limit.
- **Embedding batches** are capped by input count (128) and by estimated tokens (4,500), which counts digits and punctuation heavily: ledger text uses about twice the tokens of prose. A request bigger than the account's tokens-per-minute limit can never succeed however long it retries.
- **Analysis runs in steps from the browser**, like Run Full Audit. A step embeds for up to 20s, saves, and returns `continue`. A rate limit is not a failure: the step returns `rate_limited` and the browser waits 20s. Try Again resumes from the saved chunks. A step must never wait long enough for the route limit to kill it, because a killed step loses its work and leaves the row in `processing`.
- **Run Full Audit does the same**: a rate-limited control stays at the front of the queue and is retried, so it isn't counted as failed.
- **A scanned reading is kept** at `<storage path>.ocr.json` between steps, so OCR runs once. It is `text/plain` because the bucket's allowed types exclude JSON, and it's removed on completion and when the evidence is deleted.
- **The chunker must never drop text.** Heading detection only labels a section. It used to delete heading-like lines, so short real evidence ("Approved by: ...", list items) never reached the AI and could produce false gaps.
- **Spreadsheets** (XLSX via exceljs, CSV via our own parser) are cited by sheet and row range, Word files by section. `page_number` is null for these: never fake a "Page 1". Old `.xls` and `.doc` get a clear "re-save" error. Do not use the npm `xlsx` package (unpatched CVEs, and we parse customer uploads).
- **Scanned PDF pages** are read by Claude OCR (`extraction.ts`). Anything unread must surface as a warning, never be dropped quietly. Limit: about 10-15 scanned pages per run (8,000 output tokens, 100s timeout), and the remainder is reported as unread.
- **Re-analyzing or deleting a document replaces its chunks**, so existing findings lose that citation. The UI warns about this and the board report says so per finding, including when only some citations were lost.
- **The live database can differ from `schema.sql`.** `organisations` was readable by everyone on live although the file says otherwise. Test rules with a real session; don't trust the file.
- **Row rules can't limit columns.** Protect access fields on `profiles` with the trigger in migration 004, and never let the browser say which organisation an account belongs to. Invitations join on the server (`/api/team/invite`).
- **Free-tier Voyage is 3 calls a minute and 10K tokens a minute.** Everything above works at that speed, but slowly.
- **No new vendors / no scope creep** without flagging it to the human first.

## What is BUILT and VALIDATED (working, tested on real docs)
- **Core app**: auth, multi-tenant orgs with RLS, Risk Register, Policy Management, Compliance frameworks (controls auto-seed), Audit & Evidence, AI Tools (chat/policy/risk/regscan), Team, PayFast billing, Admin panel.
- **Phase 1 — RAG document intelligence**: upload evidence → Analyze (extract via unpdf → chunk → embed via Voyage → store in pgvector) → Ask AuditPilot (retrieves from documents + regulation base, answers with citations, honest "insufficient evidence" behavior). VALIDATED: page-accurate citations, correct POPIA retrieval, honest refusals.
- **Phase 2 — Findings Engine**: per-control analysis. For a control, finds governing regulation + relevant evidence via vector search, Claude classifies as Satisfied/Partial/Gap with High/Med/Low confidence + severity, cited to evidence chunks. Findings land as `draft_pending_review`, human accepts/dismisses, full history logged. VALIDATED: correctly returned Satisfied for a control with encryption evidence, Partial for one with conflicting evidence, Gap when evidence absent — i.e. it genuinely discriminates.
- **Phase 3 — Run Full Audit**: sequential batch across all controls in a framework, one control per HTTP request (no timeout), partial-save (resumable), skips controls that already have findings, live progress + Stop. VALIDATED.
- **Phase 4 — Compliance score from accepted findings**: accepting a finding maps its determination to the linked control's status (satisfied→implemented, partial→in_progress, gap→not_started) and recalculates the framework score via the shared `recalcFrameworkScore` helper (`src/lib/compliance/score.ts`, reused by the manual control-status route). Recompute-from-scratch = idempotent (re-accepting can't double-count). Dismiss/not_assessed change nothing. Compliance page shows a "from audit" tag on controls whose status came from an accepted finding. VALIDATED on real data.
- **Phase 5 — Board-ready findings report**: printable HTML route `src/app/reports/[frameworkId]/page.tsx` (browser print-to-PDF, no new deps). Accepted findings only, grouped by severity, with document+page citations resolved from `evidence_chunk_ids` → `document_chunks` → `evidence`. Prominent DRAFT notice + always-on unverified-regulation disclaimer; pending shown as a count only. "Board Report" button on the Findings page. VALIDATED.
- **Phase 6 — Pre-launch hardening**: (a) SECURITY — evidence served via short-lived signed URLs (`src/app/api/evidence/[id]/download`), `file_url` stores the storage PATH (never a public URL); service-role/secrets audited clean; RLS on findings/finding_history/control_regulation_map/audit_runs VERIFIED org-scoped in the live DB. (b) Fabricated dashboard "compliance trend" replaced with a real control-status breakdown. (c) Double-submit guard on finding accept/dismiss. (d) First-run onboarding checklist on the dashboard. (e) COST GUARD — metered monthly AI-operation cap (`src/lib/usage/quota.ts`): free/`starter` tier capped via `STARTER_AI_MONTHLY_CAP` (env, default 100), pro/enterprise unlimited; every AI entry point (analyze, findings, batch step, ask, 4 AI Tools) checks quota (429) and logs to `ai_interactions`; batch pauses resumably on cap. Mobile/responsive pass deferred to the final fresh-account walkthrough.

## Database migrations (run in order in Supabase SQL editor)
1. `supabase/schema.sql` — core app
2. `supabase/migration_001_rag.sql` — pgvector, document_chunks, regulation_chunks, rag_queries, match functions
3. `supabase/seed_popia_regulations.sql` — 8 POPIA sections (unverified)
4. `supabase/migration_002_findings.sql` — control_regulation_map, findings, finding_history
5. `supabase/migration_003_audit_runs.sql` — audit_runs (batch tracking)
6. `supabase/migration_004_tenant_isolation.sql` — evidence file isolation, organisations visibility, profile access-field trigger
Then run `npm run embed-regulations` once to populate regulation embeddings.

> NOTE: migrations 002 and 003 have been applied directly in the live Supabase project, but the `.sql` files are NOT yet committed to this repo — so a fresh environment cannot be rebuilt from source alone. Reconstructing and committing them from the live schema is outstanding tech-debt (findings table columns are currently inferable only from code: `findings` has `control_id`→controls.id, `framework_id`, `determination`, `status`, `reviewed_by/at`, `review_note`).

## Key file locations
- RAG lib: `src/lib/rag/{embeddings,extraction,chunking}.ts`
- Findings engine: `src/lib/findings/engine.ts`
- Batch routes: `src/app/api/audit-runs/{start,step}/route.ts`
- Findings UI: `src/components/findings/{FindingsContent,RunFullAudit}.tsx`
- Ask: `src/app/api/ask/route.ts`, `src/components/ask/AskAuditPilot.tsx`
- Analyze: `src/app/api/evidence/analyze/route.ts`

## Roadmap — what's LEFT (Phases 4–6 are DONE; remaining below)
- **Migration 004 is live** (run and verified 2026-11-04 with a normal signed-in account). `supabase/migration_004_rollback.sql` restores the previous rules if it ever has to be undone, which reopens the holes.
- **Open rule to tighten:** the live `organisations` table has two INSERT rules with `with_check true`, and "Users can create organisations" includes `anon`. Nobody can read or join through them, but anyone can add empty rows. Migration 004 doesn't touch them. Check signup still works before removing `anon`.
- **⚠️ Framework/regulation coverage gap (LIABILITY — highest open risk):** `compliance_frameworks` seeds 8 frameworks (POPIA, GDPR, ISO 27001, SOC 2, NIS2, PCI-DSS, King IV, NIST CSF), but ONLY POPIA has a regulation knowledge base (`seed_popia_regulations.sql` / `regulation_chunks`). There is currently NO gate stopping a user from running the AI findings engine / Run Full Audit on a non-POPIA framework — the engine finds zero governing regulation, so findings are grounded only in evidence + Claude's general knowledge, NOT cited to any regulation, and because `regulationChunks` is empty `used_unverified_regulation` is `false` so no warning even shows. FIX before launch: gate the findings/audit engine (UI + server) to frameworks that actually have a regulation base (POPIA). See engine `src/lib/findings/engine.ts` (`match_regulation_chunks` by `framework_id`).
- **Legal review of POPIA seed data** before any live customer — non-negotiable (stays `is_verified: false`, keep unverified warnings).
- **More frameworks** (GDPR, ISO 27001, etc.) — GATED on building a regulation base for each AND legal review of it; adding unverified frameworks multiplies liability. Do not do this without the human confirming legal review.
- **Commit migrations 002/003** (see NOTE above) so a fresh env is reproducible.
- **Mobile/responsive pass** + set `STARTER_AI_MONTHLY_CAP` to the real number.
- **Go-live**: domain (auditpilot.co.za), PayFast sandbox → live, Terms/liability disclaimer, prod env vars.

## How to work on this
- The human runs all tests (real Supabase, real API keys, real uploads). You cannot test runtime behavior. After building, give the human a specific, skeptical test plan — including how to try to break it — not just "it's done."
- Prefer editing existing files in place. Keep changes consolidated.
- If a change touches liability-sensitive areas (findings accuracy, regulation data, auto-finalizing, removing warnings), flag it explicitly before doing it.
