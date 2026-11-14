// Map import helpers for build scripts: SVG path data to polygons, and polygon geometry.
export type Point = [number, number]

/** The subpaths of a path, in document units. Curves are flattened into short straight lines. */
export function parsePath(d: string): Point[][] {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? []
  const paths: Point[][] = []
  let current: Point[] = []
  let x = 0, y = 0, command = ""
  // The last control point, reflected by the smooth curve commands.
  let control: Point | undefined
  let i = 0
  const num = () => Number(tokens[i++])
  const point = (relative: boolean): Point => {
    const nx = num(), ny = num()
    return relative ? [x + nx, y + ny] : [nx, ny]
  }
  /** Flattens a cubic Bézier from the current point. */
  function cubic(c1: Point, c2: Point, end: Point) {
    const start: Point = [x, y]
    for (let k = 1; k <= 8; k++) {
      const t = k / 8, u = 1 - t
      current.push([
        u * u * u * start[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * end[0],
        u * u * u * start[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * end[1],
      ])
    }
    ;[x, y] = end
    control = c2
  }
  while (i < tokens.length) {
    if (/^[a-zA-Z]$/.test(tokens[i])) command = tokens[i++]
    const relative = command === command.toLowerCase()
    const lower = command.toLowerCase()
    if (lower !== "c" && lower !== "s" && lower !== "q" && lower !== "t") control = undefined
    switch (lower) {
      case "c": {
        const c1 = point(relative), c2 = point(relative), end = point(relative)
        cubic(c1, c2, end)
        break
      }
      case "s": {
        const c1: Point = control ? [2 * x - control[0], 2 * y - control[1]] : [x, y]
        const c2 = point(relative), end = point(relative)
        cubic(c1, c2, end)
        break
      }
      case "q": {
        const c = point(relative), end = point(relative)
        cubic([x + 2 / 3 * (c[0] - x), y + 2 / 3 * (c[1] - y)], [end[0] + 2 / 3 * (c[0] - end[0]), end[1] + 2 / 3 * (c[1] - end[1])], end)
        break
      }
      case "m": {
        const nx = num(), ny = num()
        x = relative ? x + nx : nx
        y = relative ? y + ny : ny
        if (current.length) paths.push(current)
        current = [[x, y]]
        // Further pairs are line-tos.
        command = relative ? "l" : "L"
        break
      }
      case "l": {
        const nx = num(), ny = num()
        x = relative ? x + nx : nx
        y = relative ? y + ny : ny
        current.push([x, y])
        break
      }
      case "h": {
        const n = num()
        x = relative ? x + n : n
        current.push([x, y])
        break
      }
      case "v": {
        const n = num()
        y = relative ? y + n : n
        current.push([x, y])
        break
      }
      case "z":
        if (current.length) {
          paths.push(current)
          ;[x, y] = current[0]
        }
        current = []
        break
      default:
        throw new Error(`Unsupported path command ${command}`)
    }
  }
  if (current.length) paths.push(current)
  return paths.map(path => {
    // An explicit return to the start is the same as closing.
    const [first, last] = [path[0], path[path.length - 1]]
    return Math.hypot(first[0] - last[0], first[1] - last[1]) < 1e-6 ? path.slice(0, -1) : path
  })
}
