import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('organisation_id').eq('id', user.id).single();
  if (!profile?.organisation_id) return NextResponse.json({ error: 'No organisation' }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const frameworkId = searchParams.get('framework_id');

  let query = supabase
    .from('controls')
    .select('*')
    .eq('organisation_id', profile.organisation_id)
    .order('control_id');

  if (frameworkId) query = query.eq('framework_id', frameworkId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
