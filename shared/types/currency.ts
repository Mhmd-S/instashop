// Currencies a store can price in. Restricted to TWO-DECIMAL (minor-unit = /100)
// currencies, because the whole system stores prices as integer `price_minor`
// cents and divides by 100 everywhere. Zero-decimal currencies (JPY, KRW…) would
// break that math, so they're intentionally excluded.
export interface CurrencyOption {
  code: string
  label: string
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'GBP', label: 'GBP — British Pound' },
  { code: 'CAD', label: 'CAD — Canadian Dollar' },
  { code: 'AUD', label: 'AUD — Australian Dollar' },
  { code: 'NZD', label: 'NZD — New Zealand Dollar' },
  { code: 'CHF', label: 'CHF — Swiss Franc' },
  { code: 'SEK', label: 'SEK — Swedish Krona' },
  { code: 'NOK', label: 'NOK — Norwegian Krone' },
  { code: 'DKK', label: 'DKK — Danish Krone' },
  { code: 'PLN', label: 'PLN — Polish Zloty' },
  { code: 'AED', label: 'AED — UAE Dirham' },
  { code: 'SAR', label: 'SAR — Saudi Riyal' },
  { code: 'QAR', label: 'QAR — Qatari Riyal' },
  { code: 'EGP', label: 'EGP — Egyptian Pound' },
  { code: 'INR', label: 'INR — Indian Rupee' },
  { code: 'ZAR', label: 'ZAR — South African Rand' },
  { code: 'SGD', label: 'SGD — Singapore Dollar' },
  { code: 'HKD', label: 'HKD — Hong Kong Dollar' },
  { code: 'MXN', label: 'MXN — Mexican Peso' },
  { code: 'BRL', label: 'BRL — Brazilian Real' },
  { code: 'TRY', label: 'TRY — Turkish Lira' },
]

const CODES = new Set(SUPPORTED_CURRENCIES.map((c) => c.code))

export function isSupportedCurrency(code: string): boolean {
  return CODES.has(code)
}
