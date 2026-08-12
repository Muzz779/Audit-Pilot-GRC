import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { assessRisk } from '@/lib/anthropic';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id, organisations(industry, size)')
    .eq('id', user.id)
    .single();

  if (!profile?.organisation_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });

  const body: any = await req.json();
  const { title, description, category } = body;

  if (!title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

  try {
    const org = (profile as any).organisations;
    const result = await assessRisk({
      title,
      description: description || '',
      category: category || 'General',
      industry: org?.industry || 'General Business',
      orgSize: org?.size || '1-50',
    });

    await supabase.from('ai_interactions').insert({
      organisation_id: profile.organisation_id,
      user_id: user.id,
      feature: 'risk_assessor',
      prompt: `Assess risk: ${title}`,
      response: JSON.stringify(result).substring(0, 500),
      tokens_used: 800,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('AI risk assessment error:', err);
    return NextResponse.json({ error: err.message || 'Assessment failed' }, { status: 500 });
  }
}
