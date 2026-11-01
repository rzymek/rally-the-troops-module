import {hexDistance, isEmpty, nextActiveRole, type BaseGameState, type BaseViewState, type StateDefinition} from "../../../../rules/index.ts"

// The names framework.js links to.
export let G: BaseGameState & {moves: string[]}
export let V: BaseViewState
export const P: Record<string, StateDefinition> = {}
export const ROLES = ["White", "Black"]

declare function button(action: string): void
declare function prompt(text: string): void
declare function call(name: string): void

P.main = {
  prompt() {
    prompt("Move " + hexDistance("A00.B00", "A01.B01"))
    button("next")
  },
  next() {
    G.active = nextActiveRole(G.active, ROLES.length)
  },
}

export function on_setup() {
  G.active = 0
  G.moves = []
  if (isEmpty(G.moves)) call("main")
}

export function on_view() {
  V.log = G.log
}
