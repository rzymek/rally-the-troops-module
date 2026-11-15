import {execFileSync} from "node:child_process"
import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from "node:fs"
import {tmpdir} from "node:os"
import {join} from "node:path"
import {afterAll, beforeAll, describe, expect, it} from "vitest"
import {buildRulebook, parsePdfXml, renderRulebookHtml} from "../rulebook/index.ts"

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE pdf2xml SYSTEM "pdf2xml.dtd">
<pdf2xml producer="poppler" version="24.02.0">
<page number="1" position="absolute" top="0" left="0" height="2381.1" width="1785.8">
	<fontspec id="0" size="36" family="HYPTWJ+Questa-Bold" color="#003549"/>
	<fontspec id="1" size="30" family="ABCDEF+SourceSansPro-Regular" color="#000000"/>
<text top="300" left="150" width="600" height="45" font="0"><b>Setup &amp; play</b></text>
<text top="360" left="150" width="3" height="40" font="1">   </text>
</page>
<page number="2" position="absolute" top="0" left="0" height="2381.1" width="1785.8">
<text top="90" left="30" width="900" height="40" font="1">See <a href="https://example.com/faq">the FAQ</a> or <a href="out.html#3">page 3</a> <i>now</i></text>
</page>
</pdf2xml>`

describe("parsePdfXml", () => {
  const doc = parsePdfXml(XML, 3)

  it("scales pages, text and fonts back to points", () => {
    const round = (value: number) => Math.round(value * 10) / 10
    expect(doc.pages.map(page => [page.number, round(page.width), round(page.height)])).toEqual([[1, 595.3, 793.7], [2, 595.3, 793.7]])
    expect(doc.pages[0].texts[0]).toEqual({top: 100, left: 50, width: 200, height: 15, font: "0", html: "<b>Setup &amp; play</b>"})
    expect(doc.fonts.get("0")).toEqual({id: "0", size: 12, family: "Questa-Bold", color: "#003549"})
  })

  it("applies a font declared on an earlier page", () => {
    expect(doc.pages[1].texts[0].font).toBe("1")
  })

  it("drops blank text", () => {
    expect(doc.pages[0].texts).toHaveLength(1)
  })

  it("keeps links to the web, bold and italics, and drops links within the PDF", () => {
    expect(doc.pages[1].texts[0].html).toBe(`See <a href="https://example.com/faq" target="_blank">the FAQ</a> or page 3 <i>now</i>`)
  })
})

describe("renderRulebookHtml", () => {
  const html = renderRulebookHtml(parsePdfXml(XML, 3), {title: "Game <Rules>", image: page => `rules${page}.jpg`})

  it("puts each page's image behind its text", () => {
    expect(html).toContain(`<div id="page1" style="background-image:url('rules1.jpg');width:595.3pt;height:793.7pt">`)
    expect(html).toContain(`<p class="f0" style="top:100pt;left:50pt;line-height:15pt" data-w="200.0"><b>Setup &amp; play</b></p>`)
  })

  it("styles each font once, guessing serif or sans, and leaves black text uncoloured", () => {
    expect(html).toContain(`.f0{font-family:"Source Serif",serif;font-size:12pt;color:#003549}`)
    expect(html).toContain(`.f1{font-family:"Source Sans",sans-serif;font-size:10pt}`)
  })

  it("escapes the title", () => {
    expect(html).toContain("<title>Game &lt;Rules&gt;</title>")
  })

  it("takes the font family from the options", () => {
    const custom = renderRulebookHtml(parsePdfXml(XML, 3), {title: "", image: String, fontFamily: () => "Tinos,serif"})
    expect(custom).toContain(".f0{font-family:Tinos,serif;")
  })
})

function has(command: string): boolean {
  try {
    execFileSync(command, ["-v"], {stdio: "ignore"})
    return true
  } catch {
    return false
  }
}

describe.skipIf(!has("gs") || !has("pdftohtml"))("buildRulebook", () => {
  let dir: string

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "rtt-rulebook-"))
    // Two A5 pages: a grey box with text on each.
    writeFileSync(join(dir, "rules.ps"), `%!PS
<< /PageSize [420 595] >> setpagedevice
/Times-Bold findfont 24 scalefont setfont
0.5 setgray 50 400 200 100 rectfill 0 setgray 60 500 moveto (Sequence of Play) show showpage
/Helvetica findfont 12 scalefont setfont
60 500 moveto (Movement and combat) show showpage
`)
    execFileSync("gs", ["-q", "-dSAFER", "-dBATCH", "-dNOPAUSE", "-sDEVICE=pdfwrite",
      `-sOutputFile=${join(dir, "rules.pdf")}`, join(dir, "rules.ps")])
    // A stale image of a third page, from an earlier version of the PDF.
    writeFileSync(join(dir, "rules3.jpg"), "")
  })

  afterAll(() => rmSync(dir, {recursive: true, force: true}))

  it("writes the page images and the text over them", async () => {
    const result = await buildRulebook({pdf: join(dir, "rules.pdf"), outDir: dir, title: "Test Rules", dpi: 72})

    expect(result.images.map(image => image.slice(dir.length + 1))).toEqual(["rules1.jpg", "rules2.jpg"])
    expect(existsSync(join(dir, "rules3.jpg"))).toBe(false)

    const html = readFileSync(result.html, "utf-8")
    expect(html).toContain("<title>Test Rules</title>")
    expect(html).toMatch(/<div id="page1" style="background-image:url\('rules1\.jpg'\);width:420pt;height:595pt">/)
    expect(html).toMatch(/<p class="f\d+" style="top:[\d.]+pt;left:60pt;[^"]*" data-w="[\d.]+"><b>Sequence of Play<\/b><\/p>/)
    expect(html).toContain(">Movement and combat</p>")

    const sharp = (await import("sharp")).default
    const {width, height} = await sharp(result.images[0]).metadata()
    expect([width, height]).toEqual([420, 595])
    // The text is left out of the image: the page is blank where it was, but the box is still there.
    const {data, info} = await sharp(result.images[0]).raw().toBuffer({resolveWithObject: true})
    const pixel = (x: number, y: number) => data[(y * info.width + x) * info.channels]
    expect(pixel(150, 595 - 450)).toBeLessThan(160)
    expect(Math.min(...Array.from({length: 150}, (_, i) => pixel(60 + i, 595 - 505)))).toBeGreaterThan(240)
  })
})
