'use client'

import { useMemo, useState } from 'react'
import { Chrome } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image'

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onGoogleLogin = async () => {
    setError(null)

    setLoading(true)
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo:
          typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : undefined,
      },
    })
    setLoading(false)

    if (signInError) {
      setError(signInError.message)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-50 px-4 py-6 dark:bg-black">
      <main className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-950">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          로그인
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          구글 계정으로 로그인하세요.
        </p>

        <div className="mt-6">
          <button
            type="button"
            onClick={() => void onGoogleLogin()}
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
          >
            <Image
              src="/assets/logos/google-icon.svg"
              alt="Google"
              width={20}
              height={20}
              className="h-5 w-5"
            />
            {loading ? '구글로 로그인 중...' : 'Google로 로그인'}
          </button>
        </div>

        {error ? (
          <div className="mt-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : null}
      </main>
    </div>
  )
}
