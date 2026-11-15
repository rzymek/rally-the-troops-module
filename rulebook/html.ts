import type {PdfDocument, PdfFont} from "./parse.ts"

export interface RulebookHtmlOptions {
  /** The page title. */
  title: string
  /** Background image of a page, relative to the HTML file. */
  image: (page: number) => string
  /**
   * The CSS font-family for a PDF font, e.g. `"Source Sans",sans-serif`. The RTT server serves
   * Source Sans, Source Serif, Tinos and Gentium Basic from /fonts/fonts.css.
   * By default, fonts whose name looks sans-serif get Source Sans, the rest Source Serif.
   */
  fontFamily?: (font: PdfFont) => string
  /** Extra CSS, e.g. `@font-face` rules for the fonts `fontFamily` names. */
  css?: string
}

const SANS = /sans|arial|helvetica|gothic|grotesk|futura|myriad|frutiger|univers|verdana|calibri|segoe|roboto|lato|montserrat|din\b/i

export function defaultFontFamily(font: PdfFont): string {
  return SANS.test(font.family) ? `"Source Sans",sans-serif` : `"Source Serif",serif`
}

/** Points, without trailing zeros. */
function pt(value: number): string {
  return `${Number(value.toFixed(1))}pt`
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

/**
 * The substitute fonts are not as wide as the PDF's, so each line is stretched to the width it had in the PDF,
 * once the fonts have loaded. `data-w` is that width in points.
 */
const FIT_SCRIPT = `
function fit() {
	for (const p of document.querySelectorAll("p[data-w]")) {
		p.style.transform = ""
		const scale = p.dataset.w * 4 / 3 / p.offsetWidth
		if (scale > 0.5 && scale < 2 && Math.abs(scale - 1) > 0.01)
			p.style.transform = "scaleX(" + scale.toFixed(3) + ")"
	}
}
document.fonts.ready.then(fit)
`

/**
 * Renders the pages as the RTT rules pages do: each page a box with the page, without its text, as the
 * background, and each line of text absolutely positioned on top of it, so it can be searched, selected and
 * translated, and stays sharp when zoomed.
 */
export function renderRulebookHtml(doc: PdfDocument, options: RulebookHtmlOptions): string {
  const fontFamily = options.fontFamily ?? defaultFontFamily
  const used = new Set(doc.pages.flatMap(page => page.texts.map(text => text.font)))
  const fontCss = [...doc.fonts.values()]
    .filter(font => used.has(font.id))
    .map(font => {
      const color = font.color.toLowerCase() === "#000000" ? "" : `;color:${font.color}`
      return `.f${font.id}{font-family:${fontFamily(font)};font-size:${pt(font.size)}${color}}`
    })
  const maxWidth = Math.max(0, ...doc.pages.map(page => page.width))
  // 1pt = 4/3 CSS px, plus room for the margins and shadow.
  const viewport = Math.ceil(maxWidth * 4 / 3) + 40

  const pages = doc.pages.map(page => {
    const texts = page.texts.map(text => {
      const style = `top:${pt(text.top)};left:${pt(text.left)};line-height:${pt(text.height)}`
      return `<p class="f${text.font}" style="${style}" data-w="${text.width.toFixed(1)}">${text.html}</p>\n`
    })
    const style = `background-image:url('${options.image(page.number)}');width:${pt(page.width)};height:${pt(page.height)}`
    return `<div id="page${page.number}" style="${style}">\n${texts.join("")}</div>\n`
  })

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${viewport}">
<title>${escapeHtml(options.title)}</title>
<link rel="stylesheet" href="/fonts/fonts.css">
<style>
body{background-color:slategray;margin:0;padding:1px 0}
div{position:relative;background-color:white;background-size:100% 100%;margin:1em auto;box-shadow:1px 1px 8px -2px black}
p{position:absolute;white-space:pre;margin:0;transform-origin:0 0}
a{color:inherit}
${fontCss.join("\n")}
${options.css ?? ""}
</style>
</head>
<body>

${pages.join("\n")}
<script>${FIT_SCRIPT}</script>
</body>
</html>
`
}
