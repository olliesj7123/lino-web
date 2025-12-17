import { NextResponse } from 'next/server'

import {
  classifyContentType,
  classifyContentTypeFromHtml,
  classifySourceKey,
} from '@/lib/classify'
import { extractMetadata } from '@/lib/metadata'
import { fetchTikTokOEmbed } from '@/lib/oembed'
import { getDomain, normalizeUrl } from '@/lib/url'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as {
    url?: string
  } | null
  const rawUrl = body?.url?.trim()

  if (!rawUrl) {
    return NextResponse.json({ error: 'URL을 입력해 주세요' }, { status: 400 })
  }

  let normalized: string
  try {
    normalized = normalizeUrl(rawUrl)
  } catch (e) {
    const message = e instanceof Error ? e.message : '올바른 URL이 아니에요'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const domain = getDomain(normalized)
  const sourceKey = classifySourceKey(normalized)
  let contentType = classifyContentType(normalized)

  let fetchStatus: 'success' | 'failed' = 'failed'
  let fetchedAt: string | null = null
  let fetchError: string | null = null

  let meta = {
    title: null as string | null,
    description: null as string | null,
    image_url: null as string | null,
    site_name: null as string | null,
    author: null as string | null,
    canonical_url: null as string | null,
  }

  try {
    const res = await fetch(normalized, {
      redirect: 'follow',
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    fetchedAt = new Date().toISOString()

    const contentTypeHeader = res.headers.get('content-type') ?? ''
    const isHtml = contentTypeHeader.toLowerCase().includes('text/html')

    if (!res.ok) {
      fetchError = `HTTP ${res.status}`
    } else if (!isHtml) {
      fetchError = '지원하지 않는 콘텐츠 타입이에요'
    } else {
      const html = await res.text()
      meta = extractMetadata(html, normalized)
      contentType = classifyContentTypeFromHtml(html, normalized)
      fetchStatus = 'success'
    }
  } catch (e) {
    fetchedAt = new Date().toISOString()
    fetchError = e instanceof Error ? e.message : '가져오기에 실패했어요'
  }

  if (domain === 'tiktok.com' && fetchStatus === 'success') {
    const isMetaEmpty = !meta.title && !meta.description && !meta.image_url
    if (isMetaEmpty) {
      const oembed = await fetchTikTokOEmbed(normalized)
      if (oembed) {
        meta = {
          ...meta,
          title: meta.title ?? oembed.title,
          image_url: meta.image_url ?? oembed.thumbnail_url,
          site_name: meta.site_name ?? oembed.provider_name,
          author: meta.author ?? oembed.author_name,
        }
      }
    }
  }

  return NextResponse.json({
    preview: {
      url: normalized,
      canonical_url: meta.canonical_url,
      domain,
      source_key: sourceKey,
      content_type: contentType,
      title: meta.title,
      description: meta.description,
      image_url: meta.image_url,
      site_name: meta.site_name,
      author: meta.author,
      fetch_status: fetchStatus,
      fetched_at: fetchedAt,
      fetch_error: fetchError,
    },
  })
}
