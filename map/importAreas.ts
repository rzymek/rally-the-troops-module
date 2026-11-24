// Area maps drawn by hand in an SVG editor: one closed straight-line path per area, shared borders snapped.
import {anchorOf, distanceToSegment} from "./geometry.ts"
import {parsePath, type Point} from "./svgPath.ts"

/** The little of a DOM element this needs, so any parser does: @xmldom/xmldom in Node, or the browser's. */
export interface XmlElement {
  readonly nodeType: number
  readonly nodeName: string
  readonly textContent: string | null
  readonly childNodes: ArrayLike<XmlElement>
  getAttribute(name: string): string | null
}

/** A DOMParser: @xmldom/xmldom's, or the browser's. */
export interface XmlParser {
  parseFromString(text: string, type: "image/svg+xml"): {documentElement: object | null}
}

export interface Area {
  /** The element's id. */
  id: string
  /** Its inkscape:label, or the text of its <title>, if any. */
  label?: string
  /** The outline, in the SVG's user units (the viewBox), transforms applied. */
  polygon: Point[]
  /** Where pieces go: the point deepest inside. */
  anchor: Point
}

export interface AreaBorder {
  /** The two area ids, sorted. */
  a: string
  b: string
  /** How long the border they share is. */
  length: number
  /** The middle of the longest stretch of it. */
  middle: Point
  /** The stretches of border they share. */
  segments: [Point, Point][]
}

export interface ImportAreasOptions {
  parser: XmlParser
  /** The id or inkscape:label of the layer (a <g>) holding the areas. Default: "areas". */
  layer?: string
  /** How long a shared border must be for two areas to be adjacent, so that touching at a corner doesn't count. Default: 8. */
  minBorder?: number
  /** How far apart two lines may be and still be one border. Default: 2. */
  tolerance?: number
}

type Matrix = [a: number, b: number, c: number, d: number, e: number, f: number]
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]

const multiply = ([a1, b1, c1, d1, e1, f1]: Matrix, [a2, b2, c2, d2, e2, f2]: Matrix): Matrix =>
  [a1 * a2 + c1 * b2, b1 * a2 + d1 * b2, a1 * c2 + c1 * d2, b1 * c2 + d1 * d2, a1 * e2 + c1 * f2 + e1, b1 * e2 + d1 * f2 + f1]

/** The SVG transform attribute as a matrix: matrix, translate, scale and rotate. */
export function parseTransform(transform: string | null): Matrix {
  let result = IDENTITY
  for (const [, name, args] of (transform ?? "").matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const n = args.split(/[\s,]+/).filter(Boolean).map(Number)
    let m: Matrix
    if (name === "matrix") m = n as Matrix
    else if (name === "translate") m = [1, 0, 0, 1, n[0], n[1] ?? 0]
    else if (name === "scale") m = [n[0], 0, 0, n[1] ?? n[0], 0, 0]
    else if (name === "rotate") {
      const r = n[0] * Math.PI / 180, cos = Math.cos(r), sin = Math.sin(r)
      const [cx = 0, cy = 0] = n.slice(1)
      m = multiply(multiply([1, 0, 0, 1, cx, cy], [cos, sin, -sin, cos, 0, 0]), [1, 0, 0, 1, -cx, -cy])
    } else throw new Error(`transform ${name} is not supported`)
    result = multiply(result, m)
  }
  return result
}

const apply = ([a, b, c, d, e, f]: Matrix, [x, y]: Point): Point => [a * x + c * y + e, b * x + d * y + f]

const elements = (el: XmlElement) => Array.from(el.childNodes).filter(it => it.nodeType === 1)
const tag = (el: XmlElement) => el.nodeName.replace(/^svg:/, "")
const labelOf = (el: XmlElement) =>
  el.getAttribute("inkscape:label") ?? elements(el).find(it => tag(it) === "title")?.textContent?.trim() ?? undefined

/** The outline of a path, polygon or rect, in its own coordinates. */
function outline(el: XmlElement): Point[] | undefined {
  const attr = (name: string) => Number(el.getAttribute(name) ?? 0)
  switch (tag(el)) {
    case "path": {
      const subpaths = parsePath(el.getAttribute("d") ?? "")
      if (subpaths.length !== 1) throw new Error(`area ${el.getAttribute("id")}: one closed path expected, got ${subpaths.length} subpaths`)
      return subpaths[0]
    }
    case "polygon": {
      const n = (el.getAttribute("points") ?? "").split(/[\s,]+/).filter(Boolean).map(Number)
      return n.flatMap((_, i) => i % 2 === 0 ? [[n[i], n[i + 1]] as Point] : [])
    }
    case "rect": {
      const x = attr("x"), y = attr("y"), w = attr("width"), h = attr("height")
      return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]
    }
  }
  return undefined
}

/** The stretches of border two polygons share. */
export function sharedBorder(a: readonly Point[], b: readonly Point[], tolerance = 2): {length: number, middle: Point, segments: [Point, Point][]} {
  const segments: [Point, Point][] = []
  let length = 0, longest = 0
  let middle: Point = [0, 0]
  for (let i = 0; i < a.length; i++) {
    const p = a[i], q = a[(i + 1) % a.length]
    const len = Math.hypot(q[0] - p[0], q[1] - p[1])
    if (len === 0) continue
    const ux = (q[0] - p[0]) / len, uy = (q[1] - p[1]) / len
    for (let j = 0; j < b.length; j++) {
      const r = b[j], s = b[(j + 1) % b.length]
      if (distanceToSegment(r, p, q) > tolerance && distanceToSegment(s, p, q) > tolerance
        && distanceToSegment(p, r, s) > tolerance && distanceToSegment(q, r, s) > tolerance) continue
      // Both ends of the other edge on this edge's line.
      const off = (pt: Point) => Math.abs((pt[0] - p[0]) * uy - (pt[1] - p[1]) * ux)
      if (off(r) > tolerance || off(s) > tolerance) continue
      const tr = (r[0] - p[0]) * ux + (r[1] - p[1]) * uy
      const ts = (s[0] - p[0]) * ux + (s[1] - p[1]) * uy
      const from = Math.max(0, Math.min(tr, ts)), to = Math.min(len, Math.max(tr, ts))
      if (to <= from) continue
      length += to - from
      const at = (t: number): Point => [Math.round(p[0] + ux * t), Math.round(p[1] + uy * t)]
      segments.push([at(from), at(to)])
      if (to - from > longest) {
        longest = to - from
        middle = at((from + to) / 2)
      }
    }
  }
  return {length, middle, segments}
}

/**
 * The areas of a hand-drawn map: every path, polygon or rect in the layer (nested groups included), with their
 * anchors, and the borders between those that share at least `minBorder` of it. Throws on duplicate ids.
 *
 *   const {areas, borders} = importAreas(readFileSync("resources/map-areas.svg", "utf8"), {parser: new DOMParser()})
 */
export function importAreas(svgText: string, {parser, layer = "areas", minBorder = 8, tolerance = 2}: ImportAreasOptions): {areas: Area[], borders: AreaBorder[]} {
  const root = parser.parseFromString(svgText, "image/svg+xml").documentElement as XmlElement | null
  if (!root) throw new Error("not an SVG")
  const areas: Area[] = []
  let found = false
  function walk(el: XmlElement, matrix: Matrix, inLayer: boolean) {
    const here = multiply(matrix, parseTransform(el.getAttribute("transform")))
    const isLayer = tag(el) === "g" && (el.getAttribute("id") === layer || el.getAttribute("inkscape:label") === layer)
    found ||= isLayer
    if (inLayer || isLayer) {
      const points = outline(el)
      if (points && inLayer) {
        const id = el.getAttribute("id")
        if (!id) throw new Error(`an area in layer ${layer} has no id`)
        const polygon = points.map(p => apply(here, p))
        const label = labelOf(el)
        areas.push(label ? {id, label, polygon, anchor: anchorOf(polygon)} : {id, polygon, anchor: anchorOf(polygon)})
      }
    }
    for (const child of elements(el)) if (tag(child) !== "defs") walk(child, here, inLayer || isLayer)
  }
  walk(root, IDENTITY, false)
  if (!found) throw new Error(`no layer "${layer}" in the SVG`)
  const ids = new Set<string>()
  for (const {id} of areas) {
    if (ids.has(id)) throw new Error(`duplicate area id ${id}`)
    ids.add(id)
  }
  const borders: AreaBorder[] = []
  for (let i = 0; i < areas.length; i++) {
    for (let j = i + 1; j < areas.length; j++) {
      const border = sharedBorder(areas[i].polygon, areas[j].polygon, tolerance)
      if (border.length < minBorder) continue
      const [a, b] = [areas[i].id, areas[j].id].sort()
      borders.push({a, b, ...border})
    }
  }
  return {areas, borders}
}
