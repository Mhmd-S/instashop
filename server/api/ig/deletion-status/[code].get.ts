import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'

// Public status page for a Meta data-deletion request. Linked from the `url` we
// return to Meta. Looks up by confirmation code only (no PII in the URL) and shows
// a redacted human-readable status. Returns plain HTML so it renders for a person.
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

export default defineEventHandler(async (event) => {
  const code = (getRouterParam(event, 'code') || '').replace(/[^a-f0-9]/gi, '').slice(0, 64)
  const admin = supabaseAdmin(event)
  const { data } = await admin
    .from('ig_deletion_requests')
    .select('status, detail, requested_at, completed_at')
    .eq('confirmation_code', code)
    .maybeSingle()

  const row = data as { status: string; detail: string | null; requested_at: string; completed_at: string | null } | null

  setResponseHeader(event, 'content-type', 'text/html; charset=utf-8')
  setResponseHeader(event, 'cache-control', 'no-store')

  if (!row) {
    setResponseStatus(event, 404)
    return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Data deletion status</title>
<body style="font-family:system-ui,sans-serif;max-width:42rem;margin:4rem auto;padding:0 1.5rem;color:#0f172a">
<h1>Data deletion status</h1>
<p>No deletion request was found for confirmation code <code>${esc(code)}</code>.</p>
</body>`
  }

  const label = row.status === 'completed' ? 'Completed' : row.status === 'processing' ? 'In progress' : 'Received'
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Data deletion status</title>
<body style="font-family:system-ui,sans-serif;max-width:42rem;margin:4rem auto;padding:0 1.5rem;color:#0f172a">
<h1>Data deletion status</h1>
<p>Confirmation code: <code>${esc(code)}</code></p>
<p>Status: <strong>${esc(label)}</strong></p>
${row.detail ? `<p>${esc(row.detail)}</p>` : ''}
<p style="color:#64748b;font-size:.9rem">Requested ${esc(row.requested_at)}${row.completed_at ? ` · Completed ${esc(row.completed_at)}` : ''}</p>
</body>`
})
