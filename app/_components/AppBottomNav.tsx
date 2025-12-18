'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, Inbox, PlusCircle } from 'lucide-react'

import type { Item } from '@/lib/items'
import { useToast } from '@/app/_components/ToastProvider'

type Preview = {
  url: string
  canonical_url: string | null
  domain: string
  source_key: string
  content_type: string
  title: string | null
  description: string | null
  image_url: string | null
  site_name: string | null
  author: string | null
  fetch_status: 'success' | 'failed'
  fetched_at: string | null
  fetch_error: string | null
}

type Props = {
  active: 'today' | 'inbox'
}

export default function AppBottomNav({ active }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteInput, setPasteInput] = useState('')

  const looksLikeUrl = useCallback((value: string) => {
    const v = value.trim()
    if (!v) return false
    try {
      new URL(
        v.startsWith('http://') || v.startsWith('https://') ? v : `https://${v}`
      )
      return true
    } catch {
      return false
    }
  }, [])

  const extractUrlFromText = useCallback(
    (input: string) => {
      const text = input.trim()
      if (!text) return null

      const hasWhitespace = /\s/.test(text)
      if (hasWhitespace) {
        const match = text.match(/https?:\/\/[^\s<>()"']+/i)
        if (!match?.[0]) return null
        return match[0].replace(/[),\].!?;:]+$/, '')
      }

      if (looksLikeUrl(text)) {
        return text.startsWith('http://') || text.startsWith('https://')
          ? text
          : `https://${text}`
      }

      return null
    },
    [looksLikeUrl]
  )

  const openPreviewFromUrl = useCallback(
    async (url: string, opts?: { silent?: boolean }) => {
      const silent = opts?.silent ?? false

      setPreviewLoading(true)
      try {
        const res = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url }),
        })

        const payload = (await res.json().catch(() => null)) as {
          preview?: Preview
          error?: string
        } | null

        if (!res.ok || !payload?.preview) {
          if (!silent) {
            toast({ title: payload?.error ?? '미리보기를 불러오지 못했어요' })
          }
          return
        }

        setPreview(payload.preview)
        setPreviewOpen(true)
      } finally {
        setPreviewLoading(false)
      }
    },
    [toast]
  )

  const readClipboardText = useCallback(async (): Promise<string | null> => {
    try {
      const t = (await navigator.clipboard.readText())?.trim()
      if (t) return t
    } catch {
      // ignore and fallback
    }

    try {
      if (!('read' in navigator.clipboard)) return null
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const preferred = ['text/uri-list', 'text/plain']
        const type = preferred.find((t) => item.types.includes(t))
        if (!type) continue
        const blob = await item.getType(type)
        const raw = (await blob.text()).trim()
        if (!raw) continue

        if (type === 'text/uri-list') {
          const line = raw
            .split(/\r?\n/)
            .map((l) => l.trim())
            .find((l) => l && !l.startsWith('#'))
          if (line) return line
          continue
        }

        return raw
      }
    } catch {
      // ignore
    }

    return null
  }, [])

  useEffect(() => {
    if (previewOpen || previewLoading || saving) return
    if (typeof window === 'undefined') return

    const checkedKey = 'lino:clipboard_auto_checked'
    const lastUrlKey = 'lino:clipboard_auto_last_url'

    if (sessionStorage.getItem(checkedKey) === '1') return
    sessionStorage.setItem(checkedKey, '1')

    void (async () => {
      try {
        const raw = await readClipboardText()
        if (!raw) return
        const extracted = extractUrlFromText(raw)
        if (!extracted) return

        const last = sessionStorage.getItem(lastUrlKey)
        if (last && last === extracted) return
        sessionStorage.setItem(lastUrlKey, extracted)

        await openPreviewFromUrl(extracted, { silent: true })
      } catch {
        // silently ignore (clipboard access can be blocked without user gesture)
      }
    })()
  }, [
    previewOpen,
    previewLoading,
    saving,
    readClipboardText,
    extractUrlFromText,
    openPreviewFromUrl,
  ])

  const openPreviewFromClipboard = async () => {
    const text = await readClipboardText()
    if (!text) {
      toast({
        title: '모바일에서는 클립보드를 자동으로 읽지 못할 수 있어요',
        description: '아래에 링크를 붙여넣어 주세요.',
      })
      setPasteInput('')
      setPasteOpen(true)
      return
    }

    const extracted = extractUrlFromText(text)
    if (!extracted) {
      toast({
        title: '클립보드에서 링크를 찾지 못했어요',
        description: '아래에 링크를 붙여넣어 주세요.',
      })
      setPasteInput(text)
      setPasteOpen(true)
      return
    }

    await openPreviewFromUrl(extracted)
  }

  const confirmPaste = async () => {
    const extracted = extractUrlFromText(pasteInput)
    if (!extracted) {
      toast({
        title: '링크를 찾지 못했어요',
        description: 'http/https로 시작하는 링크를 붙여넣어 주세요.',
      })
      return
    }

    setPasteOpen(false)
    await openPreviewFromUrl(extracted)
  }

  const confirmSave = async () => {
    if (!preview?.url) return

    setSaving(true)
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: preview.url }),
      })

      const payload = (await res.json().catch(() => null)) as {
        item?: Item
        error?: string
      } | null

      if (!res.ok || !payload?.item) {
        toast({ title: payload?.error ?? '저장에 실패했어요' })
        return
      }

      window.dispatchEvent(
        new CustomEvent('lino:item_saved', { detail: { item: payload.item } })
      )

      setPreviewOpen(false)
      setPreview(null)

      router.push('/inbox')
    } finally {
      setSaving(false)
    }
  }

  const typeLabel = (type: string) => {
    if (type === 'article') return '아티클'
    if (type === 'video') return '영상'
    if (type === 'report') return '리포트'
    if (type === 'site') return '사이트'
    return '기타'
  }

  return (
    <>
      {pasteOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 px-4 pb-24"
          onClick={() => {
            setPasteOpen(false)
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-4 shadow-lg dark:bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              링크를 붙여넣어 주세요
            </div>
            <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              모바일에서는 보안 정책 때문에 클립보드 자동 읽기가 제한될 수
              있어요.
            </div>

            <textarea
              value={pasteInput}
              onChange={(e) => setPasteInput(e.target.value)}
              placeholder="https://..."
              className="mt-4 h-24 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              autoFocus
            />

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPasteOpen(false)}
                className="h-11 flex-1 rounded-xl border border-zinc-200 bg-white text-sm font-medium text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void confirmPaste()}
                disabled={previewLoading || saving}
                className="h-11 flex-1 rounded-xl bg-zinc-900 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
              >
                {previewLoading ? '불러오는 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {previewOpen && preview ? (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 px-4 pb-24"
          onClick={() => {
            setPreviewOpen(false)
            setPreview(null)
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-4 shadow-lg dark:bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              이 링크를 저장할까요?
            </div>

            <div className="mt-3 flex gap-3">
              {preview.image_url ? (
                <img
                  src={preview.image_url}
                  alt=""
                  className="h-14 w-14 flex-none rounded-xl object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-14 w-14 flex-none rounded-xl bg-zinc-100 dark:bg-zinc-900" />
              )}

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                  {preview.title ?? preview.url}
                </div>
                {preview.description ? (
                  <div className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {preview.description}
                  </div>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    {preview.domain}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    {typeLabel(preview.content_type)}
                  </span>
                </div>
                {preview.fetch_status === 'failed' ? (
                  <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                    미리보기 정보를 충분히 가져오지 못했어요.
                    {preview.fetch_error ? ` (${preview.fetch_error})` : ''}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPreviewOpen(false)
                  setPreview(null)
                }}
                className="h-11 flex-1 rounded-xl border border-zinc-200 bg-white text-sm font-medium text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void confirmSave()}
                disabled={saving}
                className="h-11 flex-1 rounded-xl bg-zinc-900 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <nav
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="하단 네비게이션"
      >
        <div className="relative mx-auto flex max-w-md items-center justify-between px-4 py-2">
          <Link
            href="/today"
            className={`flex w-20 flex-col items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium ${
              active === 'today'
                ? 'text-zinc-900 dark:text-zinc-50'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
            aria-label="오늘 볼 것"
          >
            <CalendarDays className="h-5 w-5" />
            오늘 볼 것
          </Link>

          <button
            type="button"
            onClick={() => void openPreviewFromClipboard()}
            disabled={saving || previewLoading}
            aria-label="클립보드 링크 저장"
            className="-translate-y-4 rounded-full bg-zinc-900 p-3 text-white shadow-md disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {previewLoading ? (
              <span
                className="flex h-8 w-8 items-center justify-center"
                aria-hidden
              >
                <span
                  className="h-1.5 w-1.5 rounded-full bg-current"
                  style={{
                    animation: 'lino-dot 1s infinite',
                    animationDelay: '0ms',
                  }}
                />
                <span
                  className="ml-1.5 h-1.5 w-1.5 rounded-full bg-current"
                  style={{
                    animation: 'lino-dot 1s infinite',
                    animationDelay: '150ms',
                  }}
                />
                <span
                  className="ml-1.5 h-1.5 w-1.5 rounded-full bg-current"
                  style={{
                    animation: 'lino-dot 1s infinite',
                    animationDelay: '300ms',
                  }}
                />
                <style jsx>{`
                  @keyframes lino-dot {
                    0%,
                    80%,
                    100% {
                      transform: translateY(0);
                      opacity: 0.4;
                    }
                    40% {
                      transform: translateY(-4px);
                      opacity: 1;
                    }
                  }
                `}</style>
              </span>
            ) : (
              <PlusCircle className="h-8 w-8" />
            )}
          </button>

          <Link
            href="/inbox"
            className={`flex w-20 flex-col items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium ${
              active === 'inbox'
                ? 'text-zinc-900 dark:text-zinc-50'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
            aria-label="인박스"
          >
            <Inbox className="h-5 w-5" />
            인박스
          </Link>
        </div>
      </nav>
    </>
  )
}
