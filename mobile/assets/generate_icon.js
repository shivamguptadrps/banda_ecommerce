const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Create a simple icon with shopping bag design
async function generateIcon() {
  console.log('Starting icon generation...');
  const size = 1024;
  const assetsDir = path.join(__dirname);
  console.log('Assets directory:', assetsDir);
  
  // Create SVG for the icon
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#7B2D8E;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#9D4EDD;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${size * 0.23}" fill="url(#grad)"/>
      <!-- Shopping Bag -->
      <path d="M${size * 0.5} ${size * 0.2} L${size * 0.35} ${size * 0.2} Q${size * 0.27} ${size * 0.2} ${size * 0.27} ${size * 0.27} L${size * 0.27} ${size * 0.74} Q${size * 0.27} ${size * 0.82} ${size * 0.35} ${size * 0.82} L${size * 0.65} ${size * 0.82} Q${size * 0.73} ${size * 0.82} ${size * 0.73} ${size * 0.74} L${size * 0.73} ${size * 0.27} Q${size * 0.73} ${size * 0.2} ${size * 0.65} ${size * 0.2} L${size * 0.5} ${size * 0.2} Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="${size * 0.015}"/>
      <!-- Bag Handle -->
      <path d="M${size * 0.35} ${size * 0.39} L${size * 0.35} ${size * 0.27} Q${size * 0.35} ${size * 0.23} ${size * 0.39} ${size * 0.23} L${size * 0.61} ${size * 0.23} Q${size * 0.65} ${size * 0.23} ${size * 0.65} ${size * 0.27} L${size * 0.65} ${size * 0.39}" fill="none" stroke="#7B2D8E" stroke-width="${size * 0.023}" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Products inside -->
      <circle cx="${size * 0.43}" cy="${size * 0.51}" r="${size * 0.049}" fill="#22C55E"/>
      <circle cx="${size * 0.57}" cy="${size * 0.51}" r="${size * 0.049}" fill="#22C55E"/>
      <circle cx="${size * 0.5}" cy="${size * 0.625}" r="${size * 0.039}" fill="#F59E0B"/>
      <!-- Smile -->
      <path d="M${size * 0.39} ${size * 0.7} Q${size * 0.5} ${size * 0.78} ${size * 0.61} ${size * 0.7}" fill="none" stroke="#FFFFFF" stroke-width="${size * 0.02}" stroke-linecap="round"/>
    </svg>
  `;

  // Convert SVG to PNG
  const iconPath = path.join(assetsDir, 'icon.png');
  const splashPath = path.join(assetsDir, 'splash.png');
  const adaptiveIconPath = path.join(assetsDir, 'adaptive-icon.png');

  await sharp(Buffer.from(svg))
    .resize(1024, 1024)
    .png()
    .toFile(iconPath);

  // Create splash screen (same design but larger)
  const splashSvg = `
    <svg width="2048" height="2048" viewBox="0 0 2048 2048" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#7B2D8E;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#9D4EDD;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="2048" height="2048" fill="url(#grad)"/>
      <!-- Shopping Bag -->
      <path d="M1024 400 L700 400 Q540 400 540 540 L540 1480 Q540 1640 700 1640 L1348 1640 Q1508 1640 1508 1480 L1508 540 Q1508 400 1348 400 L1024 400 Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="30"/>
      <!-- Bag Handle -->
      <path d="M700 780 L700 540 Q700 460 780 460 L1268 460 Q1348 460 1348 540 L1348 780" fill="none" stroke="#7B2D8E" stroke-width="46" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Products inside -->
      <circle cx="880" cy="1024" r="100" fill="#22C55E"/>
      <circle cx="1168" cy="1024" r="100" fill="#22C55E"/>
      <circle cx="1024" cy="1280" r="80" fill="#F59E0B"/>
      <!-- Smile -->
      <path d="M798 1440 Q1024 1560 1250 1440" fill="none" stroke="#FFFFFF" stroke-width="40" stroke-linecap="round"/>
    </svg>
  `;

  await sharp(Buffer.from(splashSvg))
    .resize(2048, 2048)
    .png()
    .toFile(splashPath);

  // Create adaptive icon (foreground only, transparent background)
  const adaptiveSvg = `
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <!-- Shopping Bag -->
      <path d="M512 200 L350 200 Q270 200 270 270 L270 740 Q270 820 350 820 L674 820 Q754 820 754 740 L754 270 Q754 200 674 200 L512 200 Z" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="15"/>
      <!-- Bag Handle -->
      <path d="M350 390 L350 270 Q350 230 390 230 L634 230 Q674 230 674 270 L674 390" fill="none" stroke="#7B2D8E" stroke-width="23" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- Products inside -->
      <circle cx="430" cy="510" r="49" fill="#22C55E"/>
      <circle cx="594" cy="510" r="49" fill="#22C55E"/>
      <circle cx="512" cy="625" r="39" fill="#F59E0B"/>
      <!-- Smile -->
      <path d="M390 700 Q512 780 634 700" fill="none" stroke="#FFFFFF" stroke-width="20" stroke-linecap="round"/>
    </svg>
  `;

  await sharp(Buffer.from(adaptiveSvg))
    .resize(1024, 1024)
    .png()
    .toFile(adaptiveIconPath);

  console.log('✅ Icon files created:');
  console.log('   - assets/icon.png (1024x1024)');
  console.log('   - assets/splash.png (2048x2048)');
  console.log('   - assets/adaptive-icon.png (1024x1024)');
}

generateIcon()
  .then(() => {
    console.log('✅ Icon generation completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error generating icons:', err);
    process.exit(1);
  });
