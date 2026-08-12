-- ============================================================
-- AuditPilot — Complete Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable necessary extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

create type user_role as enum ('owner', 'admin', 'member', 'auditor');
create type subscription_tier as enum ('starter', 'pro', 'enterprise');
create type subscription_status as enum ('active', 'inactive', 'cancelled', 'past_due', 'trialing');
create type policy_status as enum ('draft', 'review', 'approved', 'archived');
create type risk_likelihood as enum ('rare', 'unlikely', 'possible', 'likely', 'almost_certain');
create type risk_impact as enum ('negligible', 'minor', 'moderate', 'major', 'catastrophic');
create type risk_status as enum ('identified', 'assessed', 'mitigating', 'resolved', 'accepted');
create type control_status as enum ('not_started', 'in_progress', 'implemented', 'not_applicable');
create type evidence_status as enum ('pending', 'uploaded', 'verified', 'expired');
create type audit_status as enum ('planned', 'in_progress', 'completed', 'cancelled');
create type notification_type as enum ('risk_alert', 'policy_update', 'audit_reminder', 'compliance_change', 'system', 'subscription');

-- ============================================================
-- ORGANISATIONS
-- ============================================================

create table organisations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  industry text,
  size text check (size in ('1-10', '11-50', '51-200', '201-500', '500+')),
  logo_url text,
  website text,
  country text default 'ZA',
  timezone text default 'Africa/Johannesburg',
  settings jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organisation_id uuid references organisations(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  role user_role default 'member',
  is_platform_admin boolean default false,
  phone text,
  job_title text,
  department text,
  last_seen_at timestamptz,
  onboarding_completed boolean default false,
  notification_preferences jsonb default '{"email": true, "in_app": true}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================

create table subscriptions (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid references organisations(id) on delete cascade unique,
  tier subscription_tier default 'starter',
  status subscription_status default 'active',
  payfast_subscription_token text,
  payfast_payment_id text,
  amount_cents integer default 0,
  billing_cycle text default 'monthly',
  trial_ends_at timestamptz,
  current_period_start timestamptz default now(),
  current_period_end timestamptz,
  cancelled_at timestamptz,
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- SUBSCRIPTION INVOICES
-- ============================================================

create table subscription_invoices (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid references organisations(id) on delete cascade,
  subscription_id uuid references subscriptions(id) on delete cascade,
  payfast_payment_id text,
  amount_cents integer not null,
  status text default 'paid',
  paid_at timestamptz,
  invoice_data jsonb default '{}',
  created_at timestamptz default now()
);

-- ============================================================
-- COMPLIANCE FRAMEWORKS
-- ============================================================

create table compliance_frameworks (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  short_name text not null,
  description text,
  version text,
  category text,
  is_global boolean default true,
  icon text,
  color text,
  controls_count integer default 0,
  created_at timestamptz default now()
);

-- Seed frameworks
insert into compliance_frameworks (name, short_name, description, version, category, icon, color) values
  ('Protection of Personal Information Act', 'POPIA', 'South African data privacy law requiring organisations to process personal information responsibly', '2021', 'Privacy', '🇿🇦', '#006400'),
  ('General Data Protection Regulation', 'GDPR', 'European Union regulation on data protection and privacy', '2018', 'Privacy', '🇪🇺', '#003399'),
  ('ISO/IEC 27001', 'ISO 27001', 'International standard for information security management systems', '2022', 'Security', '🔒', '#0066CC'),
  ('SOC 2 Type II', 'SOC 2', 'AICPA standard for service organization security, availability, and confidentiality', '2022', 'Security', '🛡️', '#7B2D8B'),
  ('Network and Information Security Directive', 'NIS2', 'EU directive on cybersecurity for essential and important entities', '2022', 'Cybersecurity', '🌐', '#CC0000'),
  ('Payment Card Industry Data Security Standard', 'PCI-DSS', 'Security standard for organisations handling credit card data', 'v4.0', 'Finance', '💳', '#FF6600'),
  ('King IV Report on Corporate Governance', 'King IV', 'South African corporate governance framework', '2016', 'Governance', '🏛️', '#8B4513'),
  ('NIST Cybersecurity Framework', 'NIST CSF', 'US framework for improving critical infrastructure cybersecurity', '2.0', 'Cybersecurity', '🔐', '#1B4F72');

-- ============================================================
-- ORGANISATION FRAMEWORKS (which frameworks each org tracks)
-- ============================================================

create table organisation_frameworks (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid references organisations(id) on delete cascade,
  framework_id uuid references compliance_frameworks(id) on delete cascade,
  compliance_score integer default 0 check (compliance_score >= 0 and compliance_score <= 100),
  target_completion_date date,
  assigned_owner_id uuid references profiles(id),
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(organisation_id, framework_id)
);

-- ============================================================
-- CONTROLS
-- ============================================================

create table controls (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid references organisations(id) on delete cascade,
  framework_id uuid references compliance_frameworks(id) on delete cascade,
  control_id text not null, -- e.g. "A.5.1", "CC6.1"
  name text not null,
  description text,
  category text,
  status control_status default 'not_started',
  implementation_notes text,
  assigned_to uuid references profiles(id),
  due_date date,
  evidence_required boolean default true,
  last_reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- EVIDENCE
-- ============================================================

create table evidence (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid references organisations(id) on delete cascade,
  control_id uuid references controls(id) on delete set null,
  name text not null,
  description text,
  file_url text,
  file_name text,
  file_size integer,
  file_type text,
  status evidence_status default 'pending',
  collected_by uuid references profiles(id),
  verified_by uuid references profiles(id),
  expires_at timestamptz,
  tags text[] default '{}',
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- POLICIES
-- ============================================================

create table policies (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid references organisations(id) on delete cascade,
  title text not null,
  description text,
  category text,
  framework_ids uuid[] default '{}',
  current_version integer default 1,
  status policy_status default 'draft',
  owner_id uuid references profiles(id),
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  next_review_date date,
  tags text[] default '{}',
  is_template boolean default false,
  template_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- POLICY VERSIONS
-- ============================================================

create table policy_versions (
  id uuid primary key default uuid_generate_v4(),
  policy_id uuid references policies(id) on delete cascade,
  organisation_id uuid references organisations(id) on delete cascade,
  version_number integer not null,
  content text not null,
  change_summary text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- ============================================================
-- POLICY ACKNOWLEDGEMENTS
-- ============================================================

create table policy_acknowledgements (
  id uuid primary key default uuid_generate_v4(),
  policy_id uuid references policies(id) on delete cascade,
  organisation_id uuid references organisations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  version_number integer not null,
  acknowledged_at timestamptz default now(),
  ip_address text,
  unique(policy_id, user_id, version_number)
);

-- ============================================================
-- RISKS
-- ============================================================

create table risks (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid references organisations(id) on delete cascade,
  title text not null,
  description text,
  category text,
  likelihood risk_likelihood default 'possible',
  impact risk_impact default 'moderate',
  risk_score integer generated always as (
    case likelihood
      when 'rare' then 1
      when 'unlikely' then 2
      when 'possible' then 3
      when 'likely' then 4
      when 'almost_certain' then 5
    end *
    case impact
      when 'negligible' then 1
      when 'minor' then 2
      when 'moderate' then 3
      when 'major' then 4
      when 'catastrophic' then 5
    end
  ) stored,
  status risk_status default 'identified',
  owner_id uuid references profiles(id),
  mitigation_plan text,
  residual_likelihood risk_likelihood,
  residual_impact risk_impact,
  residual_score integer,
  framework_ids uuid[] default '{}',
  control_ids uuid[] default '{}',
  tags text[] default '{}',
  review_date date,
  ai_assessment jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- AUDITS
-- ============================================================

create table audits (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid references organisations(id) on delete cascade,
  framework_id uuid references compliance_frameworks(id),
  title text not null,
  description text,
  status audit_status default 'planned',
  auditor_id uuid references profiles(id),
  lead_id uuid references profiles(id),
  start_date date,
  end_date date,
  scope text,
  findings jsonb default '[]',
  recommendations text,
  report_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- AUDIT LOGS (Activity Log)
-- ============================================================

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid references organisations(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id uuid,
  resource_name text,
  details jsonb default '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

create table notifications (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid references organisations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  type notification_type default 'system',
  title text not null,
  message text,
  link text,
  is_read boolean default false,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- ============================================================
-- AI INTERACTIONS
-- ============================================================

create table ai_interactions (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid references organisations(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  feature text not null, -- 'policy_drafter', 'risk_assessor', 'chat', 'regulatory_scan'
  prompt text,
  response text,
  tokens_used integer,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- ============================================================
-- INTEGRATIONS
-- ============================================================

create table integrations (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid references organisations(id) on delete cascade,
  name text not null,
  type text not null,
  status text default 'disconnected',
  config jsonb default '{}',
  last_sync_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger organisations_updated_at before update on organisations for each row execute function update_updated_at();
create trigger profiles_updated_at before update on profiles for each row execute function update_updated_at();
create trigger subscriptions_updated_at before update on subscriptions for each row execute function update_updated_at();
create trigger policies_updated_at before update on policies for each row execute function update_updated_at();
create trigger risks_updated_at before update on risks for each row execute function update_updated_at();
create trigger controls_updated_at before update on controls for each row execute function update_updated_at();
create trigger evidence_updated_at before update on evidence for each row execute function update_updated_at();
create trigger audits_updated_at before update on audits for each row execute function update_updated_at();
create trigger organisation_frameworks_updated_at before update on organisation_frameworks for each row execute function update_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

alter table organisations enable row level security;
alter table profiles enable row level security;
alter table subscriptions enable row level security;
alter table subscription_invoices enable row level security;
alter table organisation_frameworks enable row level security;
alter table controls enable row level security;
alter table evidence enable row level security;
alter table policies enable row level security;
alter table policy_versions enable row level security;
alter table policy_acknowledgements enable row level security;
alter table risks enable row level security;
alter table audits enable row level security;
alter table audit_logs enable row level security;
alter table notifications enable row level security;
alter table ai_interactions enable row level security;
alter table integrations enable row level security;
alter table compliance_frameworks enable row level security;

-- Helper function to get org_id for current user
create or replace function get_user_org_id()
returns uuid as $$
  select organisation_id from profiles where id = auth.uid()
$$ language sql security definer stable;

-- Helper: is platform admin?
create or replace function is_platform_admin()
returns boolean as $$
  select coalesce((select is_platform_admin from profiles where id = auth.uid()), false)
$$ language sql security definer stable;

-- Helper: get user role
create or replace function get_user_role()
returns user_role as $$
  select role from profiles where id = auth.uid()
$$ language sql security definer stable;

-- ORGANISATIONS policies
create policy "Users can view their own organisation" on organisations
  for select using (id = get_user_org_id() or is_platform_admin());

create policy "Owners can update their organisation" on organisations
  for update using (id = get_user_org_id() and get_user_role() in ('owner', 'admin'));

create policy "Allow insert during signup" on organisations
  for insert with check (true);

-- PROFILES policies
create policy "Users can view profiles in their org" on profiles
  for select using (organisation_id = get_user_org_id() or id = auth.uid() or is_platform_admin());

create policy "Users can update their own profile" on profiles
  for update using (id = auth.uid());

create policy "Admins can update org profiles" on profiles
  for update using (organisation_id = get_user_org_id() and get_user_role() in ('owner', 'admin'));

create policy "Allow profile creation" on profiles
  for insert with check (id = auth.uid());

-- SUBSCRIPTIONS policies
create policy "Org members can view subscription" on subscriptions
  for select using (organisation_id = get_user_org_id() or is_platform_admin());

create policy "System can manage subscriptions" on subscriptions
  for all using (is_platform_admin());

-- SUBSCRIPTION INVOICES
create policy "Org members can view invoices" on subscription_invoices
  for select using (organisation_id = get_user_org_id() or is_platform_admin());

-- COMPLIANCE FRAMEWORKS (public read)
create policy "Anyone can view frameworks" on compliance_frameworks
  for select using (true);

-- ORGANISATION FRAMEWORKS
create policy "Org members can view org frameworks" on organisation_frameworks
  for select using (organisation_id = get_user_org_id() or is_platform_admin());

create policy "Admins can manage org frameworks" on organisation_frameworks
  for all using (organisation_id = get_user_org_id() and get_user_role() in ('owner', 'admin'));

-- CONTROLS
create policy "Org members can view controls" on controls
  for select using (organisation_id = get_user_org_id() or is_platform_admin());

create policy "Admins/members can manage controls" on controls
  for all using (organisation_id = get_user_org_id() and get_user_role() in ('owner', 'admin', 'member'));

-- EVIDENCE
create policy "Org members can view evidence" on evidence
  for select using (organisation_id = get_user_org_id() or is_platform_admin());

create policy "Members can manage evidence" on evidence
  for all using (organisation_id = get_user_org_id() and get_user_role() in ('owner', 'admin', 'member'));

-- POLICIES
create policy "Org members can view policies" on policies
  for select using (organisation_id = get_user_org_id() or is_platform_admin());

create policy "Members can create/edit policies" on policies
  for insert with check (organisation_id = get_user_org_id());

create policy "Members can update policies" on policies
  for update using (organisation_id = get_user_org_id() and get_user_role() in ('owner', 'admin', 'member'));

create policy "Admins can delete policies" on policies
  for delete using (organisation_id = get_user_org_id() and get_user_role() in ('owner', 'admin'));

-- POLICY VERSIONS
create policy "Org members can view policy versions" on policy_versions
  for select using (organisation_id = get_user_org_id() or is_platform_admin());

create policy "Members can create policy versions" on policy_versions
  for insert with check (organisation_id = get_user_org_id());

-- POLICY ACKNOWLEDGEMENTS
create policy "Org members can view acks" on policy_acknowledgements
  for select using (organisation_id = get_user_org_id() or is_platform_admin());

create policy "Users can create their own ack" on policy_acknowledgements
  for insert with check (user_id = auth.uid() and organisation_id = get_user_org_id());

-- RISKS
create policy "Org members can view risks" on risks
  for select using (organisation_id = get_user_org_id() or is_platform_admin());

create policy "Members can manage risks" on risks
  for all using (organisation_id = get_user_org_id() and get_user_role() in ('owner', 'admin', 'member'));

-- AUDITS
create policy "Org members can view audits" on audits
  for select using (organisation_id = get_user_org_id() or is_platform_admin());

create policy "Admins can manage audits" on audits
  for all using (organisation_id = get_user_org_id() and get_user_role() in ('owner', 'admin', 'auditor'));

-- AUDIT LOGS
create policy "Org members can view audit logs" on audit_logs
  for select using (organisation_id = get_user_org_id() or is_platform_admin());

create policy "System can insert audit logs" on audit_logs
  for insert with check (organisation_id = get_user_org_id());

-- NOTIFICATIONS
create policy "Users can view their own notifications" on notifications
  for select using (user_id = auth.uid() or is_platform_admin());

create policy "Users can update their own notifications" on notifications
  for update using (user_id = auth.uid());

create policy "System can create notifications" on notifications
  for insert with check (organisation_id = get_user_org_id());

-- AI INTERACTIONS
create policy "Users can view their own AI interactions" on ai_interactions
  for select using (user_id = auth.uid() or is_platform_admin());

create policy "Users can create AI interactions" on ai_interactions
  for insert with check (user_id = auth.uid() and organisation_id = get_user_org_id());

-- INTEGRATIONS
create policy "Org members can view integrations" on integrations
  for select using (organisation_id = get_user_org_id() or is_platform_admin());

create policy "Admins can manage integrations" on integrations
  for all using (organisation_id = get_user_org_id() and get_user_role() in ('owner', 'admin'));

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values 
  ('evidence', 'evidence', false, 52428800, array['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv']),
  ('logos', 'logos', true, 5242880, array['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('reports', 'reports', false, 52428800, array['application/pdf']);

-- Storage policies
create policy "Org members can view evidence files" on storage.objects
  for select using (bucket_id = 'evidence' and auth.uid() in (
    select id from profiles where organisation_id = get_user_org_id()
  ));

create policy "Members can upload evidence" on storage.objects
  for insert with check (bucket_id = 'evidence');

create policy "Public can view logos" on storage.objects
  for select using (bucket_id = 'logos');

create policy "Owners can upload logos" on storage.objects
  for insert with check (bucket_id = 'logos');

create policy "Public can view avatars" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Users can upload their avatar" on storage.objects
  for insert with check (bucket_id = 'avatars');

-- ============================================================
-- REALTIME (enable for notifications)
-- ============================================================

alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table audit_logs;
alter publication supabase_realtime add table risks;
