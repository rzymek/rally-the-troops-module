import {existsSync, mkdtempSync, readFileSync, rmSync} from "node:fs"
import {tmpdir} from "node:os"
import {join} from "node:path"
import {afterAll, beforeAll, expect, it} from "vitest"
import {build} from "vite"
import * as rules from "../rules/index.ts"
import {defineRttModule} from "../vite.ts"

// framework.js is appended after bundling and links to the game by name,
// so neither the bundler nor tsc can see these go wrong.

const root = new URL("./fixture", import.meta.url).pathname
let outDir: string
let rulesJs: string

beforeAll(async () => {
  outDir = mkdtempSync(join(tmpdir(), "rtt-module-"))
  const cwd = process.cwd()
  process.chdir(root)
  try {
    const config = defineRttModule({name: "fixture"})
    await build({...config, build: {...config.build, outDir}, root, configFile: false, logLevel: "silent"})
  } finally {
    process.chdir(cwd)
  }
  rulesJs = readFileSync(join(outDir, "rules.js"), "utf-8")
})

afterAll(() => rmSync(outDir, {recursive: true, force: true}))

function loadRules() {
  const exports: any = {}
  new Function("exports", "module", rulesJs)(exports, {exports})
  return exports
}

it.each(["G", "V", "P", "ROLES", "on_setup", "on_view"])("keeps %s at the top level of rules.js", name => {
  expect(rulesJs).toMatch(new RegExp(`^(var|let|const|function) ([^=(]*, *)?${name}\\b`, "m"))
})

it("links the game and the framework into a playable rules.js", () => {
  const {roles, setup, view, action} = loadRules()
  expect(roles).toEqual(["White", "Black"])
  const state = setup(1, "Standard", {})
  expect(state.active).toBe("White")
  expect(view(state, "White").prompt).toBe("Move 1")
  expect(action(state, "White", "next").active).toBe("Black")
})

it("keeps rules.js self-contained", () => {
  expect(rulesJs).not.toMatch(/\brequire\(/)
})

it("exports no rules helper named like a framework function", () => {
  const framework = readFileSync(new URL("../plugins/framework.js", import.meta.url), "utf-8")
  const taken = [...framework.matchAll(/^function (\w+)/gm)].map(m => m[1])
  expect(Object.keys(rules).filter(name => taken.includes(name))).toEqual([])
})

it("flattens the pages and leaves no empty chunks or references to them", () => {
  expect(existsSync(join(outDir, "src"))).toBe(false)
  for (const page of ["about", "create"]) {
    expect(existsSync(join(outDir, `${page}.js`))).toBe(false)
    expect(readFileSync(join(outDir, `${page}.html`), "utf-8")).not.toContain("<script")
  }
  const play = readFileSync(join(outDir, "play.html"), "utf-8")
  expect(play).toContain('src="./play.js"')
  expect(play).toContain('<div id="roles">')
})
