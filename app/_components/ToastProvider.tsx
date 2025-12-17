'use client'

import * as Toast from '@radix-ui/react-toast'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

type ToastPayload = {
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void | Promise<void>
  durationMs?: number
}

type ToastItem = ToastPayload & {
  id: string
  open: boolean
}

type ToastContextValue = {
  toast: (payload: ToastPayload) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within <ToastProvider />')
  }
  return ctx
}

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

export default function ToastProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((payload: ToastPayload) => {
    const id = uid()
    const next: ToastItem = {
      id,
      open: true,
      durationMs: 3000,
      ...payload,
    }

    setToasts((prev) => [next, ...prev].slice(0, 3))
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      <Toast.Provider swipeDirection="right">
        {children}

        {toasts.map((t) => (
          <Toast.Root
            key={t.id}
            open={t.open}
            duration={t.durationMs}
            onOpenChange={(open) => {
              setToasts((prev) => {
                if (!open) return prev.filter((x) => x.id !== t.id)
                return prev.map((x) => (x.id === t.id ? { ...x, open } : x))
              })
            }}
            className="pointer-events-auto grid w-full grid-cols-[1fr_auto] gap-x-3 gap-y-1 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
          >
            <Toast.Title className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {t.title}
            </Toast.Title>

            {t.actionLabel ? (
              <Toast.Action
                altText={t.actionLabel}
                className="h-8 rounded-xl bg-zinc-900 px-3 text-xs font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
                onClick={() => void t.onAction?.()}
              >
                {t.actionLabel}
              </Toast.Action>
            ) : null}

            {t.description ? (
              <Toast.Description className="col-span-2 text-sm text-zinc-600 dark:text-zinc-400">
                {t.description}
              </Toast.Description>
            ) : null}
          </Toast.Root>
        ))}

        <Toast.Viewport
          className="fixed left-0 right-0 z-50 mx-auto flex max-w-md flex-col gap-2 px-4"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom) + 72px)',
          }}
        />
      </Toast.Provider>
    </ToastContext.Provider>
  )
}
