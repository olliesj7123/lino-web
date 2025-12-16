'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { createClient } from '@/utils/supabase/client'

export default function SettingsClient() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onLogout = async () => {
    setError(null)
    setLoading(true)

    const { error: signOutError } = await supabase.auth.signOut()

    setLoading(false)

    if (signOutError) {
      setError(signOutError.message)
      return
    }

    router.replace('/login')
    router.refresh()
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void onLogout()}
        disabled={loading}
        className="h-11 w-full rounded-xl bg-zinc-900 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {loading ? '로그아웃 중...' : '로그아웃'}
      </button>

      {error ? (
        <div className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      ) : null}
    </div>
  )
}
