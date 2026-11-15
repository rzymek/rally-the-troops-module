/** A font as `pdftohtml -xml` reports it, scaled back to points. */
export interface PdfFont {
  id: string
  /** Points. */
  size: number
  /** Without the subset prefix, e.g. `Questa-Bold`. */
  family: string
  /** `#rrggbb` */
  color: string
}

/** One run of text in one font. Coordinates in points from the page's top left corner. */
export interface PdfText {
  top: number
  left: number
  width: number
  height: number
  font: string
  /** HTML: escaped text, with only `<b>`, `<i>` and `<a href="http...">` kept. */
  html: string
}

export interface PdfPage {
  number: number
  /** Points. */
  width: number
  height: number
  texts: PdfText[]
}

export interface PdfDocument {
  pages: PdfPage[]
  fonts: Map<string, PdfFont>
}

function attributes(tag: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [, key, value] of tag.matchAll(/([\w-]+)="([^"]*)"/g)) result[key] = value
  return result
}

/** Keeps bold, italics and links to the web; drops other tags, such as links within the PDF. */
function sanitize(inner: string): string {
  const keptLinks: boolean[] = []
  return inner.replace(/<[^>]*>/g, tag => {
    if (/^<\/?[bi]>$/.test(tag)) return tag
    if (/^<a\b/.test(tag)) {
      const href = /\bhref="(https?:[^"]*)"/.exec(tag)
      keptLinks.push(href !== null)
      return href ? `<a href="${href[1]}" target="_blank">` : ""
    }
    if (tag === "</a>") return keptLinks.pop() ? tag : ""
    return ""
  })
}

/**
 * Parses the output of `pdftohtml -xml -zoom <zoom> -noroundcoord`.
 * Divides by `zoom`, so pass the same zoom to get points back.
 */
export function parsePdfXml(xml: string, zoom = 1): PdfDocument {
  const fonts = new Map<string, PdfFont>()
  const pages: PdfPage[] = []
  const n = (value: string | undefined) => Number(value ?? 0) / zoom

  // Font ids are global: a font is declared on the first page that uses it.
  for (const [tag] of xml.matchAll(/<fontspec\b[^>]*>/g)) {
    const a = attributes(tag)
    fonts.set(a.id, {
      id: a.id,
      size: n(a.size),
      family: (a.family ?? "").replace(/^[A-Z]{6}\+/, ""),
      color: a.color ?? "#000000",
    })
  }

  for (const [, pageTag, body] of xml.matchAll(/(<page\b[^>]*>)([\s\S]*?)<\/page>/g)) {
    const a = attributes(pageTag)
    const texts: PdfText[] = []
    for (const [, textTag, inner] of body.matchAll(/(<text\b[^>]*>)([\s\S]*?)<\/text>/g)) {
      const t = attributes(textTag)
      const html = sanitize(inner)
      if (html.replace(/<[^>]*>/g, "").trim() === "") continue
      texts.push({top: n(t.top), left: n(t.left), width: n(t.width), height: n(t.height), font: t.font, html})
    }
    pages.push({number: Number(a.number), width: n(a.width), height: n(a.height), texts})
  }

  return {pages, fonts}
}
