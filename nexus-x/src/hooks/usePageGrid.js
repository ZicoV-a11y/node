import { useMemo, useRef } from 'react';

function pagesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].col !== b[i].col || a[i].row !== b[i].row) return false;
  }
  return true;
}

/**
 * Computes which page cells are occupied based on node positions.
 * Pages extend dynamically in all directions from the origin (0,0).
 *
 * @param {{ nodes: Array, pageWidth: number, pageHeight: number }} options
 * @returns {Array<{ col: number, row: number, x: number, y: number, width: number, height: number, label: string }>}
 */
export function usePageGrid({ nodes, pageWidth, pageHeight }) {
  const prevRef = useRef([]);

  return useMemo(() => {
    if (!pageWidth || !pageHeight) return prevRef.current;

    const occupied = new Set();

    // Always include the origin page
    occupied.add('0,0');

    // For each node, determine which page cells it overlaps
    for (const node of nodes) {
      const left = node.position.x;
      const top = node.position.y;
      const w = 200 * (node.scale || 1);
      const h = 150 * (node.scale || 1);
      const right = left + w;
      const bottom = top + h;

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
  }, [nodes, pageWidth, pageHeight]);
}
