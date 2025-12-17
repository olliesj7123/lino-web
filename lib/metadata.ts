type Metadata = {
  title: string | null
  description: string | null
  image_url: string | null
  site_name: string | null
  author: string | null
  canonical_url: string | null
}

function decodeHtml(input: string) {
  return input
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
}

function parseAttributes(tag: string) {
  const attrs: Record<string, string> = {}
  const re = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g
  let match: RegExpExecArray | null
  while ((match = re.exec(tag))) {
    const key = match[1].toLowerCase()
    const value = match[3] ?? match[4] ?? match[5] ?? ''
    attrs[key] = value
  }
  return attrs
}

function firstNonEmpty(...values: Array<string | null | undefined>) {
  for (const v of values) {
    const trimmed = v?.trim().replace(/\s+/g, ' ')
    if (trimmed) return trimmed
  }
  return null
}

function absolutize(baseUrl: string, maybeRelative: string | null) {
  if (!maybeRelative) return null
  const normalized = maybeRelative.replace(/\s+/g, '')
  try {
    return new URL(normalized, baseUrl).toString()
  } catch {
    return normalized
  }
}

export function extractMetadata(html: string, baseUrl: string): Metadata {
  const metas = new Map<string, string>()

  const metaTags = html.match(/<meta[\s\S]*?>/gi) ?? []
  for (const tag of metaTags) {
    const attrs = parseAttributes(tag)
    const key = (attrs.property ?? attrs.name ?? '').toLowerCase()
    const content = attrs.content
    if (key && content && !metas.has(key)) {
      metas.set(key, decodeHtml(content.trim()))
    }
  }

  const linkTags = html.match(/<link[\s\S]*?>/gi) ?? []
  let canonical: string | null = null
  for (const tag of linkTags) {
    const attrs = parseAttributes(tag)
    const rel = (attrs.rel ?? '').toLowerCase()
    if (rel === 'canonical' && attrs.href) {
      canonical = decodeHtml(attrs.href.trim())
      break
    }
  }

  const titleTagMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const titleTag = titleTagMatch?.[1]
    ? decodeHtml(titleTagMatch[1].trim())
    : null

  const title = firstNonEmpty(
    metas.get('og:title') ?? null,
    metas.get('twitter:title') ?? null,
    metas.get('title') ?? null,
    titleTag
  )

  const description = firstNonEmpty(
    metas.get('og:description') ?? null,
    metas.get('twitter:description') ?? null,
    metas.get('description') ?? null
  )

  const image = firstNonEmpty(
    metas.get('og:image') ?? null,
    metas.get('og:image:url') ?? null,
    metas.get('twitter:image') ?? null,
    metas.get('twitter:image:src') ?? null
  )

  const siteName = firstNonEmpty(
    metas.get('og:site_name') ?? null,
    metas.get('twitter:site') ?? null
  )

  const author = firstNonEmpty(
    metas.get('author') ?? null,
    metas.get('article:author') ?? null
  )

  const canonicalUrl = absolutize(baseUrl, canonical)

  return {
    title,
    description,
    image_url: absolutize(canonicalUrl ?? baseUrl, image),
    site_name: siteName,
    author,
    canonical_url: canonicalUrl,
  }
}
