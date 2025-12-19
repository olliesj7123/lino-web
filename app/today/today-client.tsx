'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Bookmark,
  Check,
  Copy,
  Link2,
  PlusCircle,
  Share2,
  Trash2,
} from 'lucide-react'

import type { Item } from '@/lib/items'
import { createClient } from '@/utils/supabase/client'
import { useToast } from '@/app/_components/ToastProvider'

type Props = {
  initialItems: Item[]
  initialTotalCount: number
  initialHasSeenOnboarding: boolean
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
    return { label: '어제 저장', copy: '가볍게 훑어보기' }
  }

  if (days === 2) {
    return { label: '2일 전 저장', copy: '놓치기 전에 한 번' }
  }

  if (days >= 7) {
    return { label: `${days}일 전 저장`, copy: '다시 꺼내볼 만해요' }
  }

  return { label: `${days}일 전 저장`, copy: '지금 잠깐 보기' }
}

export default function TodayClient({
  initialItems,
  initialTotalCount,
  initialHasSeenOnboarding,
}: Props) {
  const { toast } = useToast()
  const [items, setItems] = useState<Item[]>(initialItems)
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount)
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(() => {
    if (initialHasSeenOnboarding) return true
    if (typeof window === 'undefined') return false
    try {
      return localStorage.getItem('lino:has_seen_onboarding') === '1'
    } catch {
      return false
    }
  })

  const supabase = useMemo(() => createClient(), [])

  const [justCleared, setJustCleared] = useState(false)

  const [menuOpenForId, setMenuOpenForId] = useState<string | null>(null)

  useEffect(() => {
    if (!menuOpenForId) return

    const onDocClick = () => setMenuOpenForId(null)
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [menuOpenForId])

  const dismissOnboarding = async () => {
    localStorage.setItem('lino:has_seen_onboarding', '1')
    setHasSeenOnboarding(true)

    const { error } = await supabase.auth.updateUser({
      data: { has_seen_onboarding: true },
    })

    if (error) {
      console.error(error)
    }
  }

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

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: '링크를 복사했어요' })
    } catch {
      toast({
        title: '링크를 복사할 수 없어요',
        description: url,
        actionLabel: '열기',
        onAction: () => {
          window.open(url, '_blank', 'noopener,noreferrer')
        },
        durationMs: 5000,
      })
    }
  }

  const onCopyLink = async (item: Item) => {
    setMenuOpenForId(null)
    const url = item.canonical_url ?? item.url
    await copyLink(url)
  }

  const onShare = async (item: Item) => {
    setMenuOpenForId(null)

    const url = item.canonical_url ?? item.url
    const title = item.title ?? undefined
    const text = item.description ?? undefined

    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await navigator.share({ title, text, url })
        return
      }
      toast({
        title: '이 환경에서는 공유를 지원하지 않아요',
        actionLabel: '복사',
        onAction: () => copyLink(url),
      })
      return
    } catch {
      toast({
        title: '공유에 실패했어요',
        actionLabel: '복사',
        onAction: () => copyLink(url),
      })
    }
  }

  const deleteItem = async (item: Item) => {
    const res = await fetch(`/api/items/${item.id}`, { method: 'DELETE' })
    if (!res.ok) {
      throw new Error('삭제에 실패했어요')
    }
  }

  const requestDelete = (item: Item) => {
    setMenuOpenForId(null)

    const index = items.findIndex((it) => it.id === item.id)
    setItems((prev) => prev.filter((it) => it.id !== item.id))
    setTotalCount((c) => Math.max(0, c - 1))

    void deleteItem(item).catch(() => {
      setItems((prev) => {
        const exists = prev.some((it) => it.id === item.id)
        if (exists) return prev
        const next = [...prev]
        next.splice(Math.min(Math.max(index, 0), next.length), 0, item)
        return next
      })
      setTotalCount((c) => c + 1)
      toast({ title: '삭제에 실패했어요' })
    })
  }

  const requestReadWithUndo = (item: Item) => {
    // commit any previous pending undo
    if (pendingRead) {
      clearTimeout(pendingRead.timeoutId)
      setPendingRead(null)
    }

    // optimistic UI remove
    const wasLastItem = items.length === 1
    const index = items.findIndex((it) => it.id === item.id)
    setItems((prev) => prev.filter((it) => it.id !== item.id))
    setTotalCount((c) => Math.max(0, c - 1))

    if (hasSeenOnboarding && wasLastItem) {
      setJustCleared(true)
    }

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
    setJustCleared(false)
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

                    <div className="absolute left-3 right-3 top-2.5 flex items-start justify-between gap-2">
                      <div className="inline-flex items-center rounded-full border border-white/35 bg-white/55 px-2 py-0.5 text-[11px] font-semibold text-zinc-900 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/45 dark:text-zinc-50">
                        {savedInfo.label}
                      </div>

                      <div className="relative flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label="메뉴"
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenuOpenForId((cur) =>
                              cur === item.id ? null : item.id
                            )
                          }}
                          className="h-7 w-7 rounded-lg border border-white/35 bg-white/55 text-[12px] font-semibold text-zinc-900 shadow-sm backdrop-blur-md hover:bg-white/70 dark:border-white/10 dark:bg-zinc-950/45 dark:text-zinc-50 dark:hover:bg-zinc-950/60"
                        >
                          ⋮
                        </button>

                        {menuOpenForId === item.id ? (
                          <div className="absolute right-0 top-9 z-99 w-40 overflow-hidden rounded-xl border border-white/35 bg-white/70 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/70">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                void onCopyLink(item)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-900 hover:bg-white/60 dark:text-zinc-50 dark:hover:bg-zinc-900/60"
                            >
                              <Copy className="h-4 w-4" />
                              링크 복사
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                void onShare(item)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-900 hover:bg-white/60 dark:text-zinc-50 dark:hover:bg-zinc-900/60"
                            >
                              <Share2 className="h-4 w-4" />
                              공유
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                requestDelete(item)
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-white/60 dark:text-red-400 dark:hover:bg-zinc-900/60"
                            >
                              <Trash2 className="h-4 w-4" />
                              삭제
                            </button>
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            requestReadWithUndo(item)
                          }}
                          className="inline-flex h-7 items-center gap-1 rounded-lg border border-white/35 bg-white/55 px-2 text-[11px] font-semibold text-zinc-900 shadow-sm backdrop-blur-md hover:bg-white/70 dark:border-white/10 dark:bg-zinc-950/45 dark:text-zinc-50 dark:hover:bg-zinc-950/60"
                        >
                          <Check className="h-3 w-3" />
                          읽음 처리
                        </button>
                      </div>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 bg-zinc-900/85 p-4 text-white">
                      <div className="line-clamp-2 flex items-center gap-2 text-sm font-medium leading-5">
                        {title}
                      </div>

                      {source ? (
                        <div className="mt-3 flex gap-2">
                          <div className="inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 text-xs text-white/85">
                            {source}
                          </div>
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

      {items.length === 0 && !hasSeenOnboarding ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-start justify-between gap-4">
            <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              첫 저장을 시작해보세요!
            </div>
            <button
              type="button"
              onClick={() => void dismissOnboarding()}
              className="whitespace-nowrap text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              다시 보지 않기
            </button>
          </div>
          <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            링크를 복사한 뒤 아래의 <span className="font-medium">+</span>{' '}
            버튼을 눌러 저장하세요.
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-start gap-3 rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/40">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50">
                <Link2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  1단계: 링크 복사하기
                </div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  브라우저 주소창이나 공유 메뉴에서 링크를 복사합니다.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/40">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50">
                <PlusCircle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  2단계: 아래 + 버튼 누르기
                </div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  클립보드에서 링크를 불러와 미리보고 저장해요.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-900/40">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50">
                <Bookmark className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  3단계: 안읽음에서 모아보기
                </div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  저장한 링크는 안읽음 탭에서 보고, 읽음으로 정리할 수 있어요.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent('lino:open_save_from_clipboard')
                )
              }}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
            >
              클립보드 링크 저장하기
            </button>
            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              클립보드 접근이 막혀있으면 링크를 붙여넣는 화면이 열릴 수 있어요.
            </div>
          </div>
        </div>
      ) : null}

      {items.length === 0 && hasSeenOnboarding ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
          {justCleared ? (
            <>
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                모든 안읽음을 다 봤어요!
              </div>
              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                새로운 링크를 추가해 볼까요?
              </div>
            </>
          ) : (
            <>
              <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                아직 저장한 링크가 없어요
              </div>
              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                브라우저에서 링크를 복사하고 오른쪽 아래 + 버튼으로 추가해
                보세요.
              </div>
            </>
          )}

          <div className="mt-6 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-50 text-zinc-400 dark:bg-zinc-900/40 dark:text-zinc-500">
              <Bookmark className="h-7 w-7" />
            </div>
          </div>
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
