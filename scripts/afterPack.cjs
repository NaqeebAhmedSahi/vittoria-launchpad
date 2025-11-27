const fs = require('fs');
const path = require('path');

// electron-builder passes a context object with appOutDir
module.exports = async function(context) {
  try {
    const appOutDir = context.appOutDir || (context.packageData && context.packageData.directories && context.packageData.directories.output) || '.';
    const targets = [
      '/usr/lib',
      '/usr/lib/x86_64-linux-gnu',
      '/usr/local/lib'
    ];

    const destBase = path.join(appOutDir, 'resources', 'vendor', 'libvips');
    fs.mkdirSync(destBase, { recursive: true });

    let found = false;
    for (const dir of targets) {
      try {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir);
        for (const f of files) {
          if (f.indexOf('libvips') === 0) {
            const src = path.join(dir, f);
            const dest = path.join(destBase, f);
            try {
              fs.copyFileSync(src, dest);
              console.log(`Copied ${src} -> ${dest}`);
              found = true;
            } catch (e) {
              console.warn('Failed to copy', src, e.message);
            }
          }
        }
      } catch (e) {
        // ignore and continue
      }
    }

    if (!found) {
      console.log('No system libvips files found in common locations.');
    }
  } catch (err) {
    console.warn('afterPack script failed:', err && err.message);
  }
};
