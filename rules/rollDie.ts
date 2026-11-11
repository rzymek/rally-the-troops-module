/**
 * Rolls a die, 1 to `sides`. A roll can't be undone, so the undo stack is cleared first:
 * otherwise Undo would let a player roll again (the fuzzer reports this as BadUndo).
 */
export function rollDie(sides = 6): number {
  clear_undo()
  return random(sides) + 1
}
