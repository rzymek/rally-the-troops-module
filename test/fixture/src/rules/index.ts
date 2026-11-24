import {afterEachAction, createOffsetHexGrid, hexDistance, isEmpty, nextActiveRole, normalizeOptions, ref, type BaseGameState, type BaseViewState, type StateDefinition} from "../../../../rules/index.ts"

// The names framework.js links to.
export let G: BaseGameState & {moves: string[]}
export let V: BaseViewState
export const P: Record<string, StateDefinition> = {}
export const ROLES = ["White", "Black"]

declare function button(action: string): void
declare function prompt(text: string): void
declare function call(name: string): void

const grid = createOffsetHexGrid({columns: [1, 2], rows: [1, 2], shifted: "even"})

P.main = afterEachAction({
  prompt() {
    prompt("Move " + hexDistance("A00.B00", "A01.B01") + " " + ref("s", grid.hexes[0], "first"))
    button("next")
  },
  next() {
    G.active = nextActiveRole(G.active, ROLES.length)
  },
}, () => G.moves.push("next"))

export function on_setup(_scenario: string, options: Record<string, unknown>) {
  G.active = normalizeOptions(options).second ? 1 : 0
  G.moves = []
  if (isEmpty(G.moves)) call("main")
}

export function on_view() {
  V.log = G.log
}
