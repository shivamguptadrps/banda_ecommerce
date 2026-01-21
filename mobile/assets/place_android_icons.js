const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

(async () => {
  const sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192
  };

  const adaptiveSizes = {
    'mipmap-mdpi': 108,
    'mipmap-hdpi': 162,
    'mipmap-xhdpi': 216,
    'mipmap-xxhdpi': 324,
    'mipmap-xxxhdpi': 432
  };

  const logo = 'assets/mylogo.PNG';
  const resDir = 'android/app/src/main/res';

  console.log('Generating launcher icons...');
  for (const [folder, size] of Object.entries(sizes)) {
    const dir = path.join(resDir, folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await sharp(logo).resize(size, size).png().toFile(path.join(dir, 'ic_launcher.png'));
    await sharp(logo).resize(size, size).png().toFile(path.join(dir, 'ic_launcher_round.png'));
    console.log(`✅ ${folder}/ic_launcher.png (${size}x${size})`);
  }

  console.log('Generating adaptive icons...');
  for (const [folder, size] of Object.entries(adaptiveSizes)) {
    const dir = path.join(resDir, folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    await sharp(logo).resize(size, size).png().toFile(path.join(dir, 'ic_launcher_foreground.png'));
    console.log(`✅ ${folder}/ic_launcher_foreground.png (${size}x${size})`);
  }

  console.log('✅ All Android icons generated from mylogo.PNG!');
})();
