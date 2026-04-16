import { useEffect, useRef, useState, useCallback } from 'react';
import { getImageObjectUrl } from '../../services/storage';

const ACCENT = '#22d3ee';
const MIN_SIZE = 20;

const S = {
  wrap: {
    position: 'absolute',
    userSelect: 'none',
  },
  lockedHoverArea: {
    position: 'absolute',
    pointerEvents: 'auto',
    background: 'transparent',
    cursor: 'pointer',
  },
  img: {
    display: 'block',
    width: '100%',
    height: '100%',
    objectFit: 'fill',
    pointerEvents: 'none',
  },
  selectionRing: {
    position: 'absolute',
    inset: '-2px',
    border: `2px dashed ${ACCENT}`,
    pointerEvents: 'none',
  },
  resizeHandle: {
    position: 'absolute',
    right: '-6px',
    bottom: '-6px',
    width: '12px',
    height: '12px',
    background: ACCENT,
    border: '1px solid #111',
    cursor: 'nwse-resize',
    zIndex: 3,
  },
  lockBadge: {
    position: 'absolute',
    left: '4px',
    top: '4px',
    width: '18px',
    height: '18px',
    background: 'rgba(0,0,0,0.6)',
    color: ACCENT,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    pointerEvents: 'none',
    zIndex: 3,
  },
  controlStrip: {
    position: 'absolute',
    left: 0,
    top: '-30px',
    height: '26px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '0 8px',
    background: '#111',
    border: '1px solid rgba(255,255,255,0.15)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '11px',
    color: '#ccc',
    pointerEvents: 'auto',
    zIndex: 10,
  },
  btn: {
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.15)',
    color: '#ccc',
    padding: '2px 8px',
    fontSize: '10px',
    cursor: 'pointer',
    fontFamily: "'Space Grotesk', sans-serif",
    letterSpacing: '1px',
  },
  slider: {
    width: '80px',
    accentColor: ACCENT,
  },
  label: {
    fontSize: '9px',
    letterSpacing: '1px',
    color: '#888',
    textTransform: 'uppercase',
  },
};

export default function BackgroundImage({
  image,
  zoom,
  canvasRef,
  selected,
  onSelect,
  onUpdate,
  onDelete,
  onToggleLock,
}) {
  const wrapRef = useRef(null);
  const [objectUrl, setObjectUrl] = useState(null);
  const [hovered, setHovered] = useState(false);

  // Load image blob as object URL
  useEffect(() => {
    let cancelled = false;
    getImageObjectUrl(image.blobKey || image.id).then((url) => {
      if (!cancelled) setObjectUrl(url);
    });
    return () => { cancelled = true; };
  }, [image.blobKey, image.id]);

  // ---- Drag to reposition ----
  const handleMouseDown = useCallback((e) => {
    if (image.locked) return;
    // Ignore drags that start on chrome (resize handle, control strip buttons)
    if (e.target.dataset?.bgChrome) return;
    e.stopPropagation();
    onSelect?.(image.id);

    const z = zoom || 1;
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = image.x;
    const origY = image.y;
    let lastX = origX;
    let lastY = origY;
    let rafId = null;

    const apply = () => {
      rafId = null;
      if (wrapRef.current) {
        wrapRef.current.style.left = `${lastX}px`;
        wrapRef.current.style.top = `${lastY}px`;
      }
    };

    const onMove = (me) => {
      const dx = (me.clientX - startX) / z;
      const dy = (me.clientY - startY) / z;
      lastX = origX + dx;
      lastY = origY + dy;
      if (rafId == null) rafId = requestAnimationFrame(apply);
    };
    const onUp = () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      onUpdate?.(image.id, { x: lastX, y: lastY });
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [image.id, image.locked, image.x, image.y, zoom, onSelect, onUpdate]);

  // ---- Resize from bottom-right handle ----
  const handleResizeMouseDown = useCallback((e) => {
    if (image.locked) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(image.id);

    const z = zoom || 1;
    const startX = e.clientX;
    const startY = e.clientY;
    const origW = image.width;
    const origH = image.height;
    const aspect = image.naturalWidth && image.naturalHeight
      ? image.naturalWidth / image.naturalHeight
      : origW / origH;
    let lastW = origW;
    let lastH = origH;
    let rafId = null;

    const apply = () => {
      rafId = null;
      if (wrapRef.current) {
        wrapRef.current.style.width = `${lastW}px`;
        wrapRef.current.style.height = `${lastH}px`;
      }
    };

    const onMove = (me) => {
      const dx = (me.clientX - startX) / z;
      const dy = (me.clientY - startY) / z;
      let newW = Math.max(MIN_SIZE, origW + dx);
      let newH = Math.max(MIN_SIZE, origH + dy);
      // Preserve aspect ratio unless Shift is held
      if (!me.shiftKey) {
        // Use the dominant axis to compute the other
        if (Math.abs(dx) > Math.abs(dy)) {
          newH = Math.max(MIN_SIZE, newW / aspect);
        } else {
          newW = Math.max(MIN_SIZE, newH * aspect);
        }
      }
      lastW = newW;
      lastH = newH;
      if (rafId == null) rafId = requestAnimationFrame(apply);
    };
    const onUp = () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      onUpdate?.(image.id, { width: lastW, height: lastH });
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [image.id, image.locked, image.width, image.height, image.naturalWidth, image.naturalHeight, zoom, onSelect, onUpdate]);

  const wrapStyle = {
    ...S.wrap,
    left: `${image.x}px`,
    top: `${image.y}px`,
    width: `${image.width}px`,
    height: `${image.height}px`,
    opacity: image.opacity ?? 1,
    zIndex: 0,
    pointerEvents: image.locked ? 'none' : 'auto',
    cursor: image.locked ? 'default' : 'move',
  };

  const showChrome = selected || hovered;

  return (
    <>
      <div
        ref={wrapRef}
        style={wrapStyle}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        data-bg-image-id={image.id}
      >
        {objectUrl && (
          <img
            src={objectUrl}
            alt={image.name || 'background'}
            draggable={false}
            style={S.img}
          />
        )}
        {selected && !image.locked && <div style={S.selectionRing} data-export-ignore="true" />}
        {!image.locked && selected && (
          <div
            style={S.resizeHandle}
            data-bg-chrome="true"
            data-export-ignore="true"
            onMouseDown={handleResizeMouseDown}
            title="Drag to resize (Shift = free)"
          />
        )}
      </div>

      {/* Locked: clickable lock badge (outside the pointer-events:none wrap) */}
      {image.locked && (
        <button
          style={{
            ...S.lockBadge,
            position: 'absolute',
            left: `${image.x + 4}px`,
            top: `${image.y + 4}px`,
            pointerEvents: 'auto',
            cursor: 'pointer',
            border: 'none',
          }}
          data-export-ignore="true"
          data-bg-chrome="true"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={(e) => { e.stopPropagation(); onToggleLock?.(image.id); }}
          title="Click to unlock"
        >
          🔒
        </button>
      )}

      {/* Control strip — separate element so it still receives clicks when image is locked */}
      {showChrome && (
        <div
          style={{
            ...S.controlStrip,
            left: `${image.x}px`,
            top: `${image.y - 30}px`,
          }}
          data-export-ignore="true"
          data-bg-chrome="true"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <span style={S.label}>{image.name || 'Image'}</span>
          <button
            style={S.btn}
            onClick={(e) => { e.stopPropagation(); onToggleLock?.(image.id); }}
            title={image.locked ? 'Unlock' : 'Lock'}
          >
            {image.locked ? 'UNLOCK' : 'LOCK'}
          </button>
          <span style={S.label}>Opacity</span>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={image.opacity ?? 1}
            onChange={(e) => onUpdate?.(image.id, { opacity: parseFloat(e.target.value) })}
            style={S.slider}
          />
          <button
            style={{ ...S.btn, color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)' }}
            onClick={(e) => { e.stopPropagation(); onDelete?.(image.id); }}
            title="Delete"
          >
            DELETE
          </button>
        </div>
      )}
    </>
  );
}
