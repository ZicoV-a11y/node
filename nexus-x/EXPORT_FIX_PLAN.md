# Fix: Multi-Page Export — Black PNGs + Slow Performance

## Terminology (code names)
- **Canvas** (`canvasRef`, `<div data-canvas>`) — The dark workspace div with `bg-zinc-950` (#18181b). Sized to ONE page (e.g. 1632×1056 for ANSI_B landscape). Has `overflow: visible` so nodes beyond its bounds are still visible on screen.
- **Pages** (`pages` array from `usePageGrid`) — The gridded page areas. Purely visual SVG overlays rendered by `PageGridOverlay`. Each page = `{ col, row, x, y, width, height, label }` where `x = col * pageWidth`, `y = row * pageHeight`.
- **Page bounds** (`pageBounds`) — Bounding box of all pages: `{ x: minX, y: minY, width: maxX-minX, height: maxY-minY }`.
- **Transform wrapper** (`transformRef`) — Parent div applying `translate(pan) scale(zoom)`. NOT included in export captures.

## Problem 1: Black PNGs
`renderPageBlob()` in storage.js applies this style to the canvas clone:
```js
style: {
  transform: `translate(${-page.x}px, ${-page.y}px)`,
  overflow: 'hidden',
  width: `${page.width}px`,   // ← ONE page wide
  height: `${page.height}px`, // ← ONE page tall
}
```
The canvas div is only one page wide. Nodes on Page 2+ are absolutely positioned beyond this width (e.g. `left: 1700px`). CSS `overflow: hidden` clips children **before** the transform is applied, so all content beyond the first page is invisible. Result: black PNG.

## Problem 2: Slow (7 separate DOM clones)
Each `domToBlob()` call clones the entire canvas DOM tree, renders it to an internal canvas, and encodes PNG. Doing this 7 times (6 pages + layout) is extremely expensive.

## Solution: Render Once, Crop Multiple
1. Call `domToBlob` **once** to render the full layout (all pages combined)
2. Use `createImageBitmap` + HTML5 Canvas to **crop** each page from the layout image
3. Canvas cropping is near-instant — no DOM cloning, no PNG re-encoding until `toBlob`

This fixes both issues:
- **Correctness**: `renderLayoutBlob` already uses `pageBounds` dimensions which cover all pages, so no content is clipped
- **Speed**: 1 expensive domToBlob call instead of 7

## Files to Modify
- `nexus-x/src/services/storage.js` — add `cropPageBlobs()` helper
- `nexus-x/src/App.jsx` — rewrite `handleExportPNG` multi-page block

## Changes

### 1. Add `cropPageBlobs()` to storage.js (after `renderLayoutBlob`)
```js
export async function cropPageBlobs(layoutBlob, pages, pageBounds) {
  const img = await createImageBitmap(layoutBlob);
  const results = [];
  for (const page of pages) {
    const canvas = document.createElement('canvas');
    canvas.width = page.width;
    canvas.height = page.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      img,
      page.x - pageBounds.x, page.y - pageBounds.y,  // source position in layout
      page.width, page.height,                         // source size
      0, 0, page.width, page.height                    // destination
    );
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    results.push({ page, blob });
  }
  img.close();
  return results;
}
```

### 2. Rewrite `handleExportPNG` multi-page block in App.jsx
```js
// Render full layout ONCE (single expensive domToBlob)
setExportProgress({ current: 0, total: pages.length + 1 });
await new Promise(r => setTimeout(r, 0));
const layoutBlob = await renderLayoutBlob(canvas, pageBounds);

// Crop each page from the layout image (cheap canvas ops)
const cropped = await cropPageBlobs(layoutBlob, pages, pageBounds);
const namedBlobs = cropped.map(({ page, blob }) => ({
  name: `${name}-${page.label.replace(/\s+/g, '-')}.png`, blob,
}));

// Add layout image
namedBlobs.push({ name: `${name}-Layout.png`, blob: layoutBlob });

await downloadZip(namedBlobs, `${name}-${stamp}.zip`);
```
Progress updates and try/catch/finally wrapper remain as currently implemented.

### 3. Import `cropPageBlobs` in App.jsx
Add to existing import from `./services/storage`.

## Why This Works
- `renderLayoutBlob` sets `style.width = pageBounds.width` which covers ALL pages — no content is clipped
- The layout image contains every node on every page
- `createImageBitmap` + `drawImage` crops are GPU-accelerated, near-instant
- Total: 1 domToBlob + N canvas crops vs. N+1 domToBlobs (6-7x faster)
- `img.close()` frees the ImageBitmap memory immediately after cropping

## Verification
1. Run the dev server, create a project with 6+ occupied pages
2. Click Export ZIP and verify:
   - No crash or "Page Unresponsive"
   - Each page PNG shows the correct page content (not black)
   - Layout PNG shows all pages together
   - ZIP downloads with all files
3. Test single-page export still works (unaffected — uses cached blob path)
