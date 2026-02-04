import { useMemo, useRef, useState, useLayoutEffect } from 'react';

function pagesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].col !== b[i].col || a[i].row !== b[i].row ||
        a[i].width !== b[i].width || a[i].height !== b[i].height) return false;
  }
  return true;
}

/**
 * Computes which page cells are occupied based on node positions.
 * Pages extend dynamically in all directions from the origin (0,0).
 * Uses actual DOM measurements for accurate node bounding boxes.
 *
 * @param {{ nodes: Array, pageWidth: number, pageHeight: number, canvasRef: React.RefObject }} options
 * @returns {Array<{ col: number, row: number, x: number, y: number, width: number, height: number, label: string }>}
 */
export function usePageGrid({ nodes, pageWidth, pageHeight, canvasRef }) {
  const prevRef = useRef([]);
  const [measuredBounds, setMeasuredBounds] = useState([]);

  // Measure actual node bounding boxes after DOM updates
  useLayoutEffect(() => {
    if (!canvasRef?.current || !pageWidth || nodes.length === 0) {
      setMeasuredBounds(prev => prev.length === 0 ? prev : []);
      return;
    }
    const canvas = canvasRef.current;
    const canvasRect = canvas.getBoundingClientRect();
    const zf = canvasRect.width / (canvas.offsetWidth || 1);
    if (zf === 0) return;

    const bounds = [];
    for (const child of canvas.children) {
      // Skip SVG layer and non-node elements (margin guides, etc.)
      if (child.tagName === 'svg' || child.tagName === 'SVG') continue;
      if (child.classList.contains('pointer-events-none')) continue;
      const cr = child.getBoundingClientRect();
      bounds.push({
        left: (cr.left - canvasRect.left) / zf,
        top: (cr.top - canvasRect.top) / zf,
        right: (cr.right - canvasRect.left) / zf,
        bottom: (cr.bottom - canvasRect.top) / zf,
      });
    }
    setMeasuredBounds(bounds);
  }, [nodes, canvasRef, pageWidth]);

  return useMemo(() => {
    if (!pageWidth || !pageHeight) return prevRef.current;

    const occupied = new Set();

    // Always include the origin page
    occupied.add('0,0');

    // Use measured bounds if available, otherwise fall back to estimates
    const boundsToUse = measuredBounds.length > 0 ? measuredBounds :
      nodes.map(node => {
        const s = node.scale || 1;
        return {
          left: node.position.x,
          top: node.position.y,
          right: node.position.x + 400 * s,
          bottom: node.position.y + 300 * s,
        };
      });

    for (const { left, top, right, bottom } of boundsToUse) {
      const colStart = Math.floor(left / pageWidth);
      const colEnd = Math.floor((right - 1) / pageWidth);
      const rowStart = Math.floor(top / pageHeight);
      const rowEnd = Math.floor((bottom - 1) / pageHeight);

      for (let col = colStart; col <= colEnd; col++) {
        for (let row = rowStart; row <= rowEnd; row++) {
          occupied.add(`${col},${row}`);
        }
      }
    }

    // Convert Set to sorted array of page descriptors
    const pages = [];
    for (const key of occupied) {
      const [col, row] = key.split(',').map(Number);
      pages.push({
        col,
        row,
        x: col * pageWidth,
        y: row * pageHeight,
        width: pageWidth,
        height: pageHeight,
        label: '',
      });
    }

    // Sort: top-to-bottom, then left-to-right
    pages.sort((a, b) => a.row - b.row || a.col - b.col);

    // Assign sequential labels
    pages.forEach((p, i) => {
      p.label = `Page ${i + 1}`;
    });

    // Return previous reference if pages haven't changed (optimization)
    if (pagesEqual(prevRef.current, pages)) {
      return prevRef.current;
    }

    prevRef.current = pages;
    return pages;
  }, [measuredBounds, nodes, pageWidth, pageHeight]);
}
