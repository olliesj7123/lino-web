import Link from 'next/link'
import { redirect } from 'next/navigation'

import AppBottomNav from '@/app/_components/AppBottomNav'
import { createClient } from '@/utils/supabase/server'

import SettingsClient from './settings-client'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-dvh justify-center bg-zinc-50 px-4 py-6 dark:bg-black">
      <main className="w-full max-w-md pb-24">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            설정
          </h1>
        </header>

        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              계정
            </div>
            <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {user.email}
            </div>
            <div className="mt-4">
              <SettingsClient />
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              약관
            </div>
            <div className="mt-3 space-y-2">
              <Link
                href="/terms"
                className="block rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              >
                이용약관
              </Link>
              <Link
                href="/privacy"
                className="block rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              >
                개인정보처리방침
              </Link>
            </div>
          </div>
        </div>

        <AppBottomNav active="inbox" />
      </main>
    </div>
  )
}
