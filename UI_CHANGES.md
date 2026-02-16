# UI Changes - Visual Summary

## Overview
This document describes the visual changes introduced by the file preview feature.

## Asset Card (Grid View)

### Before
```
┌─────────────────────────┐
│  ┌────┐          ┌────┐ │
│  │NFT │          │IPFS│ │ <- Badges (top corners)
│  └────┘          └────┘ │
│                         │
│    [Image or File Icon] │ <- Image or generic file icon
│                         │
│                         │
├─────────────────────────┤
│ Asset Name              │
│ Description...          │
│                         │
│ 📊 Transfers  👁 Views  │
└─────────────────────────┘
```

### After
```
┌─────────────────────────┐
│  ┌────┐┌────┐    ┌────┐ │
│  │NFT ││PDF │    │IPFS│ │ <- NEW: File type badge added
│  └────┘└────┘    └────┘ │
│                         │
│  [Smart Preview/Icon]   │ <- Shows appropriate preview
│                         │
│                         │
├─────────────────────────┤
│ Asset Name              │
│ Description...          │
│                         │
│ 📊 Transfers  👁 Views  │
└─────────────────────────┘
```

## Asset Detail Page

### Before
```
┌────────────────────────────────────────┐
│  Asset Name                  [NFT]     │ <- Only NFT badge
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│                                        │
│         [Image or File Icon]           │
│                                        │
└────────────────────────────────────────┘
```

### After
```
┌────────────────────────────────────────┐
│  Asset Name            [NFT] [PDF]     │ <- NEW: File type badge added
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│         [Smart File Preview]           │
│                                        │
│  For PDFs:                             │
│    [PDF Icon]                          │
│    PDF File                            │
│    2.5 MB                              │
│    [View PDF] [Download]               │
│                                        │
│  For Text Files:                       │
│    [Text Icon]                         │
│    TXT File                            │
│    ┌─────────────────────────┐        │
│    │ Preview of file         │        │
│    │ content showing first   │        │
│    │ 500 characters...       │        │
│    └─────────────────────────┘        │
│    [Download]                          │
│                                        │
│  For Encrypted Files:                  │
│    [Lock Icon]                         │
│    Encrypted / Password Protected      │
│    (no buttons shown)                  │
└────────────────────────────────────────┘
```

## Badge Styles

### File Type Badges (NEW)
- **PDF**: Outline badge with "PDF" text
- **TXT**: Outline badge with "TXT" text
- **CSV**: Outline badge with "CSV" text
- **JSON**: Outline badge with "JSON" text
- **XML**: Outline badge with "XML" text
- **MD**: Outline badge with "MD" text

All file type badges:
- Use outline variant (border, transparent background)
- Semi-transparent backdrop (bg-background/80)
- Backdrop blur effect for better visibility

### Existing Badges (Unchanged)
- **NFT**: Red/default variant
- **Fungible**: Gray/secondary variant
- **IPFS**: Green/success variant

## Placeholder Images

### 1. Encrypted Files
```
┌─────────────────┐
│                 │
│      ╔═══╗      │ <- Lock icon
│      ║   ║      │
│    ╔═╩═══╩═╗    │
│    ║  🔑  ║    │
│    ╚═════════╝  │
│                 │
│   "Encrypted"   │
└─────────────────┘
```
Color: Red/Orange (#b45a46)
Background: Dark gray (#2a2a2a)

### 2. PDF Files
```
┌─────────────────┐
│   ┌───────┐     │
│   │      /│     │ <- Document with folded corner
│   │     / │     │
│   │    /  │     │
│   │   PDF │     │ <- Large "PDF" text
│   │       │     │
│   └───────┘     │
│                 │
│ "PDF Document"  │
└─────────────────┘
```
Color: Red (#dc2626)
Background: Dark gray (#2a2a2a)

### 3. Text Files
```
┌─────────────────┐
│   ┌───────┐     │
│   │      /│     │ <- Document with folded corner
│   │  ───  │     │ <- Text lines
│   │  ───  │     │
│   │  ───  │     │
│   │  ──   │     │
│   └───────┘     │
│                 │
│  "Text File"    │
└─────────────────┘
```
Color: Green (#10b981)
Background: Dark gray (#2a2a2a)

### 4. Generic Files
```
┌─────────────────┐
│   ┌───────┐     │
│   │      /│     │ <- Simple document outline
│   │     / │     │
│   │  ───  │     │ <- Few text lines
│   │  ───  │     │
│   │  ──   │     │
│   └───────┘     │
│                 │
│     "File"      │
└─────────────────┘
```
Color: Orange (#b45a46)
Background: Dark gray (#2a2a2a)

## Interactive Elements

### Buttons on File Previews

**View PDF Button** (for PDFs):
```
┌───────────────────┐
│ 🔗 View PDF       │
└───────────────────┘
```
- Opens PDF in new tab
- External link icon
- Outline variant

**Download Button** (for all files):
```
┌───────────────────┐
│ ⬇ Download        │
└───────────────────┘
```
- Downloads file
- Download icon
- Outline variant

## Text Preview Display

For text-based files (TXT, CSV, JSON, XML):
```
┌────────────────────────────────┐
│ const example = {              │
│   name: "Asset",               │
│   type: "NFT",                 │
│   description: "This is a..."  │
│ }                              │
│ ...                            │ <- "..." if truncated
└────────────────────────────────┘
```
- Monospace font (font-mono)
- Light gray text (text-muted-foreground)
- Bordered container
- Max height: 128px (overflow hidden)
- Shows first 500 characters

## Loading States

### During File Type Detection
```
┌─────────────────────────┐
│  [Skeleton Animation]   │ <- Pulsing gray rectangle
│                         │
│                         │
└─────────────────────────┘
```

### During Content Fetch
```
┌─────────────────────────┐
│  [Skeleton Circle]      │ <- For icon placeholder
│  [Skeleton Rectangle]   │ <- For text
│  [Skeleton Rectangle]   │ <- For buttons
└─────────────────────────┘
```

## Color Scheme

All visual elements follow the existing design system:

- **Background**: `bg-muted` (from design system)
- **Text**: `text-muted-foreground`
- **Borders**: Standard border colors
- **Icons**: Use existing color palette
- **Badges**: Follow badge component styling

## Responsive Behavior

### Mobile (< 640px)
- Badges stack vertically if needed
- Preview text size adjusts
- Buttons go full-width

### Tablet (640px - 1024px)
- Normal layout
- All badges visible in one row

### Desktop (> 1024px)
- Optimal spacing
- Larger preview areas
- Better readability

## Accessibility

- All images have alt text
- Badges use semantic HTML
- Color contrast meets WCAG AA standards
- Interactive elements have clear focus states
- Screen reader friendly labels

## Animation & Transitions

1. **Badge Appearance**: Fade in (300ms)
2. **Preview Loading**: Skeleton pulse animation
3. **Hover States**: Scale 1.05 on asset cards (existing)
4. **Image Transitions**: Opacity fade (300ms, existing)

## Browser Support

Visual features supported in:
- Chrome/Edge 90+
- Firefox 90+
- Safari 15+
- Mobile browsers (iOS Safari 15+, Chrome Mobile)

Fallbacks:
- CSS Grid → Flexbox
- Backdrop-filter → Solid background
- Modern fonts → System fonts
