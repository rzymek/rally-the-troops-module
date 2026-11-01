// Hex maths for maps with hexes named `A<nn>.B<nn>`, on axes 60 degrees apart.

export type IsOnBoard = (a: number, b: number) => boolean

// Clockwise from North: N, NE, SE, S, SW, NW
export const DIR_OFFSETS: [number, number][] = [
  [0, +1], [+1, +1], [+1, 0],
  [0, -1], [-1, -1], [-1, 0],
]

export function parseHex(id: string): [number, number] | [null, null] {
  const m = id && id.match(/^A(\d+)\.B(\d+)$/)
  return m ? [parseInt(m[1]), parseInt(m[2])] : [null, null]
}

export function hexId(a: number, b: number): string {
  return `A${String(a).padStart(2, '0')}.B${String(b).padStart(2, '0')}`
}

export function hexDistance(from: string, to: string): number {
  const [a1, b1] = parseHex(from) as [number, number]
  const [a2, b2] = parseHex(to) as [number, number]
  const da = a2 - a1, db = b2 - b1
  return Math.max(Math.abs(da), Math.abs(db), Math.abs(da - db))
}

export function hexStep(id: string, dir: number): string | null {
  const [a, b] = parseHex(id)
  if (a === null) return null
  const [da, db] = DIR_OFFSETS[dir]
  const na = a + da, nb = b + db
  if (na < 0 || nb < 0) return null
  return hexId(na, nb)
}

export function isOffBoardStep(hex: string, direction: number, isOnBoard: IsOnBoard): boolean {
  const [a, b] = parseHex(hex) as [number, number]
  const [da, db] = DIR_OFFSETS[direction]
  return !isOnBoard(a + da, b + db)
}

export function isEdgeHex(hex: string, isOnBoard: IsOnBoard): boolean {
  return DIR_OFFSETS.some((_, direction) => isOffBoardStep(hex, direction, isOnBoard))
}

/** Hexes on the board within the radius, nearest to the center first. */
export function hexesAround(center: string, radius: number, isOnBoard: IsOnBoard): string[] {
  const [a, b] = parseHex(center) as [number, number]
  const hexes: { hex: string, distance: number }[] = []
  for (let da = -radius; da <= radius; da++) {
    for (let db = -radius; db <= radius; db++) {
      const distance = Math.max(Math.abs(da), Math.abs(db), Math.abs(da - db))
      if (distance <= radius && isOnBoard(a + da, b + db))
        hexes.push({hex: hexId(a + da, b + db), distance})
    }
  }
  return hexes.sort((x, y) => x.distance - y.distance).map(it => it.hex)
}
