import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { scanRegulations } from '@/lib/anthropic';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id, organisations(industry, country)')
    .eq('id', user.id)
    .single();

  if (!profile?.organisation_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('organisation_id', profile.organisation_id)
    .single();

  if (!['pro', 'enterprise'].includes(sub?.tier || '')) {
    return NextResponse.json({ error: 'Pro subscription required' }, { status: 403 });
  }

  // Get active frameworks
  const { data: frameworks } = await supabase
    .from('organisation_frameworks')
    .select('framework:compliance_frameworks(short_name)')
    .eq('organisation_id', profile.organisation_id)
    .eq('is_active', true);

  const frameworkNames = frameworks?.map((f: any) => f.framework?.short_name).filter(Boolean) || ['POPIA', 'ISO 27001'];

  try {
    const org = (profile as any).organisations;
    const result = await scanRegulations({
      industry: org?.industry || 'General Business',
      frameworks: frameworkNames,
      country: org?.country || 'ZA',
    });

    await supabase.from('ai_interactions').insert({
      organisation_id: profile.organisation_id,
      user_id: user.id,
      feature: 'regulatory_scan',
      prompt: 'Regulatory scan',
      response: result.summary?.substring(0, 500),
      tokens_used: 1500,
    });

    // Create notifications for high/critical alerts
    const criticalAlerts = result.alerts?.filter(a => ['high', 'critical'].includes(a.severity)) || [];
    if (criticalAlerts.length > 0) {
      await supabase.from('notifications').insert(
        criticalAlerts.slice(0, 3).map(alert => ({
          organisation_id: profile.organisation_id,
          user_id: user.id,
          type: 'compliance_change',
          title: alert.title,
          message: alert.description,
          metadata: { severity: alert.severity, framework: alert.framework },
        }))
      );
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Regulatory scan error:', err);
    return NextResponse.json({ error: err.message || 'Scan failed' }, { status: 500 });
  }
}
