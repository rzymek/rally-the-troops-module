import {parseSVGTransform} from "./parseSVGTransform.ts"

/**
 * Finds hex centres on a map with `#hexes` holding one `<use id="<hex id>">` per hex of `#hexTemplate`.
 * @param templateCenter the centre of the hex template, in its own coordinates
 */
export function createHexCenterLocator(templateCenter: DOMPoint) {
  return (hexId: string): DOMPoint => {
    const templateEl = document.getElementById('hexTemplate')!
    const useEl = document.getElementById(hexId)!
    const hexesGroup = document.getElementById('hexes')!
    const templateMatrix = parseSVGTransform(templateEl.getAttribute('transform'))
    const useMatrix = parseSVGTransform(useEl.getAttribute('transform'))
    const groupMatrix = parseSVGTransform(hexesGroup.getAttribute('transform'))
    return groupMatrix.multiply(useMatrix).multiply(templateMatrix).transformPoint(templateCenter)
  }
}
