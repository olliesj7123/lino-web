'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

import type { Item } from '@/lib/items'

type Props = {
  initialItems: Item[]
  initialTotalCount: number
}

const dayDiffFromToday = (iso: string) => {
  const created = new Date(iso)
  const now = new Date()
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  )
  const startOfCreated = new Date(
    created.getFullYear(),
    created.getMonth(),
    created.getDate()
  )
  const diffMs = startOfToday.getTime() - startOfCreated.getTime()
  const days = Math.floor(diffMs / 86_400_000)
  return Number.isFinite(days) ? Math.max(0, days) : 0
}

const savedLabelAndCopy = (createdAt: string) => {
  const days = dayDiffFromToday(createdAt)

  if (days === 0) {
    return { label: '오늘 저장', copy: '지금 보기 좋아요' }
  }

  if (days === 1) {
    return { label: '어제 저장', copy: '가볍게 읽기' }
  }

  if (days === 2) {
    return { label: '2일 전 저장', copy: '다시 꺼내볼 타이밍' }
  }

  if (days >= 7) {
    return { label: `${days}일 전 저장`, copy: '읽기 전에 한 번 더' }
  }

  return { label: `${days}일 전 저장`, copy: '다시 꺼내볼 타이밍' }
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

  const groups = (() => {
    const result: Array<{ key: string; title: string; items: Item[] }> = []
    const indexByKey = new Map<string, number>()

    for (const item of items) {
      const info = savedLabelAndCopy(item.created_at)
      const key = info.label
      const idx = indexByKey.get(key)

      if (idx === undefined) {
        indexByKey.set(key, result.length)
        result.push({ key, title: info.copy, items: [item] })
      } else {
        result[idx].items.push(item)
      }
    }

    return result
  })()

  return (
    <div className="space-y-4 pb-24">
      {groups.map((group) => (
        <section key={group.key} className="space-y-4">
          <div className="px-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {group.title}
          </div>

          <div className="space-y-4">
            {group.items.map((item) => {
              const title = item.title ?? item.url
              const source = item.source_key ?? item.domain ?? ''
              const savedInfo = savedLabelAndCopy(item.created_at)

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

                    <span className="absolute left-3 top-3 inline-flex items-center rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-xs font-medium text-white/75 shadow-sm backdrop-blur">
                      {savedInfo.label}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        requestReadWithUndo(item)
                      }}
                      className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/75 shadow-sm backdrop-blur hover:bg-white/15"
                    >
                      <Check className="h-3.5 w-3.5" />
                      읽음처리
                    </button>

                    <div className="absolute inset-x-0 bottom-0 bg-zinc-900/85 p-4 text-white">
                      <div className="line-clamp-2 text-sm font-medium leading-5">
                        {title}
                      </div>

                      {source ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 text-xs text-white/85">
                            {source}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}

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
