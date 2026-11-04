/*
 * Wooden pieces (blocks, cylinders, discs...) in cabinet projection, drawn as SVG.
 * Ported from the RTT server's tools/cabinet.js, minus the file writing.
 * Copyright 2021, 2025 Tor Andersson. ISC License, see LICENSE.
 *
 * Cabinet projection is an oblique projection where depth is drawn at half
 * scale, so a block of depth `d` is offset by d/2 on each axis. The top face
 * is drawn at the shape's own coordinates and the base face is that offset
 * away: down-right by default, down-left with `lean: "left"`.
 *
 * Strokes are 1px and grid aligned, so blocks lined up edge to edge share
 * their edge strokes. A margin of `outlineWidth` is left on every side for the
 * highlights drawn by `outlinePiece`, which go underneath the piece.
 *
 * Concave shapes may need manual cleanup of partially hidden lines.
 */

import {brightness} from "./oklab.ts"

export type Point = [x: number, y: number]

/** A shape extruded down from its top face, which is drawn at the given points. */
export interface PrismShape {
  kind: "prism"
  points: Point[]
  depth: number
}

/** A disc of radius `r1` on top of one of radius `r2`. Equal radii give a cylinder. */
export interface ConeShape {
  kind: "cone"
  r1: number
  r2: number
  depth: number
}

export type PieceShape = PrismShape | ConeShape

export interface PieceStyle {
  /** Which way the sides show. `"right"` (the default) puts the base face down-right of the top face. */
  lean?: "right" | "left"
  /** Default 1. */
  strokeWidth?: number
  /** Thickness of the highlight drawn by `outlinePiece`, and of the margin kept for it. Default 3. */
  outlineWidth?: number
}

export interface DrawOptions extends PieceStyle {
  /** SVG markup drawn on the top face, in the shape's coordinates. */
  symbol?: string
  /** Default black. */
  stroke?: string
  /** Lightness of the sides relative to the top. Default 0.8. */
  shade?: number
}

export interface CabinetPiece {
  /** A standalone `<svg>` document. */
  svg: string
  width: number
  height: number
  /**
   * The base face's box within the image: where the piece stands on the map.
   * As CSS: `width: <w>px; height: <h>px; margin: -<y>px -<width-x-w>px -<height-y-h>px -<x>px`.
   */
  footprint: {x: number, y: number, w: number, h: number}
}

// https://jfly.uni-koeln.de/color/
export const palette = {
  black: "#000000",
  orange: "#e69f00",
  skyblue: "#56b4e9",
  green: "#009e73",
  yellow: "#f0e442",
  blue: "#0072b2",
  red: "#d55e00",
  purple: "#cc79a7",
} as const

/* SHAPES */

export function prism(points: Point[], depth: number): PrismShape {
  return {kind: "prism", points, depth}
}

/** A block whose top face is `w` x `h`. */
export function cuboid(w: number, h: number, depth: number): PrismShape {
  return prism([[0, 0], [0, h], [w, h], [w, 0]], depth)
}

export function cone(r1: number, r2: number, depth: number): ConeShape {
  return {kind: "cone", r1, r2, depth}
}

export function cylinder(diameter: number, depth: number): ConeShape {
  return cone(diameter / 2, diameter / 2, depth)
}

/** A regular polygon with `n` corners, starting `rotate` degrees from the bottom. */
export function polygon(n: number, rx: number, ry: number, depth: number, rotate = 0): PrismShape {
  const start = rotate * Math.PI / 180
  const delta = 2 * Math.PI / n
  const points: Point[] = []
  for (let i = 0; i < n; ++i) {
    const a = start + i * delta
    points.push([Math.sin(a) * rx + rx, Math.cos(a) * ry + ry])
  }
  return prism(roundPath(points), depth)
}

export function hexagon(diameter: number, depth: number, top: "flat" | "pointy" = "flat"): PrismShape {
  return polygon(6, diameter / 2, diameter / 2, depth, top === "flat" ? 0 : 30)
}

/** An octagon with flat sides on all four edges. Its width is about 0.92 of `diameter`. */
export function octagon(diameter: number, depth: number): PrismShape {
  return polygon(8, diameter / 2, diameter / 2, depth, 45 / 2)
}

export function octagonOfWidth(width: number, depth: number): PrismShape {
  return octagon(2 * width * 0.5412, depth)
}

export function star(n: number, big: number, small: number, depth: number, rotate = 0): PrismShape {
  const start = rotate * Math.PI / 180
  const delta = 2 * Math.PI / (n * 2)
  const points: Point[] = []
  for (let i = 0; i < n * 2; ++i) {
    const a = start + i * delta
    const r = i & 1 ? big : small
    points.push([Math.sin(a) * r + big, Math.cos(a) * r + big])
  }
  return prism(roundPath(points), depth)
}

/**
 * A prism from the `d` of an SVG path made of straight lines (M, L, H, V, Z, and lowercase).
 * Pass `reverse` if the sides come out on the wrong edges: the path is wound the other way.
 */
export function prismFromSvgPath(d: string, depth: number, reverse = false): PrismShape {
  const points = parsePath(d)
  if (reverse) points.reverse()
  return prism(roundPath(points), depth)
}

/* DRAWING */

/** Draws a piece in flat shades of `fill`, with stroked edges. */
export function drawPiece(shape: PieceShape, fill: string, options: DrawOptions = {}): CabinetPiece {
  return shape.kind === "prism" ? drawPrism(shape, fill, options) : drawCone(shape, fill, options)
}

/** Draws a highlight to place under a piece of the same shape, to mark it active or selected. */
export function outlinePiece(shape: PieceShape, color: string, style: PieceStyle = {}): CabinetPiece {
  return shape.kind === "prism" ? outlinePrism(shape, color, style) : outlineCone(shape, color, style)
}

interface Prepared {
  top: Point[]
  bot: Point[]
  w: number
  h: number
  dx: number
  dy: number
  origin: Point
}

function preparePrism({points, depth}: PrismShape, lean: "left" | "right"): Prepared {
  const dx = depth / 2, dy = depth / 2
  const [ox, oy, w, h] = bounds(points)
  let top = points.map(([x, y]): Point => [x - ox, y - oy])
  // Draw the mirror image leaning right, then mirror the drawing back. Mirroring
  // flips the winding, which decides which sides show, so reverse it too.
  if (lean === "left") top = top.map(([x, y]): Point => [w - x, y]).reverse()
  top = closePath(top)
  const bot = top.map(([x, y]): Point => [x + dx, y + dy])
  return {top, bot, w, h, dx, dy, origin: [ox, oy]}
}

// The sides seen from above-left are those under edges heading this way, given the winding of `cuboid`.
function isVisibleSide(a: Point, b: Point) {
  const angle = angleFromLine(a, b)
  return angle >= 315 || angle <= 135
}

function sideStrokes({top, bot}: Prepared) {
  const bottom: string[] = []
  const connect: string[] = []
  let on = false
  for (let i = 1; i < top.length; ++i) {
    if (isVisibleSide(top[i - 1], top[i])) {
      if (!on) connect.push(`M ${top[i - 1]} ${bot[i - 1]}`)
      bottom.push(`M ${bot[i - 1]} ${bot[i]}`)
      connect.push(`M ${top[i]} ${bot[i]}`)
      on = true
    } else {
      on = false
    }
  }
  // the first and last edges may both have drawn the same connecting line
  if (connect[0] === connect[connect.length - 1]) connect.pop()
  return {bottom, connect}
}

function drawPrism(shape: PrismShape, fill: string, options: DrawOptions): CabinetPiece {
  const lean = options.lean ?? "right"
  const p = preparePrism(shape, lean)
  const {top, bot, w, h, dx, dy, origin: [ox, oy]} = p
  const dark = brightness(fill, options.shade ?? 0.8)
  const stroke = options.stroke ?? "#000"
  const mirror = mirrorer(lean, w + dx)

  const fills: string[] = []
  for (let i = 1; i < top.length; ++i) {
    if (isVisibleSide(top[i - 1], top[i]))
      fills.push(`<path fill="${dark}" d="M ${top[i - 1]} ${top[i]} ${bot[i]} ${bot[i - 1]} z"/>`)
  }
  fills.push(`<path fill="${fill}" d="M ${top.join(" ")} z"/>`)

  const {bottom, connect} = sideStrokes(p)
  const strokes = `<path fill="none" stroke="${stroke}" d="\nM ${top.join(" ")} z\n${bottom.join(" ")}\n${connect.join("\n")}\n"/>`

  return emit(w, h, dx, dy, lean, options, [
    mirror(fills.join("\n")),
    symbolAt(options.symbol, (lean === "left" ? dx : 0) - ox, -oy),
    mirror(strokes),
  ])
}

function outlinePrism(shape: PrismShape, color: string, style: PieceStyle): CabinetPiece {
  const lean = style.lean ?? "right"
  const p = preparePrism(shape, lean)
  const {bottom, connect} = sideStrokes(p)
  const outline = outlineStroke(style)
  return emit(p.w, p.h, p.dx, p.dy, lean, style, [mirrorer(lean, p.w + p.dx)(
    `<g fill="${color}" stroke="${color}" stroke-width="${outline}">\n` +
    `<path d="M ${p.top.join(" ")} z ${bottom.join(" ")} ${connect.join(" ")}"/>\n` +
    `</g>`,
  )])
}

function coneArcs(c1: number, c2: number, r1: number, r2: number) {
  const [A, B, C, D] = twoCircleTangents([c1, c1], [c2, c2], r1, r2)
  return {
    A, B, C,
    ACA: `${r1} ${r1} 0 ${+(r2 < r1)} 1 ${C} ${r1} ${r1} 0 ${+(r1 < r2)} 1 ${A}`,
    CA: `${r1} ${r1} 0 ${+(r2 < r1)} 0 ${A}`,
    BD: `${r2} ${r2} 0 ${+(r1 < r2)} 0 ${D}`,
  }
}

function drawCone({r1, r2, depth}: ConeShape, fill: string, options: DrawOptions): CabinetPiece {
  const lean = options.lean ?? "right"
  const dx = depth / 2
  const dark = brightness(fill, options.shade ?? 0.8)
  const stroke = options.stroke ?? "#000"
  const size = r1 + r2
  const mirror = mirrorer(lean, size + dx)
  const {A, B, C, ACA, BD} = coneArcs(r1, r1 + dx, r1, r2)
  return emit(size, size, dx, dx, lean, options, [
    mirror(`<path fill="${dark}" d="M ${A} ${B} A ${BD} L ${C}"/>\n<circle fill="${fill}" cx="${r1}" cy="${r1}" r="${r1}"/>`),
    symbolAt(options.symbol, lean === "left" ? size + dx - 2 * r1 : 0, 0),
    mirror(`<path fill="none" stroke="${stroke}" d="M ${A} A ${ACA} L ${B} A ${BD} L ${C}"/>`),
  ])
}

function outlineCone({r1, r2, depth}: ConeShape, color: string, style: PieceStyle): CabinetPiece {
  const lean = style.lean ?? "right"
  const dx = depth / 2
  const size = r1 + r2
  const {B, C, CA, BD} = coneArcs(r1, r1 + dx, r1, r2)
  return emit(size, size, dx, dx, lean, style, [mirrorer(lean, size + dx)(
    `<g fill="${color}" stroke="${color}" stroke-width="${outlineStroke(style)}">\n` +
    `<path d="M ${C} A ${CA} L ${B} A ${BD} z"/>\n` +
    `</g>`,
  )])
}

/* OUTPUT */

function outlineStroke({strokeWidth = 1, outlineWidth = 3}: PieceStyle) {
  return outlineWidth * 2 + strokeWidth
}

function mirrorer(lean: "left" | "right", width: number) {
  if (lean === "right") return (svg: string) => svg
  return (svg: string) => `<g transform="matrix(-1 0 0 1 ${width} 0)">\n${svg}\n</g>`
}

function symbolAt(symbol: string | undefined, tx: number, ty: number) {
  if (!symbol) return ""
  if (tx === 0 && ty === 0) return symbol
  return `<g transform="translate(${tx},${ty})">\n${symbol}\n</g>`
}

function emit(w: number, h: number, dx: number, dy: number, lean: "left" | "right", style: PieceStyle, body: string[]): CabinetPiece {
  const {strokeWidth = 1, outlineWidth = 3} = style
  const outline = outlineStroke(style)
  const margin = outline / 2
  const width = Math.ceil(w + dx + outline)
  const height = Math.ceil(h + dy + outline)
  // The base face's box, matching the CSS margins printed by tools/cabinet.js.
  const near = outlineWidth + strokeWidth
  const x = lean === "right" ? outlineWidth + dx : near
  const y = outlineWidth + dy
  const footprint = {x, y, w: width - x - (lean === "right" ? near : outlineWidth + dx), h: height - y - near}
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">\n` +
    `<g transform="translate(${margin},${margin})" stroke-width="${strokeWidth}" stroke-linejoin="round" stroke-linecap="round">\n` +
    body.filter(s => s).join("\n") +
    "\n</g>\n</svg>\n"
  return {svg, width, height, footprint}
}

/* GEOMETRY */

/** Parses an SVG path of straight lines (M, L, H, V, Z, and lowercase) into its corners. */
export function parsePath(d: string): Point[] {
  let mode = "M"
  const path: Point[] = []
  const pen: Point = [0, 0]
  let k = 0
  for (const token of d.replaceAll(",", " ").split(/\s+/).filter(t => t)) {
    if ("MLHVZmlhvz".includes(token)) {
      mode = token
      k = 0
      continue
    }
    const v = Number(token)
    if (mode === "M" || mode === "L") pen[k++] = v
    if (mode === "m" || mode === "l") pen[k++] += v
    if (mode === "H") { pen[0] = v; k = 2 }
    if (mode === "h") { pen[0] += v; k = 2 }
    if (mode === "V") { pen[1] = v; k = 2 }
    if (mode === "v") { pen[1] += v; k = 2 }
    if (k === 2) {
      path.push([pen[0], pen[1]])
      k = 0
    }
  }
  return path
}

export function roundPath(points: Point[]): Point[] {
  return points.map(([x, y]) => [Math.round(x), Math.round(y)])
}

function closePath(points: Point[]): Point[] {
  const [first, last] = [points[0], points[points.length - 1]]
  return first[0] === last[0] && first[1] === last[1] ? points : [...points, first]
}

function bounds(points: Point[]): [x: number, y: number, w: number, h: number] {
  const xs = points.map(p => p[0]), ys = points.map(p => p[1])
  const x0 = Math.min(...xs), y0 = Math.min(...ys)
  return [x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0]
}

// Degrees counterclockwise from east, on screen: north is 90.
function angleFromLine([x1, y1]: Point, [x2, y2]: Point) {
  return Math.round(360 + Math.atan2(-(y2 - y1), x2 - x1) * 180 / Math.PI) % 360
}

// https://mathworld.wolfram.com/Circle-CircleTangents.html
function twoCircleTangents(c1: Point, c2: Point, r1: number, r2: number): [Point, Point, Point, Point] {
  r1 = Math.max(0.01, r1)
  r2 = Math.max(0.01, r2)
  const dist = Math.hypot(c2[0] - c1[0], c2[1] - c1[1])
  const H = Math.sqrt(dist * dist - (r1 - r2) * (r1 - r2))
  const Y = Math.hypot(H, r2)
  const axis = Math.atan2(c2[1] - c1[1], c2[0] - c1[0])
  const theta = Math.acos((r1 * r1 + dist * dist - Y * Y) / (2 * r1 * dist))
  const A: Point = [c1[0] + r1 * Math.cos(axis + theta), c1[1] + r1 * Math.sin(axis + theta)]
  const B: Point = [A[0] + H * Math.cos(axis + theta - Math.PI / 2), A[1] + H * Math.sin(axis + theta - Math.PI / 2)]
  const C: Point = [c1[0] + r1 * Math.cos(axis - theta), c1[1] + r1 * Math.sin(axis - theta)]
  const D: Point = [C[0] + H * Math.cos(axis - theta + Math.PI / 2), C[1] + H * Math.sin(axis - theta + Math.PI / 2)]
  return [A, B, C, D]
}
