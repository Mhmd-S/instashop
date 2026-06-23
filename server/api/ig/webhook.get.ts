// Meta webhook verification handshake. On subscribe, Meta calls this with
// hub.mode=subscribe&hub.verify_token=<our token>&hub.challenge=<echo>. We echo
// the challenge only if the verify token matches our configured secret.
export default defineEventHandler((event) => {
  const cfg = useRuntimeConfig(event)
  const q = getQuery(event)
  const mode = String(q['hub.mode'] ?? '')
  const token = String(q['hub.verify_token'] ?? '')
  const challenge = String(q['hub.challenge'] ?? '')

  if (mode === 'subscribe' && cfg.igWebhookVerifyToken && token === cfg.igWebhookVerifyToken) {
    setResponseHeader(event, 'content-type', 'text/plain')
    return challenge
  }
  throw createError({ statusCode: 403, statusMessage: 'Verification failed' })
})
