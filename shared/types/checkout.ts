// Configurable checkout questions (migration 0015).
//
// A store's checkout form = the always-required email, plus four built-in fields
// the owner can show / require / reorder, plus any number of custom questions.
// The config is stored as jsonb on `stores.checkout_config` and hydrated to the
// storefront via the tenant cache; buyer answers to custom questions are snapshot
// onto `orders.custom_fields` as [{ key, label, type, value }] so historical orders
// render correctly even after the owner later edits the config.
//
// `mergeCheckoutConfig` is the single normalizer shared by the storefront renderer,
// the server-side validator, and the admin editor so their notions of "what is
// enabled / required / in what order" can never drift.

export type BuiltinFieldKey = 'name' | 'phone' | 'address' | 'note'
export type CustomQuestionType = 'short_text' | 'long_text' | 'single_select' | 'yes_no'

export interface BuiltinField {
  key: BuiltinFieldKey
  enabled: boolean
  required: boolean
  position: number
}

export interface CustomQuestion {
  key: string // stable id, generated server-side on create
  label: string
  type: CustomQuestionType
  required: boolean
  position: number
  options?: string[] // single_select only
}

export interface CheckoutConfig {
  fields: BuiltinField[]
  questions: CustomQuestion[]
}

// Stamped onto the order at checkout time (self-describing; survives config edits).
export interface CheckoutAnswer {
  key: string
  label: string
  type: CustomQuestionType
  value: string | boolean
}

// Submitted by the storefront before the server stamps label/type from config.
export interface CheckoutAnswerInput {
  key: string
  value: string | boolean
}

export const BUILTIN_FIELD_KEYS: BuiltinFieldKey[] = ['name', 'phone', 'address', 'note']

export const BUILTIN_FIELD_LABELS: Record<BuiltinFieldKey, string> = {
  name: 'Name',
  phone: 'Phone',
  address: 'Shipping address',
  note: 'Order note',
}

export const CUSTOM_QUESTION_TYPES: CustomQuestionType[] = ['short_text', 'long_text', 'single_select', 'yes_no']

export const CUSTOM_QUESTION_TYPE_LABELS: Record<CustomQuestionType, string> = {
  short_text: 'Short text',
  long_text: 'Long text',
  single_select: 'Dropdown',
  yes_no: 'Yes / No checkbox',
}

export const MAX_CHECKOUT_QUESTIONS = 30
export const MAX_OPTIONS = 50
export const MAX_LABEL_LEN = 200
export const MAX_OPTION_LEN = 200
export const MAX_ANSWER_LEN = 2000

// Empty/never-configured stores render exactly today's form.
export const DEFAULT_CHECKOUT_CONFIG: CheckoutConfig = {
  fields: [
    { key: 'name', enabled: true, required: false, position: 0 },
    { key: 'phone', enabled: true, required: false, position: 1 },
    { key: 'address', enabled: true, required: false, position: 2 },
    { key: 'note', enabled: true, required: false, position: 3 },
  ],
  questions: [],
}

function isCustomQuestionType(t: unknown): t is CustomQuestionType {
  return typeof t === 'string' && (CUSTOM_QUESTION_TYPES as string[]).includes(t)
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

// Normalize an untrusted/partial config (from the DB or a client) into a complete,
// well-ordered CheckoutConfig. Deterministic rules:
//  - fields: always exactly the four built-ins, in DEFAULT order, taking stored
//    enabled/required/position when valid; sorted by position then renumbered 0..n.
//  - questions: drop entries without a string key, a non-empty label, or a known
//    type; dedupe by key (first wins); coerce required; clamp label/options length;
//    strip options for non-single_select; sort by position then renumber 0..n.
export function mergeCheckoutConfig(raw: unknown): CheckoutConfig {
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {}

  const storedFields = Array.isArray(obj.fields) ? (obj.fields as unknown[]) : []
  const byKey = new Map<BuiltinFieldKey, Record<string, unknown>>()
  for (const f of storedFields) {
    if (f && typeof f === 'object') {
      const k = (f as Record<string, unknown>).key
      if (typeof k === 'string' && (BUILTIN_FIELD_KEYS as string[]).includes(k) && !byKey.has(k as BuiltinFieldKey)) {
        byKey.set(k as BuiltinFieldKey, f as Record<string, unknown>)
      }
    }
  }
  const fields: BuiltinField[] = BUILTIN_FIELD_KEYS.map((key, i) => {
    const s = byKey.get(key)
    return {
      key,
      enabled: typeof s?.enabled === 'boolean' ? (s.enabled as boolean) : true,
      required: typeof s?.required === 'boolean' ? (s.required as boolean) : false,
      position: isFiniteNumber(s?.position) ? (s!.position as number) : i,
    }
  })
    .sort((a, b) => a.position - b.position)
    .map((f, i) => ({ ...f, position: i }))

  const storedQuestions = Array.isArray(obj.questions) ? (obj.questions as unknown[]) : []
  const seen = new Set<string>()
  const questions: CustomQuestion[] = []
  for (const q of storedQuestions) {
    if (!q || typeof q !== 'object') continue
    const r = q as Record<string, unknown>
    const key = typeof r.key === 'string' ? r.key.trim() : ''
    const label = typeof r.label === 'string' ? r.label.trim() : ''
    if (!key || !label || !isCustomQuestionType(r.type) || seen.has(key)) continue
    seen.add(key)
    const out: CustomQuestion = {
      key,
      label: label.slice(0, MAX_LABEL_LEN),
      type: r.type,
      required: r.required === true,
      position: isFiniteNumber(r.position) ? r.position : questions.length,
    }
    if (r.type === 'single_select') {
      const opts = Array.isArray(r.options) ? (r.options as unknown[]) : []
      out.options = opts
        .filter((o): o is string => typeof o === 'string' && o.trim().length > 0)
        .map((o) => o.trim().slice(0, MAX_OPTION_LEN))
        .slice(0, MAX_OPTIONS)
    }
    questions.push(out)
  }
  questions.sort((a, b) => a.position - b.position)
  questions.forEach((q, i) => {
    q.position = i
  })

  return { fields, questions }
}

// The "address" built-in maps to six physical columns. Both the storefront and the
// server treat it as satisfied when line1 and city are present — keep these in sync.
export function isAddressSatisfied(ship: { line1?: string | null; city?: string | null } | null | undefined): boolean {
  return !!(ship && (ship.line1 ?? '').trim() && (ship.city ?? '').trim())
}

// Render a stored answer for human display (admin order view, confirmation, email).
export function formatCheckoutAnswer(a: CheckoutAnswer): string {
  if (a.type === 'yes_no') return a.value ? 'Yes' : 'No'
  return typeof a.value === 'string' ? a.value : String(a.value)
}
