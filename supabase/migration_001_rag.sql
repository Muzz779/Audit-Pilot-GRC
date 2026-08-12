-- ============================================================
-- AuditPilot — RAG / Document Intelligence Migration
-- Phase 1: Document chunking, embeddings, and POPIA knowledge base
-- Run this AFTER the main schema.sql
-- ============================================================

-- ============================================================
-- ENABLE PGVECTOR
-- ============================================================

create extension if not exists vector;

-- ============================================================
-- ENUMS
-- ============================================================

create type chunk_analysis_status as enum ('pending', 'processing', 'completed', 'failed');

-- ============================================================
-- DOCUMENT CHUNKS
-- Stores extracted, embedded text from uploaded evidence
-- ============================================================

create table document_chunks (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid references organisations(id) on delete cascade not null,
  evidence_id uuid references evidence(id) on delete cascade not null,

  -- Chunk content
  chunk_text text not null,
  chunk_index integer not null, -- order within the document

  -- Location metadata — critical for citations
  page_number integer,
  section_title text,
  paragraph_id text,

  -- Vector embedding (Claude/Voyage embeddings are 1024 dims; using 1536 for OpenAI-compatible sizing flexibility)
  embedding vector(1536),

  -- Bookkeeping
  token_count integer,
  created_at timestamptz default now()
);

-- Vector similarity index (IVFFlat — good balance for small-to-medium scale)
create index document_chunks_embedding_idx on document_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create index document_chunks_org_idx on document_chunks(organisation_id);
create index document_chunks_evidence_idx on document_chunks(evidence_id);

-- ============================================================
-- DOCUMENT ANALYSIS STATUS
-- Tracks the manual "Analyze" trigger per evidence document
-- ============================================================

create table document_analysis (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid references organisations(id) on delete cascade not null,
  evidence_id uuid references evidence(id) on delete cascade not null unique,

  status chunk_analysis_status default 'pending',
  chunk_count integer default 0,
  page_count integer,
  error_message text,

  requested_by uuid references profiles(id),
  requested_at timestamptz default now(),
  completed_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index document_analysis_org_idx on document_analysis(organisation_id);

-- ============================================================
-- REGULATION CHUNKS
-- Hand-curated, machine-readable regulation knowledge base.
-- GLOBAL (not org-scoped) — shared reference data.
-- ============================================================

create table regulation_chunks (
  id uuid primary key default uuid_generate_v4(),
  framework_id uuid references compliance_frameworks(id) on delete cascade,

  -- Content
  section_reference text not null, -- e.g. "Section 22" or "A.5.1"
  title text not null,
  chunk_text text not null,        -- the actual requirement/obligation text
  category text,                   -- e.g. "Breach Notification", "Access Control"

  -- What this requirement needs to be satisfied
  required_evidence_description text,

  embedding vector(1536),

  -- CRITICAL: review status — must be true before used in live findings
  is_verified boolean default false,
  verified_by uuid references profiles(id),
  verified_at timestamptz,
  source_note text default 'AI-drafted from public legislative text. NOT yet reviewed by qualified legal counsel. Do not rely on this as legal advice.',

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index regulation_chunks_embedding_idx on regulation_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 50);

create index regulation_chunks_framework_idx on regulation_chunks(framework_id);

-- ============================================================
-- ASK / RAG QUERY LOG
-- Every question asked, what was retrieved, what was answered
-- Full traceability for audit purposes
-- ============================================================

create table rag_queries (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid references organisations(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,

  question text not null,
  answer text,

  -- What evidence was retrieved and used (stored for traceability)
  retrieved_document_chunk_ids uuid[] default '{}',
  retrieved_regulation_chunk_ids uuid[] default '{}',

  -- Did the model have enough evidence to answer confidently?
  had_sufficient_evidence boolean,
  confidence_note text,

  created_at timestamptz default now()
);

create index rag_queries_org_idx on rag_queries(organisation_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create trigger document_analysis_updated_at before update on document_analysis
  for each row execute function update_updated_at();

create trigger regulation_chunks_updated_at before update on regulation_chunks
  for each row execute function update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table document_chunks enable row level security;
alter table document_analysis enable row level security;
alter table regulation_chunks enable row level security;
alter table rag_queries enable row level security;

-- DOCUMENT CHUNKS — strictly organisation isolated
create policy "Org members can view their document chunks" on document_chunks
  for select using (organisation_id = get_user_org_id() or is_platform_admin());

create policy "Members can insert document chunks for their org" on document_chunks
  for insert with check (organisation_id = get_user_org_id());

create policy "Admins can delete document chunks" on document_chunks
  for delete using (organisation_id = get_user_org_id() and get_user_role() in ('owner', 'admin'));

-- DOCUMENT ANALYSIS
create policy "Org members can view analysis status" on document_analysis
  for select using (organisation_id = get_user_org_id() or is_platform_admin());

create policy "Members can manage analysis status" on document_analysis
  for all using (organisation_id = get_user_org_id() and get_user_role() in ('owner', 'admin', 'member'));

-- REGULATION CHUNKS — global read for all authenticated users, write only for platform admin
create policy "All authenticated users can read regulation chunks" on regulation_chunks
  for select using (auth.role() = 'authenticated');

create policy "Only platform admins can manage regulation chunks" on regulation_chunks
  for all using (is_platform_admin());

-- RAG QUERIES — org isolated
create policy "Org members can view their rag queries" on rag_queries
  for select using (organisation_id = get_user_org_id() or is_platform_admin());

create policy "Users can create rag queries for their org" on rag_queries
  for insert with check (organisation_id = get_user_org_id() and user_id = auth.uid());

-- ============================================================
-- VECTOR SIMILARITY SEARCH FUNCTIONS
-- These are called via Supabase RPC from the application
-- ============================================================

-- Search document chunks for a specific organisation
create or replace function match_document_chunks(
  query_embedding vector(1536),
  match_org_id uuid,
  match_count int default 8,
  match_threshold float default 0.5
)
returns table (
  id uuid,
  evidence_id uuid,
  chunk_text text,
  page_number int,
  section_title text,
  paragraph_id text,
  similarity float
)
language sql stable
as $$
  select
    document_chunks.id,
    document_chunks.evidence_id,
    document_chunks.chunk_text,
    document_chunks.page_number,
    document_chunks.section_title,
    document_chunks.paragraph_id,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where document_chunks.organisation_id = match_org_id
    and 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  order by document_chunks.embedding <=> query_embedding
  limit match_count;
$$;

-- Search regulation chunks (optionally filtered to a framework)
create or replace function match_regulation_chunks(
  query_embedding vector(1536),
  match_framework_id uuid default null,
  match_count int default 5,
  match_threshold float default 0.5
)
returns table (
  id uuid,
  framework_id uuid,
  section_reference text,
  title text,
  chunk_text text,
  category text,
  required_evidence_description text,
  is_verified boolean,
  similarity float
)
language sql stable
as $$
  select
    regulation_chunks.id,
    regulation_chunks.framework_id,
    regulation_chunks.section_reference,
    regulation_chunks.title,
    regulation_chunks.chunk_text,
    regulation_chunks.category,
    regulation_chunks.required_evidence_description,
    regulation_chunks.is_verified,
    1 - (regulation_chunks.embedding <=> query_embedding) as similarity
  from regulation_chunks
  where (match_framework_id is null or regulation_chunks.framework_id = match_framework_id)
    and 1 - (regulation_chunks.embedding <=> query_embedding) > match_threshold
  order by regulation_chunks.embedding <=> query_embedding
  limit match_count;
$$;
