import { redirect } from 'next/navigation'

import type { Item } from '@/lib/items'
import AppBottomNav from '@/app/_components/AppBottomNav'
import { createClient } from '@/utils/supabase/server'

import TodayClient from '@/app/today/today-client'

export default async function TodayPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { count: totalCount } = await supabase
    .from('items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'inbox')
    .is('read_at', null)

  const limit = 30
  const { data: items } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'inbox')
    .is('read_at', null)
    .order('created_at', { ascending: false })
    .limit(limit)

  const hasSeenOnboarding = Boolean(user.user_metadata?.has_seen_onboarding)

  return (
    <div className="flex min-h-dvh justify-center bg-zinc-50 px-4 py-6 dark:bg-black">
      <main className="w-full max-w-md">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            안읽음
          </h1>
        </header>

        <TodayClient
          initialItems={(items ?? []) as Item[]}
          initialTotalCount={totalCount ?? 0}
          initialHasSeenOnboarding={hasSeenOnboarding}
        />

        <AppBottomNav active="today" />
      </main>
    </div>
  )
}
