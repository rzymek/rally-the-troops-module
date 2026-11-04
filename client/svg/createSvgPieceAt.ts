/** What `createSvgPieceAt` needs of a piece: a `CabinetPiece` from `@rzymek/rally-the-troops-module/pieces` fits. */
export interface SvgPiece {
  svg: string
  footprint: {x: number, y: number, w: number, h: number}
}

/**
 * Places a piece so that its footprint, the face it stands on, is centred on `center`.
 * Centring the whole image instead would shift it by half its depth.
 */
export function createSvgPieceAt(center: DOMPoint, piece: SvgPiece): SVGSVGElement {
  const svgDoc = new DOMParser().parseFromString(piece.svg, 'image/svg+xml')
  const el = svgDoc.documentElement as unknown as SVGSVGElement
  const {x, y, w, h} = piece.footprint
  el.setAttribute('x', String(center.x - x - w / 2))
  el.setAttribute('y', String(center.y - y - h / 2))
  return document.adoptNode(el)
}

/**
 * Reorders the children of `layer` by their `x` and `y` attributes, so that pieces nearer
 * the bottom right are drawn over those behind them, as cabinet projection needs.
 * For pieces leaning left, pass a negative `xWeight`.
 */
export function sortCabinetOrder(layer: Element, xWeight = 1, yWeight = 2) {
  const at = (el: Element, name: string) => parseFloat(el.getAttribute(name) ?? '0') || 0
  const z = (el: Element) => at(el, 'y') * yWeight + at(el, 'x') * xWeight
  const sorted = Array.from(layer.children).sort((a, b) => z(a) - z(b))
  layer.replaceChildren(...sorted)
}
