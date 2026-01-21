// This script generates logo assets for the app
// Run with: node assets/generate_logo.js

const fs = require('fs');
const path = require('path');

// SVG Logo for Banda Baazar
const logoSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7B2D8E;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#9D4EDD;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="120" fill="url(#grad)"/>
  <!-- Shopping Bag -->
  <path d="M256 100 L180 100 Q140 100 140 140 L140 380 Q140 420 180 420 L332 420 Q372 420 372 380 L372 140 Q372 100 332 100 L256 100 Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="8"/>
  <!-- Bag Handle -->
  <path d="M180 200 L180 140 Q180 120 200 120 L312 120 Q332 120 332 140 L332 200" fill="none" stroke="#7B2D8E" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Products inside -->
  <circle cx="220" cy="260" r="25" fill="#22C55E"/>
  <circle cx="292" cy="260" r="25" fill="#22C55E"/>
  <circle cx="256" cy="320" r="20" fill="#F59E0B"/>
  <!-- Smile -->
  <path d="M200 360 Q256 400 312 360" fill="none" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round"/>
</svg>`;

// Write SVG
const assetsDir = path.join(__dirname);
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

fs.writeFileSync(path.join(assetsDir, 'logo.svg'), logoSvg);
console.log('✅ Logo SVG created at assets/logo.svg');
console.log('📝 Note: You need to convert this to PNG for app icons');
console.log('   Use an online converter or ImageMagick:');
console.log('   convert -background none -size 512x512 assets/logo.svg assets/icon.png');
