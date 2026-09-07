/**
 * Rasterize public/masked-icon.svg into PWA/favicon PNGs.
 * Run: npm install --no-save @resvg/resvg-js; node scripts/generate-icons.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = join(root, 'public')
const svg = readFileSync(join(publicDir, 'masked-icon.svg'))

function pngAt(size) {
  return new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    font: { loadSystemFonts: false },
  })
    .render()
    .asPng()
}

function pngToIco(png) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)

  const entry = Buffer.alloc(16)
  entry[0] = 32
  entry[1] = 32
  entry.writeUInt16LE(0, 4)
  entry.writeUInt32LE(png.length, 8)
  entry.writeUInt32LE(22, 12)

  return Buffer.concat([header, entry, png])
}

const targets = [
  ['pwa-512x512.png', 512],
  ['pwa-192x192.png', 192],
  ['apple-touch-icon.png', 180],
  ['favicon-32.png', 32],
]

for (const [name, size] of targets) {
  const png = pngAt(size)
  writeFileSync(join(publicDir, name), png)
  console.log(`wrote public/${name} (${size}x${size})`)
}

const faviconPng = pngAt(32)
writeFileSync(join(publicDir, 'favicon.ico'), pngToIco(faviconPng))
console.log('wrote public/favicon.ico')
