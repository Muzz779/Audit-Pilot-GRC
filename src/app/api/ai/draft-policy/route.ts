import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkAiQuota, quotaExceededResponse } from '@/lib/usage/quota';
import { draftPolicy } from '@/lib/anthropic';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id, organisations(name, industry)')
    .eq('id', user.id)
    .single();

  if (!profile?.organisation_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });

  const quota = await checkAiQuota(profile.organisation_id);
  if (!quota.allowed) return NextResponse.json(quotaExceededResponse(quota), { status: 429 });

  // Check subscription for Pro features
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('tier, status')
    .eq('organisation_id', profile.organisation_id)
    .single();

  const body: any = await req.json();
  const { title, description, category, industry, frameworks = [] } = body;

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  try {
    const org = (profile as any).organisations;
    const content = await draftPolicy({
      title,
      description: description || '',
      industry: industry || org?.industry || 'General Business',
      frameworks: frameworks.length > 0 ? frameworks : ['POPIA', 'ISO 27001'],
      orgName: org?.name || 'Your Organisation',
    });

    // Log AI interaction
    await supabase.from('ai_interactions').insert({
      organisation_id: profile.organisation_id,
      user_id: user.id,
      feature: 'policy_drafter',
      prompt: `Draft policy: ${title}`,
      response: content.substring(0, 500),
      tokens_used: Math.ceil(content.length / 4),
    });

    return NextResponse.json({ content });
  } catch (err: any) {
    console.error('AI policy draft error:', err);
    return NextResponse.json({ error: err.message || 'AI drafting failed' }, { status: 500 });
  }
}
