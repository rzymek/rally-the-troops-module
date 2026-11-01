export function parseSVGTransform(str: string | null): DOMMatrix {
  const m = str && str.match(/matrix\((.*?)\)/)
  if (m) return new DOMMatrix(m[1].trim().split(/[\s,]+/).map(Number))
  const t = str && str.match(/translate\((.*?)\)/)
  if (t) {
    const [x, y = 0] = t[1].trim().split(/[\s,]+/).map(Number)
    return new DOMMatrix().translate(x, y)
  }
  return new DOMMatrix()
}