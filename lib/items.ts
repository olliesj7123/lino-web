import type { ContentType, SourceKey } from '@/lib/classify'

export type ItemStatus = 'inbox' | 'archived'
export type FetchStatus = 'pending' | 'success' | 'failed'

export type Item = {
  id: string
  user_id: string
  url: string
  canonical_url: string | null
  domain: string | null
  source_key: SourceKey | null
  content_type: ContentType | null
  title: string | null
  description: string | null
  image_url: string | null
  site_name: string | null
  author: string | null
  status: ItemStatus
  fetch_status: FetchStatus
  fetched_at: string | null
  fetch_error: string | null
  last_opened_at: string | null
  created_at: string
}
