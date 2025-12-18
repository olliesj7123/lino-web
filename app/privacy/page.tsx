import { redirect } from 'next/navigation'

import AppBottomNav from '@/app/_components/AppBottomNav'
import { createClient } from '@/utils/supabase/server'

export default async function PrivacyPage() {
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
            개인정보처리방침(약식)
          </h1>
        </header>

        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          <div>
            서비스 제공을 위해 이메일 등 계정 식별 정보와 사용자가 저장한 링크
            데이터를 처리합니다.
          </div>
          <div>
            저장된 링크(및 메타데이터)는 인박스 기능 제공 목적에 한해
            사용됩니다.
          </div>
          <div>
            법령 또는 서비스 운영상 필요한 경우를 제외하고 제3자에게 제공하지
            않습니다.
          </div>
          <div>
            문의가 필요하면 서비스 내 제공되는 연락 채널(추후 제공)을 통해
            요청할 수 있습니다.
          </div>
        </div>

        <AppBottomNav active="inbox" />
      </main>
    </div>
  )
}
