// A two player game for playRandomGames: whoever is active adds 1 or 2; the one reaching 5 wins.
exports.scenarios = ["Standard", "Short"]
exports.setup = (seed, scenario, options) => ({active: "A", total: scenario === "Short" ? 3 : 0, log: [], options, L: {P: "add"}})
exports.view = (state, role) => (state.active === role ? {actions: {add: [1, 2], undo: 0}} : {})
exports.action = (state, role, action, n) => {
  const total = state.total + n
  if (total >= 5) return {...state, total, result: role, active: null, L: {message: `${role} wins`}}
  return {...state, total, active: role === "A" ? "B" : "A", log: [...state.log, `${role} adds ${n}`]}
}
