import {expect, it} from "vitest"
import {brightness, cuboid, cylinder, drawPiece, outlinePiece} from "../pieces/index.ts"

// Verbatim from verdun's pieces/, made by the RTT server's tools/cabinet.js.
const verdunFrenchFresh = `<svg xmlns="http://www.w3.org/2000/svg" width="47" height="47">
<g transform="translate(3.5,3.5)" stroke-width="1" stroke-linejoin="round" stroke-linecap="round">
<path fill="#1e86b9" d="M 0,20 20,20 40,40 20,40 z"/>
<path fill="#1e86b9" d="M 20,20 20,0 40,20 40,40 z"/>
<path fill="#56b4e9" d="M 0,0 0,20 20,20 20,0 0,0 z"/>
<path fill="none" stroke="#000" d="
M 0,0 0,20 20,20 20,0 0,0 z
M 20,40 40,40 M 40,40 40,20
M 0,20 20,40
M 20,20 40,40
M 20,0 40,20
"/>
</g>
</svg>
`

const verdunSelectFresh = `<svg xmlns="http://www.w3.org/2000/svg" width="47" height="47">
<g transform="translate(3.5,3.5)" stroke-width="1" stroke-linejoin="round" stroke-linecap="round">
<g fill="#0ff" stroke="#0ff" stroke-width="7">
<path d="M 0,0 0,20 20,20 20,0 0,0 z M 20,40 40,40 M 40,40 40,20 M 0,20 20,40 M 20,20 40,40 M 20,0 40,20"/>
</g>
</g>
</svg>
`

it("draws blocks like tools/cabinet.js", () => {
  expect(drawPiece(cuboid(20, 20, 40), "#56b4e9").svg).toBe(verdunFrenchFresh)
  expect(outlinePiece(cuboid(20, 20, 40), "#0ff").svg).toBe(verdunSelectFresh)
})

it("gives the footprint that verdun's CSS margins encode", () => {
  // .unit { width: 47px; height: 47px; margin: -23px -4px -4px -23px; }
  expect(drawPiece(cuboid(20, 20, 40), "#56b4e9")).toMatchObject({width: 47, height: 47, footprint: {x: 23, y: 23, w: 20, h: 20}})
  // .unit.exhausted { width: 37px; height: 57px; margin: -13px -4px -4px -13px; }
  expect(drawPiece(cuboid(20, 40, 20), "#56b4e9")).toMatchObject({width: 37, height: 57, footprint: {x: 13, y: 13, w: 20, h: 40}})
  expect(drawPiece(cylinder(28, 40), "#eee")).toMatchObject({footprint: {x: 23, y: 23, w: 28, h: 28}})
})

it("shades sides in OKLab", () => {
  expect(brightness("#56b4e9", 0.8)).toBe("#1e86b9")
  expect(brightness("#ad262e", 0.8)).toBe("#8b0011") // fire-stone's improv-red.svg
})

it("leans left, like fire-stone's blocks", () => {
  // fire-stone's improv-red.svg: 122 x 37, top face from x 13.5 to 118.5, sides down to x 3.5
  const piece = drawPiece(cuboid(105, 20, 20), "#ad262e", {lean: "left", symbol: "<g id=s/>"})
  expect(piece).toMatchObject({width: 122, height: 37, footprint: {x: 4, y: 13, w: 105, h: 20}})
  expect(piece.svg).toContain('<g transform="matrix(-1 0 0 1 115 0)">')
  expect(piece.svg).toContain('<g transform="translate(10,0)">\n<g id=s/>') // the symbol is not mirrored
  // drawn leaning right inside the mirroring group, so the same paths as a right-leaning block
  expect(piece.svg).toContain('<path fill="#8b0011" d="M 0,20 105,20 115,30 10,30 z"/>')
  expect(piece.svg).toContain('<path fill="#8b0011" d="M 105,20 105,0 115,10 115,30 z"/>')
})
