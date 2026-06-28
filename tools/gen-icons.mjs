// Regenerates source icon/splash PNGs for @capacitor/assets from the Montréal+ logo.
// Run: node tools/gen-icons.mjs   then:   npx capacitor-assets generate --android
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const BLUE = '#0a7cff'   // theme_color
const NAVY = '#07111f'   // background_color
const out = new URL('../assets/', import.meta.url)
await mkdir(out, { recursive: true })

// The two white marks from the original manifest logo, in a 192 viewBox.
const MARK = `
  <path d="M45 118L96 36l51 82H45z" fill="white"/>
  <path d="M64 130h64v18H64z" fill="white"/>`

const render = (svg, size, file) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toFile(new URL(file, out).pathname)

// Full legacy/web icon: blue rounded square + white mark.
const iconOnly = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="44" fill="${BLUE}"/>${MARK}</svg>`

// Adaptive foreground: white mark only, on transparent, scaled into the safe zone.
const foreground = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 192 192">
  <g transform="translate(96 96) scale(0.8) translate(-96 -96)">${MARK}</g></svg>`

// Adaptive background: solid brand blue.
const background = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 192 192">
  <rect width="192" height="192" fill="${BLUE}"/></svg>`

// Splash: small centered mark on dark navy.
const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
  <rect width="2732" height="2732" fill="${NAVY}"/>
  <g transform="translate(1366 1366) scale(3.2) translate(-96 -96)">${MARK}</g></svg>`

await render(iconOnly, 1024, 'icon-only.png')
await render(foreground, 1024, 'icon-foreground.png')
await render(background, 1024, 'icon-background.png')
await render(splash, 2732, 'splash.png')
await render(splash, 2732, 'splash-dark.png')
console.log('Generated assets/: icon-only, icon-foreground, icon-background, splash, splash-dark')
