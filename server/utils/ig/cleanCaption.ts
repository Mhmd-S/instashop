// Deterministic Instagram-caption -> clean store-copy sanitizer.
// Pure, dependency-free, never throws. Used in three places:
//   (a) heuristicAnalysis()  — no-Gemini fallback description
//   (b) validateAnalysis()   — always-on safety net over Gemini's own output
//   (c) importer chooseDescription() — last-resort clean of a raw caption
//   ...and for per-image alt text (maxSentences: 1).
// Errs toward removing junk over keeping it.

export interface CleanCaptionOpts {
  maxSentences?: number // trim to first N sentences (default 3)
  maxChars?: number // hard cap after trimming (default 400)
}

// Emoji + pictographs + dingbats + symbols + variation selectors + ZWJ + regional
// flags + PUA (brand glyph fonts). Broad on purpose: store copy contains no emoji.
// Explicit symbol ranges only -> never eats CJK / accented letters / digits.
// Deliberately strips ZWJ / variation-selectors / keycap so emoji sequences vanish fully.
const EMOJI_RE =
  // eslint-disable-next-line no-misleading-character-class
  /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{2190}-\u{21FF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{2122}\u{2139}\u{E000}-\u{F8FF}]/gu

// eslint-disable-next-line no-control-regex -- intentionally strips control characters from captions
const CTRL_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g
const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi
const BARE_DOMAIN_RE = /\b[a-z0-9-]+\.(?:com|net|org|co|io|shop|store|me|ly|link|biz)\b\S*/gi
const EMAIL_RE = /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/gi
const HASHTAG_RE = /(?:^|\s)#[\p{L}\p{N}_]+/gu
const MENTION_RE = /(?:^|\s)@[\w.]+/g
// 7+ digit run possibly broken by spaces/dashes/dots/parens, optional leading + / 00.
const PHONE_RE = /(?:\+|00)?\d[\d\s().-]{6,}\d/g
// Currency/price fragments: "$25", "25 USD", "₦15,000", "Rs. 1200". Bare integers
// without a currency marker are KEPT (e.g. "100% cotton").
const PRICE_RE =
  /(?:[$£€₦₹¥]|rs\.?|aed|sar|usd|eur|gbp|ngn|inr|pkr)\s?\d[\d,.]*|(?<![a-z])\d[\d,.]*\s?(?:usd|eur|gbp|ngn|inr|pkr|aed|sar|dollars?|euros?)\b/gi
// Orphan currency code left behind once its amount is stripped (e.g. "$36 USD" -> " USD").
const CURRENCY_CODE_RE = /\b(?:usd|eur|gbp|ngn|inr|pkr|aed|sar)\b/gi

// Whole lines that are pure CTA / contact noise -> dropped entirely. Deliberately
// conservative (DM/contact/price-label only) so a legit description sentence that
// merely starts with "Available"/"Shop"/"Order" is NOT nuked — those CTA phrasings
// are caught mid-line by CTA_PHRASE_RE instead. English + common Arabic.
// ASCII triggers need a \b; Arabic script has no ASCII word boundary, so those
// alternatives are matched without \b.
const CTA_LINE_RE =
  /^\s*(?:(?:dm|d\.m\.|pm|inbox|message us|whats\s?app|wts|call|tel(?=[\s:.]*\d)|price\s*[:=])\b|سعر|للطلب|للحجز|تواصل|للتواصل|واتساب).*$/i

// CTA phrases appearing mid-sentence -> removed inline.
const CTA_PHRASE_RE =
  /\b(?:dm(?:\s+(?:to|us|me|for))?\b[^.!?\n]*|pm\s+to\s+order|link\s+in\s+bio|swipe\s+up|tap\s+(?:the\s+)?link|click\s+(?:the\s+)?link|shop\s+now|order\s+now|buy\s+now|available\s+now|in\s+stock|out\s+of\s+stock|limited\s+stock|free\s+(?:shipping|delivery)|cash\s+on\s+delivery|\bcod\b|whats\s?app[^.!?\n]*)/gi

function stripPerLine(caption: string): string {
  return caption
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false
      if (/^[@#][\p{L}\p{N}_.\s@#]+$/u.test(l)) return false // wall-of-hashtags / handle line
      return !CTA_LINE_RE.test(l)
    })
    .join('\n')
}

function stripTokens(text: string): string {
  return text
    .replace(CTRL_RE, ' ')
    .replace(URL_RE, ' ') // URLs before bare-domain so https://shop.com/x isn't half-stripped
    .replace(EMAIL_RE, ' ')
    .replace(BARE_DOMAIN_RE, ' ')
    .replace(HASHTAG_RE, ' ')
    .replace(MENTION_RE, ' ')
    .replace(PRICE_RE, ' ') // price before phone (currency-tagged) so phone-regex can't eat it
    .replace(CURRENCY_CODE_RE, ' ') // orphan currency code left after the amount is stripped
    .replace(PHONE_RE, ' ')
    .replace(CTA_PHRASE_RE, ' ')
    .replace(EMOJI_RE, ' ')
}

function firstSentences(text: string, n: number): string {
  const parts = text.match(/[^.!?\n]+[.!?]*/g) ?? [text]
  const picked: string[] = []
  for (const p of parts) {
    const s = p.trim()
    if (s) picked.push(s)
    if (picked.length >= n) break
  }
  let out = picked.join(' ').trim()
  if (out && !/[.!?]$/.test(out)) out += '.'
  return out
}

export function cleanCaption(caption: string | null | undefined, opts: CleanCaptionOpts = {}): string {
  const maxSentences = opts.maxSentences ?? 3
  const maxChars = opts.maxChars ?? 400
  if (!caption) return ''

  let t = caption.normalize('NFC')
  t = stripPerLine(t)
  t = stripTokens(t)

  // Collapse all whitespace -> single spaces.
  t = t.replace(/\s+/g, ' ').trim()

  // Tidy punctuation left behind by removals.
  t = t
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/([,;:])\1+/g, '$1')
    .replace(/[.!?]{2,}/g, (m) => m[0]!)
    .replace(/[•·▪►★☆➡➜»«|/\\]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,.;:–—-]+/, '')
    .trim()

  if (!t) return ''

  t = firstSentences(t, maxSentences)

  // Hard char cap on a word boundary (no mid-word truncation, no ellipsis).
  if (t.length > maxChars) {
    t = t.slice(0, maxChars)
    const lastSpace = t.lastIndexOf(' ')
    if (lastSpace > maxChars * 0.6) t = t.slice(0, lastSpace)
    t = t.replace(/[\s,.;:–—-]+$/, '').trim()
  }
  return t
}
