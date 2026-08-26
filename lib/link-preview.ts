export type LinkPreview = {
  url: string
  title: string | null
  description: string | null
  image: string | null
  siteName: string | null
  favicon: string | null
}

export async function fetchLinkPreview(url: string, signal?: AbortSignal): Promise<LinkPreview> {
  const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`, { signal })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(body?.error || 'Could not load preview.')
  }
  return (body?.data ?? body) as LinkPreview
}
