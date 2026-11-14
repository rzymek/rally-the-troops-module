import {vi} from "vitest"

/** What a state's prompt offers, collected through spies on `action`, `button` and `prompt`. */
export interface Offered {
  /** Arguments of each action verb, as strings. */
  actions: Record<string, string[]>
  /** Buttons, and whether each is enabled. */
  buttons: Record<string, boolean>
  /** The prompt text. */
  text: string
}

/** Runs a state's `prompt()` with spies installed, and returns what it offers. */
export function offered(state: {prompt(): void}): Offered {
  const action = vi.fn(), button = vi.fn(), text = vi.fn()
  vi.stubGlobal("action", action)
  vi.stubGlobal("button", button)
  vi.stubGlobal("prompt", text)
  state.prompt()
  const actions: Record<string, string[]> = {}
  for (const [verb, argument] of action.mock.calls) (actions[verb] ??= []).push(String(argument))
  return {
    actions,
    buttons: Object.fromEntries(button.mock.calls.map(([name, enabled = true]) => [name, Boolean(enabled)])),
    text: text.mock.calls[0]?.[0] ?? "",
  }
}

/**
 * A `goto` for tests that does what the framework's does to the local scope: replaces it with the new state's
 * environment (keeping the same object, as tests import it), records the state's name, and runs its `_begin` hook.
 * Pass it to `stubFramework({goto: recorder.goto})`.
 */
export function gotoRecorder(local: Record<string, unknown>, states: Record<string, unknown> = {}) {
  const recorder = {
    state: "",
    goto: vi.fn((name: string, env?: Record<string, unknown>) => {
      recorder.state = name
      for (const key of Object.keys(local)) delete local[key]
      Object.assign(local, env)
      const begin = (states[name] as Record<string, unknown> | undefined)?.["_begin"]
      if (typeof begin === "function") begin()
    }),
  }
  return recorder
}
