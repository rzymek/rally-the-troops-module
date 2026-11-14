/**
 * `action_button_with_argument` creates a button per verb and argument the first time it is called, and only updates
 * its visibility when called again with the same argument. Buttons for arguments no longer offered (an option of
 * another card, say) stay visible: this hides every button of the verb whose argument the current view doesn't offer.
 */
export function hideStaleArgumentButtons(verb: string) {
  const offered = (view.actions as Record<string, unknown> | undefined)?.[verb]
  document.querySelectorAll<HTMLButtonElement>(`#actions button[id^="${verb}_"]`).forEach(button => {
    const argument = button.id.slice(verb.length + 1, -"_button".length)
    button.hidden = !(Array.isArray(offered) && offered.map(String).includes(argument))
  })
}
