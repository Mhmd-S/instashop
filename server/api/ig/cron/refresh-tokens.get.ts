import { refreshExpiringTokens } from '~~/server/utils/ig/refresh'

// Daily token-refresh job. Triggered by Vercel Cron (GET + `Authorization: Bearer
// $CRON_SECRET`) in prod, or curl with the same header in dev. Refuses unless the
// secret matches, so it can't be hit anonymously on the public host.
export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig(event)
  if (!cfg.cronSecret) throw createError({ statusCode: 503, statusMessage: 'Cron is not configured' })

  const auth = getHeader(event, 'authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth
  if (token !== cfg.cronSecret) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const summary = await refreshExpiringTokens(event)
  return { ok: true, ...summary }
})
