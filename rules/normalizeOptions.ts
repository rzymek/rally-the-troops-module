/**
 * The game options as booleans. The create page sends checkboxes as `"true"` (or leaves them out), and the server's
 * fuzzer and tools may send real booleans: both count as on, anything else as off.
 *
 *   G.options = normalizeOptions(options)   // in on_setup
 */
export function normalizeOptions(options: Record<string, unknown> | undefined): Record<string, boolean> {
  return Object.fromEntries(Object.entries(options ?? {}).map(([key, value]) => [key, value === true || value === "true"]))
}
