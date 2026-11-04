# @rzymek/rally-the-troops-module

Shared toolchain, typings and helpers for writing Rally the Troops modules in TypeScript.

| Import | For |
|---|---|
| `@rzymek/rally-the-troops-module/vite` | `defineRttModule()`, in `vite.config.ts` |
| `@rzymek/rally-the-troops-module/rules` | State types, hex maths, `nextActiveRole`, `isEmpty` |
| `@rzymek/rally-the-troops-module/client` | SVG, layer, piece placement and hex highlight helpers, `isEmpty` |
| `@rzymek/rally-the-troops-module/pieces` | SVG blocks, cylinders and other wooden pieces in cabinet projection |
| `@rzymek/rally-the-troops-module/rules/framework` | Ambient types of the rules framework |
| `@rzymek/rally-the-troops-module/client/globals` | Ambient types of the RTT client |
| `@rzymek/rally-the-troops-module/testing` | `stubFramework()`, for vitest |
| `@rzymek/rally-the-troops-module/tsconfig.json` | Base for `extends` |
| `node_modules/@rzymek/rally-the-troops-module/oxlint.base.json` | Base for `extends` in `.oxlintrc.json` |
| `node_modules/@rzymek/rally-the-troops-module/client/*.html` | Page partials, for `<load src="..."/>` |

## The rules of the bundle

`framework.js` is appended to `rules.js` after bundling, and links to your code **by name**. Neither tsc nor the bundler can see these go wrong:

- `G`, `L`, `R`, `V`, `P`, `ROLES`, `on_setup` and `on_view` must be declared at the top level of your rules code, in the rules bundle. That's why they live in your game and not here.
- Your own top-level names must not clash with the framework's, such as `log`, `action`, `call` or `roles`.
- `rules.js` must be self-contained. Code imported at runtime by both the rules and the client gets split into a separate chunk, which the server can't load, so the build fails. Share only types; give each side its own copy of anything else. This is why `isEmpty` exists twice here.

## Starting a new module

Install it with `pnpm add @rzymek/rally-the-troops-module`.

Also add `vite`, plus `typescript` with `@types/node`, `vitest` and `oxlint` if you use them, as dev dependencies.

```ts
// vite.config.ts
import {defineRttModule} from '@rzymek/rally-the-troops-module/vite'

export default defineRttModule({outDir: '../../server/public/my-game/'})
```

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

## Hex helpers

They assume hexes named `A<nn>.B<nn>`. Anything that depends on the shape of the board takes an `isOnBoard(a, b)` function. `createHexCenterLocator` and `highlightHexes` state what they need from the page in their doc comments.

## Tests

```ts
beforeEach(() => stubFramework({random: () => 3}))
```

The set, map, array and object helpers are the framework's real code, the control flow is spies, and `random` throws unless you supply it. Call `vi.unstubAllGlobals()` if a later test needs a clean slate.

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
