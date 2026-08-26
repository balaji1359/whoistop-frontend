/**
 * Renders structured data as a `<script type="application/ld+json">` tag.
 *
 * Listing names/taglines are free text anyone can submit via `POST /products`
 * — `JSON.stringify` escapes quotes but not `</script>`, so a listing named
 * `</script><script>alert(1)` would otherwise break out of the tag and
 * execute. Escaping `<` as `<` neutralizes that while staying valid,
 * parseable JSON.
 */
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return (
    // eslint-disable-next-line react/no-danger
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
  )
}
