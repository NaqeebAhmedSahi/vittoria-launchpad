const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const required = [
  { p: 'build/icon.png', hint: 'Linux (PNG) icon required by electron-builder' },
  { p: 'build/icon.ico', hint: 'Windows (ICO) icon recommended' },
  { p: 'build/icon.icns', hint: 'macOS (ICNS) icon recommended' }
];

let missing = [];
for (const r of required) {
  const full = path.join(projectRoot, r.p);
  if (!fs.existsSync(full)) missing.push({ file: r.p, hint: r.hint });
}

if (missing.length === 0) {
  console.log('✔ build icons found.');
  process.exit(0);
}

console.warn('\n⚠️  Missing build icon files:');
for (const m of missing) console.warn(` - ${m.file} (${m.hint})`);

console.warn('\nSuggestions:');
console.warn(" - Generate icons from your SVG (public/favicon.svg) using 'rsvg-convert' or 'imagemagick' (recommended on CI).\n   Example: rsvg-convert -w 512 -h 512 public/favicon.svg -o build/icon.png");
console.warn(" - Or place prepared files at build/icon.png, build/icon.ico, build/icon.icns before running the build.");

// do not fail the build by default; just warn so it's actionable
process.exit(0);
