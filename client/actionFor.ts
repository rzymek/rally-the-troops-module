/**
 * The first of the verbs whose action list in the view includes the argument: what a click on a space or a piece
 * means right now.
 *
 *   el.addEventListener("click", () => { const verb = actionFor(SPACE_ACTIONS, id); if (verb) send_action(verb, id) })
 */
export function actionFor(verbs: readonly string[], argument: string | number): string | undefined {
  const actions = view.actions as Record<string, unknown> | undefined
  return verbs.find(verb => {
    const list = actions?.[verb]
    return Array.isArray(list) && list.some(it => String(it) === String(argument))
  })
}
