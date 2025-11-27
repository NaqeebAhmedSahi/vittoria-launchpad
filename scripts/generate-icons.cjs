const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const svgPath = path.join(projectRoot, 'public', 'favicon.svg');
const outDir = path.join(projectRoot, 'build');

if (!fs.existsSync(svgPath)) {
  console.error('SVG not found at', svgPath);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

function hasCmd(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

console.log('Generating icons from', svgPath);

const pngPath = path.join(outDir, 'icon.png');

try {
  if (hasCmd('rsvg-convert')) {
    console.log('Using rsvg-convert to render PNG');
    execSync(`rsvg-convert -w 512 -h 512 "${svgPath}" -o "${pngPath}"`);
  } else if (hasCmd('convert')) {
    console.log('Using ImageMagick convert to render PNG');
    execSync(`convert "${svgPath}" -resize 512x512 "${pngPath}"`);
  } else {
    console.error('No rsvg-convert or convert (ImageMagick) found on PATH. Please install librsvg2-bin or imagemagick.');
    process.exit(2);
  }
  console.log('Created', pngPath);
} catch (e) {
  console.error('Failed to generate PNG:', e.message);
  process.exit(3);
}

// Create ICO (Windows)
const icoPath = path.join(outDir, 'icon.ico');
try {
  if (hasCmd('convert')) {
    console.log('Creating ICO using ImageMagick');
    execSync(`convert "${pngPath}" -define icon:auto-resize=256,128,64,48,32,16 "${icoPath}"`);
    console.log('Created', icoPath);
  } else {
    console.warn('ImageMagick convert not available; skipping ICO generation');
  }
} catch (e) {
  console.warn('ICO generation failed:', e.message);
}

// Create ICNS (macOS) if iconutil available
const icnsPath = path.join(outDir, 'icon.icns');
try {
  if (hasCmd('iconutil') && hasCmd('sips')) {
    console.log('Creating ICNS using iconutil (macOS)');
    const iconsetDir = path.join(outDir, 'icon.iconset');
    fs.mkdirSync(iconsetDir, { recursive: true });
    const sizes = [16,32,64,128,256,512];
    sizes.forEach(sz => {
      const out = path.join(iconsetDir, `icon_${sz}x${sz}.png`);
      execSync(`sips -z ${sz} ${sz} "${pngPath}" --out "${out}"`);
    });
    execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`);
    console.log('Created', icnsPath);
  } else {
    console.warn('iconutil not available; skipping ICNS generation');
  }
} catch (e) {
  console.warn('ICNS generation failed:', e.message);
}

console.log('\nIcon generation complete. Place the generated files in build/ and re-run your electron-builder command.');
