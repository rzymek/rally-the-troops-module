// Hex maths for the usual wargame map: columns of hexes with flat tops, each other column offset by half a hex,
// hexes named by their printed column and row (e.g. "0412", "4.12" or "29.15"). Taken from the SCS/TCS modules.
//
// Which columns are offset is given by `shifted`: a shifted column sits half a hex further towards the higher rows
// than its neighbours. So the hexes beside a hex of a shifted column (in the columns left and right of it) have its
// row and the next row; beside a hex of the other columns, its row and the row before. E.g. with rows growing
// downward and `shifted: "even"`, 0201 touches 0101 and 0102, and 0301 and 0302.
// TCS maps, whose rows grow northward with even columns half a hex higher, are `shifted: "even"`.

/** How hex ids are written and read. */
export interface HexFormat {
  id(column: number, row: number): string
  /** [column, row], or NaNs when it is not a hex id of this format. */
  parse(hex: string): [column: number, row: number]
}

const pad2 = (n: number) => String(n).padStart(2, "0")

export const HEX_FORMATS = {
  /** "CCRR", e.g. "0412". */
  fourDigit: {
    id: (column, row) => pad2(column) + pad2(row),
    parse: hex => /^\d{4}$/.test(hex) ? [Number(hex.slice(0, 2)), Number(hex.slice(2))] : [NaN, NaN],
  },
  /** "C.RR", e.g. "4.12" or "29.05". */
  dotted: {
    id: (column, row) => `${column}.${pad2(row)}`,
    parse: hex => /^\d+\.\d+$/.test(hex) ? hex.split(".").map(Number) as [number, number] : [NaN, NaN],
  },
} satisfies Record<string, HexFormat>

export interface OffsetHexGridOptions {
  /** First and last column, inclusive. */
  columns: [first: number, last: number]
  /** First and last row, inclusive. */
  rows: [first: number, last: number]
  /** Which columns are offset (see above). */
  shifted: "odd" | "even"
  /** Whether a hex of the rectangle is on the map, e.g. at least half of it showing. Default: all of them. */
  isOnMap?: (column: number, row: number) => boolean
  /** Default: HEX_FORMATS.fourDigit. */
  format?: HexFormat
}

export interface OffsetHexGrid {
  /** Every hex on the map, by column then row. */
  readonly hexes: readonly string[]
  isOnMap(hex: string): boolean
  id(column: number, row: number): string
  parse(hex: string): [column: number, row: number]
  /** The hexes next to it, on the map. The result is shared: don't change it. */
  neighbors(hex: string): readonly string[]
  /** The number of hexes between two hexes (on the map or not). */
  distance(a: string, b: string): number
  /** The hex `distance` hexes away in a direction, 0 to 5 clockwise, 0 being towards the row before; on the map or not. */
  step(hex: string, direction: number, distance?: number): string
  /** A hexside, as "<hex>|<hex>" with the hexes in the order of columns, then rows. */
  sideKey(a: string, b: string): string
  /** The center of the hex in units of the distance between adjacent centers, x with columns, y with rows. */
  point(hex: string): [x: number, y: number]
}

/** The six directions, clockwise from "row before", as [columns, half rows]. */
const DIRECTIONS: [number, number][] = [[0, -2], [1, -1], [1, 1], [0, 2], [-1, 1], [-1, -1]]

export function createOffsetHexGrid(options: OffsetHexGridOptions): OffsetHexGrid {
  const {columns: [firstColumn, lastColumn], rows: [firstRow, lastRow], shifted, format = HEX_FORMATS.fourDigit} = options
  const inRectangle = (column: number, row: number) =>
    Number.isInteger(column) && Number.isInteger(row) &&
    column >= firstColumn && column <= lastColumn && row >= firstRow && row <= lastRow
  const onMap = (column: number, row: number) => inRectangle(column, row) && (options.isOnMap?.(column, row) ?? true)
  const isShifted = (column: number) => (Math.abs(column) % 2 === 1) === (shifted === "odd")
  /** Rows in halves of a hex: a shifted column sits half a hex further on. */
  const halfRow = (column: number, row: number) => 2 * row + (isShifted(column) ? 1 : 0)
  const fromHalfRow = (column: number, half: number) => (half - (isShifted(column) ? 1 : 0)) / 2

  const hexes: string[] = []
  for (let column = firstColumn; column <= lastColumn; column++)
    for (let row = firstRow; row <= lastRow; row++)
      if (onMap(column, row)) hexes.push(format.id(column, row))

  const neighborsCache = new Map<string, string[]>()
  const compare = (a: string, b: string) => {
    const [ac, ar] = format.parse(a), [bc, br] = format.parse(b)
    return ac - bc || ar - br
  }

  return {
    hexes,
    id: format.id,
    parse: format.parse,
    isOnMap(hex) {
      const [column, row] = format.parse(hex)
      return onMap(column, row)
    },
    neighbors(hex) {
      let result = neighborsCache.get(hex)
      if (!result) {
        const [column, row] = format.parse(hex)
        const side = isShifted(column) ? row + 1 : row - 1
        result = ([[column, row - 1], [column, row + 1], [column - 1, row], [column + 1, row], [column - 1, side], [column + 1, side]] as const)
          .filter(([c, r]) => onMap(c, r))
          .map(([c, r]) => format.id(c, r))
        neighborsCache.set(hex, result)
      }
      return result
    },
    distance(a, b) {
      const [ac, ar] = format.parse(a), [bc, br] = format.parse(b)
      const columns = Math.abs(ac - bc)
      const halfRows = Math.abs(halfRow(ac, ar) - halfRow(bc, br))
      return columns + Math.max(0, (halfRows - columns) / 2)
    },
    step(hex, direction, distance = 1) {
      let [column, row] = format.parse(hex)
      for (let i = 0; i < distance; i++) {
        const [dc, dh] = DIRECTIONS[direction]
        const half = halfRow(column, row) + dh
        column += dc
        row = fromHalfRow(column, half)
      }
      return format.id(column, row)
    },
    sideKey(a, b) {
      return compare(a, b) < 0 ? `${a}|${b}` : `${b}|${a}`
    },
    point(hex) {
      const [column, row] = format.parse(hex)
      return [column * Math.sqrt(3) / 2, halfRow(column, row) / 2]
    },
  }
}

/** Anything with neighbours: a hex grid, or an area map's adjacency. */
export interface Graph {
  neighbors(space: string): readonly string[]
}

export interface PathOptions {
  /** MP to step into a neighbouring space; Infinity when it can't be entered from there. */
  cost: (from: string, to: string) => number
  /** Whether a unit can end its move in the space. Default: everywhere. */
  canStop?: (space: string) => boolean
  /** Whether a unit able to move may always spend its whole allowance to move one space (e.g. TCS 20.0c). */
  oneSpaceRule?: boolean
}

export interface Reach {
  /** The lowest MP cost of each space the unit may end its move in. */
  cost: Record<string, number>
  /** The space each one is entered from, on the cheapest path; "" for entering the map there. */
  from: Record<string, string>
  /** The lowest MP cost of every space reached, also those that can only be passed through. */
  through: Record<string, number>
}

/**
 * The spaces a unit can reach with `mp`, each with its cheapest cost (Dijkstra). Starts from the spaces given at the
 * cost given: the unit's space at 0, or the entry spaces of a reinforcement at their entry cost.
 */
export function reachable(graph: Graph, starts: Record<string, number>, mp: number, {cost, canStop = () => true, oneSpaceRule = false}: PathOptions): Reach {
  const best: Record<string, number> = {}
  const from: Record<string, string> = {}
  const frontier: string[] = []
  for (const [space, initial] of Object.entries(starts)) {
    if (initial > mp && !oneSpaceRule) continue
    best[space] = Math.min(initial, mp)
    if (initial > 0) from[space] = ""
    frontier.push(space)
  }
  while (frontier.length > 0) {
    frontier.sort((a, b) => best[a] - best[b] || (a < b ? -1 : a > b ? 1 : 0))
    const space = frontier.shift()!
    for (const next of graph.neighbors(space)) {
      const step = cost(space, next)
      if (!Number.isFinite(step)) continue
      const total = best[space] + step
      if (total > mp || total >= (best[next] ?? Infinity)) continue
      best[next] = total
      from[next] = space
      frontier.push(next)
    }
  }
  const origins = Object.keys(starts).filter(space => starts[space] === 0)
  if (oneSpaceRule) {
    for (const origin of origins) {
      for (const next of graph.neighbors(origin)) {
        if (best[next] !== undefined || !Number.isFinite(cost(origin, next))) continue
        best[next] = mp
        from[next] = origin
      }
    }
  }
  for (const origin of origins) delete best[origin]
  const through = {...best}
  for (const space of Object.keys(best)) if (!canStop(space)) delete best[space]
  return {cost: best, from, through}
}

/** The spaces from the start's next space to `space`, following reach.from. */
export function pathTo(reach: Reach, space: string): string[] {
  const path: string[] = []
  for (let at: string | undefined = space; at !== undefined && at !== "" && reach.from[at] !== undefined; at = reach.from[at]) path.unshift(at)
  return path
}
