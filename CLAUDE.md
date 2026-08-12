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
- Anthropic Claude API — model via `ANTHROPIC_MODEL` env var, default `claude-sonnet-4-6` (the old `claude-sonnet-4-20250514` is DEPRECATED — do not use it)
- Voyage AI (`voyage-3-lite`, 1536 dims) for embeddings — separate API key `VOYAGE_API_KEY`
- unpdf (PDF.js engine) for PDF text extraction — REPLACED pdf-parse, which failed on valid PDFs with "bad xref entry". Do not reintroduce pdf-parse.
- PayFast (ZAR) for billing, sandbox mode currently
- Vercel for deployment
- Repo: github.com/Muzz779/Audit-Pilot-GRC (branch: main)

## Hard-won gotchas (these cost real debugging time — respect them)
- **Vercel strict TypeScript**: every API route needs `const body: any = await req.json()`. Every `.map/.filter/.reduce` callback needs explicit param types (e.g. `(c: any)`). Dynamic route params are `Promise<{id:string}>` and must be awaited (Next 15).
- **Vector search threshold is 0.25**, NOT 0.5. voyage-3-lite produces lower cosine similarities; 0.5 filtered out all real matches. Tuned and validated at 0.25.
- **Private storage bucket**: files are downloaded server-side via service-role client using the stored storage PATH, not fetched via public URL. `file_url` stores the path, not a public URL.
- **unpdf splits by real page** (`mergePages: false`) — this is what makes citations page-accurate. Critical; don't break it.
- **Re-analyzing a document must delete old chunks first** or chunks accumulate and eventually blow Voyage's token limit.
- **Embedding batches** are capped by both input count (128) and total chars (~350k) to stay under Voyage limits.
- **No new vendors / no scope creep** without flagging it to the human first.

## What is BUILT and VALIDATED (working, tested on real docs)
- **Core app**: auth, multi-tenant orgs with RLS, Risk Register, Policy Management, Compliance frameworks (controls auto-seed), Audit & Evidence, AI Tools (chat/policy/risk/regscan), Team, PayFast billing, Admin panel.
- **Phase 1 — RAG document intelligence**: upload evidence → Analyze (extract via unpdf → chunk → embed via Voyage → store in pgvector) → Ask AuditPilot (retrieves from documents + regulation base, answers with citations, honest "insufficient evidence" behavior). VALIDATED: page-accurate citations, correct POPIA retrieval, honest refusals.
- **Phase 2 — Findings Engine**: per-control analysis. For a control, finds governing regulation + relevant evidence via vector search, Claude classifies as Satisfied/Partial/Gap with High/Med/Low confidence + severity, cited to evidence chunks. Findings land as `draft_pending_review`, human accepts/dismisses, full history logged. VALIDATED: correctly returned Satisfied for a control with encryption evidence, Partial for one with conflicting evidence, Gap when evidence absent — i.e. it genuinely discriminates.
- **Phase 3 — Run Full Audit**: sequential batch across all controls in a framework, one control per HTTP request (no timeout), partial-save (resumable), skips controls that already have findings, live progress + Stop. VALIDATED.
- **Phase 4 — Compliance score from accepted findings**: accepting a finding maps its determination to the linked control's status (satisfied→implemented, partial→in_progress, gap→not_started) and recalculates the framework score via the shared `recalcFrameworkScore` helper (`src/lib/compliance/score.ts`, reused by the manual control-status route). Recompute-from-scratch = idempotent (re-accepting can't double-count). Dismiss/not_assessed change nothing. Compliance page shows a "from audit" tag on controls whose status came from an accepted finding. VALIDATED on real data.

## Database migrations (run in order in Supabase SQL editor)
1. `supabase/schema.sql` — core app
2. `supabase/migration_001_rag.sql` — pgvector, document_chunks, regulation_chunks, rag_queries, match functions
3. `supabase/seed_popia_regulations.sql` — 8 POPIA sections (unverified)
4. `supabase/migration_002_findings.sql` — control_regulation_map, findings, finding_history
5. `supabase/migration_003_audit_runs.sql` — audit_runs (batch tracking)
Then run `npm run embed-regulations` once to populate regulation embeddings.

> NOTE: migrations 002 and 003 have been applied directly in the live Supabase project, but the `.sql` files are NOT yet committed to this repo — so a fresh environment cannot be rebuilt from source alone. Reconstructing and committing them from the live schema is outstanding tech-debt (findings table columns are currently inferable only from code: `findings` has `control_id`→controls.id, `framework_id`, `determination`, `status`, `reviewed_by/at`, `review_note`).

## Key file locations
- RAG lib: `src/lib/rag/{embeddings,extraction,chunking}.ts`
- Findings engine: `src/lib/findings/engine.ts`
- Batch routes: `src/app/api/audit-runs/{start,step}/route.ts`
- Findings UI: `src/components/findings/{FindingsContent,RunFullAudit}.tsx`
- Ask: `src/app/api/ask/route.ts`, `src/components/ask/AskAuditPilot.tsx`
- Analyze: `src/app/api/evidence/analyze/route.ts`

## Roadmap — what's LEFT (in priority order)
- **Phase 5 — Board report / PDF export** — turn accepted findings into a formatted executive report (NEXT). Note: an older general HTML report exists at `src/app/api/audit-report/route.ts` (frameworks/risks/policies), but it is NOT findings-based and lacks evidence citations, severity grouping, and the unverified-regulation/DRAFT disclaimers.
- **Scanned-PDF OCR** — currently scanned PDFs are rejected; add OCR via Claude vision.
- **More file types in analysis** — XLSX ingestion.
- **More frameworks** (ISO 27001, GDPR, etc.) — GATED on legal review of the regulation-base approach; adding unverified frameworks multiplies liability. Do not do this without the human confirming legal review.
- **Legal review of POPIA seed data** before any live customer — non-negotiable.
- **Go-live**: domain (auditpilot.co.za), PayFast sandbox → live.

## How to work on this
- The human runs all tests (real Supabase, real API keys, real uploads). You cannot test runtime behavior. After building, give the human a specific, skeptical test plan — including how to try to break it — not just "it's done."
- Prefer editing existing files in place. Keep changes consolidated.
- If a change touches liability-sensitive areas (findings accuracy, regulation data, auto-finalizing, removing warnings), flag it explicitly before doing it.
