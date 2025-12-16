'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Share2, Trash2 } from 'lucide-react'

import type { Item } from '@/lib/items'

type Props = {
  initialItems: Item[]
  initialTotalCount: number
}

export default function InboxClient({
  initialItems,
  initialTotalCount,
}: Props) {
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Item[]>(initialItems)
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount)
  const [typeFilter, setTypeFilter] = useState<'all' | 'video' | 'article'>(
    'all'
  )

  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [menuOpenForId, setMenuOpenForId] = useState<string | null>(null)

  const maxItems = 10

  const UNDO_MS = 6000
  const [pendingDelete, setPendingDelete] = useState<{
    item: Item
    index: number
    timeoutId: ReturnType<typeof setTimeout>
  } | null>(null)

  const typeLabel = (type: string) => {
    if (type === 'article') return '아티클'
    if (type === 'video') return '영상'
    if (type === 'report') return '리포트'
    return '기타'
  }

  const filteredItems =
    typeFilter === 'all'
      ? items
      : items.filter(
          (it) => (it.content_type ?? '').toLowerCase() === typeFilter
        )

  const commitDelete = async (item: Item, index: number) => {
    try {
      const res = await fetch(`/api/items/${item.id}`, { method: 'DELETE' })
      if (!res.ok) {
        setItems((prev) => {
          const exists = prev.some((it) => it.id === item.id)
          if (exists) return prev
          const next = [...prev]
          next.splice(Math.min(Math.max(index, 0), next.length), 0, item)
          return next.slice(0, maxItems)
        })
        setTotalCount((c) => c + 1)
        setError('삭제에 실패했어요')
      }
    } catch {
      setItems((prev) => {
        const exists = prev.some((it) => it.id === item.id)
        if (exists) return prev
        const next = [...prev]
        next.splice(Math.min(Math.max(index, 0), next.length), 0, item)
        return next.slice(0, maxItems)
      })
      setTotalCount((c) => c + 1)
      setError('삭제에 실패했어요')
    }
  }

  const requestDeleteWithUndo = (item: Item) => {
    setMenuOpenForId(null)
    setError(null)

    if (pendingDelete) {
      clearTimeout(pendingDelete.timeoutId)
      void commitDelete(pendingDelete.item, pendingDelete.index)
      setPendingDelete(null)
    }

    const index = items.findIndex((it) => it.id === item.id)
    setItems((prev) => prev.filter((it) => it.id !== item.id))
    setTotalCount((c) => Math.max(0, c - 1))

    const timeoutId = setTimeout(() => {
      setPendingDelete((cur) => {
        if (!cur || cur.item.id !== item.id) return cur
        void commitDelete(cur.item, cur.index)
        return null
      })
    }, UNDO_MS)

    setPendingDelete({ item, index: index < 0 ? 0 : index, timeoutId })
  }

  const undoDelete = () => {
    if (!pendingDelete) return
    clearTimeout(pendingDelete.timeoutId)
    setItems((prev) => {
      const exists = prev.some((it) => it.id === pendingDelete.item.id)
      if (exists) return prev
      const next = [...prev]
      next.splice(
        Math.min(Math.max(pendingDelete.index, 0), next.length),
        0,
        pendingDelete.item
      )
      return next
    })
    setTotalCount((c) => c + 1)
    setPendingDelete(null)
  }

  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent
      const item = ev.detail?.item as Item | undefined
      if (!item?.id) return

      setItems((prev) => {
        if (prev.some((it) => it.id === item.id)) return prev
        const next = [item, ...prev]
        return next.slice(0, maxItems)
      })
      setTotalCount((c) => c + 1)
    }

    window.addEventListener('lino:item_saved', handler as EventListener)
    return () => {
      window.removeEventListener('lino:item_saved', handler as EventListener)
    }
  }, [maxItems])

  const onShare = async (item: Item) => {
    setMenuOpenForId(null)

    const url = item.url
    const title = item.title ?? undefined
    const text = item.description ?? undefined

    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await navigator.share({ title, text, url })
        return
      }
    } catch {
      // fallthrough to clipboard
    }

    try {
      await navigator.clipboard.writeText(url)
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
      }
      setToastMessage('링크를 복사했어요')
      toastTimerRef.current = setTimeout(() => {
        setToastMessage(null)
        toastTimerRef.current = null
      }, 2000)
    } catch {
      window.prompt('아래 링크를 복사해 주세요.', url)
    }
  }

  return (
    <div className="space-y-4 pb-24">
      {error ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-red-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-red-400">
          {error}
        </div>
      ) : null}

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-2">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={`h-9 rounded-full border px-3 text-sm font-medium ${
              typeFilter === 'all'
                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
                : 'border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50'
            }`}
          >
            전체 ({totalCount})
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter('video')}
            className={`h-9 rounded-full border px-3 text-sm font-medium ${
              typeFilter === 'video'
                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
                : 'border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50'
            }`}
          >
            영상
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter('article')}
            className={`h-9 rounded-full border px-3 text-sm font-medium ${
              typeFilter === 'article'
                ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900'
                : 'border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50'
            }`}
          >
            아티클
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredItems.map((item) => {
          const href = `/items/${item.id}`
          const title = item.title ?? item.url
          const source = item.source_key ?? item.domain ?? ''
          const type = item.content_type ?? 'unknown'

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex gap-3">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt=""
                    className="h-14 w-14 flex-none rounded-xl object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-14 w-14 flex-none rounded-xl bg-zinc-100 dark:bg-zinc-900" />
                )}

                <div className="min-w-0 flex-1">
                  <Link
                    href={href}
                    className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-50"
                  >
                    {title}
                  </Link>

                  <div className="mt-1 flex flex-wrap gap-2">
                    {source ? (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                        {source}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                      {typeLabel(type)}
                    </span>
                  </div>
                </div>

                <div className="relative flex-none">
                  <button
                    type="button"
                    aria-label="메뉴"
                    onClick={() =>
                      setMenuOpenForId((cur) =>
                        cur === item.id ? null : item.id
                      )
                    }
                    className="h-9 w-9 rounded-xl border border-zinc-200 bg-white text-sm font-medium text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                  >
                    ⋮
                  </button>

                  {menuOpenForId === item.id ? (
                    <div className="absolute right-0 top-10 z-10 w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                      <button
                        type="button"
                        onClick={() => void onShare(item)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-900 hover:bg-zinc-50 dark:text-zinc-50 dark:hover:bg-zinc-900"
                      >
                        <Share2 className="h-4 w-4" />
                        공유
                      </button>

                      <button
                        type="button"
                        onClick={() => void requestDeleteWithUndo(item)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-zinc-50 dark:text-red-400 dark:hover:bg-zinc-900"
                      >
                        <Trash2 className="h-4 w-4" />
                        삭제
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )
        })}

        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            {typeFilter === 'all'
              ? '아직 저장된 링크가 없어요.'
              : '해당 필터에 해당하는 항목이 없어요.'}
          </div>
        ) : null}
      </div>

      {pendingDelete ? (
        <div
          className="fixed left-0 right-0 z-30 px-4"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 72px)' }}
        >
          <div className="mx-auto flex max-w-md items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
            <div>
              삭제됨 <span className="text-zinc-400">·</span>{' '}
              <button
                type="button"
                onClick={() => undoDelete()}
                className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-50"
              >
                되돌리기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toastMessage ? (
        <div
          className="fixed left-0 right-0 z-30 px-4"
          style={{
            bottom: pendingDelete
              ? 'calc(env(safe-area-inset-bottom) + 136px)'
              : 'calc(env(safe-area-inset-bottom) + 72px)',
          }}
        >
          <div className="mx-auto max-w-md rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
            {toastMessage}
          </div>
        </div>
      ) : null}
    </div>
  )
}
