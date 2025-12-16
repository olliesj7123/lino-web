import { getDomain } from '@/lib/url'

export type SourceKey = string
export type ContentType = 'article' | 'video' | 'report' | 'unknown'

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

  if (pathname) {
    return 'article'
  }

  return 'unknown'
}
