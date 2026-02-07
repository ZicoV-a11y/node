import { memo, useMemo } from 'react';

const GRID_SPACING = 50; // 50px grid lines

function PageGridOverlayInner({ pages, zoom, showRatioOverlay }) {
  const borderWidth = 1 / zoom;
  const fontSize = 14 / zoom;
  const gridLineWidth = 0.5 / zoom;
  const gridDash = `${2 / zoom} ${4 / zoom}`;

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
          {/* 50px grid lines - vertical */}
          {Array.from({ length: Math.floor(page.width / GRID_SPACING) }, (_, i) => (
            <line
              key={`v-${i}`}
              x1={page.x - bounds.x + (i + 1) * GRID_SPACING}
              y1={page.y - bounds.y}
              x2={page.x - bounds.x + (i + 1) * GRID_SPACING}
              y2={page.y - bounds.y + page.height}
              stroke="#27272a"
              strokeWidth={gridLineWidth}
              strokeDasharray={gridDash}
            />
          ))}
          {/* 50px grid lines - horizontal */}
          {Array.from({ length: Math.floor(page.height / GRID_SPACING) }, (_, i) => (
            <line
              key={`h-${i}`}
              x1={page.x - bounds.x}
              y1={page.y - bounds.y + (i + 1) * GRID_SPACING}
              x2={page.x - bounds.x + page.width}
              y2={page.y - bounds.y + (i + 1) * GRID_SPACING}
              stroke="#27272a"
              strokeWidth={gridLineWidth}
              strokeDasharray={gridDash}
            />
          ))}
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
