import type {StateDefinition} from "./types.ts"

/** The state hooks and the prompt: everything else in a state is an action handler. */
const NOT_ACTIONS = new Set(["inactive", "prompt", "_begin", "_end", "_resume"])

/**
 * Wraps every action handler of a state so that `hook` runs after it, e.g. to update control of the map or to check
 * for the end of the game after anything a player does. The prompt and the `_begin`/`_end`/`_resume` hooks are left
 * as they are. Returns the same state object.
 *
 *   P.movement = afterEachAction({prompt() {...}, move_space(to) {...}}, checkVictory)
 */
export function afterEachAction<S extends StateDefinition>(state: S, hook: () => void): S {
  for (const [name, handler] of Object.entries(state)) {
    if (NOT_ACTIONS.has(name) || typeof handler !== "function") continue
    ;(state as Record<string, unknown>)[name] = function (this: unknown, ...args: unknown[]) {
      const result = handler.apply(this, args)
      hook()
      return result
    }
  }
  return state
}
