// Polygon helpers for the map tools.
import type {Point} from "./svgPath.ts";

export function contains(points: readonly Point[], [x, y]: Point): boolean {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i], [xj, yj] = points[j]
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function distanceToSegment([px, py]: Point, [ax, ay]: Point, [bx, by]: Point): number {
  const dx = bx - ax, dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(px - ax - t * dx, py - ay - t * dy)
}

/** The shortest distance between the outlines of two polygons (0 when they overlap); a single point works too. */
export function polygonDistance(a: readonly Point[], b: readonly Point[]): number {
  if (a.some(p => contains(b, p)) || b.some(p => contains(a, p))) return 0
  let best = Infinity
  const edges = (poly: readonly Point[]) => poly.length === 1 ? [[poly[0], poly[0]] as [Point, Point]]
    : poly.map((p, i) => [p, poly[(i + 1) % poly.length]] as [Point, Point])
  for (const p of a) for (const [r, s] of edges(b)) best = Math.min(best, distanceToSegment(p, r, s))
  for (const p of b) for (const [r, s] of edges(a)) best = Math.min(best, distanceToSegment(p, r, s))
  return best
}

/** Where pieces go: roughly the point deepest inside the polygon. */
export function anchorOf(points: readonly Point[]): Point {
  const xs = points.map(p => p[0]), ys = points.map(p => p[1])
  let best: Point = points[0], bestDistance = -1
  const step = 6
  for (let x = Math.min(...xs); x <= Math.max(...xs); x += step) {
    for (let y = Math.min(...ys); y <= Math.max(...ys); y += step) {
      if (!contains(points, [x, y])) continue
      let d = Infinity
      for (let i = 0; i < points.length; i++) d = Math.min(d, distanceToSegment([x, y], points[i], points[(i + 1) % points.length]))
      if (d > bestDistance) [best, bestDistance] = [[x, y], d]
    }
  }
  return [Math.round(best[0]), Math.round(best[1])]
}
