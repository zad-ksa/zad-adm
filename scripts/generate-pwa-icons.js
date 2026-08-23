/**
 * Regenerates the PWA icon set from public/logo-icon.svg.
 *
 * Run with `node scripts/generate-pwa-icons.js` after the brand mark changes.
 * The mark is a tall mint glyph on no ground, but an app icon must be square and
 * opaque, so every output centres it on the brand teal.
 *
 * `sharp` comes in through Next's own dependencies rather than package.json. If a
 * future install drops it, `npm i -D sharp` restores this script; nothing in the
 * app itself depends on it.
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "public", "logo-icon.svg");
const BRAND = { r: 0x0f, g: 0x76, b: 0x6e, alpha: 1 }; // --color-primary

async function build({ size, coverage, out }) {
  // `coverage` is the share of the canvas the glyph may occupy. Maskable icons
  // get a smaller share because Android crops roughly 20% off every edge.
  const box = Math.round(size * coverage);

  const glyph = await sharp(fs.readFileSync(SRC), { density: 600 })
    .resize({ width: box, height: box, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({ create: { width: size, height: size, channels: 4, background: BRAND } })
    .composite([{ input: glyph, gravity: "centre" }])
    .png()
    .toFile(out);

  const kb = (fs.statSync(out).size / 1024).toFixed(1);
  console.log(`${path.relative(ROOT, out).replace(/\\/g, "/")}  ${size}x${size}  ${kb} KB`);
}

(async () => {
  await build({ size: 192, coverage: 0.62, out: path.join(ROOT, "public", "icon-192.png") });
  await build({ size: 512, coverage: 0.62, out: path.join(ROOT, "public", "icon-512.png") });
  await build({ size: 512, coverage: 0.46, out: path.join(ROOT, "public", "icon-maskable-512.png") });
  await build({ size: 180, coverage: 0.66, out: path.join(ROOT, "src", "app", "apple-icon.png") });
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
