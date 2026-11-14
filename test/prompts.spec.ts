import {describe, expect, it} from "vitest"
import {gotoRecorder, offered, stubFramework} from "../testing/index.ts"

declare function prompt(text: string): void
declare function action(verb: string, argument: unknown): void
declare function button(name: string, enabled?: boolean): void
declare function goto(name: string, env?: object): void

describe("prompt helpers", () => {
  it("collects what a prompt offers, and records states like the framework's goto", () => {
    const local: Record<string, unknown> = {old: 1}
    const begun: string[] = []
    const recorder = gotoRecorder(local, {next: {_begin: () => begun.push("next")}})
    stubFramework({goto: recorder.goto})
    const state = {
      prompt() {
        prompt("Pick one.")
        action("card", "A1")
        action("card", 2)
        button("done", false)
        goto("next", {n: 1})
      },
    }
    const result = offered(state)
    expect(result).toEqual({actions: {card: ["A1", "2"]}, buttons: {done: false}, text: "Pick one."})
    expect(recorder.state).toBe("next")
    expect(local).toEqual({n: 1})
    expect(begun).toEqual(["next"])
  })
})
