import type { SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'store-media'
const PAGE = 100

// Supabase Storage `list` only returns a folder's immediate children, and folders
// come back as entries with a null `id`. Walk the tree to collect every object path
// beneath a prefix.
async function listAllObjects(admin: SupabaseClient, prefix: string): Promise<string[]> {
  const files: string[] = []
  const dirs = [prefix]
  while (dirs.length) {
    const dir = dirs.pop()!
    let offset = 0
    for (;;) {
      const { data, error } = await admin.storage.from(BUCKET).list(dir, { limit: PAGE, offset })
      if (error) throw error
      if (!data || !data.length) break
      for (const entry of data) {
        const path = `${dir}/${entry.name}`
        if (entry.id === null) dirs.push(path) // a sub-folder
        else files.push(path)
      }
      if (data.length < PAGE) break
      offset += PAGE
    }
  }
  return files
}

// Remove every object a store owns from the public store-media bucket. All upload
// paths are namespaced under `${storeId}/` (products, ig, branding, theme), so the
// store's prefix is its whole storage footprint. Best-effort: returns how many were
// removed vs. failed (orphaned public files are a cost/privacy cleanup, not a hard
// failure that should block deleting the store itself).
export async function deleteStoreMedia(
  admin: SupabaseClient,
  storeId: string,
): Promise<{ removed: number; failed: number }> {
  const paths = await listAllObjects(admin, storeId)
  let removed = 0
  let failed = 0
  for (let i = 0; i < paths.length; i += PAGE) {
    const chunk = paths.slice(i, i + PAGE)
    const { error } = await admin.storage.from(BUCKET).remove(chunk)
    if (error) {
      failed += chunk.length
      console.error('[storage] failed to remove store media chunk', error.message)
    } else {
      removed += chunk.length
    }
  }
  return { removed, failed }
}
