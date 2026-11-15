import {execFileSync} from "node:child_process"
import {mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync} from "node:fs"
import {tmpdir} from "node:os"
import {basename, extname, join} from "node:path"
import {renderRulebookHtml, type RulebookHtmlOptions} from "./html.ts"
import {parsePdfXml} from "./parse.ts"

export {defaultFontFamily, renderRulebookHtml, type RulebookHtmlOptions} from "./html.ts"
export {parsePdfXml, type PdfDocument, type PdfFont, type PdfPage, type PdfText} from "./parse.ts"

export interface RulebookOptions {
  /** The PDF to convert. */
  pdf: string
  /** Where to write `<name>.html` and its page images, e.g. `public/info`. */
  outDir: string
  /** Base name of the HTML file and the images (`rules` gives rules.html, rules1.jpg, ...). */
  name?: string
  /** The page title. By default, the PDF's file name. */
  title?: string
  /** Resolution of the page images. */
  dpi?: number
  /** JPEG quality of the page images, 1 to 100. */
  quality?: number
  fontFamily?: RulebookHtmlOptions["fontFamily"]
  css?: string
}

export interface RulebookResult {
  html: string
  images: string[]
}

// Font sizes are reported in whole units, so extract at the largest zoom pdftohtml allows, 3, for a third of a point.
const ZOOM = 3

function run(command: string, args: string[], hint: string): string {
  try {
    return execFileSync(command, args, {encoding: "utf-8", maxBuffer: 1 << 30, stdio: ["ignore", "pipe", "pipe"]})
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error(`${command} not found. ${hint}`)
    const stderr = (error as {stderr?: string}).stderr?.trim()
    throw new Error(`${command} failed${stderr ? `: ${stderr}` : ""}`)
  }
}

/**
 * Converts a PDF rulebook to an HTML page, the way the official RTT modules' rules are published: page images
 * without the text, with the text laid over them as HTML.
 *
 * Needs `pdftohtml` (poppler-utils) for the text and Ghostscript (`gs`) for the images.
 */
export async function buildRulebook(options: RulebookOptions): Promise<RulebookResult> {
  const {pdf, outDir, name = "rules", dpi = 150, quality = 80} = options
  const title = options.title ?? basename(pdf, extname(pdf))

  const xml = run("pdftohtml",
    ["-xml", "-i", "-q", "-nodrm", "-noroundcoord", "-fontfullname", "-zoom", String(ZOOM), "-stdout", pdf],
    "Install poppler-utils.")
  const doc = parsePdfXml(xml, ZOOM)
  if (doc.pages.length === 0) throw new Error(`pdftohtml found no pages in ${pdf}`)

  mkdirSync(outDir, {recursive: true})
  const stale = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\d+\\.jpg$`)
  for (const file of readdirSync(outDir)) if (stale.test(file)) rmSync(join(outDir, file))

  const sharp = (await import("sharp")).default
  const tmp = mkdtempSync(join(tmpdir(), "rtt-rulebook-"))
  const images: string[] = []
  try {
    run("gs", [
      "-q", "-dSAFER", "-dBATCH", "-dNOPAUSE",
      "-dFILTERTEXT", // the text goes in the HTML
      "-sDEVICE=png16m", `-r${dpi}`, "-dGraphicsAlphaBits=4", "-dTextAlphaBits=4",
      `-sOutputFile=${join(tmp, "%d.png")}`, pdf,
    ], "Install Ghostscript.")
    for (const page of doc.pages) {
      const image = join(outDir, `${name}${page.number}.jpg`)
      await sharp(join(tmp, `${page.number}.png`))
        .flatten({background: "#ffffff"})
        .jpeg({quality, progressive: true, mozjpeg: true})
        .toFile(image)
      images.push(image)
    }
  } finally {
    rmSync(tmp, {recursive: true, force: true})
  }

  const html = join(outDir, `${name}.html`)
  writeFileSync(html, renderRulebookHtml(doc, {
    title,
    image: page => `${name}${page}.jpg`,
    fontFamily: options.fontFamily,
    css: options.css,
  }))
  return {html, images}
}
