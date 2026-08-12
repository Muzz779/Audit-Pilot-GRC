import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { LandingPage } from '@/components/landing/LandingPage';

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If logged in, go to dashboard
  if (user) redirect('/dashboard');

  return <LandingPage />;
}
