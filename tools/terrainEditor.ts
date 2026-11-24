// A local web page over the map, to mark the terrain the rules need: what a detector reads off the map image is
// never perfect, and much of it (named places, entry areas, hexside features) can't be detected at all. Nothing here
// goes into the bundles: run it with node from a module's tools/terrain-editor.ts.
import {execFile} from "node:child_process"
import {existsSync, readFileSync, writeFileSync} from "node:fs"
import {createServer, type ServerResponse} from "node:http"
import {extname, join, normalize} from "node:path"
import {readMapSvg} from "../map/readMapSvg.ts"
import type {Point} from "../map/svgPath.ts"

export interface TerrainLayer {
  /** "space": a hex or area has it; "border": the border (hexside) between two adjacent spaces has it. */
  kind: "space" | "border"
  /** Shown in the editor. Default: the layer's name. */
  label?: string
  color: string
  /** How much of a space a "space" layer fills, so that several stay visible. Default: 1. */
  scale?: number
}

/** A border between two spaces: its key in the terrain file, and where to click it. */
export interface TerrainBorder {
  key: string
  a: string
  b: string
  at: Point
}

/** The terrain: the keys of each layer, spaces' ids or borders' keys. */
export type Terrain = Record<string, string[]>

export interface TerrainEditorOptions {
  /** The module's directory; the other paths are relative to it. */
  root: string
  /** Default: src/play/map.svg. Its spaces carry their ids and anchors (`data-anchor`, or a hex `<use>`). */
  mapSvg?: string
  /** Served as the site root, so that map.svg's image links (e.g. "images/map.jpg") work. Default: public. */
  publicDir?: string
  /** The JSON file the terrain is kept in, a list of keys per layer. Default: tools/map/terrain.json. */
  terrainFile?: string
  layers: Record<string, TerrainLayer>
  /** The borders a "border" layer may mark. */
  borders?: () => TerrainBorder[]
  /** Scripts run, in order, after the terrain file is saved, e.g. ["tools/map/hex/gen-map.ts"]. */
  regenerate?: string[]
  /** Default: 8765. */
  port?: number
}

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".png": "image/png", ".webp": "image/webp", ".json": "application/json", ".js": "text/javascript",
}

/** The terrain file as written by the editor: one line per layer, keys sorted. */
export function formatTerrain(terrain: Terrain): string {
  const lines = Object.entries(terrain).map(([name, keys]) => `  ${JSON.stringify(name)}: ${JSON.stringify([...keys].sort())}`)
  return `{\n${lines.join(",\n")}\n}\n`
}

export function readTerrain(file: string, layers: Record<string, TerrainLayer>): Terrain {
  const stored: Terrain = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {}
  return Object.fromEntries(Object.keys(layers).map(name => [name, stored[name] ?? []]))
}

interface Change {
  layer: string
  key: string
  /** Whether the key should end up in the layer. */
  on: boolean
}

/** Applies the editor's changes to the terrain, checking them against the map's spaces and borders. */
export function applyChanges(terrain: Terrain, changes: Change[], layers: Record<string, TerrainLayer>, spaces: Set<string>, borders: Set<string>): Terrain {
  const result = Object.fromEntries(Object.entries(terrain).map(([name, keys]) => [name, new Set(keys)]))
  for (const {layer, key, on} of changes) {
    const kind = layers[layer]?.kind
    if (!kind) throw new Error(`no layer ${layer}`)
    if (!(kind === "space" ? spaces : borders).has(key)) throw new Error(`${layer}: no ${kind} ${key} on the map`)
    const set = result[layer] ??= new Set()
    if (on) set.add(key)
    else set.delete(key)
  }
  return Object.fromEntries(Object.entries(result).map(([name, keys]) => [name, [...keys].sort()]))
}

/**
 * Serves the terrain editor on http://localhost:<port>. Clicking a space (or near a border) stages a change in the
 * selected layer; Submit writes the terrain file and runs the `regenerate` scripts, showing what they print.
 */
export function serveTerrainEditor(options: TerrainEditorOptions) {
  const {root, layers, borders = () => [], regenerate = [], port = 8765} = options
  const path = (file: string) => join(root, file)
  const mapSvg = path(options.mapSvg ?? "src/play/map.svg")
  const publicDir = path(options.publicDir ?? "public")
  const terrainFile = path(options.terrainFile ?? "tools/map/terrain.json")
  const page = readFileSync(new URL("./terrain-editor.html", import.meta.url))

  const run = (script: string) => new Promise<{ok: boolean, log: string}>(resolve =>
    execFile(process.execPath, [...process.execArgv, path(script)], {cwd: root},
      (error, stdout, stderr) => resolve({ok: !error, log: `${script}:\n${stdout}${stderr}`})))

  function config() {
    const svg = readFileSync(mapSvg, "utf8")
    const {width, height, anchors} = readMapSvg(svg)
    return {layers, width, height, spaces: Object.fromEntries(anchors), borders: borders()}
  }

  async function submit(changes: Change[]) {
    const {spaces, borders: list} = config()
    const terrain = applyChanges(readTerrain(terrainFile, layers), changes, layers, new Set(Object.keys(spaces)), new Set(list.map(it => it.key)))
    writeFileSync(terrainFile, formatTerrain(terrain))
    let log = `Saved ${terrainFile}\n`
    for (const script of regenerate) {
      const result = await run(script)
      log += result.log
      if (!result.ok) return {ok: false, log}
    }
    return {ok: true, log}
  }

  function send(res: ServerResponse, body: string | Buffer, type: string, code = 200) {
    res.writeHead(code, {"Content-Type": type, "Cache-Control": "no-store"})
    res.end(body)
  }

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost").pathname
      if (req.method === "GET" && url === "/") return send(res, page, TYPES[".html"])
      if (req.method === "GET" && url === "/config") return send(res, JSON.stringify(config()), TYPES[".json"])
      if (req.method === "GET" && url === "/map.svg") return send(res, readFileSync(mapSvg), TYPES[".svg"])
      if (req.method === "GET" && url === "/terrain") return send(res, JSON.stringify(readTerrain(terrainFile, layers)), TYPES[".json"])
      if (req.method === "POST" && url === "/submit") {
        let body = ""
        for await (const chunk of req) body += chunk
        const result = await submit(JSON.parse(body))
        return send(res, JSON.stringify(result), TYPES[".json"], result.ok ? 200 : 500)
      }
      const file = join(publicDir, normalize(decodeURIComponent(url)).replace(/^(\.\.[/\\])+/, ""))
      if (req.method === "GET" && file.startsWith(publicDir) && existsSync(file))
        return send(res, readFileSync(file), TYPES[extname(file)] ?? "application/octet-stream")
      send(res, "not found", "text/plain", 404)
    } catch (error) {
      send(res, JSON.stringify({ok: false, log: String(error)}), TYPES[".json"], 500)
    }
  })
  server.listen(port, "127.0.0.1", () => console.log(`Terrain editor: http://localhost:${port}`))
  return server
}
