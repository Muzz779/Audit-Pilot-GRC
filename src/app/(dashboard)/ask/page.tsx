import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Topbar } from '@/components/dashboard/Topbar';
import { AskAuditPilot } from '@/components/ask/AskAuditPilot';

export const metadata = { title: 'Ask AuditPilot' };

export default async function AskPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('organisation_id').eq('id', user.id).single();
  const orgId = profile?.organisation_id;
  if (!orgId) redirect('/register?step=organisation');

  // Check if there are any analyzed documents yet — helps set expectations
  const { count: analyzedCount } = await supabase
    .from('document_analysis')
    .select('id', { count: 'exact', head: true })
    .eq('organisation_id', orgId)
    .eq('status', 'completed');

  return (
    <div className="flex flex-col">
      <Topbar
        title="Ask AuditPilot"
        subtitle="Evidence-grounded answers with citations — Phase 1 preview"
      />
      <div className="p-6 max-w-4xl mx-auto w-full space-y-4">
        {(analyzedCount || 0) === 0 && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-xs text-amber-700 dark:text-amber-400">
            ⚠️ No documents have been analyzed yet. Go to <strong>Audit &amp; Evidence</strong>, upload a document,
            and click <strong>Analyze Document</strong> before asking questions about your evidence.
            You can still ask about regulations in the knowledge base.
          </div>
        )}
        <AskAuditPilot orgId={orgId} />
      </div>
    </div>
  );
}
