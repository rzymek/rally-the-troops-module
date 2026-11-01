/** L - the (local) game state

 There is a local scope for storing data that is only used by a particular state.
 This local scope has reserved properties ("P", "I", and "L") that you must not touch!
 These properties are used to track the execution of scripts and where to go next.
 */
export interface FrameState {
  P: string
  I: number
  L: FrameState | null
  $?: unknown
  message?: string
  [key: string]: unknown
}

/** G - the (global) game state

 This object contains the full representation of the game. Extend it with
 any data you need to represent the game board state.

 The L, seed, log, and undo properties are automatically managed; you should never need to touch these.

 `active` is used to indicate whose turn it is to take an action. The framework also
 accepts an array of roles; a game whose turns work that way can narrow it accordingly.
 */
export interface BaseGameState {
  active: number
  seed: number
  log: string[]
  undo: any[]
  L: FrameState | null
  result?: string
}

/** V - the view object

 The view object that is being generated for the client is held in V during
 the execution of the on_view hook and the state prompt functions.
 */
export interface BaseViewState<Actions = Record<string, number | (string | number)[]>> {
  log: string[]
  prompt: string | null
  actions?: Actions
}

/** An entry of P: a state and its action handlers. */
export interface StateDefinition {
  inactive?: string
  _begin?: () => void
  _end?: () => void
  _resume?: () => void
  prompt?: () => void
  [action: string]: unknown
}
