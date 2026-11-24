import {afterEach, expect, it, vi} from "vitest"
import {actionFor, escapeHtml, parseLogLine, plainText} from "../client/index.ts"

afterEach(() => vi.unstubAllGlobals())

it("parses log lines: classes, bold and references", () => {
  expect(parseLogLine(".h1 .turn Turn {s:0101:Ford} *by {p:2:Lancers}*")).toEqual({
    classes: ["h1", "turn"],
    parts: [
      {text: "Turn "},
      {kind: "s", id: "0101", name: "Ford"},
      {text: " "},
      {text: "by ", bold: true},
      {kind: "p", id: "2", name: "Lancers", bold: true},
    ],
  })
  expect(parseLogLine("plain")).toEqual({classes: [], parts: [{text: "plain"}]})
  expect(plainText("{p:2:Lancers} *win*")).toBe("Lancers win")
})

it("finds the verb offering an argument", () => {
  vi.stubGlobal("view", {actions: {select_piece: [1, 2], move_space: ["0101"], done: 1}})
  expect(actionFor(["move_space", "select_piece"], 2)).toBe("select_piece")
  expect(actionFor(["move_space", "select_piece"], "0101")).toBe("move_space")
  expect(actionFor(["move_space", "done"], "x")).toBeUndefined()
})

it("escapes HTML", () => {
  expect(escapeHtml(`<b a="1">&'`)).toBe("&#60;b a=&#34;1&#34;&#62;&#38;&#39;")
})
