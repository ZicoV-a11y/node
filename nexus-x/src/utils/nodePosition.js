const OVERLAP_THRESHOLD = 30;
const STAGGER_STEP = 40;
const MAX_ATTEMPTS = 50;
const DEFAULT_NODE_WIDTH = 320;
const DEFAULT_NODE_HEIGHT = 200;

/**
 * Compute the canvas-space coordinates of the viewport center.
 */
export function getViewportCenter(containerRef, panRef, zoomRef) {
  const container = containerRef.current;
  if (!container) return { x: 200, y: 200 };
  const rect = container.getBoundingClientRect();
  return {
    x: (rect.width / 2 - panRef.current.x) / zoomRef.current,
    y: (rect.height / 2 - panRef.current.y) / zoomRef.current,
  };
}

/**
 * Find a position for a new node that doesn't stack corner-to-corner
 * with any existing node.
 *
 * @param {Array} existingNodes - array of node objects with .position
 * @param {number} targetX - desired X (center if isCenterTarget, else top-left)
 * @param {number} targetY - desired Y
 * @param {object} options
 */
export function findOpenPosition(existingNodes, targetX, targetY, options = {}) {
  const {
    isCenterTarget = true,
    snapToGrid = false,
    gridSize = 10,
  } = options;

  let x = isCenterTarget ? targetX - DEFAULT_NODE_WIDTH / 2 : targetX;
  let y = isCenterTarget ? targetY - DEFAULT_NODE_HEIGHT / 2 : targetY;

  if (snapToGrid && gridSize > 0) {
    x = Math.round(x / gridSize) * gridSize;
    y = Math.round(y / gridSize) * gridSize;
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const collision = existingNodes.some(
      (node) =>
        Math.abs(node.position.x - x) < OVERLAP_THRESHOLD &&
        Math.abs(node.position.y - y) < OVERLAP_THRESHOLD
    );

    if (!collision) return { x, y };

    x += STAGGER_STEP;
    y += STAGGER_STEP;

    if (snapToGrid && gridSize > 0) {
      x = Math.round(x / gridSize) * gridSize;
      y = Math.round(y / gridSize) * gridSize;
    }
  }

  return { x, y };
}
