#!/usr/bin/env node
import {parseArgs} from "node:util"
import {buildRulebook} from "./index.ts"

const USAGE = `Usage: rtt-rulebook <rules.pdf> [options]

Converts a PDF rulebook to an HTML page with page images, as the official RTT modules publish their rules.
Needs pdftohtml (poppler-utils) and gs (Ghostscript).

Options:
  -o, --out <dir>      output directory (default: public/info)
  -n, --name <name>    base name of the HTML file and images (default: rules)
  -t, --title <title>  page title (default: the PDF's file name)
      --dpi <n>        resolution of the page images (default: 150)
      --quality <n>    JPEG quality, 1 to 100 (default: 80)
  -h, --help`

const {values, positionals} = parseArgs({
  allowPositionals: true,
  options: {
    out: {type: "string", short: "o", default: "public/info"},
    name: {type: "string", short: "n", default: "rules"},
    title: {type: "string", short: "t"},
    dpi: {type: "string"},
    quality: {type: "string"},
    help: {type: "boolean", short: "h"},
  },
})

if (values.help || positionals.length !== 1) {
  console.log(USAGE)
  process.exit(values.help ? 0 : 1)
}

try {
  const {html, images} = await buildRulebook({
    pdf: positionals[0],
    outDir: values.out,
    name: values.name,
    title: values.title,
    dpi: values.dpi ? Number(values.dpi) : undefined,
    quality: values.quality ? Number(values.quality) : undefined,
  })
  console.log(`Wrote ${html} and ${images.length} page images.`)
} catch (error) {
  console.error((error as Error).message)
  process.exit(1)
}
