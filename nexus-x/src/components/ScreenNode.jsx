import { useState, useRef, useEffect, useCallback, useLayoutEffect, memo } from 'react';
import { putImageBlob, getImageObjectUrl, revokeImageObjectUrl } from '../services/storage';
import { SIGNAL_COLOR_HEX_BY_ID } from '../config/signalColors';
import { T } from '../config/theme';

const TITLE_BAR_H = 36;
const RAIL_W = 90;            // wide enough for "XD A/B 11" and similar
const DOT_SIZE = 7;           // small square at the outer edge of the rail
const RESIZE_HANDLE_PX = 14;
const MIN_W = 360;
const MIN_H = 160;

// Default anchors created on every new ScreenNode. Power + Data are always present.
const DEFAULT_ANCHORS = () => [
  { id: 'pwr', label: 'POWER', kind: 'power', side: 'left', direction: 'in', fixed: true },
  { id: 'dat', label: 'DATA',  kind: 'data',  side: 'left', direction: 'in', fixed: true },
];

function ScreenNode({
  node,
  zoom,
  isSelected,
  snapToGrid,
  gridSize,
  onUpdate,
  onDelete,
  onAnchorClick,
  registerAnchor,
  unregisterAnchors,
  activeWire,
  connectedAnchorIds,
  selectedNodes,
  onMoveSelectedNodes,
  onSelect,
  onDragUpdate,
  onDragEnd,
  getWireAxisSnap,
}) {
  const nodeRef = useRef(null);
  const fileInputRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const width = node.width || 480;
  const height = node.height || 270;
  const anchors = node.anchors && node.anchors.length > 0 ? node.anchors : DEFAULT_ANCHORS();
  const signalHex = node.signalColor ? SIGNAL_COLOR_HEX_BY_ID.get(node.signalColor) : null;

  // Split anchors by side so each side can distribute its anchors evenly.
  const leftAnchors = anchors.filter(a => a.side === 'left');
  const rightAnchors = anchors.filter(a => a.side === 'right');

  // Even-distribution Y for an anchor at index i of n on a rail.
  const evenY = (i, n) => (n <= 1 ? 0.5 : (i + 1) / (n + 1));

  // Row height per rail = available rail height divided by anchor count, capped 18..36px.
  // (Tight when there are many anchors so labels don't overlap; comfortable when few.)
  const railH = Math.max(0, height - TITLE_BAR_H);
  const leftRowH = Math.max(18, Math.min(36, leftAnchors.length > 0 ? railH / leftAnchors.length : 24));
  const rightRowH = Math.max(18, Math.min(36, rightAnchors.length > 0 ? railH / rightAnchors.length : 24));

  // ---- Resolve image blob to object URL ----
  useEffect(() => {
    let cancelled = false;
    if (!node.imageBlobKey) {
      setImageUrl(null);
      return;
    }
    getImageObjectUrl(node.imageBlobKey).then(url => {
      if (!cancelled) setImageUrl(url || null);
    });
    return () => { cancelled = true; };
  }, [node.imageBlobKey]);

  // ---- Image upload ----
  const handleImageFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const blobKey = `screen-${Date.now()}`;
    await putImageBlob(blobKey, file, file.type);
    if (node.imageBlobKey) revokeImageObjectUrl(node.imageBlobKey);
    onUpdate({ imageBlobKey: blobKey });
  }, [node.imageBlobKey, onUpdate]);

  const handleFilePick = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    e.target.value = '';
  }, [handleImageFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleImageFile(file);
  }, [handleImageFile]);

  // ---- Anchor mutations ----
  const writeAnchors = useCallback((next) => onUpdate({ anchors: next }), [onUpdate]);

  const addAnchor = useCallback((direction /* 'in' | 'out' */) => {
    const next = [...anchors, {
      id: `a-${Date.now()}`,
      label: '',
      kind: 'custom',
      side: direction === 'in' ? 'left' : 'right',
      direction,
      fixed: false,
    }];
    writeAnchors(next);
  }, [anchors, writeAnchors]);

  const removeAnchor = useCallback((id) => {
    const a = anchors.find(x => x.id === id);
    if (a?.fixed) return;
    writeAnchors(anchors.filter(x => x.id !== id));
  }, [anchors, writeAnchors]);

  const swapSide = useCallback((id) => {
    writeAnchors(anchors.map(a =>
      a.id === id ? { ...a, side: a.side === 'left' ? 'right' : 'left' } : a
    ));
  }, [anchors, writeAnchors]);

  const setLabel = useCallback((id, label) => {
    writeAnchors(anchors.map(a => a.id === id ? { ...a, label } : a));
  }, [anchors, writeAnchors]);

  // ---- Anchor registration with the wire system ----
  useLayoutEffect(() => {
    if (!nodeRef.current || !registerAnchor) return;
    const nodeRect = nodeRef.current.getBoundingClientRect();
    const totalScale = (node.scale || 1) * zoom;
    const registered = new Set();

    nodeRef.current.querySelectorAll('[data-anchor-id]').forEach(el => {
      const aid = el.getAttribute('data-anchor-id');
      const dir = el.getAttribute('data-anchor-direction'); // 'in' | 'out'
      const side = el.getAttribute('data-anchor-side');     // 'left' | 'right'
      if (!aid || !dir || !side) return;
      registered.add(aid);
      const r = el.getBoundingClientRect();
      const localX = (r.left + r.width / 2 - nodeRect.left) / totalScale;
      const localY = (r.top + r.height / 2 - nodeRect.top) / totalScale;
      registerAnchor(aid, {
        nodeId: node.id,
        localX,
        localY,
        type: dir,
        side,
      });
    });

    return () => {
      if (unregisterAnchors) unregisterAnchors(Array.from(registered));
    };
  }, [
    node.id, node.scale, node.width, node.height, anchors,
    zoom, registerAnchor, unregisterAnchors,
  ]);

  // ---- Drag (RAF-throttled — preserves perf optimization) ----
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const lastPositionRef = useRef(null);
  const hasDraggedRef = useRef(false);

  const handleTitleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
    e.stopPropagation();
    e.preventDefault();
    onSelect?.(node.id, e.shiftKey);
    const canvas = nodeRef.current?.closest('[data-canvas]');
    if (!canvas) return;
    const cr = canvas.getBoundingClientRect();
    setDragStart({
      offsetX: e.clientX - cr.left - node.position.x * zoom,
      offsetY: e.clientY - cr.top - node.position.y * zoom,
    });
    lastPositionRef.current = { x: node.position.x, y: node.position.y };
    hasDraggedRef.current = false;
    setIsDragging(true);
  }, [node.id, node.position.x, node.position.y, zoom, onSelect]);

  useEffect(() => {
    if (!isDragging || !dragStart) return;
    let rafId = null;
    let pendingPosition = null;
    let pendingDelta = null;

    const onMove = (e) => {
      hasDraggedRef.current = true;
      const canvas = nodeRef.current?.closest('[data-canvas]');
      if (!canvas) return;
      const cr = canvas.getBoundingClientRect();
      let nx = (e.clientX - cr.left - dragStart.offsetX) / zoom;
      let ny = (e.clientY - cr.top - dragStart.offsetY) / zoom;

      if ((e.ctrlKey || e.metaKey) && getWireAxisSnap) {
        const snapped = getWireAxisSnap(node.id, nx, ny);
        nx = snapped.x; ny = snapped.y;
      } else if (snapToGrid && gridSize > 0) {
        nx = Math.round(nx / gridSize) * gridSize;
        ny = Math.round(ny / gridSize) * gridSize;
      }

      const dx = nx - (lastPositionRef.current?.x || node.position.x);
      const dy = ny - (lastPositionRef.current?.y || node.position.y);

      if (nodeRef.current) {
        nodeRef.current.style.left = `${nx}px`;
        nodeRef.current.style.top = `${ny}px`;
      }
      onDragUpdate?.(node.id, nx, ny, node.scale || 1);

      pendingPosition = { x: nx, y: ny };
      pendingDelta = { x: dx, y: dy };
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          if (pendingPosition) {
            onUpdate({ position: pendingPosition });
            if (selectedNodes && selectedNodes.size > 1 && onMoveSelectedNodes && pendingDelta) {
              onMoveSelectedNodes(pendingDelta.x, pendingDelta.y, node.id);
            }
            lastPositionRef.current = pendingPosition;
          }
          rafId = null;
        });
      }
    };

    const onUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      onDragEnd?.();
      setIsDragging(false);
      lastPositionRef.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [
    isDragging, dragStart, zoom, snapToGrid, gridSize,
    node.id, node.position.x, node.position.y, node.scale,
    selectedNodes, onMoveSelectedNodes, onUpdate, onDragUpdate, onDragEnd, getWireAxisSnap,
  ]);

  // ---- Resize ----
  const handleResizeMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const startW = width, startH = height;
    let rafId = null;
    let pending = null;

    const onMove = (me) => {
      const dw = (me.clientX - startX) / zoom;
      const dh = (me.clientY - startY) / zoom;
      const nw = Math.max(MIN_W, Math.round(startW + dw));
      const nh = Math.max(MIN_H, Math.round(startH + dh));
      pending = { width: nw, height: nh };
      if (nodeRef.current) {
        nodeRef.current.style.width = `${nw}px`;
        nodeRef.current.style.height = `${nh}px`;
      }
      onDragUpdate?.(node.id, node.position.x, node.position.y, node.scale || 1);
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          if (pending) onUpdate(pending);
          rafId = null;
        });
      }
    };
    const onUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      onDragEnd?.();
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [width, height, zoom, node.id, node.position.x, node.position.y, node.scale, onUpdate, onDragUpdate, onDragEnd]);

  // ---- Render ----
  const totalScale = node.scale || 1;
  const borderColor = isSelected ? (signalHex || '#22d3ee') : T.border;

  return (
    <div
      ref={nodeRef}
      data-node-id={node.id}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onSelect?.(node.id, e.shiftKey); }}
      style={{
        position: 'absolute',
        left: node.position.x,
        top: node.position.y,
        width,
        height,
        transform: totalScale !== 1 ? `scale(${totalScale})` : undefined,
        transformOrigin: 'top left',
        background: T.card,
        border: `2px solid ${borderColor}`,
        borderRadius: '8px 8px 0 0',
        color: T.text,
        fontFamily: T.mono,
        userSelect: 'none',
        boxSizing: 'border-box',
        zIndex: isDragging ? 1000 : 1,
        overflow: 'hidden',
      }}
    >
      {/* Title bar (mirrors Node313) */}
      <div
        onMouseDown={handleTitleMouseDown}
        style={{
          height: TITLE_BAR_H,
          background: T.card,
          borderBottom: `2px solid ${T.border}`,
          display: 'flex',
          alignItems: 'center',
          padding: '6px 4px',
          gap: 2,
          cursor: 'grab',
        }}
      >
        <span style={{ color: T.textMuted, fontSize: 10, padding: '0 3px', cursor: 'grab' }}>⋮⋮</span>
        <input
          type="text"
          value={node.title || ''}
          placeholder="SCREEN"
          onChange={(e) => onUpdate({ title: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            flex: 1, minWidth: 30, height: 18,
            background: 'transparent', border: 'none', outline: 'none',
            color: T.white,
            fontSize: 14, fontWeight: 300, letterSpacing: 2,
            fontFamily: T.hFont,
            textAlign: 'left',
          }}
        />
        <TitleBtn title="Add input anchor" onClick={() => addAnchor('in')}>+IN</TitleBtn>
        <TitleBtn title="Add output anchor" onClick={() => addAnchor('out')}>+OUT</TitleBtn>
        <TitleBtn title="Upload image" onClick={() => fileInputRef.current?.click()}>IMG</TitleBtn>
        <TitleBtn title="Delete node" danger onClick={onDelete}>×</TitleBtn>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFilePick}
          style={{ display: 'none' }}
        />
      </div>

      {/* Image area (drop target) */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          position: 'absolute',
          top: TITLE_BAR_H,
          left: RAIL_W,
          right: RAIL_W,
          bottom: 0,
          background: dragOver ? 'rgba(34,211,238,0.18)' : T.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderLeft: `1px solid ${T.border}`,
          borderRight: `1px solid ${T.border}`,
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={node.title || 'Screen'}
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: node.imageFit || 'contain',
              pointerEvents: 'none',
            }}
          />
        ) : (
          <div style={{
            color: T.textMuted, fontSize: 9,
            fontFamily: T.hFont, letterSpacing: 2, textTransform: 'uppercase',
          }}>
            Drop image · or click IMG
          </div>
        )}
      </div>

      {/* Left rail */}
      <Rail side="left" baseTop={TITLE_BAR_H} totalHeight={height - TITLE_BAR_H} />
      {leftAnchors.map((a, i) => (
        <AnchorPin
          key={a.id}
          anchor={a}
          fullAnchorId={`${node.id}-${a.id}`}
          y={evenY(i, leftAnchors.length)}
          baseTop={TITLE_BAR_H}
          totalHeight={height - TITLE_BAR_H}
          railW={RAIL_W}
          rowH={leftRowH}
          isActive={activeWire?.from === `${node.id}-${a.id}`}
          isConnected={connectedAnchorIds?.has?.(`${node.id}-${a.id}`)}
          onClick={() => onAnchorClick?.(`${node.id}-${a.id}`, a.direction, node.id)}
          onLabelChange={(label) => setLabel(a.id, label)}
          onSwapSide={() => swapSide(a.id)}
          onRemove={a.fixed ? null : () => removeAnchor(a.id)}
        />
      ))}

      {/* Right rail */}
      <Rail side="right" baseTop={TITLE_BAR_H} totalHeight={height - TITLE_BAR_H} />
      {rightAnchors.map((a, i) => (
        <AnchorPin
          key={a.id}
          anchor={a}
          fullAnchorId={`${node.id}-${a.id}`}
          y={evenY(i, rightAnchors.length)}
          baseTop={TITLE_BAR_H}
          totalHeight={height - TITLE_BAR_H}
          railW={RAIL_W}
          rowH={rightRowH}
          isActive={activeWire?.from === `${node.id}-${a.id}`}
          isConnected={connectedAnchorIds?.has?.(`${node.id}-${a.id}`)}
          onClick={() => onAnchorClick?.(`${node.id}-${a.id}`, a.direction, node.id)}
          onLabelChange={(label) => setLabel(a.id, label)}
          onSwapSide={() => swapSide(a.id)}
          onRemove={a.fixed ? null : () => removeAnchor(a.id)}
        />
      ))}

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeMouseDown}
        title="Resize"
        style={{
          position: 'absolute',
          right: 0, bottom: 0,
          width: RESIZE_HANDLE_PX, height: RESIZE_HANDLE_PX,
          cursor: 'nwse-resize',
          background:
            'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.20) 50%, rgba(255,255,255,0.20) 60%, transparent 60%, transparent 70%, rgba(255,255,255,0.20) 70%, rgba(255,255,255,0.20) 80%, transparent 80%)',
        }}
      />
    </div>
  );
}

function Rail({ side, baseTop, totalHeight }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: baseTop,
        height: totalHeight,
        [side]: 0,
        width: RAIL_W,
        background: T.bg,
        pointerEvents: 'none',
      }}
    />
  );
}

function TitleBtn({ children, onClick, title, danger }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        height: 20,
        padding: '0 6px',
        background: hover ? T.iconBtnHover || 'rgba(255,255,255,0.10)' : T.accentGlow,
        border: `1px solid ${T.borderStrong}`,
        color: danger ? '#ef5350' : T.text,
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: 1,
        cursor: 'pointer',
        fontFamily: T.hFont,
      }}
    >
      {children}
    </button>
  );
}

const AnchorPin = memo(function AnchorPin({
  anchor, fullAnchorId, y, baseTop, totalHeight, railW, rowH,
  isActive, isConnected,
  onClick, onLabelChange, onSwapSide, onRemove,
}) {
  const [hover, setHover] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(anchor.label || '');
  useEffect(() => setEditValue(anchor.label || ''), [anchor.label]);

  const top = baseTop + y * totalHeight;
  const isLeft = anchor.side === 'left';
  const labelText = anchor.label
    || (anchor.kind === 'power' ? 'POWER'
        : anchor.kind === 'data' ? 'DATA'
        : anchor.direction === 'out' ? 'OUT' : 'IN');

  const labelColor = anchor.kind === 'power' ? '#fbbf24'
                  : anchor.kind === 'data'  ? '#22d3ee'
                  : T.textMuted;

  // The whole anchor row spans the rail width.
  // Layout — left rail: [dot at outer edge][label aligned right toward image]
  //          right rail: [label aligned left toward image][dot at outer edge]
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'absolute',
        top: top - rowH / 2,
        [isLeft ? 'left' : 'right']: 0,
        width: railW,
        height: rowH,
        display: 'flex',
        alignItems: 'center',
        flexDirection: isLeft ? 'row' : 'row-reverse',
        zIndex: 5,
        pointerEvents: 'auto',
      }}
    >
      {/* Anchor dot (small square at the outer edge) */}
      <button
        type="button"
        data-anchor-id={fullAnchorId}
        data-anchor-direction={anchor.direction}
        data-anchor-side={anchor.side}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        onMouseDown={(e) => e.stopPropagation()}
        title={`${labelText} · ${anchor.direction === 'in' ? 'input' : 'output'} (${anchor.side})`}
        style={{
          flexShrink: 0,
          width: DOT_SIZE,
          height: DOT_SIZE,
          marginLeft: isLeft ? 3 : 0,
          marginRight: isLeft ? 0 : 3,
          background: isActive ? '#22d3ee' : isConnected ? labelColor : 'transparent',
          border: `1.5px solid ${isActive ? '#22d3ee' : labelColor}`,
          padding: 0,
          cursor: 'crosshair',
          boxShadow: isActive ? `0 0 6px ${labelColor}` : 'none',
        }}
      />

      {/* Label (or edit input) — fills remaining rail width, aligned toward the image */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: isLeft ? '0 8px 0 6px' : '0 6px 0 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isLeft ? 'flex-end' : 'flex-start',
        }}
      >
        {editing ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => { onLabelChange(editValue.trim()); setEditing(false); }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') e.target.blur();
              if (e.key === 'Escape') { setEditValue(anchor.label || ''); setEditing(false); }
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              height: 18,
              fontSize: 11, padding: '0 4px',
              background: T.card,
              border: `1px solid ${T.borderStrong}`,
              color: T.white,
              fontFamily: T.hFont,
              letterSpacing: 1,
              textTransform: 'uppercase',
              textAlign: isLeft ? 'right' : 'left',
              outline: 'none',
            }}
          />
        ) : (
          <span
            onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Double-click to rename"
            style={{
              fontSize: 11,
              color: labelColor,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              cursor: 'text',
              letterSpacing: 1,
              fontFamily: T.hFont,
              textTransform: 'uppercase',
              fontWeight: anchor.kind === 'power' || anchor.kind === 'data' ? 500 : 400,
            }}
          >
            {labelText}
          </span>
        )}
      </div>

      {/* Hover-only controls — overlay the row's outer edge so the label doesn't shift */}
      {hover && !editing && (
        <div
          style={{
            position: 'absolute',
            top: 1, bottom: 1,
            [isLeft ? 'right' : 'left']: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            background: 'linear-gradient(' + (isLeft ? '270deg' : '90deg') + ', ' + T.card + ' 0%, ' + T.card + ' 70%, transparent 100%)',
            padding: isLeft ? '0 2px 0 8px' : '0 8px 0 2px',
            pointerEvents: 'auto',
          }}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSwapSide?.(); }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Swap side (left ⇄ right)"
            style={{
              width: 16, height: 16,
              background: 'transparent', border: 'none',
              color: T.accent, fontSize: 12, lineHeight: 1, padding: 0,
              cursor: 'pointer',
            }}
          >⇆</button>
          {onRemove && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              onMouseDown={(e) => e.stopPropagation()}
              title="Remove anchor"
              style={{
                width: 16, height: 16,
                background: 'transparent', border: 'none',
                color: '#ef5350', fontSize: 13, lineHeight: 1, padding: 0,
                cursor: 'pointer',
              }}
            >×</button>
          )}
        </div>
      )}
    </div>
  );
});

export default memo(ScreenNode, (prev, next) => (
  prev.node === next.node &&
  prev.zoom === next.zoom &&
  prev.isSelected === next.isSelected &&
  prev.activeWire === next.activeWire &&
  prev.snapToGrid === next.snapToGrid &&
  prev.gridSize === next.gridSize &&
  prev.onUpdate === next.onUpdate &&
  prev.onDelete === next.onDelete &&
  prev.onAnchorClick === next.onAnchorClick &&
  prev.registerAnchor === next.registerAnchor &&
  prev.unregisterAnchors === next.unregisterAnchors &&
  prev.onSelect === next.onSelect &&
  prev.connectedAnchorIds === next.connectedAnchorIds
));
