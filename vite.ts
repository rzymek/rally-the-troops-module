import {createLogger, defineConfig, type PluginOption, type UserConfig} from 'vite'
import injectHTML from 'vite-plugin-html-inject'
import {appendFramework} from './plugins/append-framework.ts'
import {cleanupSvg} from './plugins/cleanup-svg.ts'
import {covers} from './plugins/covers-plugin.ts'
import {flattenHtmlOutputs} from './plugins/flatten-html-outputs.ts'
import {removeEmptyChunks} from './plugins/remove-empty-chunks.ts'

// Harmless for an RTT page: /common/client.js and friends are served by the RTT server.
const SUPPRESSED = [
  "can't be bundled without type=\"module\"",
  "doesn't exist at build time",
]

function quietLogger() {
  const logger = createLogger()
  const warn = logger.warn.bind(logger)
  const warnOnce = logger.warnOnce.bind(logger)
  const suppress = (msg: string) => SUPPRESSED.some(s => msg.includes(s))
  logger.warn = (msg, options) => {
    if (!suppress(msg)) warn(msg, options)
  }
  logger.warnOnce = (msg, options) => {
    if (!suppress(msg)) warnOnce(msg, options)
  }
  return logger
}

export interface RttModuleOptions {
  /** Where the module is published, usually `<server>/public/<title>/`. */
  outDir: string
  /** Game-specific plugins, added after the standard ones. */
  plugins?: PluginOption[]
}

export function defineRttModule({outDir, plugins = []}: RttModuleOptions): UserConfig {
  return defineConfig({
    customLogger: quietLogger(),
    plugins: [
      covers(),
      injectHTML(),
      cleanupSvg(),
      removeEmptyChunks(),
      flattenHtmlOutputs(),
      appendFramework(),
      ...plugins,
    ],
    base: './',
    build: {
      outDir,
      minify: false,
      modulePreload: false,
      rollupOptions: {
        preserveEntrySignatures: 'exports-only',
        onwarn(warning, defaultHandler) {
          if (warning.code === 'EVAL') return
          defaultHandler(warning)
        },
        input: {
          play: 'src/play/play.html',
          about: 'src/about.html',
          create: 'src/create.html',
          rules: 'src/rules/index.ts',
        },
        output: {
          format: 'commonjs',
          cleanDir: true,
          chunkFileNames: '[name][extname]',
          entryFileNames: '[name].js',
          assetFileNames: '[name][extname]',
        },
      },
    },
  })
}
