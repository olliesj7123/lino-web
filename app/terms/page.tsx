import { redirect } from 'next/navigation'

import AppBottomNav from '@/app/_components/AppBottomNav'
import { createClient } from '@/utils/supabase/server'

export default async function TermsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-dvh justify-center bg-zinc-50 px-4 py-6 dark:bg-black">
      <main className="w-full max-w-md pb-24">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            이용약관(약식)
          </h1>
        </header>

        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          <div>
            본 서비스는 링크를 저장하고 다시 확인하기 위한 개인용 도구입니다.
          </div>
          <div>
            사용자는 불법/유해 콘텐츠를 저장하거나 공유하지 않아야 하며, 서비스
            운영을 방해하는 행위를 해서는 안 됩니다.
          </div>
          <div>
            서비스는 안정적인 제공을 위해 노력하지만, 오류/중단이 발생할 수
            있습니다.
          </div>
          <div>서비스 운영상 필요 시 기능/정책이 변경될 수 있습니다.</div>
        </div>

        <AppBottomNav active="settings" />
      </main>
    </div>
  )
}
