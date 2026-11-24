# @rzymek/rally-the-troops-module

Shared toolchain, typings and helpers for writing Rally the Troops modules in TypeScript.

| Import | For |
|---|---|
| `@rzymek/rally-the-troops-module/vite` | `defineRttModule()`, in `vite.config.ts` |
| `@rzymek/rally-the-troops-module/rules` | State types, hex maths and offset hex grids, `reachable`, `nextActiveRole`, `isEmpty`, `rollDie`, `normalizeOptions`, `afterEachAction`, `ref` |
| `@rzymek/rally-the-troops-module/client` | SVG, layer, piece placement and hex highlight helpers, `createLogRenderer`, `actionFor`, `isEmpty` |
| `@rzymek/rally-the-troops-module/pieces` | SVG blocks, cylinders and other wooden pieces in cabinet projection |
| `@rzymek/rally-the-troops-module/rules/framework` | Ambient types of the rules framework |
| `@rzymek/rally-the-troops-module/client/globals` | Ambient types of the RTT client |
| `@rzymek/rally-the-troops-module/rulebook` | `buildRulebook()`, PDF rules to an HTML page; also the `rtt-rulebook` command |
| `@rzymek/rally-the-troops-module/testing` | `stubFramework()`, `offered()`, `gotoRecorder()`, `frameworkNameClashes()`, for vitest; `playRandomGames()`, for scripts |
| `@rzymek/rally-the-troops-module/map` | `importAreas()`, `readMapSvg()` and polygon geometry, for map build scripts |
| `@rzymek/rally-the-troops-module/tools` | `serveTerrainEditor()`, for a module's terrain editor |
| `@rzymek/rally-the-troops-module/tsconfig.json` | Base for `extends` |
| `node_modules/@rzymek/rally-the-troops-module/oxlint.base.json` | Base for `extends` in `.oxlintrc.json` |
| `node_modules/@rzymek/rally-the-troops-module/client/*.html` | Page partials, for `<load src="..."/>` |

## The rules of the bundle

`framework.js` is appended to `rules.js` after bundling, and links to your code **by name**. Neither tsc nor the bundler can see these go wrong:

- `G`, `L`, `R`, `V`, `P`, `ROLES`, `on_setup` and `on_view` must be declared at the top level of your rules code, in the rules bundle. That's why they live in your game and not here.
- Your own top-level names must not clash with the framework's, such as `log`, `action`, `call` or `roles`.
- `rules.js` must be self-contained. Code imported at runtime by both the rules and the client gets split into a separate chunk, which the server can't load, so the build fails. Share only types; give each side its own copy of anything else. This is why `isEmpty` exists twice here.

## Starting a new module

The easiest way is to copy `modules/module-template`, a runnable module built on this package; see its README.

Otherwise, install it with `pnpm add @rzymek/rally-the-troops-module`.

Also add `vite`, plus `typescript` with `@types/node`, `vitest` and `oxlint` if you use them, as dev dependencies.

```ts
// vite.config.ts
import {defineRttModule} from '@rzymek/rally-the-troops-module/vite'

export default defineRttModule({name: 'my-game'})
```

The build writes to `$RTT_DIR/public/<name>/`, so set `RTT_DIR` to your rally-the-troops server directory.

```ts
// src/rtt-env.d.ts
import "@rzymek/rally-the-troops-module/rules/framework"
import "@rzymek/rally-the-troops-module/client/globals"
```

Expected files:

```
cover.png or cover.jpg     thumbnail and covers are generated from it
public/title.sql           registers the game with the server
src/about.html
src/create.html
src/play/play.html         with <svg id="map"> inside <main>; loads the partials and play.ts
src/rules/index.ts         the state globals and the on_setup and on_view exports
```

Rules globals, typed with the bases from this package:

```ts
import type {BaseGameState, BaseViewState, FrameState, StateDefinition} from "@rzymek/rally-the-troops-module/rules"

export let G: BaseGameState & {/* your state */}
export let L: FrameState
export let R!: number
export let V: BaseViewState & {/* your view */}
export const P: Record<string, StateDefinition | string | Array<() => void>> = {}
export const ROLES = ["White", "Black"]
```

On the client, merge your types into the globals in a `.d.ts`:

```ts
declare global {
  interface GameView extends MyView {}      // the type of `view`
  interface GameTypes {player: MyRoleName}  // narrows `player`, otherwise a string
}
```

## Rulebook

The official modules publish their rules as an HTML page, not a PDF: each page is an image of the PDF page
without its text, with the text laid over it as HTML, so it can be searched, selected and translated, and stays sharp
when zoomed. `rtt-rulebook` makes one from your PDF. It needs `pdftohtml` (poppler-utils) and Ghostscript.

```sh
pnpm exec rtt-rulebook resources/rules.pdf --title "My Game - Rules"
```

This writes `public/info/rules.html` and `rules1.jpg`, `rules2.jpg`, ... next to it; Vite copies `public` to the
build, so link to `/my-game/info/rules.html` from `about.html` and the play page's menu. Commit the output, so building
the module doesn't need the PDF tools. `--out`, `--name`, `--dpi` (150) and `--quality` (80) change the defaults; run
it again when the PDF changes, and it removes the images of pages that are gone.

The text is set in Source Serif, or Source Sans for fonts with sans-like names, which the RTT server provides, and each
line is stretched to its width in the PDF so it stays on the artwork. To use other fonts, call `buildRulebook()` from a
script with `fontFamily` (a PDF font to a CSS font-family) and `css` (for `@font-face` rules).

## Area maps

`@rzymek/rally-the-troops-module/map` is for build scripts (Node), not the bundles: `parsePath` turns SVG path data
(absolute or relative, curves flattened) into polygons, and `contains`, `distanceToSegment`, `polygonDistance` and
`anchorOf` (the point deepest inside a polygon, where pieces go) measure them. Ironwood imports its hand-drawn
`map-areas.svg` with them.

`importAreas(svgText, {parser, layer = "areas", minBorder = 8})` does the whole import: every path, polygon or rect
of the layer (a `<g>` with that id or Inkscape label), transforms applied, with its id, label and anchor, and the
borders between the areas that share at least `minBorder` of it (touching at a corner doesn't count), with their
middle points. Pass a DOMParser, e.g. `new DOMParser()` from `@xmldom/xmldom`.

`readMapSvg(svgText)` reads a module's map.svg without a DOM: the viewBox size, each space's anchor (`data-anchor`,
or a hex `<use>`'s translate) and the hex outline.

## Terrain editor

`serveTerrainEditor({root, layers, borders, regenerate, ...})` (`/tools`, Node) serves a page over the map where
terrain is marked by clicking: `"space"` layers (hexes or areas) and `"border"` layers (hexsides or area borders).
The terrain is kept in a JSON file (a list of keys per layer); Submit checks the changes against the map, saves them
and runs the `regenerate` scripts. The module template's `tools/terrain-editor.ts` sets it up.

## Menu links

`add_main_menu_item_link_newtab(text, url)` (client): `add_main_menu_item_link`, but the link opens in a new tab, as
the official modules' rules links do. It returns the link.

```ts
add_main_menu_item_link_newtab("Rules", "/my-game/info/rules.html")
```

## Prompt helpers

`hideStaleArgumentButtons(verb)` (client): `action_button_with_argument` only updates a button when called again with
the same argument, so buttons of arguments no longer offered stay visible; call this after drawing them.

`offered(state)` and `gotoRecorder(L, P)` (testing): what a state's prompt offers (actions by verb, buttons,
text), and a `goto` that resets the local scope, records the state name and runs `_begin`, as the framework does.

## Options, state hooks

`normalizeOptions(options)` (rules): the create page's checkboxes (`"true"`, or left out) and the fuzzer's booleans
as `Record<string, boolean>`, for on_setup.

`afterEachAction(state, hook)` (rules): runs `hook` after every action handler of a state (not after `prompt` or
the `_begin`/`_end`/`_resume` hooks), e.g. to update control of the map or check for victory.

## Log references

One syntax for naming things in the log, so the client can link them: `{<kind>:<id>:<name>}`. Write it with
`ref(kind, id, name)` (rules), e.g. `ref("p", piece.id, piece.name)`; `plainText(text)` strips the markup (both sides
have it). On the client, `createLogRenderer()` returns an `on_log`:

```ts
on_log = createLogRenderer({
  targets: {
    p: id => [...document.querySelectorAll(`[data-piece="${id}"]`)],
    s: id => [document.getElementById(id)].filter(it => it !== null),
  },
  lineClasses: [[/\beliminated\b/, "loss"]],      // a class for the line, by what it says
  wordClasses: [[/\b(Red|Blue)\b/g, "side"]],     // a span with a class, around words
})
```

A line's leading `.class ` tokens become classes of the line (`.h1 Turn 3`), `*bold*` is bold, and a reference shows
its name in a `span.ref.ref-<kind>`: hovering it puts `log-focus` on the kind's targets, clicking pans the map to the
first one. Don't `ref` a piece the reader may not identify: its id gives it away (write "a block" instead).
`parseLogLine(text)` is the parser alone.

## Clicks, layers, SVG

`actionFor(verbs, argument)` (client): the first verb whose action list in the view includes the argument: what a
click on a space or piece means right now. `svgElement(name, attributes, parent?)` creates an SVG element,
`ensureLayer(id, {before})` gets or creates a `<g>` layer, `escapeHtml(text)` is for `on_prompt`.

`client/aside.html` has a `#turn_info` div between the roles and the log, for a line or two about the turn; it is
hidden while empty.

## Offset hex grids

Most wargame maps have flat-topped hexes in columns, every other column shifted by half a hex, named by their printed
column and row. `createOffsetHexGrid({columns, rows, shifted, isOnMap?, format?})` (rules) gives their `hexes`,
`neighbors`, `distance`, `step`, `sideKey` and `point`; ids are `"CCRR"` (`HEX_FORMATS.fourDigit`, the default) or
`"C.RR"` (`HEX_FORMATS.dotted`). `shifted` says which columns sit half a hex further towards the higher rows.

`reachable(graph, starts, mp, {cost, canStop?, oneSpaceRule?})` finds the cheapest cost of every space a unit can get
to (Dijkstra), on a hex grid or anything with `neighbors()`, and `pathTo(reach, space)` the way there.

## Hex helpers (`A<nn>.B<nn>`)

They assume hexes named `A<nn>.B<nn>`. Anything that depends on the shape of the board takes an `isOnBoard(a, b)` function. `createHexCenterLocator` and `highlightHexes` state what they need from the page in their doc comments.

## Tests

```ts
beforeEach(() => stubFramework({random: () => 3}))
```

The set, map, array and object helpers are the framework's real code, the control flow is spies, and `random` throws unless you supply it. Call `vi.unstubAllGlobals()` if a later test needs a clean slate.

`frameworkNameClashes(rulesDir)` lists the rules' top-level declarations that would replace one of framework.js's
(a `resume` or `finish` of your own): rules.js puts both in one scope, so nothing else notices.

```ts
it("clashes with no framework name", () => expect(frameworkNameClashes(new URL("./", import.meta.url).pathname)).toEqual([]))
```

`pnpm test` here builds `test/fixture` and plays it through the real framework, which guards the rules above. `pnpm check:types` type-checks the package.

## Releasing

Bump `version` in `package.json`, commit, then push a matching tag. The `Publish to npm` workflow checks, tests and publishes it.

```sh
git tag v0.1.1 && git push origin master v0.1.1
```

## Blocks and other wooden pieces

`pieces` is a typed port of the RTT server's `tools/cabinet.js`, and draws the same SVG. It doesn't touch the DOM or the file system, so it runs in the browser or in a build script.

```ts
import {cuboid, drawPiece, outlinePiece} from "@rzymek/rally-the-troops-module/pieces"
import {createSvgPieceAt, sortCabinetOrder} from "@rzymek/rally-the-troops-module/client"

const block = cuboid(20, 20, 40)                  // top face 20 x 20, 40 deep
const french = drawPiece(block, "#56b4e9")        // {svg, width, height, footprint}
const selected = outlinePiece(block, "#0ff")      // put it under the piece
const fireStone = drawPiece(cuboid(105, 20, 20), "#ad262e", {lean: "left"})

layer.append(createSvgPieceAt(hexCenter("A01.B02"), french))
sortCabinetOrder(layer)                           // nearer pieces on top
```

The shapes are `cuboid`, `cylinder`, `cone`, `polygon`, `hexagon`, `octagon`, `star`, `prism` and `prismFromSvgPath`. Pass `symbol` to draw SVG markup on the top face. `footprint` is the box of the face the piece stands on. `createSvgPieceAt` centres that box on the point, and for CSS it gives the negative margins that verdun's `play.css` uses.

## Dice

`rollDie(sides = 6)` clears the undo stack, then rolls. Roll every die through it: if a die is rolled while undo
is possible, a player can undo and roll again, and the server's fuzzer reports a `BadUndo`.

## Random games

`playRandomGames()` plays the built `rules.js` with random actions, never Undo, and returns the games, with their
result and final state. Unlike the server's fuzzer, a script can then count what happened in the logs:

```ts
import {playRandomGames} from "@rzymek/rally-the-troops-module/testing"

const games = playRandomGames({
  rulesPath: `${process.env.RTT_DIR}/public/my-game/rules.js`,
  games: 20,
  options: game => ({some_option: game % 2 === 1}),
})
for (const game of games) console.log(game.scenario, game.steps, game.result ?? "unfinished", game.message)
```
