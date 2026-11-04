// Colour maths in the OKLab colour space, ported from the RTT server's tools/oklab.js.
// Copyright 2021, 2025 Tor Andersson. ISC License, see LICENSE.

interface Rgb {r: number, g: number, b: number}

interface Oklab {l: number, a: number, b: number}

function parseHex(hex: string): Rgb {
  const x = parseInt(hex.substring(1), 16)
  return {r: ((x >> 16) & 255) / 255, g: ((x >> 8) & 255) / 255, b: (x & 255) / 255}
}

function formatHex({r, g, b}: Rgb): string {
  const byte = (c: number) => Math.round(Math.max(0, Math.min(1, c)) * 255)
  return "#" + ((byte(r) << 16) | (byte(g) << 8) | byte(b)).toString(16).padStart(6, "0")
}

function toLinear(c: number) {
  const ac = Math.abs(c)
  if (ac < 0.04045) return c / 12.92
  return (Math.sign(c) || 1) * Math.pow((ac + 0.055) / 1.055, 2.4)
}

function fromLinear(c: number) {
  const ac = Math.abs(c)
  if (ac > 0.0031308) return (Math.sign(c) || 1) * (1.055 * Math.pow(ac, 1 / 2.4) - 0.055)
  return c * 12.92
}

function oklabFromRgb(rgb: Rgb): Oklab {
  const r = toLinear(rgb.r), g = toLinear(rgb.g), b = toLinear(rgb.b)
  const L = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const M = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const S = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return {
    l: 0.2104542553 * L + 0.793617785 * M - 0.0040720468 * S,
    a: 1.9779984951 * L - 2.428592205 * M + 0.4505937099 * S,
    b: 0.0259040371 * L + 0.7827717662 * M - 0.808675766 * S,
  }
}

function rgbFromOklab({l, a, b}: Oklab): Rgb {
  const L = Math.pow(l + 0.3963377774 * a + 0.2158037573 * b, 3)
  const M = Math.pow(l - 0.1055613458 * a - 0.0638541728 * b, 3)
  const S = Math.pow(l - 0.0894841775 * a - 1.291485548 * b, 3)
  return {
    r: fromLinear(+4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S),
    g: fromLinear(-1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S),
    b: fromLinear(-0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S),
  }
}

/** Scales the perceptual lightness of a `#rrggbb` colour by `m`: 0.8 is 20% darker. */
export function brightness(hex: string, m: number): string {
  const c = oklabFromRgb(parseHex(hex))
  c.l = Math.max(0, Math.min(1, c.l * m))
  return formatHex(rgbFromOklab(c))
}

/** Mixes two `#rrggbb` colours: `t` = 0 gives `x`, 1 gives `y`. */
export function blend(x: string, y: string, t: number): string {
  const a = oklabFromRgb(parseHex(x))
  const b = oklabFromRgb(parseHex(y))
  const lerp = (p: number, q: number) => p + (q - p) * t
  return formatHex(rgbFromOklab({l: lerp(a.l, b.l), a: lerp(a.a, b.a), b: lerp(a.b, b.b)}))
}
