// The one syntax for naming things in the log, so the client can link them: {<kind>:<id>:<name>}, e.g.
// {p:3:1st Guards} for a piece and {s:0412:Bastogne} for a space. The client shows the name, and highlights and pans
// to what `kind` and `id` point at (createLogRenderer in the client). Names may contain anything but braces.

/** Matches a reference: kind (letters), id (no colon or braces), name. Global: use with matchAll or replace. */
export const REF_PATTERN = /\{([a-z][a-z0-9_-]*):([^:{}]+):([^{}]*)\}/g

/** Matches *bold* text. */
export const BOLD_PATTERN = /\*([^*]+)\*/g

/**
 * A reference to something on the map, for the log (and prompts, through on_prompt): `ref("p", piece.id, piece.name)`.
 * Don't ref a piece the reader may not identify (write e.g. "a block"): its id would give away which one it is.
 */
export function ref(kind: string, id: string | number, name: string): string {
  return `{${kind}:${id}:${name.replace(/[{}]/g, "")}}`
}

/** The text with references replaced by their names and *bold* markup removed, e.g. for finish() messages. */
export function plainText(text: string): string {
  return text.replace(REF_PATTERN, (_, _kind, _id, name: string) => name).replace(BOLD_PATTERN, (_, bold: string) => bold)
}
