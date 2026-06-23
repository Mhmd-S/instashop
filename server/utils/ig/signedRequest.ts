import { createHmac, timingSafeEqual } from 'node:crypto'

// Meta signs the deauthorize + data-deletion callbacks as `signed_request`:
//   <base64url(HMAC-SHA256(payload, app_secret))>.<base64url(JSON payload)>
// (https://developers.facebook.com/docs/facebook-login/data-deletion-request)
export interface SignedRequest {
  user_id?: string
  algorithm?: string
  issued_at?: number
  [k: string]: unknown
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4))
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64')
}

// Verify + decode. Returns null on any tampering / bad signature.
export function parseSignedRequest(signed: string, appSecret: string): SignedRequest | null {
  if (!signed || !appSecret) return null
  const dot = signed.indexOf('.')
  if (dot < 1) return null
  const sigPart = signed.slice(0, dot)
  const payloadPart = signed.slice(dot + 1)

  let sig: Buffer
  try {
    sig = b64urlDecode(sigPart)
  } catch {
    return null
  }
  const expected = createHmac('sha256', appSecret).update(payloadPart).digest()
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null

  try {
    const json = JSON.parse(b64urlDecode(payloadPart).toString('utf8')) as SignedRequest
    if (json.algorithm && String(json.algorithm).toUpperCase().replace('-', '') !== 'HMACSHA256') return null
    return json
  } catch {
    return null
  }
}

// Verify the X-Hub-Signature-256 header on webhook POST bodies.
export function verifyXHubSignature(rawBody: string, header: string | undefined, appSecret: string): boolean {
  if (!header || !appSecret) return false
  const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')
  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

// Short, URL-safe confirmation code for data-deletion tracking.
export function deletionCode(igUserId: string, issuedAt: number, appSecret: string): string {
  return createHmac('sha256', appSecret).update(`${igUserId}:${issuedAt}`).digest('hex').slice(0, 24)
}
