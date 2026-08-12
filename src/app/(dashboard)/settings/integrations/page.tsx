import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Topbar } from '@/components/dashboard/Topbar';

export const metadata = { title: 'Integrations' };

const INTEGRATIONS = [
  { id: 'slack', name: 'Slack', description: 'Send compliance alerts and risk notifications to Slack channels', icon: '💬', status: 'coming_soon', category: 'Notifications' },
  { id: 'jira', name: 'Jira', description: 'Create Jira tickets automatically from risk findings and audit items', icon: '🎯', status: 'coming_soon', category: 'Project Management' },
  { id: 'microsoft_teams', name: 'Microsoft Teams', description: 'Push GRC alerts and compliance updates to Teams channels', icon: '🔷', status: 'coming_soon', category: 'Notifications' },
  { id: 'google_workspace', name: 'Google Workspace', description: 'Sync policies to Google Drive and manage team access', icon: '📁', status: 'coming_soon', category: 'Productivity' },
  { id: 'azure_ad', name: 'Azure Active Directory', description: 'SSO and user provisioning via Azure AD', icon: '🏢', status: 'coming_soon', category: 'Identity' },
  { id: 'okta', name: 'Okta', description: 'Enterprise SSO and automated user lifecycle management', icon: '🔐', status: 'coming_soon', category: 'Identity' },
  { id: 'aws', name: 'AWS Security Hub', description: 'Pull AWS security findings directly into your risk register', icon: '☁️', status: 'coming_soon', category: 'Cloud Security' },
  { id: 'crowdstrike', name: 'CrowdStrike', description: 'Ingest endpoint security events for continuous monitoring', icon: '🦅', status: 'coming_soon', category: 'Security' },
  { id: 'servicenow', name: 'ServiceNow', description: 'Bi-directional sync with ServiceNow GRC module', icon: '🔄', status: 'coming_soon', category: 'GRC' },
  { id: 'zapier', name: 'Zapier', description: 'Connect with 5,000+ apps via Zapier webhooks', icon: '⚡', status: 'coming_soon', category: 'Automation' },
  { id: 'api', name: 'REST API', description: 'Build custom integrations with our comprehensive REST API', icon: '🔗', status: 'coming_soon', category: 'Developer' },
  { id: 'webhook', name: 'Webhooks', description: 'Receive real-time event notifications via webhooks', icon: '📡', status: 'coming_soon', category: 'Developer' },
];

const CATEGORIES = [...new Set(INTEGRATIONS.map(i => i.category))];

export default async function IntegrationsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="flex flex-col">
      <Topbar title="Integrations" subtitle="Connect AuditPilot with your existing tools" />
      <div className="p-6 max-w-5xl mx-auto space-y-8">
        <div className="rounded-xl bg-gradient-to-r from-brand-600 to-brand-400 p-5 text-white">
          <h2 className="font-bold text-lg mb-1">Integrations Coming Soon</h2>
          <p className="text-brand-100 text-sm">We're building native integrations with the tools your team already uses. Vote on what to build next or request a custom integration.</p>
          <a href="mailto:integrations@auditpilot.co.za" className="inline-flex items-center gap-2 mt-3 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Request Integration →
          </a>
        </div>

        {CATEGORIES.map(category => (
          <div key={category}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">{category}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {INTEGRATIONS.filter(i => i.category === category).map(integration => (
                <div key={integration.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card opacity-75">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-xl shrink-0">
                    {integration.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{integration.name}</p>
                      <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full font-medium">Coming Soon</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{integration.description}</p>
                  </div>
                  <button className="text-xs text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-lg transition-colors shrink-0">
                    Notify Me
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
