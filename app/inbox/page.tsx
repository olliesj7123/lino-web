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
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            인박스
          </h1>
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
