// Renders public/favicon.svg into PNG PWA icons (any + maskable) via headless Chromium.
// Run once: `node scripts/gen-icons.mjs` — outputs are committed under public/icons/.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const svg = readFileSync('public/favicon.svg', 'utf8');
mkdirSync('public/icons', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

async function render(size, maskable) {
  const scale = maskable ? 0.62 : 0.92;
  const png = await page.evaluate(async ([svgText, s, mask, inner]) => {
    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(svgText);
    await img.decode();
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const ctx = c.getContext('2d');
    if (mask) {
      ctx.fillStyle = '#1a4f9c';
      ctx.fillRect(0, 0, s, s);
    }
    const w = s * inner;
    const h = (img.height / img.width) * w;
    ctx.drawImage(img, (s - w) / 2, (s - h) / 2, w, h);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    const dataUrl = await new Promise((r) => {
      const fr = new FileReader();
      fr.onload = () => r(fr.result);
      fr.readAsDataURL(blob);
    });
    return dataUrl.split(',')[1];
  }, [svg, size, maskable, scale]);
  return Buffer.from(png, 'base64');
}

for (const size of [192, 512]) {
  writeFileSync(`public/icons/icon-${size}.png`, await render(size, false));
  writeFileSync(`public/icons/icon-maskable-${size}.png`, await render(size, true));
  console.log(`wrote icon-${size}.png + maskable`);
}
await browser.close();
