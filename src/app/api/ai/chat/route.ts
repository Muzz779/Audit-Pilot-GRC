import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { checkAiQuota, quotaExceededResponse } from '@/lib/usage/quota';
import { chatWithGRC } from '@/lib/anthropic';

const MAX_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 4000;

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

  const body: any = await req.json();
  const { messages } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
  }

  // Size limits keep each call within the metered cost of one AI operation.
  // Only the latest turns are sent, roles are restricted to user/assistant,
  // and the organisation context is built here, never taken from the browser.
  const recent = messages.slice(-MAX_MESSAGES);
  const cleaned: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const m of recent as any[]) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 });
    }
    if (m.content.length > MAX_MESSAGE_CHARS) {
      return NextResponse.json({ error: `Each message must be under ${MAX_MESSAGE_CHARS.toLocaleString()} characters` }, { status: 400 });
    }
    cleaned.push({ role: m.role, content: m.content });
  }
  while (cleaned.length && cleaned[0].role !== 'user') cleaned.shift();
  if (!cleaned.length || cleaned[cleaned.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'The last message must be a question' }, { status: 400 });
  }

  const org = (profile as any).organisations;
  const orgContext = `Organisation: ${String(org?.name || 'Unknown').slice(0, 200)}, Industry: ${String(org?.industry || 'Unknown').slice(0, 100)}`;

  try {
    const content = await chatWithGRC({ messages: cleaned, orgContext });

    if (!content) {
      return NextResponse.json({ error: 'No response received from Claude' }, { status: 500 });
    }

    await supabase.from('ai_interactions').insert({
      organisation_id: profile.organisation_id,
      user_id: user.id,
      feature: 'chat',
      prompt: cleaned[cleaned.length - 1].content.substring(0, 200),
      response: content.substring(0, 500),
      tokens_used: Math.ceil(content.length / 4),
    });

    return NextResponse.json({ content });
  } catch (err: any) {
    console.error('AI chat error:', err);
    return NextResponse.json({ error: 'The assistant could not answer just now. Please try again.' }, { status: 500 });
  }
}
