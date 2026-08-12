import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { chatWithGRC } from '@/lib/anthropic';

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single();

  if (!profile?.organisation_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });

  const body: any = await req.json();
  const { messages, orgContext } = body;

  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
  }

  try {
    const content = await chatWithGRC({ messages, orgContext: orgContext || '' });

    if (!content) {
      return NextResponse.json({ error: 'No response received from Claude' }, { status: 500 });
    }

    await supabase.from('ai_interactions').insert({
      organisation_id: profile.organisation_id,
      user_id: user.id,
      feature: 'chat',
      prompt: messages[messages.length - 1]?.content?.substring(0, 200),
      response: content.substring(0, 500),
      tokens_used: Math.ceil(content.length / 4),
    });

    return NextResponse.json({ content });
  } catch (err: any) {
    console.error('AI chat error:', err);
    return NextResponse.json({ error: err.message || 'Chat failed' }, { status: 500 });
  }
}
