<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { isClaimableSubdomain } from '~~/shared/tenancy/reserved'
import { ONBOARDING_STEPS, TRACKED_STEPS, stepDone, onboardingStepUrl } from '~~/shared/onboarding/steps'
import type { OnboardingStepKey, SetupStatus } from '~~/shared/onboarding/steps'

definePageMeta({ surface: 'admin', layout: 'admin', requiresAuth: true })

const route = useRoute()
const { storeUrl } = useSurfaceUrls()

// The wizard is driven entirely by the URL (?store, ?step) so it survives the
// round-trips out to the per-feature pages and the browser back button.
const storeId = computed(() => (route.query.store as string) || null)

const { data: statusData, refresh: refreshStatus } = await useFetch<SetupStatus>(
  () => `/api/admin/stores/${storeId.value}/setup-status`,
  // Always hit the network on (re)mount: when the seller returns from editing
  // theme/products/branding, the step's "done" state must reflect their changes,
  // not a cached snapshot.
  { immediate: !!storeId.value, watch: false, getCachedData: () => undefined },
)
watch(storeId, (v) => {
  if (v) refreshStatus()
})
const status = computed(() => statusData.value ?? null)
const store = computed(() => status.value?.store ?? null)

// --- step model (once the store exists); ONBOARDING_STEPS is the shared spine ---
const KEYS = ONBOARDING_STEPS.map((s) => s.key)

const currentKey = computed<OnboardingStepKey>(() => {
  const q = route.query.step as string
  return (KEYS as string[]).includes(q) ? (q as OnboardingStepKey) : 'instagram'
})
const currentIndex = computed(() => KEYS.indexOf(currentKey.value))

const doneOf = (key: OnboardingStepKey) => stepDone(status.value, key)
const completedCount = computed(() => TRACKED_STEPS.filter(doneOf).length)

function goStep(key: OnboardingStepKey) {
  return navigateTo({ path: '/onboarding', query: { store: storeId.value, step: key } })
}
function next() {
  if (currentIndex.value < KEYS.length - 1) goStep(KEYS[currentIndex.value + 1]!)
}
function back() {
  if (currentIndex.value > 0) goStep(KEYS[currentIndex.value - 1]!)
}

// Deep-link out to an existing page, passing a return URL so its back button can
// bring the seller straight back to this step.
const returnParam = computed(() => encodeURIComponent(onboardingStepUrl(storeId.value ?? '', currentKey.value)))
function deep(path: string) {
  return `/stores/${storeId.value}/${path}?return=${returnParam.value}`
}

const isDev = import.meta.dev

// The Instagram step kicks off OAuth straight from the wizard — no intermediate
// settings page to click through a second time. The callback returns here (it
// merges in connected=1), so this step then shows the "connected" state.
const igConnectUrl = computed(
  () =>
    `/api/ig/connect?storeId=${storeId.value}` +
    `&return=${encodeURIComponent(onboardingStepUrl(storeId.value ?? '', 'instagram'))}`,
)

// Posts import automatically once Instagram is connected — no button needed.
const productCount = computed(() => status.value?.steps.products.count ?? 0)
const importing = ref(false)
const igMsg = ref<string | null>(null)
const igError = ref(false)
async function importPosts() {
  importing.value = true
  igMsg.value = null
  igError.value = false
  try {
    const res = await $fetch(`/api/admin/stores/${storeId.value}/ig/sync`, { method: 'POST' })
    const bits = [`${res.imported} new product${res.imported === 1 ? '' : 's'}`]
    if (res.merged) bits.push(`${res.merged} merged`)
    if (res.branding) bits.push(`${res.branding} branding post${res.branding === 1 ? '' : 's'}`)
    if (res.needsReview) bits.push(`${res.needsReview} to review`)
    igMsg.value =
      `Imported ${bits.join(', ')} from ${res.total} post${res.total === 1 ? '' : 's'}` +
      (res.skipped ? `, ${res.skipped} already imported` : '') +
      (res.usedAi ? '.' : ' (no AI key — used a simple import).')
    await refreshStatus()
  } catch (e) {
    igError.value = true
    igMsg.value =
      ((e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Import failed') +
      ' — refresh the page to try again.'
  } finally {
    importing.value = false
  }
}

// Fire the import the moment the wizard shows a connected Instagram step — client
// only (never during SSR), exactly once per visit.
const igConnected = computed(() => !!status.value?.steps.instagram.connected)
let autoImportTried = false
if (import.meta.client) {
  watchEffect(() => {
    if (currentKey.value === 'instagram' && igConnected.value && !autoImportTried) {
      autoImportTried = true
      importPosts()
    }
  })
}

// Per-step review acknowledgements for the auto-filled steps. Each must be
// explicitly marked reviewed before it counts as done (setup-status gates on this),
// then we advance to the next step.
const reviewing = ref<string | null>(null)
const reviewError = ref<string | null>(null)
async function markReviewed(step: 'theme' | 'products' | 'branding') {
  reviewing.value = step
  reviewError.value = null
  try {
    await $fetch(`/api/admin/stores/${storeId.value}/onboarding/review`, { method: 'POST', body: { step } })
    await refreshStatus()
    next()
  } catch (e) {
    reviewError.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Could not save — please try again.'
  } finally {
    reviewing.value = null
  }
}
// A stale error from one step shouldn't linger when the seller moves to another.
watch(currentKey, () => { reviewError.value = null })

// The inline editors have no Save button of their own — the wizard owns the save.
// We hold refs to the ones that need persisting and call their exposed save()
// before advancing.
const themeEditor = ref<{ save: () => Promise<boolean> } | null>(null)
const productsReview = ref<{ save: () => Promise<boolean> } | null>(null)
const savingStep = ref(false)

// "Next" is the single forward control: it first persists the open inline editor
// (theme/products), then on an auto-filled step records the review (which also
// advances); everywhere else it just advances. A failed save is surfaced inline by
// the editor, so we stop short of advancing.
async function advance() {
  const key = currentKey.value
  const editor = key === 'theme' ? themeEditor.value : key === 'products' ? productsReview.value : null
  if (editor) {
    savingStep.value = true
    let ok = false
    try {
      ok = await editor.save()
    } finally {
      savingStep.value = false
    }
    if (!ok) return
  }
  if ((key === 'theme' || key === 'products' || key === 'branding') && !doneOf(key)) {
    markReviewed(key)
  } else {
    next()
  }
}

const previewUrl = computed(() => (store.value ? storeUrl(store.value.subdomain) : '#'))

// --- create-store step (no store yet) ---
const name = ref('')
const subdomain = ref('')
const availability = ref<{ available: boolean; reason: string } | null>(null)
const createError = ref<string | null>(null)
const creating = ref(false)

const checkAvail = useDebounceFn(async () => {
  const v = subdomain.value.toLowerCase().trim()
  if (!v) {
    availability.value = null
    return
  }
  availability.value = await $fetch('/api/admin/stores/check-subdomain', { query: { subdomain: v } })
}, 400)
watch(subdomain, () => {
  availability.value = null
  checkAvail()
})

const canCreate = computed(
  () => name.value.trim().length >= 2 && isClaimableSubdomain(subdomain.value.toLowerCase().trim()),
)

async function createStore() {
  creating.value = true
  createError.value = null
  try {
    const res = await $fetch<{ store: { id: string } }>('/api/admin/stores', {
      method: 'POST',
      body: { name: name.value, subdomain: subdomain.value },
    })
    await navigateTo({ path: '/onboarding', query: { store: res.store.id, step: 'instagram' } })
  } catch (e) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string }
    createError.value = err.data?.statusMessage || err.statusMessage || 'Could not create store'
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-3xl">
    <!-- ============ Step 0: create the store ============ -->
    <template v-if="!storeId">
      <div class="mb-6">
        <UButton to="/dashboard" icon="i-lucide-arrow-left" label="Back to dashboard" variant="link" color="neutral" size="sm" class="-ml-2.5" />
        <h1 class="text-2xl font-bold text-highlighted mt-1">Create your store</h1>
        <p class="text-muted text-sm mt-1">First, the basics — then we'll guide you through each step below.</p>
      </div>

      <!-- Same stepper as the rest of the wizard, in a pre-store preview state. -->
      <div class="mb-8">
        <OnboardingStepper :store-id="''" :status="null" />
      </div>

      <UCard>
        <div class="flex items-start gap-3 mb-5">
          <div class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><UIcon name="i-lucide-store" class="size-5" /></div>
          <div>
            <h2 class="font-semibold text-highlighted">Store details</h2>
            <p class="text-sm text-muted mt-0.5">Your subdomain is your public storefront URL — you can rename the store anytime.</p>
          </div>
        </div>
        <form class="space-y-5" @submit.prevent="createStore">
          <UFormField label="Store name" name="name">
            <UInput v-model="name" type="text" required placeholder="Acme Goods" class="w-full" />
          </UFormField>
          <UFormField label="Subdomain" name="subdomain">
            <UInput v-model="subdomain" type="text" required placeholder="acme" class="w-full" :ui="{ base: 'lowercase' }">
              <template #trailing><span class="text-sm text-muted">.insteshop.app</span></template>
            </UInput>
            <template v-if="availability" #help>
              <span v-if="availability.available" class="text-success inline-flex items-center gap-1">
                <UIcon name="i-lucide-check" class="size-4" /> available — {{ storeUrl(subdomain.toLowerCase().trim()) }}
              </span>
              <span v-else-if="availability.reason === 'taken'" class="text-error">Already taken</span>
              <span v-else class="text-error">Invalid or reserved</span>
            </template>
          </UFormField>
          <UAlert v-if="createError" color="error" variant="soft" :title="createError" icon="i-lucide-circle-alert" />
          <UButton
            type="submit" color="primary" size="lg" block
            :loading="creating" :disabled="creating || !canCreate"
            :label="creating ? 'Creating…' : 'Create store & continue'"
            trailing-icon="i-lucide-arrow-right"
          />
        </form>
      </UCard>
    </template>

    <!-- ============ Steps 1..5: guided setup ============ -->
    <template v-else>
      <div class="mb-6">
        <UButton to="/dashboard" icon="i-lucide-arrow-left" label="Exit setup" variant="link" color="neutral" size="sm" class="-ml-2.5" />
        <h1 class="text-2xl font-bold text-highlighted mt-1">
          Set up <span class="text-primary">{{ store?.name ?? 'your store' }}</span>
        </h1>
        <p class="text-muted text-sm mt-1">{{ completedCount }} of {{ TRACKED_STEPS.length }} essentials done — you can finish anytime.</p>
      </div>

      <!-- stepper (shared with the deep-linked pages via SetupFlowBar) -->
      <div class="mb-8">
        <OnboardingStepper :current="currentKey" :store-id="storeId ?? ''" :status="status" />
      </div>

      <!-- Instagram -->
      <UCard v-if="currentKey === 'instagram'">
        <div class="space-y-4">
          <div class="flex items-start gap-3">
            <div class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><UIcon name="i-lucide-instagram" class="size-5" /></div>
            <div>
              <h2 class="font-semibold text-highlighted">Connect Instagram</h2>
              <p class="text-sm text-muted mt-0.5">
                Import your posts as draft products automatically — the fastest way to fill your store. You can also add products by hand.
              </p>
              <p v-if="!status?.steps.instagram.connected" class="text-xs text-dimmed mt-1.5">
                Requires an Instagram <span class="text-muted">Professional</span> (Business or Creator) account.
              </p>
            </div>
          </div>
          <!-- Not connected → start OAuth directly (one click, no second screen). -->
          <template v-if="!status?.steps.instagram.connected">
            <div class="flex flex-wrap gap-3">
              <UButton :to="igConnectUrl" external color="primary" icon="i-lucide-instagram" label="Connect Instagram" />
              <UButton variant="ghost" color="neutral" label="Skip — I'll add products manually" @click="next" />
            </div>
            <!-- Dev only: the fixture loader lives on the settings page. -->
            <UButton
              v-if="isDev"
              :to="deep('instagram')" variant="link" color="neutral" size="xs"
              icon="i-lucide-flask-conical" label="Dev: load test data instead" class="px-0"
            />
          </template>

          <!-- Connected → posts import automatically; just continue with “Next”. -->
          <template v-else>
            <UAlert
              color="success" variant="soft" icon="i-lucide-circle-check"
              title="Instagram connected"
              :description="`${productCount} product${productCount === 1 ? '' : 's'} in your store so far.`"
            />
            <div v-if="importing" class="flex items-center gap-2 text-sm text-muted">
              <UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
              Importing your posts…
            </div>
            <UAlert
              v-else-if="igMsg"
              :color="igError ? 'warning' : 'info'" variant="soft"
              :icon="igError ? 'i-lucide-triangle-alert' : 'i-lucide-info'"
              :description="igMsg"
            />
            <p class="text-xs text-dimmed">
              Imported items land as drafts under Products — set prices and publish there. Hit “Next” to keep going.
            </p>
          </template>
        </div>
      </UCard>

      <!-- Theme — review/edit inline -->
      <div v-else-if="currentKey === 'theme'" class="space-y-4">
        <div class="flex items-start gap-3">
          <div class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><UIcon name="i-lucide-palette" class="size-5" /></div>
          <div>
            <h2 class="font-semibold text-highlighted">Make it yours</h2>
            <p class="text-sm text-muted mt-0.5">
              We generated a palette, fonts and mood from your logo — review and tweak anything below.
            </p>
          </div>
        </div>
        <ThemeEditor ref="themeEditor" :store-id="storeId ?? ''" embedded />
      </div>

      <!-- Products — review imported items inline -->
      <div v-else-if="currentKey === 'products'" class="space-y-4">
        <div class="flex items-start gap-3">
          <div class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><UIcon name="i-lucide-package" class="size-5" /></div>
          <div>
            <h2 class="font-semibold text-highlighted">Review your products</h2>
            <p class="text-sm text-muted mt-0.5">Set prices, edit details and add photos — expand any to edit. Hitting <span class="font-medium text-highlighted">Next</span> publishes everything you've priced; unpriced items stay as drafts you can publish later.</p>
          </div>
        </div>
        <ProductsReview ref="productsReview" :store-id="storeId ?? ''" />
      </div>

      <!-- Branding — review/pick hero inline -->
      <div v-else-if="currentKey === 'branding'" class="space-y-4">
        <div class="flex items-start gap-3">
          <div class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><UIcon name="i-lucide-images" class="size-5" /></div>
          <div>
            <h2 class="font-semibold text-highlighted">Branding &amp; hero</h2>
            <p class="text-sm text-muted mt-0.5">
              Pick a lifestyle post as your storefront hero banner. These were captured during import.
            </p>
          </div>
        </div>
        <BrandingReview :store-id="storeId ?? ''" />
      </div>

      <!-- Payments — connect/manage Stripe inline -->
      <div v-else-if="currentKey === 'payments'" class="space-y-4">
        <div class="flex items-start gap-3">
          <div class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><UIcon name="i-lucide-credit-card" class="size-5" /></div>
          <div>
            <h2 class="font-semibold text-highlighted">Accept payments</h2>
            <p class="text-sm text-muted mt-0.5">
              Connect Stripe to take card payments — money lands in your own Stripe account. Orders still work with cash on delivery without this.
            </p>
          </div>
        </div>
        <PaymentsSetup
          :store-id="storeId ?? ''"
          :return-path="onboardingStepUrl(storeId ?? '', 'payments')"
          @changed="refreshStatus"
        />
      </div>

      <!-- Preview -->
      <UCard v-else>
        <div class="space-y-5">
          <div class="text-center">
            <div class="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-primary/10 text-primary"><UIcon name="i-lucide-rocket" class="size-6" /></div>
            <h2 class="text-xl font-bold text-highlighted">Your store is live 🎉</h2>
            <p class="text-sm text-muted mt-1">Here's the storefront you built — share the link or keep refining.</p>
          </div>

          <div class="rounded-xl border border-default overflow-hidden">
            <div class="flex items-center gap-1.5 px-3 py-2 border-b border-default bg-elevated">
              <span class="size-2.5 rounded-full bg-error/50" />
              <span class="size-2.5 rounded-full bg-warning/50" />
              <span class="size-2.5 rounded-full bg-success/50" />
              <span class="ml-2 truncate text-xs text-muted">{{ previewUrl }}</span>
            </div>
            <iframe :src="previewUrl" class="w-full h-[460px] bg-white" title="Storefront preview" loading="lazy" />
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div v-for="s in ONBOARDING_STEPS.slice(0, 5)" :key="s.key" class="flex items-center gap-2 rounded-lg border border-default px-3 py-2 text-sm">
              <UIcon :name="doneOf(s.key) ? 'i-lucide-circle-check' : 'i-lucide-circle-dashed'" :class="doneOf(s.key) ? 'text-success' : 'text-dimmed'" class="size-4 shrink-0" />
              <span :class="doneOf(s.key) ? 'text-highlighted' : 'text-muted'">{{ s.label }}</span>
            </div>
          </div>

          <div class="flex justify-center">
            <UButton :to="previewUrl" target="_blank" external color="primary" trailing-icon="i-lucide-external-link" label="Open live site" />
          </div>
        </div>
      </UCard>

      <!-- nav -->
      <UAlert v-if="reviewError" color="error" variant="soft" :title="reviewError" icon="i-lucide-circle-alert" class="mt-6" />
      <div class="mt-6 flex items-center justify-between">
        <UButton :disabled="currentIndex === 0 || reviewing !== null || savingStep" variant="ghost" color="neutral" icon="i-lucide-arrow-left" label="Back" @click="back" />
        <UButton
          v-if="currentKey !== 'preview'"
          color="primary" trailing-icon="i-lucide-arrow-right" label="Next"
          :loading="reviewing !== null || savingStep" :disabled="reviewing !== null || savingStep" @click="advance"
        />
        <UButton v-else to="/dashboard" color="primary" trailing-icon="i-lucide-check" label="Finish" />
      </div>
    </template>
  </div>
</template>
