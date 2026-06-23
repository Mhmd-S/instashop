// Single source of truth for reserved subdomains (L2).
// Mirrored in the DB via public.reserved_subdomains + app.guard_subdomain().
export const RESERVED_SUBDOMAINS = new Set<string>([
  'app', 'api', 'admin', 'www', 'assets', 'cdn', 'static',
  'mail', 'ftp', 'ns1', 'ns2', 'status', 'help', 'docs', 'blog', 'dashboard',
])

// DNS label rule — mirrors the stores.subdomain CHECK constraint in 0000_init.sql.
export const SUBDOMAIN_RE = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/

export function isClaimableSubdomain(label: string): boolean {
  const s = label.toLowerCase()
  return SUBDOMAIN_RE.test(s) && !RESERVED_SUBDOMAINS.has(s)
}
