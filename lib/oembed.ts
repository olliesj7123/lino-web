export type OEmbedResult = {
  title: string | null
  thumbnail_url: string | null
  author_name: string | null
  provider_name: string | null
}

function cleanText(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim().replace(/\s+/g, ' ')
  return trimmed ? trimmed : null
}

function cleanUrl(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const normalized = input.trim().replace(/\s+/g, '')
  return normalized ? normalized : null
}

export async function fetchTikTokOEmbed(
  url: string
): Promise<OEmbedResult | null> {
  try {
    const endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(
      url
    )}`
    const res = await fetch(endpoint, {
      redirect: 'follow',
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        accept: 'application/json,text/plain,*/*',
      },
    })

    if (!res.ok) return null

    const json = (await res.json().catch(() => null)) as Record<
      string,
      unknown
    > | null
    if (!json) return null

    return {
      title: cleanText(json.title),
      thumbnail_url: cleanUrl(json.thumbnail_url),
      author_name: cleanText(json.author_name),
      provider_name: cleanText(json.provider_name),
    }
  } catch {
    return null
  }
}
