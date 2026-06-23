import { requireUser } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { isClaimableSubdomain } from '~~/shared/tenancy/reserved'

// Live availability check for the onboarding form.
export default defineEventHandler(async (event) => {
  await requireUser(event)
  const subdomain = String(getQuery(event).subdomain ?? '').toLowerCase().trim()

  if (!subdomain) return { available: false, reason: 'empty' as const }
  if (!isClaimableSubdomain(subdomain)) return { available: false, reason: 'invalid' as const }

  const admin = supabaseAdmin(event)
  const { data } = await admin.from('stores').select('id').eq('subdomain', subdomain).maybeSingle()
  return data ? { available: false, reason: 'taken' as const } : { available: true, reason: 'ok' as const }
})
