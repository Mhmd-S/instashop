// Validate a `?return` / redirect value is a safe in-app path before using it as a
// link target or a server-issued redirect. Rejects non-strings (e.g. duplicated
// `?return=a&return=b` which vue-router parses to an array), absolute URLs
// (`https://evil.com`) and protocol-relative / backslash tricks (`//evil.com`,
// `/\evil.com`) that browsers resolve off-origin — i.e. open-redirect / phishing
// vectors. Returns the path when safe, otherwise null.
export function safeReturnPath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null
  if (value[0] !== '/') return null
  if (value[1] === '/' || value[1] === '\\') return null
  return value
}
