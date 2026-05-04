const CORNER_RADIUS = 8;
const ANCHOR_OFFSET = 30;

// Pure wire path geometry — no React dependencies.
// fromPos / toPos: { x, y, side: 'left' | 'right' }
export function computeWirePath(fromPos, toPos, waypoints = []) {
  if (!fromPos || !toPos) return '';

  if (!waypoints || !waypoints.length) {
    const dx = Math.abs(toPos.x - fromPos.x);
    const offset = Math.max(50, dx * 0.4);
    const fromCtrlX = fromPos.side === 'left' ? fromPos.x - offset : fromPos.x + offset;
    const toCtrlX = toPos.side === 'left' ? toPos.x - offset : toPos.x + offset;
    return `M ${fromPos.x} ${fromPos.y} C ${fromCtrlX} ${fromPos.y}, ${toCtrlX} ${toPos.y}, ${toPos.x} ${toPos.y}`;
  }

  const allPoints = [];
  allPoints.push({ x: fromPos.x, y: fromPos.y });
  const fromOffsetX = fromPos.side === 'left' ? fromPos.x - ANCHOR_OFFSET : fromPos.x + ANCHOR_OFFSET;
  allPoints.push({ x: fromOffsetX, y: fromPos.y });
  waypoints.forEach(wp => allPoints.push({ x: wp.x, y: wp.y }));
  const toOffsetX = toPos.side === 'left' ? toPos.x - ANCHOR_OFFSET : toPos.x + ANCHOR_OFFSET;
  allPoints.push({ x: toOffsetX, y: toPos.y });
  allPoints.push({ x: toPos.x, y: toPos.y });

  let path = `M ${allPoints[0].x} ${allPoints[0].y}`;
  for (let i = 1; i < allPoints.length; i++) {
    const prev = allPoints[i - 1], curr = allPoints[i], next = allPoints[i + 1];
    if (!next || i === allPoints.length - 1) {
      path += ` L ${curr.x} ${curr.y}`;
    } else {
      const dx1 = curr.x - prev.x, dy1 = curr.y - prev.y;
      const dx2 = next.x - curr.x, dy2 = next.y - curr.y;
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      const maxRadius = Math.min(len1 / 2, len2 / 2, CORNER_RADIUS);
      if (maxRadius < 2 || len1 < 4 || len2 < 4) {
        path += ` L ${curr.x} ${curr.y}`;
      } else {
        path += ` L ${curr.x - (dx1 / len1) * maxRadius} ${curr.y - (dy1 / len1) * maxRadius}`;
        path += ` Q ${curr.x} ${curr.y}, ${curr.x + (dx2 / len2) * maxRadius} ${curr.y + (dy2 / len2) * maxRadius}`;
      }
    }
  }
  return path;
}
