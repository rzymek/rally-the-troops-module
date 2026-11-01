export function createSvgMarkerAt(center: DOMPoint, svgText: string) {
  const svgDoc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  const marker = svgDoc.documentElement as unknown as SVGSVGElement
  const width = parseFloat(marker.getAttribute('width')!)
  const height = parseFloat(marker.getAttribute('height')!)
  marker.setAttribute('x', String(center.x - width / 2))
  marker.setAttribute('y', String(center.y - height / 2))
  return document.adoptNode(marker);
}