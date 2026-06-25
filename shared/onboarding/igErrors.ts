// Human-readable copy for the ig_error codes the Instagram OAuth callback
// (server/api/ig/callback.get.ts) can redirect back with. Shared by the onboarding
// wizard and the standalone IG settings page so the two never drift.
export const IG_ERROR_MESSAGES: Record<string, string> = {
  account_in_use:
    'That Instagram account is already connected to another store. Disconnect it there first, then connect it here.',
  token_exchange: 'Instagram sign-in didn’t complete. Please try connecting again.',
  save_failed: 'We couldn’t save the connection — please try connecting again.',
}

export function igErrorMessage(code: string): string {
  return IG_ERROR_MESSAGES[code] ?? `Connect failed: ${code}`
}
