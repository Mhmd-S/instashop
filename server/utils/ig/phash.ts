import sharp from 'sharp'

// Cheap 64-bit average hash (aHash) for near-duplicate image detection. Sellers
// frequently repost the identical hero shot across posts; when those posts merge
// into one product we don't want four copies of the same photo in the gallery.
// Deterministic, no network. The hash is a 16-char hex string (stored on
// product_images.phash) — no BigInt, so it's safe under the es2019 build target.

const POPCOUNT4 = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4] // bits set in 0..15

// 8x8 greyscale average hash -> 16 hex chars. Returns null if the image can't decode.
export async function aHash(buf: Buffer): Promise<string | null> {
  try {
    const { data, info } = await sharp(buf, { failOn: 'none' })
      .greyscale()
      .resize(8, 8, { fit: 'fill', kernel: 'cubic' })
      .raw()
      .toBuffer({ resolveWithObject: true })
    const ch = info.channels // expect 1 after greyscale; index defensively anyway
    const px: number[] = []
    for (let i = 0; i < 64; i++) {
      const v = data[i * ch]
      if (v === undefined) return null
      px.push(v)
    }
    const avg = px.reduce((s, v) => s + v, 0) / 64
    let hex = ''
    for (let nib = 0; nib < 16; nib++) {
      let v = 0
      for (let b = 0; b < 4; b++) v = (v << 1) | (px[nib * 4 + b]! >= avg ? 1 : 0)
      hex += v.toString(16)
    }
    return hex
  } catch {
    return null
  }
}

// Hamming distance between two 16-char hex hashes (0..64). Mismatched lengths → 64.
export function hamming(a: string, b: string): number {
  if (a.length !== b.length) return 64
  let d = 0
  for (let i = 0; i < a.length; i++) {
    const x = (parseInt(a[i]!, 16) ^ parseInt(b[i]!, 16)) & 0xf
    d += POPCOUNT4[x]!
  }
  return d
}

// 0 = identical; <=5 catches re-compressions/recrops of the same shot without
// merging genuinely different product angles.
export const PHASH_DUP_THRESHOLD = 5

export function isNearDup(a: string | null, b: string | null, t = PHASH_DUP_THRESHOLD): boolean {
  return a != null && b != null && hamming(a, b) <= t
}
