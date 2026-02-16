# File Preview Feature Documentation

## Overview

The RTM Asset Explorer now supports displaying previews for non-image file types stored on IPFS, including PDFs, text files, CSV files, JSON, XML, and more. This feature automatically detects file types, shows appropriate previews, and indicates when files are encrypted or password-protected.

## Features

### 1. File Type Detection

The system automatically detects file types from:
- File extensions in IPFS CID/filename
- MIME types from HTTP response headers

Supported file types:
- **Images**: PNG, JPG, JPEG, GIF, WebP, SVG
- **Documents**: PDF, TXT, MD (Markdown)
- **Data Files**: CSV, JSON, XML

### 2. File Type Badges

Assets with file type information display badges showing:
- Asset Type: "NFT" or "Fungible"
- IPFS Status: "IPFS" (when available)
- **NEW**: File Type: "PDF", "TXT", "CSV", "JSON", "XML", "MD"

Badges appear in:
- Asset cards in grid view
- Asset detail page headers

### 3. Content Previews

For text-based files, the system shows:
- First 500 characters of content
- File size
- Download button
- "View PDF" button for PDF files (opens in new tab)

### 4. Encryption Detection

The system automatically detects encrypted or password-protected files using:
- **PDF Encryption**: Checks for `/Encrypt` marker in PDF headers
- **High Entropy Detection**: Analyzes byte distribution to detect encryption
  - Encrypted data typically has entropy > 7.5 bits
  - Uses 512-byte sample for efficiency
  - Threshold of 7.5 provides good balance between detection and false positives
- **Known Markers**: Detects PGP messages and other encrypted text formats

When encryption is detected:
- Shows a lock icon placeholder
- Displays "Encrypted / Password Protected" label
- Hides preview and download buttons

### 5. Placeholder Images

Different placeholders for different scenarios:
- **Images**: Original placeholder for failed image loads
- **Encrypted Files**: Lock icon with "Encrypted" label
- **PDF Files**: Red PDF icon
- **Text Files**: Green text/document icon
- **Unknown Files**: Generic file icon

## Implementation Details

### Core Components

#### 1. `fileTypes.ts` Utility
Location: `/frontend/lib/fileTypes.ts`

Provides:
- `detectFileType(cidOrFilename)`: Detects file type from CID/filename
- `detectFileTypeFromMime(mimeType)`: Detects file type from MIME type
- `isEncrypted(data)`: Checks if file content is encrypted
- `getPlaceholderImage(fileType, encrypted)`: Returns appropriate placeholder
- `formatFileSize(bytes)`: Formats file size for display

#### 2. `FilePreview` Component
Location: `/frontend/components/shared/FilePreview.tsx`

Handles non-image file display:
- Fetches file metadata using HEAD request
- Uses HTTP Range requests to fetch only 1-2KB for preview/encryption check
- Displays appropriate placeholder based on file type
- Shows text content preview (first 500 chars)
- Provides download and view buttons

#### 3. `IPFSImage` Component (Updated)
Location: `/frontend/components/shared/IPFSImage.tsx`

Enhanced to:
- Detect file type on mount
- Delegate non-image files to FilePreview component
- Maintain backward compatibility with existing image display

#### 4. `AssetCard` Component (Updated)
Location: `/frontend/components/assets/AssetCard.tsx`

Added:
- File type detection for assets with IPFS data
- File type badge display alongside NFT/Fungible badges

#### 5. `AssetDetail` Component (Updated)
Location: `/frontend/components/assets/AssetDetail.tsx`

Added:
- File type detection for assets with IPFS data
- File type badge display in header

### Placeholder Images

Location: `/frontend/public/`

- `placeholder-encrypted.svg`: Lock icon for encrypted files
- `placeholder-pdf.svg`: Red PDF document icon
- `placeholder-text.svg`: Green text document icon
- `placeholder-file.svg`: Generic file icon
- `placeholder-asset.svg`: Original placeholder (unchanged)

## Performance Optimizations

### HTTP Range Requests

The system uses HTTP Range requests to minimize bandwidth:
- **Text files**: Fetches only first 1KB for preview and encryption check
- **PDF files**: Fetches only first 2KB (sufficient for header analysis)

This is significantly more efficient than downloading entire files.

### HEAD Requests

Before fetching content:
1. Makes HEAD request to get file size and MIME type
2. Uses this info to refine file type detection
3. Only fetches content if needed for preview

### Progressive Enhancement

- File type detection happens immediately from CID
- Content fetching happens asynchronously
- Loading states keep UI responsive
- Gateway fallback ensures reliability

## Security Considerations

### Entropy Analysis

The entropy calculation uses:
- **Sample size**: 512 bytes
  - Large enough for representative distribution
  - Small enough to be efficient
- **Threshold**: 7.5 bits
  - Random/encrypted data: > 7.5 (approaching 8.0)
  - Compressed data: ~7-7.5
  - Plain text: ~4-5

### No False Negatives for Security

The system errs on the side of caution:
- High entropy = likely encrypted (even if false positive)
- Shows "Encrypted" placeholder if unsure
- Better to hide potentially sensitive content

## User Experience

### Visual Feedback

1. **Loading State**: Skeleton animation while fetching
2. **File Type Indicators**: Clear badges showing file type
3. **Encryption Warning**: Prominent lock icon and warning text
4. **Preview Content**: Easy-to-read text preview with proper formatting

### Accessibility

- All images have proper alt text
- Badges use semantic HTML
- Buttons have clear labels
- Color contrast meets WCAG standards

## Future Enhancements

Potential improvements:
1. **Video Support**: Add preview for video files (MP4, WebM, etc.)
2. **Audio Support**: Add player for audio files (MP3, WAV, etc.)
3. **Office Documents**: Support for DOCX, XLSX, PPTX
4. **Archive Files**: Detection and listing for ZIP, TAR, etc.
5. **3D Models**: Preview for GLB, GLTF, OBJ files
6. **Markdown Rendering**: Render markdown files instead of showing raw text

## Testing

To test the feature:

1. **Image Files**: Should work as before (no change)
2. **PDF Files**: Should show PDF icon, file size, and "View PDF" button
3. **Text Files**: Should show text icon, preview, and download button
4. **CSV Files**: Should show preview of data
5. **Encrypted Files**: Should show lock icon and encryption warning
6. **Unknown Files**: Should show generic file icon

## Browser Compatibility

The feature uses:
- Fetch API with Range requests (modern browsers)
- Next.js Image component (optimized delivery)
- React hooks (useState, useEffect)

Supported browsers:
- Chrome/Edge 90+
- Firefox 90+
- Safari 15+

## Troubleshooting

### Preview Not Showing

1. Check browser console for errors
2. Verify IPFS gateway is accessible
3. Check file has proper extension in CID
4. Try different IPFS gateway (system auto-retries)

### False Encryption Detection

If non-encrypted files show as encrypted:
- Highly compressed files may trigger detection
- Binary files may have high entropy
- This is intentional (safe default)

### Performance Issues

If previews load slowly:
- Range requests should minimize bandwidth
- Check IPFS gateway performance
- Consider adding caching layer

## API Reference

### FileTypeInfo Interface

```typescript
interface FileTypeInfo {
  type: 'image' | 'pdf' | 'text' | 'csv' | 'json' | 'xml' | 'unknown'
  mimeType?: string
  extension?: string
  category: 'image' | 'document' | 'data' | 'unknown'
  canPreview: boolean
  badge?: string
}
```

### detectFileType Function

```typescript
function detectFileType(cidOrFilename: string): FileTypeInfo
```

Detects file type from CID or filename extension.

### isEncrypted Function

```typescript
function isEncrypted(data: Uint8Array | string): boolean
```

Checks if file content appears to be encrypted.

## Summary

This feature significantly enhances the RTM Asset Explorer by providing meaningful previews for non-image file types. It maintains excellent performance through HTTP Range requests, provides clear visual feedback, and includes robust encryption detection to protect sensitive content.
