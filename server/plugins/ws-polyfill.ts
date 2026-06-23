import { WebSocket } from 'ws'

// @supabase/realtime-js (pulled in by supabase-js) requires a global WebSocket.
// Node < 22 has none, so constructing any Supabase client throws during SSR.
// Polyfill it once at server start. Harmless on Node 22+ (only sets if missing).
export default defineNitroPlugin(() => {
  const g = globalThis as unknown as { WebSocket?: unknown }
  if (typeof g.WebSocket === 'undefined') {
    g.WebSocket = WebSocket
  }
})
