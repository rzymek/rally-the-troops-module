import type {Plugin} from 'vite';
import {readFileSync} from "node:fs"

export function appendFramework(): Plugin {
  return {
    name: 'appendFramework',
    generateBundle(_opts, bundle) {
      const chunk = bundle['rules.js']
      if (chunk?.type !== 'chunk') return
      // The server loads rules.js alone, and the framework links to the game by name within that one file.
      // Code imported at runtime by both the rules and the client gets split out, so it needs a copy per side.
      if (chunk.imports.length > 0)
        this.error(`rules.js must be self-contained, but imports ${chunk.imports.join(', ')}: don't share runtime code between the rules and the client`)
      const js = readFileSync(import.meta.dirname + "/framework.js", {encoding: 'utf-8'})
      chunk.code = chunk.code + '\n\n' + js;
    }
  }
}
