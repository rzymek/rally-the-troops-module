import {expect, it} from "vitest"
import {playRandomGames} from "../testing/index.ts"

const rulesPath = new URL("./fixture/random-game/rules.cjs", import.meta.url).pathname

it("plays games to their end, every scenario in turn, the same way each time", () => {
  const games = playRandomGames({rulesPath, games: 4, options: game => ({game})})
  expect(games.map(it => it.scenario)).toEqual(["Standard", "Short", "Standard", "Short"])
  for (const game of games) {
    expect(["A", "B"]).toContain(game.result)
    expect(game.message).toBe(`${game.result} wins`)
    expect(game.state.total).toBeGreaterThanOrEqual(5)
  }
  expect(games[2].options).toEqual({game: 2})
  expect(playRandomGames({rulesPath, games: 4}).map(it => it.steps)).toEqual(games.map(it => it.steps))
})

it("stops games after maxSteps", () => {
  const [game] = playRandomGames({rulesPath, games: 1, maxSteps: 1})
  expect(game.steps).toBe(1)
  expect(game.result).toBeUndefined()
})
