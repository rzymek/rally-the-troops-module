import type { Plugin } from 'vite';

export function cleanupSvg(): Plugin {
  return {
    name: 'cleanupSvg',
    transformIndexHtml(html: string) {
      return html.replace(/file:\/\/\/.*?\/public\//g, './');
    },
  };
}
