import type { H3Event } from 'h3'
import { supabaseAdmin } from '../supabaseAdmin'

// Store an IG token in Vault, returning the secret UUID kept in ig_accounts.
export async function storeIgToken(event: H3Event, token: string, name: string): Promise<string | null> {
  const admin = supabaseAdmin(event)
  const { data, error } = await admin.rpc('ig_store_token', { p_secret: token, p_name: name })
  if (error) {
    console.error('[ig] store token failed', error)
    return null
  }
  return data as unknown as string
}

export async function readIgToken(event: H3Event, secretId: string): Promise<string | null> {
  const admin = supabaseAdmin(event)
  const { data, error } = await admin.rpc('ig_read_token', { p_secret_id: secretId })
  if (error) {
    console.error('[ig] read token failed', error)
    return null
  }
  return (data as unknown as string) ?? null
}

// Hard-delete a token from Vault (disconnect / deauthorize / data-deletion).
export async function deleteIgToken(event: H3Event, secretId: string): Promise<void> {
  const admin = supabaseAdmin(event)
  const { error } = await admin.rpc('ig_delete_token', { p_secret_id: secretId })
  if (error) console.error('[ig] delete token failed', error)
}
