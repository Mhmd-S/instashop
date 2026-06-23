import { z } from 'zod'
import { requireUser } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { isClaimableSubdomain } from '~~/shared/tenancy/reserved'

const Body = z.object({
  name: z.string().trim().min(2).max(60),
  subdomain: z.string().trim().toLowerCase().min(3).max(63),
})

// Defense-in-depth resource cap (review: low-sev abuse finding).
const MAX_STORES_PER_OWNER = 20

// Create a store. Store creation is service-role only (no RLS INSERT policy, H10):
// owner_id is taken from the authenticated session — never the request body.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: 'Invalid input', data: parsed.error.flatten() })
  }
  const { name, subdomain } = parsed.data

  if (!isClaimableSubdomain(subdomain)) {
    throw createError({ statusCode: 422, statusMessage: 'Invalid or reserved subdomain' })
  }

  const admin = supabaseAdmin(event)

  // Per-owner cap to prevent loop-create abuse.
  const { count } = await admin
    .from('store_members')
    .select('store_id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('role', 'owner')
  if ((count ?? 0) >= MAX_STORES_PER_OWNER) {
    throw createError({ statusCode: 429, statusMessage: 'Store limit reached' })
  }

  // Fast-path availability check (nice UX). The real guard is the UNIQUE constraint
  // below — there is a TOCTOU window here, but a duplicate insert just hits 23505.
  const { data: existing } = await admin
    .from('stores')
    .select('id')
    .eq('subdomain', subdomain)
    .maybeSingle()
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'That subdomain is already taken' })
  }

  // status 'active' so the storefront is immediately viewable in dev.
  // (The owner store_members row is created by a DB trigger.)
  const { data, error } = await admin
    .from('stores')
    .insert({ owner_id: user.id, subdomain, name, status: 'active' })
    .select('id, subdomain, name, status')
    .single()

  if (error) {
    // Map known DB errors to clean messages; never echo raw DB text (info disclosure).
    const code = (error as { code?: string }).code
    if (code === '23505' || error.message?.includes('duplicate key')) {
      throw createError({ statusCode: 409, statusMessage: 'That subdomain is already taken' })
    }
    if (error.message?.toLowerCase().includes('reserved')) {
      throw createError({ statusCode: 422, statusMessage: 'Invalid or reserved subdomain' })
    }
    console.error('[stores.create]', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to create store' })
  }

  return { store: data }
})
