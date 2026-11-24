// The client's side of the log markup written by the rules' `ref()` (see rules/ref.ts): rules.js and the client
// can't share runtime code, so this is the client's own copy of the patterns.

const REF_PATTERN = /\{([a-z][a-z0-9_-]*):([^:{}]+):([^{}]*)\}/g
const BOLD_PATTERN = /\*([^*]+)\*/g
/** Leading ".class " tokens, e.g. ".h1 Turn 3" or ".combat .loss Lost a step". */
const CLASSES_PATTERN = /^((?:\.[\w-]+ )+)/

export type LogPart =
  | {text: string, bold?: boolean}
  | {kind: string, id: string, name: string, bold?: boolean}

export interface LogLine {
  /** CSS classes given by the leading ".class " tokens. */
  classes: string[]
  parts: LogPart[]
}

/** The text with references replaced by their names and *bold* markup removed. */
export function plainText(text: string): string {
  return text.replace(REF_PATTERN, (_, _kind, _id, name: string) => name).replace(BOLD_PATTERN, (_, bold: string) => bold)
}

function refParts(text: string, bold: boolean): LogPart[] {
  const parts: LogPart[] = []
  let last = 0
  for (const match of text.matchAll(REF_PATTERN)) {
    if (match.index > last) parts.push({text: text.slice(last, match.index), ...(bold && {bold})})
    parts.push({kind: match[1], id: match[2], name: match[3], ...(bold && {bold})})
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({text: text.slice(last), ...(bold && {bold})})
  return parts
}

/** Splits a log line into its classes, text, *bold* text and references. */
export function parseLogLine(line: string): LogLine {
  const match = CLASSES_PATTERN.exec(line)
  const classes = match ? match[1].trim().split(" ").map(it => it.slice(1)) : []
  const text = match ? line.slice(match[0].length) : line
  const parts: LogPart[] = []
  let last = 0
  for (const bold of text.matchAll(BOLD_PATTERN)) {
    parts.push(...refParts(text.slice(last, bold.index), false))
    parts.push(...refParts(bold[1], true))
    last = bold.index + bold[0].length
  }
  parts.push(...refParts(text.slice(last), false))
  return {classes, parts}
}
