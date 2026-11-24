import {describe, expect, it} from "vitest"
import {afterEachAction, createOffsetHexGrid, HEX_FORMATS, normalizeOptions, pathTo, plainText, reachable, ref, REF_PATTERN} from "../rules/index.ts"
import type {StateDefinition} from "../rules/index.ts"

describe("normalizeOptions", () => {
  it("turns true and \"true\" on, anything else off", () => {
    expect(normalizeOptions({a: true, b: "true", c: false, d: "false", e: 1, f: undefined})).toEqual({a: true, b: true, c: false, d: false, e: false, f: false})
    expect(normalizeOptions(undefined)).toEqual({})
  })
})

describe("afterEachAction", () => {
  it("runs the hook after each action handler, not after the prompt or the state hooks", () => {
    const calls: string[] = []
    const state = afterEachAction({
      prompt() { calls.push("prompt") },
      _begin() { calls.push("begin") },
      move(to: unknown) { calls.push(`move ${to}`) },
      done() { calls.push("done") },
    } satisfies StateDefinition, () => calls.push("hook"))
    state.prompt()
    state._begin()
    state.move("0101")
    state.done()
    expect(calls).toEqual(["prompt", "begin", "move 0101", "hook", "done", "hook"])
  })
})

describe("log references", () => {
  it("writes {kind:id:name}, which plainText turns back into the name", () => {
    const text = `${ref("p", 3, "1st {Guards}")} attacks ${ref("s", "0412", "Hill 12")} *hard*`
    expect(text).toBe("{p:3:1st Guards} attacks {s:0412:Hill 12} *hard*")
    expect([...text.matchAll(REF_PATTERN)].map(m => [m[1], m[2], m[3]])).toEqual([["p", "3", "1st Guards"], ["s", "0412", "Hill 12"]])
    expect(plainText(text)).toBe("1st Guards attacks Hill 12 hard")
  })
})

describe("createOffsetHexGrid", () => {
  const grid = createOffsetHexGrid({columns: [1, 4], rows: [1, 3], shifted: "even"})

  it("lists the hexes, by column then row", () => {
    expect(grid.hexes.slice(0, 4)).toEqual(["0101", "0102", "0103", "0201"])
    expect(grid.hexes).toHaveLength(12)
  })

  it("finds the neighbours of shifted and other columns", () => {
    // Even columns sit half a hex towards the higher rows: 0201 touches 0101 and 0102.
    expect([...grid.neighbors("0201")].sort()).toEqual(["0101", "0102", "0202", "0301", "0302"])
    expect([...grid.neighbors("0302")].sort()).toEqual(["0201", "0202", "0301", "0303", "0401", "0402"])
  })

  it("measures distances consistently with neighbours, and steps around", () => {
    for (const a of grid.hexes) for (const b of grid.neighbors(a)) expect(grid.distance(a, b)).toBe(1)
    expect(grid.distance("0101", "0403")).toBe(4)
    for (let direction = 0; direction < 6; direction++) {
      const next = grid.step("0302", direction)
      expect(grid.neighbors("0302")).toContain(next)
      expect(grid.step(next, (direction + 3) % 6)).toBe("0302")
    }
  })

  it("supports the dotted format, odd shifts and holes", () => {
    const tcs = createOffsetHexGrid({columns: [1, 3], rows: [1, 2], shifted: "odd", format: HEX_FORMATS.dotted, isOnMap: (c, r) => !(c === 3 && r === 2)})
    expect(tcs.hexes).toEqual(["1.01", "1.02", "2.01", "2.02", "3.01"])
    expect([...tcs.neighbors("1.01")].sort()).toEqual(["1.02", "2.01", "2.02"])
    expect(tcs.isOnMap("3.02")).toBe(false)
    expect(tcs.sideKey("2.01", "1.02")).toBe("1.02|2.01")
  })
})

describe("reachable", () => {
  it("finds the cheapest way round, with the path to each space", () => {
    const grid = createOffsetHexGrid({columns: [1, 3], rows: [1, 3], shifted: "even"})
    const cost = (_from: string, to: string) => to === "0202" ? Infinity : 1
    // 0201 and 0203 are two hexes apart, but the way through 0202 is closed: round by column 1 is 3 hexes.
    expect(reachable(grid, {"0201": 0}, 2, {cost}).cost["0203"]).toBeUndefined()
    const reach = reachable(grid, {"0201": 0}, 3, {cost})
    expect(reach.cost["0203"]).toBe(3)
    expect(reach.cost["0202"]).toBeUndefined()
    expect(pathTo(reach, "0203")).toEqual(["0102", "0103", "0203"])
  })
})
