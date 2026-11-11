import {createRequire} from "node:module"

/** What `rules.js` exports, as far as playing it goes. */
interface Rules {
  scenarios: string[] | Record<string, string[]>
  setup(seed: number, scenario: string, options: Record<string, unknown>): GameState
  view(state: GameState, role: string): {actions?: Record<string, unknown>}
  action(state: GameState, role: string, action: string, argument: unknown): GameState
}

interface GameState {
  active: string | string[] | null
  result?: string
  log: string[]
  L?: {P?: string, message?: string}
  [key: string]: unknown
}

export interface RandomGame {
  game: number
  scenario: string
  options: Record<string, unknown>
  steps: number
  /** The winning role, "Draw", or undefined when `maxSteps` ran out */
  result?: string
  /** The message `finish()` gave */
  message?: string
  state: GameState
}

export interface PlayRandomGamesOptions {
  /** The built rules, e.g. `$RTT_DIR/public/<name>/rules.js` */
  rulesPath: string
  games: number
  /** Defaults to all the scenarios, in turn */
  scenarios?: string[]
  /** The options of each game; none by default */
  options?: (game: number) => Record<string, unknown>
  /** Stop a game that hasn't ended after this many actions; 20000 by default */
  maxSteps?: number
}

/**
 * Plays games with random actions, never Undo, to see that they run to their end, and how.
 * Unlike the server's fuzzer, it returns the games, so a script can count what happened in their logs.
 * Throws when a role to act has no action, with the state it got stuck in.
 */
export function playRandomGames({rulesPath, games, scenarios, options = () => ({}), maxSteps = 20000}: PlayRandomGamesOptions): RandomGame[] {
  const rules = createRequire(import.meta.url)(rulesPath) as Rules
  const all = scenarios ?? (Array.isArray(rules.scenarios) ? rules.scenarios : Object.values(rules.scenarios).flat())
  const results: RandomGame[] = []
  for (let game = 0; game < games; game++) {
    let seed = game + 1
    const pick = (n: number) => {
      seed = (seed * 48271) % 0x7fffffff
      return seed % n
    }
    const scenario = all[game % all.length]
    const gameOptions = options(game)
    let state = rules.setup(game + 1, scenario, gameOptions)
    let steps = 0
    for (; steps < maxSteps && !state.result && state.active; steps++) {
      const roles = Array.isArray(state.active) ? state.active : [state.active]
      const role = roles[pick(roles.length)]
      const actions = listActions(rules.view(state, role))
      if (actions.length === 0) throw new Error(`Game ${game}, ${scenario}: no actions for ${role} in ${state.L?.P}`)
      const [name, argument] = actions[pick(actions.length)]
      state = rules.action(state, role, name, argument)
    }
    results.push({game, scenario, options: gameOptions, steps, result: state.result || undefined, message: state.L?.message, state})
  }
  return results
}

/** The actions in a view, as [action, argument] pairs, without Undo. */
function listActions(view: {actions?: Record<string, unknown>}): [string, unknown][] {
  const result: [string, unknown][] = []
  for (const [name, value] of Object.entries(view.actions ?? {})) {
    if (name === "undo") continue
    if (Array.isArray(value)) for (const argument of value) result.push([name, argument])
    else if (value) result.push([name, undefined])
  }
  return result
}
