import {svgNS} from "./svg/svgNS.ts"

export function createLayer(): SVGGElement {
  return document.createElementNS(svgNS, 'g')
}
