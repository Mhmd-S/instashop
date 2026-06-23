// Returns the tenant resolved for the current Host (surface + store + hostInfo).
// Storefront/admin clients can call this; it never exposes secrets.
export default defineEventHandler((event) => {
  return {
    surface: event.context.surface ?? 'marketing',
    store: event.context.store ?? null,
    hostInfo: event.context.hostInfo ?? null,
  }
})
