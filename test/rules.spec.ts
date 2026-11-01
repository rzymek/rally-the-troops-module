import {describe, expect, it} from "vitest"
import {hexDistance, hexesAround, hexId, hexStep, isEdgeHex, nextActiveRole, parseHex} from "../rules/index.ts"

const onSmallBoard = (a: number, b: number) => a >= 0 && a <= 2 && b >= 0 && b <= 2

describe("hex", () => {
  it("round-trips ids", () => {
    expect(parseHex(hexId(3, 12))).toEqual([3, 12])
    expect(hexId(3, 12)).toBe("A03.B12")
    expect(parseHex("nope")).toEqual([null, null])
  })
  it("measures distance along the hex axes", () => {
    expect(hexDistance("A05.B05", "A05.B05")).toBe(0)
    expect(hexDistance("A05.B05", "A06.B06")).toBe(1)
    expect(hexDistance("A05.B05", "A06.B04")).toBe(2)
  })
  it("steps in a direction, refusing negative coordinates", () => {
    expect(hexStep("A05.B05", 0)).toBe("A05.B06")
    expect(hexStep("A05.B05", 4)).toBe("A04.B04")
    expect(hexStep("A00.B00", 3)).toBeNull()
  })
  it("finds hexes on the board only, nearest first", () => {
    const hexes = hexesAround("A00.B00", 1, onSmallBoard)
    expect(hexes[0]).toBe("A00.B00")
    expect([...hexes].sort()).toEqual(["A00.B00", "A00.B01", "A01.B00", "A01.B01"])
  })
  it("tells edge hexes", () => {
    expect(isEdgeHex("A00.B00", onSmallBoard)).toBe(true)
    expect(isEdgeHex("A01.B01", onSmallBoard)).toBe(false)
  })
})

describe("nextActiveRole", () => {
  it("goes round the table", () => {
    expect(nextActiveRole(0, 2)).toBe(1)
    expect(nextActiveRole(1, 2)).toBe(0)
    expect(nextActiveRole(2, 3)).toBe(0)
  })
})
