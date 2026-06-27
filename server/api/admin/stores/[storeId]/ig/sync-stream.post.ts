import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { runImport } from '~~/server/utils/ig/importer'

// Streaming twin of ig/sync: runs the exact same import but emits newline-delimited
// JSON (NDJSON) progress events as each real stage completes, so the onboarding UI
// can show an honest, ticking checklist instead of a single indeterminate spinner.
//
// Wire format (one JSON object per line):
//   { "type": "progress", "step": "...", "status": "active|done", "current": n, "total": n }
//   { "type": "result", "result": ImportResult }   ← terminal, on success
//   { "type": "error", "message": "..." }           ← terminal, on failure
//
// The import is kicked off eagerly inside the stream and runs to completion on the
// server even if the client stops reading, so navigating away never aborts it
// (matches the fire-and-forget durability of the plain ig/sync endpoint).
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'admin')

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      const send = (obj: unknown) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
        } catch {
          closed = true // client went away mid-import; let the import finish quietly
        }
      }

      runImport(event, storeId, (p) => send({ type: 'progress', ...p }))
        .then((result) => send({ type: 'result', result }))
        .catch(async (e) => {
          const msg = (e as { statusMessage?: string }).statusMessage || (e as Error).message || 'Import failed'
          try {
            await supabaseAdmin(event)
              .from('ig_accounts')
              .update({ last_sync_error: msg.slice(0, 500) })
              .eq('store_id', storeId)
          } catch {
            // best-effort; the error is already surfaced to the client below
          }
          send({ type: 'error', message: msg })
        })
        .finally(() => {
          if (!closed) controller.close()
        })
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      // Tell any intermediary proxy not to buffer — we want chunks flushed live.
      'x-accel-buffering': 'no',
    },
  })
})
