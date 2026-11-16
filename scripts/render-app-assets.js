// Usage: npm run assets:android  (renders assets/*.png from assets/logo-mark.svg, then generates Android icons + splash)
// Renders the source PNGs @capacitor/assets expects, from assets/logo-mark.svg.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const dir = process.argv[2];
const mark = fs.readFileSync(path.join(dir, 'logo-mark.svg'), 'utf8').replace(/<!--.*?-->/s, '');
const BG = '#0B0C15';
const page = (size, body, bg) => `<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;background:${bg};display:flex;align-items:center;justify-content:center;flex-direction:column">${body}</body></html>`;
const svg = (px) => mark.replace('<svg ', `<svg width="${px}" height="${px}" `);
(async () => {
  const b = await chromium.launch();
  const shots = [
    // Adaptive icon: Android masks to a circle/squircle; keep the mark inside the 66% safe zone.
    ['icon-foreground.png', 1024, svg(560), 'transparent'],
    ['icon-background.png', 1024, '', BG],
    // Legacy / Play listing icon
    ['icon-only.png', 1024, svg(640), BG],
    // Splash (light + dark both use the dark brand background)
    ...['splash.png', 'splash-dark.png'].map((n) => [n, 2732, `${svg(520)}<div style="margin-top:40px;font:700 150px system-ui,sans-serif;color:#F5C619;letter-spacing:-2px">Eth-Links</div>`, BG]),
  ];
  for (const [name, size, body, bg] of shots) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    await p.setContent(page(size, body, bg));
    await p.screenshot({ path: path.join(dir, name), omitBackground: bg === 'transparent' });
    await p.close();
    console.log('wrote', name);
  }
  await b.close();
})();
