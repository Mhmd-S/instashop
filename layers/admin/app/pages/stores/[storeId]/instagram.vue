<script setup lang="ts">
import { safeReturnPath } from '~~/shared/utils/safeReturn'
import { igErrorMessage } from '~~/shared/onboarding/igErrors'

definePageMeta({ surface: 'admin', layout: 'admin', requiresAuth: true })

const route = useRoute()
const storeId = route.params.storeId as string
// When opened from the onboarding wizard, return there instead of the dashboard.
// safeReturnPath rejects off-origin values (open-redirect) and array/duplicate params.
const ret = computed(() => safeReturnPath(route.query.return))
const backTo = computed(() => ret.value ?? '/dashboard')
const backLabel = computed(() => (ret.value ? 'Back to setup' : 'Dashboard'))
const { data, refresh } = await useFetch(`/api/admin/stores/${storeId}/ig`)
const connected = computed(() => data.value?.connected)
const account = computed(() => data.value?.account)
// A row can exist but be token-less after deauthorize/expiry → needs reconnect.
const needsReconnect = computed(() =>
  !!account.value && ['revoked', 'expired', 'error'].includes(account.value.token_status),
)
const active = computed(() => connected.value && !needsReconnect.value)

// Full-page navigation (the endpoint redirects to instagram.com) — not $fetch.
// Carry the wizard return path so the OAuth callback can land back in the wizard.
const connectUrl = computed(
  () => `/api/ig/connect?storeId=${storeId}` + (ret.value ? `&return=${encodeURIComponent(ret.value)}` : ''),
)

const syncing = ref(false)
const msg = ref<string | null>(null)
const msgIsError = ref(false)

onMounted(() => {
  if (route.query.connected) msg.value = 'Instagram connected.'
  if (route.query.ig_error) {
    msg.value = igErrorMessage(String(route.query.ig_error))
    msgIsError.value = true
  }
})

async function sync() {
  syncing.value = true
  msg.value = null
  msgIsError.value = false
  try {
    const res = await $fetch(`/api/admin/stores/${storeId}/ig/sync`, { method: 'POST' })
    const bits = [`${res.imported} new product${res.imported === 1 ? '' : 's'}`]
    if (res.merged) bits.push(`${res.merged} merged into existing`)
    if (res.branding) bits.push(`${res.branding} branding post${res.branding === 1 ? '' : 's'}`)
    if (res.needsReview) bits.push(`${res.needsReview} to review`)
    msg.value =
      `Imported ${bits.join(', ')} from ${res.total} post(s)` +
      (res.skipped ? `, ${res.skipped} already imported` : '') +
      (res.usedAi ? '.' : ' (no AI key — used simple import).')
    await refresh()
  } catch (e) {
    msg.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Import failed'
    msgIsError.value = true
  } finally {
    syncing.value = false
  }
}

async function disconnect() {
  if (!confirm('Disconnect Instagram? Imported products are kept.')) return
  await $fetch(`/api/admin/stores/${storeId}/ig/disconnect`, { method: 'POST' })
  await refresh()
}
</script>

<template>
  <div>
    <!-- Contextual back-link only when launched from the onboarding wizard; the
         sidebar handles dashboard navigation otherwise. -->
    <UButton
      v-if="ret"
      :to="backTo" variant="link" color="neutral" size="xs"
      icon="i-lucide-arrow-left" :label="backLabel" class="-ml-2 mb-2"
    />

    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-ink">Instagram</h1>
        <p class="mt-1 text-sm text-ink-muted">Import your Instagram posts as products.</p>
      </div>
    </div>

    <UAlert
      v-if="msg" class="mt-6" :color="msgIsError ? 'warning' : 'info'" variant="soft"
      :icon="msgIsError ? 'i-lucide-triangle-alert' : 'i-lucide-info'" :description="msg"
    />

    <UCard v-if="connected && account" class="mt-6">
      <div class="flex items-center gap-3">
        <img v-if="account.profile_picture_url" :src="account.profile_picture_url" class="w-12 h-12 rounded-full border border-default object-cover">
        <UIcon v-else name="i-lucide-instagram" class="size-12 text-ink-subtle" />
        <div>
          <p class="font-medium text-ink">@{{ account.ig_username }}</p>
          <p class="text-sm text-ink-muted">{{ account.account_type }} · {{ account.media_count ?? '—' }} posts</p>
        </div>
        <span
          v-if="active"
          class="ml-auto inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium capitalize text-emerald-700"
        >Connected</span>
        <span
          v-else
          class="ml-auto inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium capitalize text-amber-700"
        >Reconnect needed</span>
      </div>

      <UAlert
        v-if="needsReconnect" class="mt-4" color="warning" variant="subtle"
        icon="i-lucide-triangle-alert"
        title="Instagram access ended"
        description="The connection was revoked or expired. Reconnect to keep importing posts. Existing products are unaffected."
      />

      <p class="text-sm text-ink-muted mt-4">
        Last import: {{ account.last_sync_at ? account.last_sync_at.slice(0, 16).replace('T', ' ') : 'never' }}
      </p>

      <div class="flex flex-wrap items-center gap-3 mt-4">
        <UButton
          v-if="needsReconnect"
          :to="connectUrl" external
          icon="i-lucide-instagram" color="primary" label="Reconnect Instagram"
        />
        <UButton
          v-else
          :loading="syncing" :disabled="syncing"
          icon="i-lucide-upload" color="primary"
          :label="syncing ? 'Importing…' : 'Import posts'"
          @click="sync"
        />
        <UButton
          icon="i-lucide-unplug" color="error" variant="ghost" size="sm"
          label="Disconnect"
          @click="disconnect"
        />
      </div>

      <template #footer>
        <p class="text-xs text-ink-subtle">
          AI groups posts of the same item into one product (with all its photos), suggests categories, and skips
          non-product posts. Everything lands as <strong>draft</strong> under Products — review, set prices, and publish.
        </p>
      </template>
    </UCard>

    <div v-else class="mt-6 rounded-xl border border-default bg-white p-5 sm:p-6">
      <p class="text-ink-muted text-sm">
        Connect your Instagram <strong class="text-ink">Professional</strong> (Business or Creator) account to import your
        posts as products.
      </p>
      <UButton
        :to="connectUrl" external
        class="mt-4 shadow-card" icon="i-lucide-instagram" color="primary"
        label="Connect Instagram"
      />
    </div>

    <IgFixtureLoader :store-id="storeId" class="mt-6" @seeded="refresh" />
  </div>
</template>
