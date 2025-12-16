'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmed = email.trim()
    if (!trimmed) return
    if (!password) return

    setLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmed,
      password,
    })
    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    router.replace('/inbox')
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-50 px-4 py-6 dark:bg-black">
      <main className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-950">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          로그인
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          로그인 할 이메일을 입력하세요.
        </p>

        <form className="mt-6 space-y-3" onSubmit={onSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소"
            autoComplete="email"
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-base text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            autoComplete="current-password"
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-base text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
          />

          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-xl bg-zinc-900 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {error ? (
          <div className="mt-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : null}
      </main>
    </div>
  )
}
