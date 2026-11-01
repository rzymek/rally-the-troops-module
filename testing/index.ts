import {readFileSync} from "node:fs"
import {vi} from "vitest"

const PURE_HELPERS = [
  "set_clear", "set_has", "set_add", "set_delete", "set_toggle",
  "map_clear", "map_has", "map_get", "map_set", "map_delete", "map_get_set", "map_for_each",
  "array_delete", "array_delete_item", "array_insert", "array_delete_pair", "array_insert_pair",
  "object_copy", "object_diff", "object_group_by", "map_group_by",
] as const

const SPIED = [
  "log", "prompt", "button", "action", "finish",
  "call", "call_or_goto", "goto", "end", "resume",
  "push_undo", "pop_undo", "clear_undo",
] as const

// These only work on their arguments, so tests get the real implementation, not a copy that can drift.
function loadPureHelpers(): Record<string, unknown> {
  const framework = readFileSync(new URL("../plugins/framework.js", import.meta.url), "utf-8")
  return new Function(
    "exports",
    `var ROLES = [], P = {};\n${framework}\nreturn {${PURE_HELPERS.join(",")}}`,
  )({})
}

/**
 * Installs the framework's globals for a test, as `vi.stubGlobal`:
 * - the set, map, array and object helpers are the real ones,
 * - the control flow, prompt and undo functions are spies,
 * - `random` throws, since a test must decide what the dice say.
 *
 * Pass `overrides` for anything a test needs to control or inspect, e.g. `{goto, random: () => 3}`.
 */
export function stubFramework(overrides: Record<string, unknown> = {}) {
  for (const [name, helper] of Object.entries(loadPureHelpers()))
    vi.stubGlobal(name, helper)
  for (const name of SPIED)
    vi.stubGlobal(name, vi.fn())
  vi.stubGlobal("random", () => {
    throw new Error("stubFramework: pass a `random` override to roll dice")
  })
  for (const [name, value] of Object.entries(overrides))
    vi.stubGlobal(name, value)
}
