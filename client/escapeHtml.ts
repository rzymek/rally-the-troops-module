/** Text made safe to put into HTML, e.g. in on_prompt, which returns HTML. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)
}
