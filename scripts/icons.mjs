// Renders the Kasane "Layers" icon (canvas concept 3) to the SVG/PNG files the PWA needs.
// Run with `npm run icons`; outputs are committed so builds don't depend on this script.
import { mkdirSync, writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'

const BG = '#1f1f22'
const ACCENT = '#2f6fe0'

// Bars in a 180-unit box, bottom to top: [width, opacity].
const BARS = [
  { x: 38, y: 112, w: 104, opacity: 0.35 },
  { x: 48, y: 79, w: 84, opacity: 0.65 },
  { x: 58, y: 46, w: 64, opacity: 1 },
]

function bars(scale = 1) {
  // Scale around the centre so maskable icons keep the bars inside the safe zone.
  const t = (v) => 90 + (v - 90) * scale
  return BARS.map(
    (b) =>
      `<rect x="${t(b.x)}" y="${t(b.y)}" width="${b.w * scale}" height="${26 * scale}" rx="${9 * scale}" fill="${ACCENT}" opacity="${b.opacity}"/>`,
  ).join('')
}

// Rounded version for favicons / browser tabs.
const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect width="180" height="180" rx="40" fill="${BG}"/>${bars()}</svg>`
// Full-bleed square: iOS and Android apply their own corner mask.
const square = (scale) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect width="180" height="180" fill="${BG}"/>${bars(scale)}</svg>`

function png(svg, size, file) {
  const out = new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng()
  writeFileSync(file, out)
}

mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icon.svg', rounded)
png(square(1), 180, 'public/apple-touch-icon.png')
png(square(1), 192, 'public/icons/icon-192.png')
png(square(1), 512, 'public/icons/icon-512.png')
png(square(0.78), 512, 'public/icons/maskable-512.png')
console.log('icons written to public/')
