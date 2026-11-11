import {afterEach, expect, it, vi} from "vitest"
import {stubFramework} from "../testing/index.ts"

declare function set_add(set: unknown[], item: unknown): void
declare function goto(name: string): void
declare function random(range: number): number

afterEach(() => {
  vi.unstubAllGlobals()
})

it("uses the framework's real, sorted sets", () => {
  stubFramework()
  const set = [1, 3]
  set_add(set, 2)
  expect(set).toEqual([1, 2, 3])
})

it("spies on control flow and honours overrides", () => {
  const myGoto = vi.fn()
  stubFramework({goto: myGoto, random: () => 4})
  goto("next")
  expect(myGoto).toHaveBeenCalledWith("next")
  expect(random(6)).toBe(4)
})

it("refuses to roll dice unless told what they say", () => {
  stubFramework()
  expect(() => random(6)).toThrow(/random/)
})

it("clears the undo stack before rolling a die", async () => {
  const {rollDie} = await import("../rules/index.ts")
  const clear = vi.fn()
  stubFramework({clear_undo: clear, random: (n: number) => n - 1})
  expect(rollDie()).toBe(6)
  expect(rollDie(10)).toBe(10)
  expect(clear).toHaveBeenCalledTimes(2)
})
