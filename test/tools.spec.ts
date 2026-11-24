import {mkdtempSync, writeFileSync} from "node:fs"
import {tmpdir} from "node:os"
import {join} from "node:path"
import {expect, it} from "vitest"
import {frameworkNameClashes} from "../testing/index.ts"
import {applyChanges, formatTerrain, readTerrain, type TerrainLayer} from "../tools/index.ts"

const layers: Record<string, TerrainLayer> = {rough: {kind: "space", color: "#c80"}, river: {kind: "border", color: "#00f"}}

it("applies the terrain editor's changes, checking them against the map", () => {
  const terrain = applyChanges({rough: ["0102"], river: []}, [
    {layer: "rough", key: "0101", on: true},
    {layer: "rough", key: "0102", on: false},
    {layer: "river", key: "0101|0102", on: true},
  ], layers, new Set(["0101", "0102"]), new Set(["0101|0102"]))
  expect(terrain).toEqual({rough: ["0101"], river: ["0101|0102"]})
  expect(() => applyChanges(terrain, [{layer: "rough", key: "9999", on: true}], layers, new Set(), new Set())).toThrow(/no space 9999/)
  expect(formatTerrain(terrain)).toBe('{\n  "rough": ["0101"],\n  "river": ["0101|0102"]\n}\n')
})

it("reads the terrain file, with every layer present", () => {
  const dir = mkdtempSync(join(tmpdir(), "terrain-"))
  writeFileSync(join(dir, "terrain.json"), '{"rough": ["0101"]}')
  expect(readTerrain(join(dir, "terrain.json"), layers)).toEqual({rough: ["0101"], river: []})
  expect(readTerrain(join(dir, "none.json"), layers)).toEqual({rough: [], river: []})
})

it("finds top-level rules names that would replace the framework's", () => {
  const dir = mkdtempSync(join(tmpdir(), "rules-"))
  writeFileSync(join(dir, "a.ts"), "export function resume() {}\nexport let G = {}\nconst fine = 1\n")
  writeFileSync(join(dir, "a.spec.ts"), "function finish() {}\n")
  expect(frameworkNameClashes(dir)).toEqual(["a.ts: resume"])
})

it("the library's own rules helpers clash with nothing in the framework", () => {
  expect(frameworkNameClashes(new URL("../rules/", import.meta.url).pathname)).toEqual([])
})
