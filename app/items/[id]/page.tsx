import Link from 'next/link'
import { redirect } from 'next/navigation'

import type { Item } from '@/lib/items'
import { createClient } from '@/utils/supabase/server'

export default async function ItemDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !data) {
    return (
      <div className="flex min-h-dvh justify-center bg-zinc-50 px-4 py-6 dark:bg-black">
        <main className="w-full max-w-md">
          <Link
            href="/inbox"
            className="text-sm text-zinc-600 dark:text-zinc-400"
          >
            뒤로
          </Link>
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            찾을 수 없어요.
          </div>
        </main>
      </div>
    )
  }

  const item = data as Item

  await supabase
    .from('items')
    .update({ last_opened_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  const openUrl = item.canonical_url ?? item.url

  return (
    <div className="flex min-h-dvh justify-center bg-zinc-50 px-4 py-6 dark:bg-black">
      <main className="w-full max-w-md">
        <Link
          href="/inbox"
          className="text-sm text-zinc-600 dark:text-zinc-400"
        >
          뒤로
        </Link>

        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {item.title ?? '제목 없음'}
          </h1>

          {item.description ? (
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {item.description}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {item.source_key ? (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {item.source_key}
              </span>
            ) : null}
            {item.content_type ? (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {item.content_type}
              </span>
            ) : null}
          </div>

          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex h-11 w-full items-center justify-center rounded-xl bg-zinc-900 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            원문 열기
          </a>

          <div className="mt-3 break-all text-xs text-zinc-500 dark:text-zinc-400">
            {openUrl}
          </div>
        </div>
      </main>
    </div>
  )
}
