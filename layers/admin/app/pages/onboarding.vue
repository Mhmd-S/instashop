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

// Import runs inline in the wizard, so connect → import → Next all happen here
// instead of bouncing out to the standalone Instagram settings page.
const productCount = computed(() => status.value?.steps.products.count ?? 0)
const importing = ref(false)
const igMsg = ref<string | null>(null)
async function importPosts() {
  importing.value = true
  igMsg.value = null
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
    igMsg.value = (e as { data?: { statusMessage?: string } }).data?.statusMessage || 'Import failed'
  } finally {
    importing.value = false
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
        <p class="text-muted text-sm mt-1">Pick a name and your storefront address to get started.</p>
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

      <!-- Preview the flow ahead, so step 0 reads as part of the same journey. -->
      <div class="mt-6">
        <p class="text-[11px] font-medium uppercase tracking-wide text-dimmed mb-2">Up next</p>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div
            v-for="s in ONBOARDING_STEPS.slice(0, 5)" :key="s.key"
            class="flex items-center gap-2 rounded-lg border border-default px-3 py-2 text-sm"
          >
            <UIcon :name="s.icon" class="size-4 shrink-0 text-dimmed" />
            <span class="text-muted">{{ s.label }}</span>
          </div>
        </div>
      </div>
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

      <UCard>
        <!-- Instagram -->
        <div v-if="currentKey === 'instagram'" class="space-y-4">
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

          <!-- Connected → import right here, then continue with “Next”. -->
          <template v-else>
            <UAlert
              color="success" variant="soft" icon="i-lucide-circle-check"
              title="Instagram connected"
              :description="`${productCount} product${productCount === 1 ? '' : 's'} in your store so far.`"
            />
            <UAlert v-if="igMsg" color="info" variant="soft" icon="i-lucide-info" :description="igMsg" />
            <div class="flex flex-wrap items-center gap-3">
              <UButton
                :loading="importing" :disabled="importing"
                color="primary" icon="i-lucide-upload"
                :label="importing ? 'Importing…' : (productCount > 0 ? 'Import new posts' : 'Import posts')"
                @click="importPosts"
              />
              <UButton :to="deep('instagram')" variant="soft" color="neutral" icon="i-lucide-settings-2" label="Manage" />
            </div>
            <p class="text-xs text-dimmed">
              Imported items land as drafts under Products — set prices and publish there. Hit “Next” to keep going.
            </p>
          </template>
        </div>

        <!-- Theme -->
        <div v-else-if="currentKey === 'theme'" class="space-y-4">
          <div class="flex items-start gap-3">
            <div class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><UIcon name="i-lucide-palette" class="size-5" /></div>
            <div>
              <h2 class="font-semibold text-highlighted">Make it yours</h2>
              <p class="text-sm text-muted mt-0.5">
                We auto-generate a palette, fonts and mood from your logo or Instagram profile — then you can tweak anything.
              </p>
            </div>
          </div>
          <UAlert v-if="doneOf('theme')" color="success" variant="soft" icon="i-lucide-circle-check" title="Theme configured" description="Your storefront has a custom theme." />
          <UButton :to="deep('theme')" color="primary" icon="i-lucide-palette" :label="doneOf('theme') ? 'Edit theme' : 'Customize theme'" />
        </div>

        <!-- Products & categories -->
        <div v-else-if="currentKey === 'products'" class="space-y-4">
          <div class="flex items-start gap-3">
            <div class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><UIcon name="i-lucide-package" class="size-5" /></div>
            <div>
              <h2 class="font-semibold text-highlighted">Products &amp; categories</h2>
              <p class="text-sm text-muted mt-0.5">Review imported items, set prices, add your own, and organize them with categories.</p>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-lg border border-default p-3">
              <p class="text-2xl font-bold text-highlighted">{{ status?.steps.products.count ?? 0 }}</p>
              <p class="text-xs text-muted">product{{ (status?.steps.products.count ?? 0) === 1 ? '' : 's' }}</p>
            </div>
            <div class="rounded-lg border border-default p-3">
              <p class="text-2xl font-bold text-highlighted">{{ status?.steps.categories.count ?? 0 }}</p>
              <p class="text-xs text-muted">categor{{ (status?.steps.categories.count ?? 0) === 1 ? 'y' : 'ies' }}</p>
            </div>
          </div>
          <div class="flex flex-wrap gap-3">
            <UButton :to="deep('products')" color="primary" icon="i-lucide-package" :label="(status?.steps.products.count ?? 0) > 0 ? 'Manage products' : 'Add products'" />
            <UButton :to="deep('categories')" variant="soft" color="neutral" icon="i-lucide-tags" label="Categories" />
          </div>
        </div>

        <!-- Branding -->
        <div v-else-if="currentKey === 'branding'" class="space-y-4">
          <div class="flex items-start gap-3">
            <div class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><UIcon name="i-lucide-images" class="size-5" /></div>
            <div>
              <h2 class="font-semibold text-highlighted">Branding &amp; hero</h2>
              <p class="text-sm text-muted mt-0.5">
                Pick a lifestyle post as your storefront hero banner. Optional, but it makes a great first impression.
              </p>
            </div>
          </div>
          <UAlert v-if="status?.steps.branding.heroSet" color="success" variant="soft" icon="i-lucide-circle-check" title="Hero banner set" />
          <UButton :to="deep('branding')" color="primary" icon="i-lucide-images" label="Choose branding" />
          <p v-if="(status?.steps.branding.count ?? 0) === 0" class="text-xs text-dimmed">
            Branding posts appear here after an Instagram import — connect Instagram to populate this.
          </p>
        </div>

        <!-- Payments -->
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
          <UAlert
            v-if="status?.steps.payments.chargesEnabled"
            color="success" variant="soft" icon="i-lucide-circle-check" title="Stripe ready"
            :description="status.steps.payments.enabled ? 'Card payments are live at checkout.' : 'Stripe can charge — flip on “Accept card payments” to show it at checkout.'"
          />
          <UAlert
            v-else-if="status?.steps.payments.connected"
            color="warning" variant="soft" icon="i-lucide-triangle-alert"
            title="Finish Stripe onboarding" description="Stripe needs a few more details before you can accept cards."
          />
          <div class="flex flex-wrap gap-3">
            <UButton :to="deep('payments')" color="primary" icon="i-lucide-credit-card" :label="status?.steps.payments.connected ? 'Manage payments' : 'Connect Stripe'" />
            <UButton variant="ghost" color="neutral" label="Skip — use cash on delivery" @click="next" />
          </div>
        </div>

        <!-- Preview -->
        <div v-else class="space-y-5">
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
      <div class="mt-6 flex items-center justify-between">
        <UButton :disabled="currentIndex === 0" variant="ghost" color="neutral" icon="i-lucide-arrow-left" label="Back" @click="back" />
        <UButton v-if="currentKey !== 'preview'" color="primary" trailing-icon="i-lucide-arrow-right" label="Next" @click="next" />
        <UButton v-else to="/dashboard" color="primary" trailing-icon="i-lucide-check" label="Finish" />
      </div>
    </template>
  </div>
</template>
