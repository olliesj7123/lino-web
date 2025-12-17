import { getDomain } from '@/lib/url'

export type SourceKey = string
export type ContentType = 'article' | 'video' | 'report' | 'site' | 'unknown'

function extractMetaContents(html: string) {
  const metas = new Map<string, string>()
  const metaTags = html.match(/<meta[\s\S]*?>/gi) ?? []
  const re = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g

  for (const tag of metaTags) {
    const attrs: Record<string, string> = {}
    let match: RegExpExecArray | null
    while ((match = re.exec(tag))) {
      const key = match[1].toLowerCase()
      const value = match[3] ?? match[4] ?? match[5] ?? ''
      attrs[key] = value
    }

    const key = (attrs.property ?? attrs.name ?? '').toLowerCase()
    const content = attrs.content
    if (!key || !content || metas.has(key)) continue
    metas.set(key, content.trim().replace(/\s+/g, ' '))
  }

  return metas
}

function normalizeSchemaType(t: unknown): string[] {
  if (!t) return []
  if (typeof t === 'string') return [t]
  if (Array.isArray(t)) return t.flatMap((x) => normalizeSchemaType(x))
  return []
}

function collectSchemaTypes(node: unknown, out: Set<string>) {
  if (!node) return
  if (Array.isArray(node)) {
    for (const v of node) collectSchemaTypes(v, out)
    return
  }
  if (typeof node !== 'object') return

  const obj = node as Record<string, unknown>
  for (const t of normalizeSchemaType(obj['@type'])) {
    out.add(String(t))
  }

  const graph = obj['@graph']
  if (graph) collectSchemaTypes(graph, out)
}

function extractJsonLdTypes(html: string) {
  const types = new Set<string>()
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html))) {
    const raw = match[1]?.trim()
    if (!raw) continue
    try {
      const json = JSON.parse(raw)
      collectSchemaTypes(json, types)
    } catch {
      // ignore invalid json-ld
    }
  }
  return types
}

function hasAny(types: Set<string>, candidates: string[]) {
  const lower = new Set(Array.from(types).map((t) => t.toLowerCase()))
  return candidates.some((c) => lower.has(c.toLowerCase()))
}

export function classifyContentTypeFromHtml(
  html: string,
  url: string
): ContentType {
  const pathname = new URL(url).pathname.toLowerCase()
  if (pathname.endsWith('.pdf')) return 'report'

  const jsonLdTypes = extractJsonLdTypes(html)
  if (
    hasAny(jsonLdTypes, [
      'Article',
      'NewsArticle',
      'Report',
      'BlogPosting',
      'TechArticle',
      'ScholarlyArticle',
    ])
  ) {
    return 'article'
  }
  if (hasAny(jsonLdTypes, ['VideoObject'])) {
    return 'video'
  }

  const metas = extractMetaContents(html)
  const ogType = (metas.get('og:type') ?? '').toLowerCase()
  const twitterCard = (metas.get('twitter:card') ?? '').toLowerCase()

  if (
    ogType.startsWith('video') ||
    twitterCard === 'player' ||
    metas.has('og:video') ||
    metas.has('og:video:url') ||
    metas.has('og:video:secure_url')
  ) {
    return 'video'
  }

  if (
    ogType === 'article' ||
    metas.has('article:published_time') ||
    metas.has('article:modified_time') ||
    metas.has('article:author')
  ) {
    return 'article'
  }

  if (/\/video\/(\d+)(?:\/|$)/.test(pathname)) {
    return 'video'
  }

  return classifyContentType(url)
}

export function classifySourceKey(url: string): SourceKey {
  const domain = getDomain(url)

  if (
    domain === 'youtube.com' ||
    domain === 'youtu.be' ||
    domain.endsWith('.youtube.com')
  ) {
    return 'youtube'
  }

  if (domain === 'medium.com' || domain.endsWith('.medium.com')) {
    return 'medium'
  }

  if (domain === 'yozm.wishket.com') {
    return 'yozm'
  }

  return domain
}

export function classifyContentType(url: string): ContentType {
  const domain = getDomain(url)
  const pathname = new URL(url).pathname.toLowerCase()

  if (
    domain === 'youtube.com' ||
    domain === 'youtu.be' ||
    domain.endsWith('.youtube.com')
  ) {
    return 'video'
  }

  if (pathname.endsWith('.pdf')) {
    return 'report'
  }

  if (domain === 'medium.com' || domain.endsWith('.medium.com')) {
    return 'article'
  }

  if (domain === 'yozm.wishket.com') {
    return 'article'
  }

  if (
    domain === 'hankyung.com' &&
    (pathname === '/article' || pathname.startsWith('/article/'))
  ) {
    const rest = pathname.replace(/^\/article\/?/, '')
    if (/^\d{8,}(?:[a-z]+)?$/.test(rest)) {
      return 'article'
    }
  }

  return 'site'
}
