import Link from 'next/link'
import { User } from 'lucide-react'

import { createClient } from '@/utils/supabase/server'

import type { Item } from '@/lib/items'
import InboxClient from '@/app/inbox/InboxClient'
import AppBottomNav from '@/app/_components/AppBottomNav'

export default async function InboxPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const status = 'inbox'

  const { count: totalCount } = await supabase
    .from('items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user?.id ?? '')
    .eq('status', status)

  const limit = 10
  const { data: items } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', user?.id ?? '')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (
    <div className="flex min-h-dvh justify-center bg-zinc-50 px-4 py-6 dark:bg-black">
      <main className="w-full max-w-md">
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              인박스
            </h1>

            <Link
              href="/settings"
              aria-label="프로필"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
            >
              <User className="h-5 w-5" />
            </Link>
          </div>
        </header>

        <InboxClient
          initialItems={(items ?? []) as Item[]}
          initialTotalCount={totalCount ?? 0}
        />

        <AppBottomNav active="inbox" />
      </main>
    </div>
  )
}
