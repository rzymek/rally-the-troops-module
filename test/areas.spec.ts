import {DOMParser} from "@xmldom/xmldom"
import {describe, expect, it} from "vitest"
import {importAreas, parseTransform, readMapSvg} from "../map/index.ts"

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="0 0 100 50">
  <g inkscape:label="background"><rect id="bg" width="100" height="50"/></g>
  <g id="layer1" inkscape:label="areas" transform="translate(10 0)">
    <path id="west" inkscape:label="West" d="M 0 0 H 40 V 40 H 0 Z"/>
    <path id="east" d="m 40,0 40,0 0,20 -40,0 z"><title>East</title></path>
    <polygon id="south" points="40,20 80,20 80,40 40,40"/>
    <rect id="corner" x="80" y="40" width="10" height="10"/>
  </g>
</svg>`

describe("importAreas", () => {
  const {areas, borders} = importAreas(SVG, {parser: new DOMParser()})

  it("reads every shape of the layer, transforms applied, with labels and anchors", () => {
    expect(areas.map(a => [a.id, a.label])).toEqual([["west", "West"], ["east", "East"], ["south", undefined], ["corner", undefined]])
    expect(areas[0].polygon[0]).toEqual([10, 0])
    expect(areas[0].anchor).toEqual([28, 18])
  })

  it("finds the borders long enough, not the corners", () => {
    expect(borders.map(b => `${b.a}-${b.b} ${b.length}`)).toEqual(["east-west 20", "south-west 20", "east-south 40"])
    expect(borders[0].middle).toEqual([50, 10])
  })

  it("complains about a missing layer", () => {
    expect(() => importAreas(SVG, {parser: new DOMParser(), layer: "nope"})).toThrow(/no layer "nope"/)
  })

  it("parses transforms", () => {
    expect(parseTransform("translate(5,6) scale(2)")).toEqual([2, 0, 0, 2, 5, 6])
  })
})

describe("readMapSvg", () => {
  it("reads anchors from data-anchor and from hex <use> elements, and the hex outline", () => {
    const map = readMapSvg(`<svg id="map" viewBox="0 0 300 200"><defs><polygon id="hexTemplate" points="1,0 0,1 -1,0"/></defs>
      <g id="spaces"><polygon id="a" points="0,0 1,1" data-anchor="5,6"/><use id="0101" transform="translate(10.5 20)" href="#hexTemplate"/></g></svg>`)
    expect(map.width).toBe(300)
    expect([...map.anchors]).toEqual([["a", [5, 6]], ["0101", [10.5, 20]]])
    expect(map.hexOutline).toEqual([[1, 0], [0, 1], [-1, 0]])
  })
})
