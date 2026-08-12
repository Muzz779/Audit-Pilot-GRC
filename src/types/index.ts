// ============================================================
// AuditPilot — Core Types
// ============================================================

export type UserRole = 'owner' | 'admin' | 'member' | 'auditor';
export type SubscriptionTier = 'starter' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'inactive' | 'cancelled' | 'past_due' | 'trialing';
export type PolicyStatus = 'draft' | 'review' | 'approved' | 'archived';
export type RiskLikelihood = 'rare' | 'unlikely' | 'possible' | 'likely' | 'almost_certain';
export type RiskImpact = 'negligible' | 'minor' | 'moderate' | 'major' | 'catastrophic';
export type RiskStatus = 'identified' | 'assessed' | 'mitigating' | 'resolved' | 'accepted';
export type ControlStatus = 'not_started' | 'in_progress' | 'implemented' | 'not_applicable';
export type EvidenceStatus = 'pending' | 'uploaded' | 'verified' | 'expired';
export type AuditStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';
export type NotificationType = 'risk_alert' | 'policy_update' | 'audit_reminder' | 'compliance_change' | 'system' | 'subscription';

// ============================================================
// DATABASE ENTITIES
// ============================================================

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  industry?: string;
  size?: string;
  logo_url?: string;
  website?: string;
  country: string;
  timezone: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  organisation_id?: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  is_platform_admin: boolean;
  phone?: string;
  job_title?: string;
  department?: string;
  last_seen_at?: string;
  onboarding_completed: boolean;
  notification_preferences: { email: boolean; in_app: boolean };
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  organisation_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  payfast_subscription_token?: string;
  payfast_payment_id?: string;
  amount_cents: number;
  billing_cycle: string;
  trial_ends_at?: string;
  current_period_start: string;
  current_period_end?: string;
  cancelled_at?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionInvoice {
  id: string;
  organisation_id: string;
  subscription_id: string;
  payfast_payment_id?: string;
  amount_cents: number;
  status: string;
  paid_at?: string;
  invoice_data: Record<string, unknown>;
  created_at: string;
}

export interface ComplianceFramework {
  id: string;
  name: string;
  short_name: string;
  description?: string;
  version?: string;
  category?: string;
  is_global: boolean;
  icon?: string;
  color?: string;
  controls_count: number;
  created_at: string;
}

export interface OrganisationFramework {
  id: string;
  organisation_id: string;
  framework_id: string;
  compliance_score: number;
  target_completion_date?: string;
  assigned_owner_id?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  framework?: ComplianceFramework;
}

export interface Control {
  id: string;
  organisation_id: string;
  framework_id: string;
  control_id: string;
  name: string;
  description?: string;
  category?: string;
  status: ControlStatus;
  implementation_notes?: string;
  assigned_to?: string;
  due_date?: string;
  evidence_required: boolean;
  last_reviewed_at?: string;
  created_at: string;
  updated_at: string;
  framework?: ComplianceFramework;
  assignee?: Profile;
}

export interface Evidence {
  id: string;
  organisation_id: string;
  control_id?: string;
  name: string;
  description?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  status: EvidenceStatus;
  collected_by?: string;
  verified_by?: string;
  expires_at?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Policy {
  id: string;
  organisation_id: string;
  title: string;
  description?: string;
  category?: string;
  framework_ids: string[];
  current_version: number;
  status: PolicyStatus;
  owner_id?: string;
  approved_by?: string;
  approved_at?: string;
  next_review_date?: string;
  tags: string[];
  is_template: boolean;
  template_name?: string;
  created_at: string;
  updated_at: string;
  owner?: Profile;
}

export interface PolicyVersion {
  id: string;
  policy_id: string;
  organisation_id: string;
  version_number: number;
  content: string;
  change_summary?: string;
  created_by?: string;
  created_at: string;
  author?: Profile;
}

export interface PolicyAcknowledgement {
  id: string;
  policy_id: string;
  organisation_id: string;
  user_id: string;
  version_number: number;
  acknowledged_at: string;
  ip_address?: string;
  user?: Profile;
}

export interface Risk {
  id: string;
  organisation_id: string;
  title: string;
  description?: string;
  category?: string;
  likelihood: RiskLikelihood;
  impact: RiskImpact;
  risk_score: number;
  status: RiskStatus;
  owner_id?: string;
  mitigation_plan?: string;
  residual_likelihood?: RiskLikelihood;
  residual_impact?: RiskImpact;
  residual_score?: number;
  framework_ids: string[];
  control_ids: string[];
  tags: string[];
  review_date?: string;
  ai_assessment?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  owner?: Profile;
}

export interface Audit {
  id: string;
  organisation_id: string;
  framework_id?: string;
  title: string;
  description?: string;
  status: AuditStatus;
  auditor_id?: string;
  lead_id?: string;
  start_date?: string;
  end_date?: string;
  scope?: string;
  findings: Record<string, unknown>[];
  recommendations?: string;
  report_url?: string;
  created_at: string;
  updated_at: string;
  framework?: ComplianceFramework;
}

export interface AuditLog {
  id: string;
  organisation_id: string;
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  resource_name?: string;
  details: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
  user?: Profile;
}

export interface Notification {
  id: string;
  organisation_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message?: string;
  link?: string;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AIInteraction {
  id: string;
  organisation_id: string;
  user_id: string;
  feature: string;
  prompt?: string;
  response?: string;
  tokens_used?: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ============================================================
// COMPUTED / UI TYPES
// ============================================================

export interface DashboardStats {
  overall_risk_score: number;
  open_risks: number;
  open_risks_change: number;
  compliance_percentage: number;
  compliance_change: number;
  active_policies: number;
  upcoming_audits: number;
  pending_evidence: number;
}

export interface RiskHeatmapCell {
  likelihood: number;
  impact: number;
  risks: Risk[];
  level: 'low' | 'medium' | 'high' | 'critical';
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface PricingPlan {
  id: SubscriptionTier;
  name: string;
  price_cents: number;
  price_display: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  payfast_amount: string;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ============================================================
// PAYFAST TYPES
// ============================================================

export interface PayFastPaymentData {
  merchant_id: string;
  merchant_key: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  name_first: string;
  name_last: string;
  email_address: string;
  m_payment_id: string;
  amount: string;
  item_name: string;
  item_description?: string;
  subscription_type?: string;
  billing_date?: string;
  recurring_amount?: string;
  frequency?: string;
  cycles?: string;
  signature?: string;
}

export interface PayFastWebhookPayload {
  m_payment_id: string;
  pf_payment_id: string;
  payment_status: string;
  item_name: string;
  item_description?: string;
  amount_gross: string;
  amount_fee: string;
  amount_net: string;
  custom_str1?: string;
  custom_str2?: string;
  custom_str3?: string;
  custom_str4?: string;
  custom_str5?: string;
  name_first?: string;
  name_last?: string;
  email_address?: string;
  merchant_id: string;
  token?: string;
  billing_date?: string;
  signature: string;
}
