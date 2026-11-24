import {svgNS} from "./svg/svgNS.ts"

/** An SVG element with its attributes, appended to `parent` when given. */
export function svgElement<K extends keyof SVGElementTagNameMap>(name: K, attributes: Record<string, string | number> = {}, parent?: Element): SVGElementTagNameMap[K] {
  const element = document.createElementNS(svgNS, name)
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value))
  parent?.append(element)
  return element
}

/** The `<g>` with this id, created (before the element with id `before`, when given) if there is none yet. */
export function ensureLayer(id: string, {before, parent}: {before?: string, parent?: Element} = {}): SVGGElement {
  const existing = document.getElementById(id)
  if (existing) return existing as unknown as SVGGElement
  const layer = svgElement("g", {id})
  const next = before ? document.getElementById(before) : null
  if (next) next.before(layer)
  else (parent ?? document.getElementById("map"))!.append(layer)
  return layer
}
