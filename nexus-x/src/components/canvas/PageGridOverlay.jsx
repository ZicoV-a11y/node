import { memo, useMemo } from 'react';

const PRINT_MARGINS = { top: 48, right: 48, bottom: 48, left: 48 };

function PageGridOverlayInner({ pages, zoom, showRatioOverlay }) {
  const borderWidth = 1 / zoom;
  const fontSize = 14 / zoom;
  const marginBorderWidth = 1 / zoom;
  const marginDash = `${6 / zoom} ${4 / zoom}`;

  // Compute bounding box to size the SVG appropriately
  const bounds = useMemo(() => {
    if (pages.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    const minX = Math.min(...pages.map(p => p.x));
    const minY = Math.min(...pages.map(p => p.y));
    const maxX = Math.max(...pages.map(p => p.x + p.width));
    const maxY = Math.max(...pages.map(p => p.y + p.height));
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }, [pages]);

  // Calculate ratio overlay that maintains paper aspect ratio across all pages
  const ratioOverlay = useMemo(() => {
    if (!showRatioOverlay || pages.length === 0) return null;

    const minX = Math.min(...pages.map(p => p.x));
    const minY = Math.min(...pages.map(p => p.y));
    const maxX = Math.max(...pages.map(p => p.x + p.width));
    const maxY = Math.max(...pages.map(p => p.y + p.height));

    const totalWidth = maxX - minX;
    const totalHeight = maxY - minY;

    const pageWidth = pages[0].width;
    const pageHeight = pages[0].height;
    const paperAspect = pageWidth / pageHeight;

    let overlayWidth, overlayHeight;
    const totalAspect = totalWidth / totalHeight;

    if (totalAspect > paperAspect) {
      overlayWidth = totalWidth;
      overlayHeight = totalWidth / paperAspect;
    } else {
      overlayHeight = totalHeight;
      overlayWidth = totalHeight * paperAspect;
    }

    const centerX = minX + totalWidth / 2;
    const centerY = minY + totalHeight / 2;

    return {
      x: centerX - overlayWidth / 2,
      y: centerY - overlayHeight / 2,
      width: overlayWidth,
      height: overlayHeight,
    };
  }, [showRatioOverlay, pages]);

  if (pages.length === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'visible',
      }}
    >
      {pages.map((page) => (
        <g key={`${page.col},${page.row}`}>
          {/* Page boundary */}
          <rect
            x={page.x - bounds.x}
            y={page.y - bounds.y}
            width={page.width}
            height={page.height}
            fill="none"
            stroke="#3f3f46"
            strokeWidth={borderWidth}
          />
          {/* Print margin guide inside each page */}
          <rect
            x={page.x - bounds.x + PRINT_MARGINS.left}
            y={page.y - bounds.y + PRINT_MARGINS.top}
            width={page.width - PRINT_MARGINS.left - PRINT_MARGINS.right}
            height={page.height - PRINT_MARGINS.top - PRINT_MARGINS.bottom}
            fill="none"
            stroke="#27272a"
            strokeWidth={marginBorderWidth}
            strokeDasharray={marginDash}
          />
          {/* Page label */}
          <text
            x={page.x - bounds.x + 10 / zoom}
            y={page.y - bounds.y + 24 / zoom}
            fill="#52525b"
            fontSize={fontSize}
            fontFamily="ui-monospace, SFMono-Regular, monospace"
          >
            {page.label}
          </text>
        </g>
      ))}

      {/* Ratio overlay — blue dashed outline maintaining paper aspect ratio */}
      {ratioOverlay && (
        <rect
          x={ratioOverlay.x - bounds.x}
          y={ratioOverlay.y - bounds.y}
          width={ratioOverlay.width}
          height={ratioOverlay.height}
          fill="none"
          stroke="#00bfff"
          strokeWidth={3 / zoom}
          strokeDasharray={`${10 / zoom} ${5 / zoom}`}
        />
      )}
    </svg>
  );
}

export default memo(PageGridOverlayInner);
