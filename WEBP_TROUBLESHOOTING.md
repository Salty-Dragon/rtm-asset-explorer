# WebP Image Support Troubleshooting

## Problem
WebP images (like `rtm-logo.webp`) are not displaying, showing as invisible or displaying "image type is not supported" error. Server logs show: `The requested resource isn't a valid image for /rtm-logo.webp received null`.

## Root Cause
Next.js 15 uses `sharp` for image optimization. While `sharp` is installed as a dependency of Next.js, its **native binaries** may not be compatible with your production server's platform or may be missing required system libraries.

## Solution

### Step 1: Verify Sharp Installation
Check if sharp is installed:
```bash
cd /home/assetx/rtm-asset-explorer/frontend
npm list sharp
```

You should see output like:
```
raptoreum-asset-explorer-frontend@1.0.0
└─┬ next@15.5.12
  └── sharp@0.34.5
```

### Step 2: Install System Dependencies (Linux/Ubuntu)
Sharp requires certain system libraries. Install them:

```bash
# For Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y \
  build-essential \
  python3 \
  libvips-dev \
  pkg-config
```

### Step 3: Rebuild Sharp for Your Platform
Even though sharp is installed, it needs to be rebuilt to match your server's architecture:

```bash
cd /home/assetx/rtm-asset-explorer/frontend

# Remove node_modules and package-lock to ensure clean rebuild
rm -rf node_modules package-lock.json

# Clear npm cache
npm cache clean --force

# Reinstall all dependencies (this will compile sharp for your platform)
npm install

# Verify sharp installation
npm list sharp
```

### Step 4: Test Sharp Functionality
Create a test script to verify sharp can process WebP images:

```bash
cd /home/assetx/rtm-asset-explorer/frontend
cat > test-sharp.js << 'EOF'
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function testSharp() {
  try {
    console.log('Sharp version:', sharp.versions);
    
    const webpPath = path.join(__dirname, 'public', 'rtm-logo.webp');
    console.log('\nTesting WebP file:', webpPath);
    
    if (fs.existsSync(webpPath)) {
      const image = sharp(webpPath);
      const metadata = await image.metadata();
      console.log('WebP metadata:', metadata);
      console.log('\n✅ Sharp WebP test passed!');
    } else {
      console.error('❌ WebP file not found');
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
}

testSharp();
EOF

# Run the test
node test-sharp.js
```

If you see `✅ Sharp WebP test passed!`, sharp is working correctly.

If you see an error, proceed to Step 5.

### Step 5: Platform-Specific Rebuild (If Step 4 Failed)
If the test failed, explicitly rebuild sharp:

```bash
cd /home/assetx/rtm-asset-explorer/frontend

# Force rebuild sharp with verbose output
npm rebuild sharp --verbose
```

Look for any errors in the output. Common issues:
- Missing C++ compiler: Install `build-essential`
- Missing Python: Install `python3`
- Missing libvips: Install `libvips-dev`

### Step 6: Rebuild Frontend and Restart
After fixing sharp, rebuild the frontend:

```bash
cd /home/assetx/rtm-asset-explorer/frontend

# Rebuild the Next.js application
npm run build

# Restart the application with PM2
pm2 restart rtm-frontend

# Or if running directly
# npm start
```

### Step 7: Verify the Fix
1. Open your browser and navigate to your site
2. Check if the logo appears in the header
3. Right-click the logo and open it in a new tab - it should display correctly
4. Check server logs - the error message should be gone

## Alternative Solution: Use PNG Instead of WebP
If you cannot get sharp working on your platform, you can temporarily use a PNG logo:

```bash
cd /home/assetx/rtm-asset-explorer/frontend/public

# Convert WebP to PNG (requires imagemagick or online converter)
# Or create a PNG version of your logo

# Update your .env file
nano .env
# Change: NEXT_PUBLIC_LOGO_PATH=rtm-logo.webp
# To: NEXT_PUBLIC_LOGO_PATH=rtm-logo.png

# Rebuild and restart
npm run build
pm2 restart rtm-frontend
```

## Common Issues and Solutions

### Issue: "Something went wrong installing the 'sharp' module"
**Solution:** Install system dependencies first, then reinstall:
```bash
sudo apt-get install -y build-essential python3 libvips-dev pkg-config
cd /home/assetx/rtm-asset-explorer/frontend
rm -rf node_modules
npm install
```

### Issue: "Module did not self-register"
**Solution:** This means sharp was built for a different Node.js version. Rebuild it:
```bash
cd /home/assetx/rtm-asset-explorer/frontend
npm rebuild sharp
npm run build
pm2 restart rtm-frontend
```

### Issue: "Could not load the 'sharp' module"
**Solution:** Check if libvips is installed:
```bash
pkg-config --modversion vips
# If error, install: sudo apt-get install -y libvips-dev
```

### Issue: Image optimization works locally but not in production
**Solution:** Platform mismatch. Sharp must be installed/rebuilt on the production server:
```bash
# On production server
cd /home/assetx/rtm-asset-explorer/frontend
npm rebuild sharp
npm run build
pm2 restart rtm-frontend
```

## Still Having Issues?

### Check Next.js Image Optimization Logs
```bash
# Check PM2 logs for Next.js
pm2 logs rtm-frontend --lines 100

# Look for errors related to:
# - "sharp"
# - "image optimization"
# - "invalid image"
```

### Disable Image Optimization Temporarily
If you need the site working immediately, you can disable Next.js image optimization:

Edit `frontend/next.config.js`:
```javascript
const nextConfig = {
  images: {
    unoptimized: true,  // Add this line
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.raptoreum.com',
        pathname: '/ipfs/**',
      },
    ],
  },
  // ... rest of config
}
```

Then rebuild and restart:
```bash
npm run build
pm2 restart rtm-frontend
```

**Note:** This will serve images without optimization, increasing bandwidth usage and load times.

## Prevention
To avoid this issue in the future:
1. Always run `npm install` and `npm run build` on the production server (not locally)
2. Document your server's platform and Node.js version
3. Include sharp in package.json dependencies explicitly (now added in latest version)
4. Test image loading after any Node.js version upgrades

## Additional Resources
- [Sharp Installation Guide](https://sharp.pixelplumbing.com/install)
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [Sharp Platform Support](https://sharp.pixelplumbing.com/install#cross-platform)
