// URL-safe slug from arbitrary text. Mirrors the per-store unique (store_id, slug).
// NFKD decomposes accented letters (é -> e + combining mark); keeping only ASCII
// code points drops the marks (and other non-ASCII) but keeps the base letter.
export function slugify(input: string): string {
  const ascii = input
    .toLowerCase()
    .normalize('NFKD')
    .split('')
    .filter((c) => c.charCodeAt(0) < 128)
    .join('')
  const s = ascii
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return s || 'item'
}
