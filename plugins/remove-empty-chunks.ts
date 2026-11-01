import type {Plugin} from 'vite'

/** about.html and create.html have no scripts, yet each still gets an empty chunk and a tag loading it. */
export function removeEmptyChunks(): Plugin {
  return {
    name: 'removeEmptyChunks',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type !== 'chunk' || chunk.code.trim()) continue
        delete bundle[fileName]
        const tag = new RegExp(`\\s*<script\\b[^>]*\\bsrc="[^"]*/?${fileName.replaceAll('.', '\\.')}"[^>]*></script>`, 'g')
        for (const asset of Object.values(bundle)) {
          if (asset.type === 'asset' && asset.fileName.endsWith('.html'))
            asset.source = String(asset.source).replace(tag, '')
        }
      }
    },
  }
}
