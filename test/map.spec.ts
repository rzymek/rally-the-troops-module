import {describe, expect, it} from "vitest"
import {anchorOf, contains, parsePath, polygonDistance} from "../map/index.ts"

describe("map helpers", () => {
  it("parses relative and absolute path data, exponents included, into closed polygons", () => {
    expect(parsePath("m 0,0 10,0 0,10 -1e1,0 z")).toEqual([[[0, 0], [10, 0], [10, 10], [0, 10]]])
    expect(parsePath("M 0 0 H 4 V 4 L 0 4 Z")).toEqual([[[0, 0], [4, 0], [4, 4], [0, 4]]])
  })

  it("measures polygons: inside, distance between outlines, deepest point", () => {
    const square = parsePath("M 0 0 H 10 V 10 H 0 Z")[0]
    const other = parsePath("M 13 0 H 20 V 10 H 13 Z")[0]
    expect(contains(square, [5, 5])).toBe(true)
    expect(contains(square, [15, 5])).toBe(false)
    expect(polygonDistance(square, other)).toBe(3)
    expect(polygonDistance(square, square)).toBe(0)
    expect(anchorOf(square)).toEqual([6, 6])
  })
})
