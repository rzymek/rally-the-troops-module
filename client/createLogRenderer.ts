import {parseLogLine} from "./logLine.ts"

export interface LogRendererOptions {
  /**
   * What each kind of reference points at on the page, by kind (as in the rules' `ref(kind, id, name)`): hovering the
   * name in the log highlights them, clicking it pans the map to the first one. Looked up on every hover, as pieces
   * are redrawn on updates. Kinds without an entry are shown as plain names.
   */
  targets: Record<string, (id: string) => Element[]>
  /** Line classes by what the line says, e.g. [[/\beliminated\b/, "loss"]], added to the ".class " tokens. */
  lineClasses?: [RegExp, string][]
  /** Words to wrap in a span with a class, e.g. [[/\b(Red|Blue)\b/g, "side"]]; the pattern must be global. */
  wordClasses?: [RegExp, string][]
  /** The class put on targets while their name is hovered. Default: "log-focus". */
  focusClass?: string
}

/**
 * An `on_log` for the log markup of the rules' `ref()`: leading ".class " tokens become classes of the line (".h1",
 * ".h2" for headings), *bold* is bold, and references become names that highlight and pan to what they name.
 *
 *   on_log = createLogRenderer({targets: {p: id => [...document.querySelectorAll(`[data-piece="${id}"]`)]}})
 */
export function createLogRenderer({targets, lineClasses = [], wordClasses = [], focusClass = "log-focus"}: LogRendererOptions) {
  const clearFocus = () => document.querySelectorAll("." + focusClass).forEach(it => it.classList.remove(focusClass))

  function appendWords(parent: HTMLElement, text: string) {
    let pieces: (string | HTMLElement)[] = [text]
    for (const [pattern, className] of wordClasses) {
      pieces = pieces.flatMap(piece => {
        if (typeof piece !== "string") return [piece]
        const out: (string | HTMLElement)[] = []
        let last = 0
        for (const match of piece.matchAll(pattern)) {
          const span = document.createElement("span")
          span.className = className
          span.textContent = match[0]
          out.push(piece.slice(last, match.index), span)
          last = match.index + match[0].length
        }
        out.push(piece.slice(last))
        return out
      })
    }
    parent.append(...pieces)
  }

  return function onLog(text: string): HTMLElement {
    const div = document.createElement("div")
    const {classes, parts} = parseLogLine(text)
    for (const [pattern, className] of lineClasses) if (pattern.test(text)) classes.push(className)
    div.className = classes.join(" ")
    for (const part of parts) {
      const parent = part.bold ? div.appendChild(document.createElement("b")) : div
      if (!("kind" in part)) {
        appendWords(parent, part.text)
        continue
      }
      const span = document.createElement("span")
      span.className = `ref ref-${part.kind}`
      span.textContent = part.name
      const find = targets[part.kind]
      if (find) {
        span.addEventListener("mouseenter", () => find(part.id).forEach(it => it.classList.add(focusClass)))
        span.addEventListener("mouseleave", clearFocus)
        span.addEventListener("click", () => {
          const [first] = find(part.id)
          if (first) scroll_into_view(first)
        })
      }
      parent.append(span)
    }
    return div
  }
}
