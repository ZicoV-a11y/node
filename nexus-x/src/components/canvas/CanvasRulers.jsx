import { forwardRef, useImperativeHandle, useRef, useState, useEffect, useCallback } from 'react';

const RULER_SIZE = 20;
const DPI = 96;
const MIN_SCREEN_GAP = 50;

// Background & styling colors (matching zinc dark theme)
const BG = '#18181b';        // zinc-900
const BORDER = '#3f3f46';    // zinc-700
const TICK_MAJOR = '#71717a'; // zinc-500
const TICK_MINOR = '#52525b'; // zinc-600
const LABEL_COLOR = '#a1a1aa'; // zinc-400
const CORNER_HOVER = '#27272a'; // zinc-800
const FONT = '9px ui-monospace, SFMono-Regular, monospace';

function computeTickInterval(zoom, unit) {
  if (unit === 'px') {
    const niceSteps = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
    for (const step of niceSteps) {
      if (step * zoom >= MIN_SCREEN_GAP) {
        return { major: step, minor: step / 5, labelFn: (v) => String(Math.round(v)) };
      }
    }
    return { major: 10000, minor: 2000, labelFn: (v) => String(Math.round(v)) };
  }

  // Inches
  const niceInchSteps = [0.125, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100];
  for (const step of niceInchSteps) {
    const pxStep = step * DPI;
    if (pxStep * zoom >= MIN_SCREEN_GAP) {
      const decimals = step < 0.25 ? 3 : step < 1 ? 2 : step >= 10 ? 0 : 1;
      return {
        major: pxStep,
        minor: pxStep / 4,
        labelFn: (v) => (v / DPI).toFixed(decimals) + '"',
      };
    }
  }
  return { major: 100 * DPI, minor: 25 * DPI, labelFn: (v) => (v / DPI).toFixed(0) + '"' };
}

function drawHorizontalRuler(ctx, width, height, panX, zoom, unit) {
  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);

  // Bottom border
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height - 0.5);
  ctx.lineTo(width, height - 0.5);
  ctx.stroke();

  const { major, minor, labelFn } = computeTickInterval(zoom, unit);

  // Visible canvas range (accounting for ruler offset)
  const canvasStart = (RULER_SIZE - panX) / zoom;
  const canvasEnd = (width + RULER_SIZE - panX) / zoom;
  const firstTick = Math.floor(canvasStart / minor) * minor;

  ctx.font = FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  for (let canvasPos = firstTick; canvasPos <= canvasEnd; canvasPos += minor) {
    // Convert canvas position to screen position relative to ruler left edge
    const screenX = canvasPos * zoom + panX - RULER_SIZE;
    const isMajor = Math.abs(canvasPos - Math.round(canvasPos / major) * major) < 0.5;

    ctx.beginPath();
    if (isMajor) {
      ctx.strokeStyle = TICK_MAJOR;
      ctx.moveTo(Math.round(screenX) + 0.5, height);
      ctx.lineTo(Math.round(screenX) + 0.5, height - 12);
      ctx.stroke();
      ctx.fillStyle = LABEL_COLOR;
      ctx.fillText(labelFn(canvasPos), screenX, 2);
    } else {
      ctx.strokeStyle = TICK_MINOR;
      ctx.moveTo(Math.round(screenX) + 0.5, height);
      ctx.lineTo(Math.round(screenX) + 0.5, height - 5);
      ctx.stroke();
    }
  }
}

function drawVerticalRuler(ctx, width, height, panY, zoom, unit) {
  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width, height);

  // Right border
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width - 0.5, 0);
  ctx.lineTo(width - 0.5, height);
  ctx.stroke();

  const { major, minor, labelFn } = computeTickInterval(zoom, unit);

  // Visible canvas range (accounting for ruler offset)
  const canvasStart = (RULER_SIZE - panY) / zoom;
  const canvasEnd = (height + RULER_SIZE - panY) / zoom;
  const firstTick = Math.floor(canvasStart / minor) * minor;

  ctx.font = FONT;
  ctx.textBaseline = 'middle';

  for (let canvasPos = firstTick; canvasPos <= canvasEnd; canvasPos += minor) {
    const screenY = canvasPos * zoom + panY - RULER_SIZE;
    const isMajor = Math.abs(canvasPos - Math.round(canvasPos / major) * major) < 0.5;

    ctx.beginPath();
    if (isMajor) {
      ctx.strokeStyle = TICK_MAJOR;
      ctx.moveTo(width, Math.round(screenY) + 0.5);
      ctx.lineTo(width - 12, Math.round(screenY) + 0.5);
      ctx.stroke();

      // Draw label rotated -90 degrees
      ctx.save();
      ctx.translate(8, screenY);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = LABEL_COLOR;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelFn(canvasPos), 0, 0);
      ctx.restore();
    } else {
      ctx.strokeStyle = TICK_MINOR;
      ctx.moveTo(width, Math.round(screenY) + 0.5);
      ctx.lineTo(width - 5, Math.round(screenY) + 0.5);
      ctx.stroke();
    }
  }
}

const CanvasRulers = forwardRef(function CanvasRulers({ containerRef, visible }, ref) {
  const hCanvasRef = useRef(null);
  const vCanvasRef = useRef(null);
  const [unit, setUnit] = useState(() => localStorage.getItem('nx-rulerUnit') || 'px');
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const unitRef = useRef(unit);
  const dimsRef = useRef(dims);
  const lastPan = useRef({ x: 0, y: 0 });
  const lastZoom = useRef(1);

  useEffect(() => { unitRef.current = unit; }, [unit]);
  useEffect(() => { dimsRef.current = dims; }, [dims]);

  // Track container dimensions
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setDims({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  // Resize canvas backing store when dimensions change
  useEffect(() => {
    if (!visible) return;
    const dpr = window.devicePixelRatio || 1;
    if (hCanvasRef.current) {
      const w = dims.width - RULER_SIZE;
      if (w > 0) {
        hCanvasRef.current.width = w * dpr;
        hCanvasRef.current.height = RULER_SIZE * dpr;
        const ctx = hCanvasRef.current.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }
    if (vCanvasRef.current) {
      const h = dims.height - RULER_SIZE;
      if (h > 0) {
        vCanvasRef.current.width = RULER_SIZE * dpr;
        vCanvasRef.current.height = h * dpr;
        const ctx = vCanvasRef.current.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }
    // Redraw after resize
    drawBoth(lastPan.current, lastZoom.current);
  }, [dims, visible]);

  // Redraw when unit changes
  useEffect(() => {
    if (visible) drawBoth(lastPan.current, lastZoom.current);
  }, [unit, visible]);

  function drawBoth(pan, zoom) {
    const d = dimsRef.current;
    const u = unitRef.current;
    if (hCanvasRef.current) {
      const w = d.width - RULER_SIZE;
      if (w > 0) {
        const ctx = hCanvasRef.current.getContext('2d');
        drawHorizontalRuler(ctx, w, RULER_SIZE, pan.x, zoom, u);
      }
    }
    if (vCanvasRef.current) {
      const h = d.height - RULER_SIZE;
      if (h > 0) {
        const ctx = vCanvasRef.current.getContext('2d');
        drawVerticalRuler(ctx, RULER_SIZE, h, pan.y, zoom, u);
      }
    }
  }

  // Imperative draw exposed to parent
  const draw = useCallback((pan, zoom) => {
    lastPan.current = pan;
    lastZoom.current = zoom;
    if (!visible) return;
    drawBoth(pan, zoom);
  }, [visible]);

  useImperativeHandle(ref, () => ({ draw }), [draw]);

  const toggleUnit = useCallback(() => {
    setUnit(prev => {
      const next = prev === 'px' ? 'in' : 'px';
      localStorage.setItem('nx-rulerUnit', next);
      return next;
    });
  }, []);

  if (!visible) return null;

  return (
    <>
      {/* Corner square — unit toggle */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: RULER_SIZE,
          height: RULER_SIZE,
          zIndex: 32,
          backgroundColor: BG,
          borderRight: `1px solid ${BORDER}`,
          borderBottom: `1px solid ${BORDER}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          pointerEvents: 'auto',
        }}
        onClick={toggleUnit}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = CORNER_HOVER; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = BG; }}
        title={`Unit: ${unit === 'px' ? 'Pixels' : 'Inches'} (click to toggle)`}
      >
        <span style={{ fontSize: 8, color: LABEL_COLOR, fontFamily: 'ui-monospace, monospace', userSelect: 'none' }}>
          {unit}
        </span>
      </div>

      {/* Horizontal ruler */}
      <canvas
        ref={hCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: RULER_SIZE,
          width: dims.width - RULER_SIZE,
          height: RULER_SIZE,
          zIndex: 31,
          pointerEvents: 'none',
        }}
      />

      {/* Vertical ruler */}
      <canvas
        ref={vCanvasRef}
        style={{
          position: 'absolute',
          top: RULER_SIZE,
          left: 0,
          width: RULER_SIZE,
          height: dims.height - RULER_SIZE,
          zIndex: 31,
          pointerEvents: 'none',
        }}
      />
    </>
  );
});

export default CanvasRulers;
