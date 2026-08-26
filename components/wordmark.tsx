import Link from 'next/link'

export function Wordmark({ href = '/' }: { href?: string }) {
  return (
    <Link className="wordmark" href={href} aria-label="WhoIsTop home">
      whois<span className="stop">top</span>.lol
    </Link>
  )
}
