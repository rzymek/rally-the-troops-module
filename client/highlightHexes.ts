import {isEmpty} from "./isEmpty.ts";

/** Needs `<style id="cssOverrides">` on the page, and hexes styled with `fill: var(--hex-fill, transparent)`. */

export function highlightHexes(hexes: string[] | undefined, color: string) {
  const cssOverrides = document.getElementById('cssOverrides')!;
  if (isEmpty(hexes)) {
    return;
  }
  cssOverrides.textContent += `
    ${hexes.map(id => `#${CSS.escape(id)}`).join(',')} {
        --hex-fill: ${color};
  }`
}

export function clearHexHighlights() {
  document.getElementById('cssOverrides')!.textContent = '';
}