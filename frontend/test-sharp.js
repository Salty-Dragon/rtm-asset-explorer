// Test if sharp can process WebP images
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function testSharp() {
  try {
    console.log('Sharp version:', sharp.versions);
    console.log('Sharp formats:', sharp.format);
    
    const webpPath = path.join(__dirname, 'public', 'rtm-logo.webp');
    console.log('\nTesting WebP file:', webpPath);
    console.log('File exists:', fs.existsSync(webpPath));
    
    if (fs.existsSync(webpPath)) {
      const stats = fs.statSync(webpPath);
      console.log('File size:', stats.size, 'bytes');
      
      // Try to read and process the WebP image
      const image = sharp(webpPath);
      const metadata = await image.metadata();
      console.log('\nWebP metadata:', metadata);
      
      // Try to convert to PNG to verify processing works
      const buffer = await image.png().toBuffer();
      console.log('Successfully processed WebP image');
      console.log('Output buffer size:', buffer.length, 'bytes');
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testSharp().then(() => {
  console.log('\n✅ Sharp WebP test passed!');
  process.exit(0);
});
