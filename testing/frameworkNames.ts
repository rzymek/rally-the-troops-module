import {readdirSync, readFileSync} from "node:fs"
import {join} from "node:path"

/** The names the framework expects the module to declare at the top level of rules.js. */
export const LINKED_NAMES: readonly string[] = ["G", "L", "R", "V", "P", "ROLES", "SCENARIOS", "on_setup", "on_view", "on_query", "on_assert", "on_static_view"]

/** What framework.js declares at the top level of rules.js. */
export function frameworkNames(): Set<string> {
  const source = readFileSync(new URL("../plugins/framework.js", import.meta.url), "utf8")
  return new Set([...source.matchAll(/^(?:async )?function ([A-Za-z_$][\w$]*)|^(?:var|let|const) ([A-Za-z_$][\w$]*)/gm)]
    .map(m => m[1] ?? m[2]))
}

/**
 * The top-level declarations of the rules sources (specs left out) that have the name of one of the framework's,
 * as "<file>: <name>". The bundle puts the rules and framework.js in one scope, so such a declaration silently
 * replaces the framework's function (e.g. a `resume` or `finish` of your own). Expect it to be empty:
 *
 *   expect(frameworkNameClashes(new URL("./", import.meta.url).pathname)).toEqual([])
 */
export function frameworkNameClashes(rulesDir: string): string[] {
  const names = frameworkNames()
  const clashes: string[] = []
  for (const file of readdirSync(rulesDir, {recursive: true, encoding: "utf8"}).sort()) {
    if (!file.endsWith(".ts") || file.endsWith(".spec.ts") || file.endsWith(".d.ts")) continue
    const source = readFileSync(join(rulesDir, file), "utf8")
    for (const m of source.matchAll(/^(?:export )?(?:async )?(?:function\*?|const|let|var|class) ([A-Za-z_$][\w$]*)/gm))
      if (names.has(m[1]) && !LINKED_NAMES.includes(m[1])) clashes.push(`${file}: ${m[1]}`)
  }
  return clashes
}
