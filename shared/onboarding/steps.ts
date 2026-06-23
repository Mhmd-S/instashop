// Single source of truth for the onboarding flow's steps, shared by the wizard
// (/onboarding) and the SetupFlowBar shown on each deep-linked setup page, so the
// two can never drift. `preview` is the final celebratory step; the first five are
// the trackable "essentials".
export type OnboardingStepKey = 'instagram' | 'theme' | 'products' | 'branding' | 'payments' | 'preview'

export interface OnboardingStep {
  key: OnboardingStepKey
  label: string
  icon: string
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  { key: 'instagram', label: 'Instagram', icon: 'i-lucide-instagram' },
  { key: 'theme', label: 'Theme', icon: 'i-lucide-palette' },
  { key: 'products', label: 'Products', icon: 'i-lucide-package' },
  { key: 'branding', label: 'Branding', icon: 'i-lucide-images' },
  { key: 'payments', label: 'Payments', icon: 'i-lucide-credit-card' },
  { key: 'preview', label: 'Preview', icon: 'i-lucide-rocket' },
]

// The five steps with a completion signal (everything except the final preview).
export const TRACKED_STEPS: OnboardingStepKey[] = ['instagram', 'theme', 'products', 'branding', 'payments']

// Shape returned by GET /api/admin/stores/:id/setup-status.
export interface SetupStatus {
  store: { id: string; name: string; subdomain: string; status: string }
  steps: {
    instagram: { done: boolean; connected: boolean }
    theme: { done: boolean }
    products: { done: boolean; count: number }
    categories: { count: number }
    branding: { done: boolean; count: number; heroSet: boolean }
    payments: { done: boolean; connected: boolean; chargesEnabled: boolean; enabled: boolean }
  }
}

// Whether a step's completion signal is satisfied. `preview` has none.
export function stepDone(status: SetupStatus | null, key: OnboardingStepKey): boolean {
  const st = status?.steps
  if (!st) return false
  if (key === 'instagram') return st.instagram.done
  if (key === 'theme') return st.theme.done
  if (key === 'products') return st.products.done
  if (key === 'branding') return st.branding.done
  if (key === 'payments') return st.payments.done
  return false
}

// Build the wizard URL for a given step.
export function onboardingStepUrl(storeId: string, key: OnboardingStepKey): string {
  return `/onboarding?store=${storeId}&step=${key}`
}
