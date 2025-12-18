'use client'

import { useState } from 'react'

import type { Item } from '@/lib/items'

type Props = {
  initialItems: Item[]
  initialTotalCount: number
}

export default function TodayClient({
  initialItems,
  initialTotalCount,
}: Props) {
  const [items, setItems] = useState<Item[]>(initialItems)
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount)

  const UNDO_MS = 6000
  const [pendingRead, setPendingRead] = useState<{
    item: Item
    index: number
    timeoutId: ReturnType<typeof setTimeout>
  } | null>(null)

  const markRead = async (item: Item) => {
    const res = await fetch(`/api/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ read_at: new Date().toISOString() }),
    })

    if (!res.ok) {
      throw new Error('읽음 처리에 실패했어요')
    }
  }

  const markUnread = async (item: Item) => {
    const res = await fetch(`/api/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ read_at: null }),
    })

    if (!res.ok) {
      throw new Error('되돌리기에 실패했어요')
    }
  }

  const openOutlink = (item: Item) => {
    const openUrl = item.canonical_url ?? item.url
    window.open(openUrl, '_blank', 'noopener,noreferrer')
  }

  const requestReadWithUndo = (item: Item) => {
    // commit any previous pending undo
    if (pendingRead) {
      clearTimeout(pendingRead.timeoutId)
      setPendingRead(null)
    }

    // optimistic UI remove
    const index = items.findIndex((it) => it.id === item.id)
    setItems((prev) => prev.filter((it) => it.id !== item.id))
    setTotalCount((c) => Math.max(0, c - 1))

    // mark read on server (best-effort)
    void markRead(item).catch(() => {
      // revert if failed
      setItems((prev) => {
        const exists = prev.some((it) => it.id === item.id)
        if (exists) return prev
        const next = [...prev]
        next.splice(Math.min(Math.max(index, 0), next.length), 0, item)
        return next
      })
      setTotalCount((c) => c + 1)
    })

    // allow undo within window
    const timeoutId = setTimeout(() => {
      setPendingRead((cur) => {
        if (!cur || cur.item.id !== item.id) return cur
        return null
      })
    }, UNDO_MS)

    setPendingRead({ item, index: index < 0 ? 0 : index, timeoutId })
  }

  const undoRead = () => {
    if (!pendingRead) return

    clearTimeout(pendingRead.timeoutId)

    const item = pendingRead.item
    void markUnread(item)

    setItems((prev) => {
      const exists = prev.some((it) => it.id === item.id)
      if (exists) return prev
      const next = [...prev]
      next.splice(
        Math.min(Math.max(pendingRead.index, 0), next.length),
        0,
        item
      )
      return next
    })
    setTotalCount((c) => c + 1)
    setPendingRead(null)
  }

  return (
    <div className="space-y-4 pb-24">
      {items.map((item) => {
        const title = item.title ?? item.url
        const source = item.source_key ?? ''
        const domain =
          item.domain ??
          (() => {
            try {
              return new URL(item.canonical_url ?? item.url).hostname
            } catch {
              return ''
            }
          })()

        return (
          <div
            key={item.id}
            role="link"
            tabIndex={0}
            onClick={() => openOutlink(item)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                openOutlink(item)
              }
            }}
            className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="relative">
              <div className="aspect-4/3 w-full bg-zinc-100 dark:bg-zinc-900">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  requestReadWithUndo(item)
                }}
                className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-zinc-900 shadow-sm backdrop-blur hover:bg-white dark:bg-zinc-950/90 dark:text-zinc-50"
              >
                읽음
              </button>

              <div className="absolute inset-x-0 bottom-0 bg-zinc-900/85 p-4 text-white">
                <div className="line-clamp-2 text-sm font-medium leading-5">
                  {title}
                </div>

                <div className="mt-3 space-y-1 text-xs text-white/80">
                  <div className="truncate">
                    {source ? `출처: ${source}` : '출처: -'}
                  </div>
                  <div className="truncate">
                    {domain ? `도메인: ${domain}` : '도메인: -'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
          오늘 볼 것이 없어요.
        </div>
      ) : null}

      {pendingRead ? (
        <div
          className="fixed left-0 right-0 z-30 px-4"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 72px)' }}
        >
          <div className="mx-auto flex max-w-md items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50">
            <div>
              읽음 처리됨 <span className="text-zinc-400">·</span>{' '}
              <button
                type="button"
                onClick={() => undoRead()}
                className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-50"
              >
                되돌리기
              </button>
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {totalCount}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
