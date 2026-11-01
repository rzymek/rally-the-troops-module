import type { Plugin, ResolvedConfig } from 'vite';
import { readdirSync, readFileSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join, basename } from 'path';

export function flattenHtmlOutputs(): Plugin {
  let outDir: string;
  return {
    name: 'flattenHtmlOutputs',
    apply: 'build',
    configResolved(config: ResolvedConfig) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const srcDir = join(outDir, 'src');
      if(!existsSync(srcDir)){
        return;
      }
      for (const file of readdirSync(srcDir, { recursive: true }) as string[]) {
        if (file.endsWith('.html')) {
          const src = join(srcDir, file);
          const dest = join(outDir, basename(file));
          const content = readFileSync(src, 'utf8')
            .replace(/\b(src|href)="(?:\.\.\/)+/g, '$1="./');
          writeFileSync(dest, content);
        }
      }
      rmSync(srcDir, { recursive: true, force: true });
    },
  };
}
