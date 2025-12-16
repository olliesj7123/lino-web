const TRACKING_PARAMS = [
  'fbclid',
  'gclid',
  'igshid',
  'mc_cid',
  'mc_eid',
  'mkt_tok',
]

function isUtmParam(key: string) {
  return key.toLowerCase().startsWith('utm_')
}

export function normalizeUrl(input: string) {
  let raw = input.trim()
  if (!raw) throw new Error('URL을 입력해 주세요')

  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(raw)) {
    raw = `https://${raw}`
  }

  const url = new URL(raw)

  for (const key of Array.from(url.searchParams.keys())) {
    if (isUtmParam(key) || TRACKING_PARAMS.includes(key.toLowerCase())) {
      url.searchParams.delete(key)
    }
  }

  const hostname = url.hostname.toLowerCase()

  if (hostname === 'www.youtube.com' || hostname === 'youtube.com') {
    if (url.pathname === '/watch') {
      url.searchParams.delete('list')
      url.searchParams.delete('index')
    }
  }

  if (hostname === 'youtu.be') {
    const videoId = url.pathname.replace(/^\//, '').trim()
    if (videoId) {
      const canonical = new URL('https://www.youtube.com/watch')
      canonical.searchParams.set('v', videoId)
      url.href = canonical.href
    }
  }

  url.hash = ''

  return url.toString()
}

export function getDomain(urlString: string) {
  const u = new URL(urlString)
  return u.hostname.replace(/^www\./, '').toLowerCase()
}
