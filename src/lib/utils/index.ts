import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { RiskLevel, RiskLikelihood, RiskImpact } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Risk scoring
export function getRiskLevel(score: number): RiskLevel {
  if (score <= 4) return 'low';
  if (score <= 9) return 'medium';
  if (score <= 16) return 'high';
  return 'critical';
}

export function getRiskLevelColor(level: RiskLevel): string {
  switch (level) {
    case 'low': return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400';
    case 'medium': return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400';
    case 'high': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400';
    case 'critical': return 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400';
  }
}

export function getRiskLevelBgColor(level: RiskLevel): string {
  switch (level) {
    case 'low': return '#10b981';
    case 'medium': return '#f59e0b';
    case 'high': return '#f97316';
    case 'critical': return '#f43f5e';
  }
}

export const LIKELIHOOD_SCORES: Record<RiskLikelihood, number> = {
  rare: 1,
  unlikely: 2,
  possible: 3,
  likely: 4,
  almost_certain: 5,
};

export const IMPACT_SCORES: Record<RiskImpact, number> = {
  negligible: 1,
  minor: 2,
  moderate: 3,
  major: 4,
  catastrophic: 5,
};

export const LIKELIHOOD_LABELS: Record<RiskLikelihood, string> = {
  rare: 'Rare',
  unlikely: 'Unlikely',
  possible: 'Possible',
  likely: 'Likely',
  almost_certain: 'Almost Certain',
};

export const IMPACT_LABELS: Record<RiskImpact, string> = {
  negligible: 'Negligible',
  minor: 'Minor',
  moderate: 'Moderate',
  major: 'Major',
  catastrophic: 'Catastrophic',
};

// Format date
export function formatDate(dateString: string | undefined, options?: Intl.DateTimeFormatOptions): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  });
}

export function formatDateTime(dateString: string | undefined): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(dateString);
}

// Format ZAR
export function formatZAR(cents: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

// Status helpers
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Policy
    draft: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
    review: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
    approved: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400',
    archived: 'text-gray-500 bg-gray-100 dark:bg-gray-800',
    // Risk
    identified: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
    assessed: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400',
    mitigating: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400',
    resolved: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400',
    accepted: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
    // Control
    not_started: 'text-gray-600 bg-gray-100 dark:bg-gray-800',
    in_progress: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    implemented: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
    not_applicable: 'text-gray-500 bg-gray-100 dark:bg-gray-800',
    // Subscription
    active: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
    inactive: 'text-gray-500 bg-gray-100',
    cancelled: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20',
    past_due: 'text-red-600 bg-red-50 dark:bg-red-900/20',
    trialing: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    // Audit
    planned: 'text-gray-600 bg-gray-100',
    completed: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
  };
  return colors[status] || 'text-gray-600 bg-gray-100';
}

// Generate org slug
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 50);
}

// File size formatter
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Compliance score color
export function getComplianceColor(score: number): string {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  if (score >= 40) return 'text-orange-600';
  return 'text-rose-600';
}

export function getComplianceBgColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#f43f5e';
}

// Industries list
export const INDUSTRIES = [
  'Financial Services',
  'Healthcare',
  'Retail & E-Commerce',
  'Technology & Software',
  'Manufacturing',
  'Legal Services',
  'Education',
  'Government & Public Sector',
  'Mining & Resources',
  'Telecommunications',
  'Insurance',
  'Consulting',
  'Real Estate',
  'Media & Entertainment',
  'Non-Profit',
  'Other',
];

// Company sizes
export const COMPANY_SIZES = [
  { value: '1-10', label: '1–10 employees' },
  { value: '11-50', label: '11–50 employees' },
  { value: '51-200', label: '51–200 employees' },
  { value: '201-500', label: '201–500 employees' },
  { value: '500+', label: '500+ employees' },
];

// Policy categories
export const POLICY_CATEGORIES = [
  'Security',
  'Privacy',
  'IT',
  'HR',
  'Finance',
  'Operations',
  'Legal',
  'Governance',
  'Risk',
  'Technology',
  'Environment',
  'Health & Safety',
];

// Risk categories
export const RISK_CATEGORIES = [
  'Cybersecurity',
  'Compliance',
  'Operational',
  'Financial',
  'Third Party',
  'People',
  'Technology',
  'Strategic',
  'Reputational',
  'Legal',
  'Environmental',
  'Physical',
];
