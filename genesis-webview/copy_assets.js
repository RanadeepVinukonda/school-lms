/**
 * Copies the high-resolution Genesis icon into all Android resource
 * buckets so the launcher & splash use a crisp, branded asset instead of
 * the default low-res Expo webp placeholders.
 *
 * Run: node copy_assets.js
 * (No dependencies; pure Node fs.)
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'assets', 'genesis_icon.png');
const RES_DIR = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');

const LOW_RES = ['ic_launcher.webp', 'ic_launcher_round.webp'];

// Old per-density splash logos (replaced right below by the high-res icon).
const TARGETS = [
  { pattern: /^drawable(-.*)?$/, file: 'splashscreen_logo.png' },
  { pattern: /^mipmap(-.*)?$/, file: 'ic_launcher.png' },
  { pattern: /^mipmap(-.*)?$/, file: 'ic_launcher_round.png' },
];

if (!fs.existsSync(SOURCE)) {
  console.error('Missing source icon:', SOURCE);
  process.exit(1);
}
if (!fs.existsSync(RES_DIR)) {
  console.error('Missing android res dir:', RES_DIR);
  process.exit(1);
}

const icon = fs.readFileSync(SOURCE);

for (const entry of fs.readdirSync(RES_DIR, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const abs = path.join(RES_DIR, entry.name);
  const density = entry.name;

  // Remove the low-res default launcher webps.
  for (const low of LOW_RES) {
    const p = path.join(abs, low);
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
      console.log('removed', path.relative(ROOT, p));
    }
  }

  for (const t of TARGETS) {
    if (!t.pattern.test(density)) continue;
    const out = path.join(abs, t.file);
    const prev = fs.existsSync(out) ? fs.statSync(out).size : 0;
    fs.writeFileSync(out, icon);
    console.log('wrote', path.relative(ROOT, out), `(${prev} -> ${icon.length} bytes)`);
  }
}

console.log('Done. Rebuild Android resources to pick up new launcher/splash assets.');