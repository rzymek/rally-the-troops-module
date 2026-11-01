import type { Plugin } from 'vite';
import { existsSync, readFileSync } from 'fs';
import { join, basename, extname } from 'path';

type Fit = 'inside' | 'fill';

const JPEG_OPTIONS = { progressive: true, quality: 95, chromaSubsampling: '4:4:4' as const };

export function covers(root?: string): Plugin {
  let resolvedRoot: string;
  return {
    name: 'covers',
    apply: 'build',
    configResolved(config) {
      resolvedRoot = root ?? config.root;
    },
    async buildStart() {
      for (const filename of ['cover.jpg', 'cover.png']) {
        const coverPath = join(resolvedRoot, filename);
        if (!existsSync(coverPath)) continue;

        const sharp = (await import('sharp')).default;
        const { width = 0, height = 0 } = await sharp(coverPath).metadata();
        const isPortrait = width < height;
        const isSquare = width === height;

        let th: [number, number], s1x: [number, number], s2x: [number, number], fit: Fit;
        if (isPortrait) {
          th = [108, 144]; s1x = [150, 200]; s2x = [300, 400]; fit = 'fill';
        } else if (isSquare) {
          th = [120, 120]; s1x = [170, 170]; s2x = [340, 340]; fit = 'fill';
        } else {
          th = [120, 144]; s1x = [170, 200]; s2x = [340, 400]; fit = 'inside';
        }

        const base = basename(filename, extname(filename));
        const [thumbnail, cover1x, cover2x] = await Promise.all([
          sharp(coverPath).resize(th[0], th[1], { fit }).toColorspace('srgb').jpeg(JPEG_OPTIONS).toBuffer(),
          sharp(coverPath).resize(s1x[0], s1x[1], { fit }).toColorspace('srgb').jpeg(JPEG_OPTIONS).toBuffer(),
          sharp(coverPath).resize(s2x[0], s2x[1], { fit }).toColorspace('srgb').jpeg(JPEG_OPTIONS).toBuffer(),
        ]);

        this.emitFile({ type: 'asset', fileName: 'thumbnail.jpg', source: thumbnail });
        this.emitFile({ type: 'asset', fileName: `${base}.1x.jpg`, source: cover1x });
        this.emitFile({ type: 'asset', fileName: `${base}.2x.jpg`, source: cover2x });
        this.emitFile({ type: 'asset', fileName: filename, source: readFileSync(coverPath) });
      }
    },
  };
}
