import { useEffect, useRef } from 'react';

const S = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 10000,
  },
  panel: {
    position: 'absolute', zIndex: 10001,
    background: '#111111', border: '2px solid rgba(255,255,255,0.15)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
    padding: '10px 0', minWidth: '200px',
    fontFamily: "'Space Grotesk', sans-serif",
  },
  label: {
    padding: '4px 14px', fontSize: '9px', color: '#555555',
    letterSpacing: '2px', textTransform: 'uppercase',
  },
  row: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '5px 14px',
  },
  btn: (active) => ({
    fontSize: '11px', letterSpacing: '1px', padding: '4px 10px',
    border: `1px solid ${active ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.10)'}`,
    color: active ? '#bbbbbb' : '#666666',
    background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
    cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
  }),
  select: {
    fontSize: '11px', background: '#0a0a0a',
    border: '1px solid rgba(255,255,255,0.10)',
    padding: '4px 6px', color: '#aaaaaa',
    fontFamily: "'Space Grotesk', sans-serif",
  },
  input: {
    fontSize: '11px', background: '#0a0a0a',
    border: '1px solid rgba(255,255,255,0.10)',
    padding: '4px 4px', color: '#aaaaaa', width: '60px',
    fontFamily: "'Space Grotesk', sans-serif",
  },
  divider: {
    height: '1px', background: 'rgba(255,255,255,0.08)', margin: '6px 0',
  },
};

export default function PageSetupPopover({
  isOpen, onClose, anchorRef,
  paperEnabled, setPaperEnabled,
  paperSize, onPaperSizeChange, PAPER_SIZES,
  customWidth, customHeight, onCustomSizeChange,
  orientation, toggleOrientation,
  showTitleBlock, toggleTitleBlock,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target) &&
          (!anchorRef?.current || !anchorRef.current.contains(e.target))) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  const rect = anchorRef?.current?.getBoundingClientRect();
  const style = rect
    ? { ...S.panel, left: rect.left, top: rect.bottom + 4 }
    : { ...S.panel, left: 0, top: 0 };

  return (
    <div ref={ref} style={style}>
      <div style={S.label}>Page</div>
      <div style={S.row}>
        <button onClick={() => setPaperEnabled(p => !p)} style={S.btn(paperEnabled)}>
          {paperEnabled ? 'Paper ON' : 'Paper OFF'}
        </button>
      </div>

      <div style={S.row}>
        <select value={paperSize} onChange={(e) => onPaperSizeChange(e.target.value)} style={S.select}>
          {Object.entries(PAPER_SIZES).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {paperSize === 'Custom' && (
        <div style={S.row}>
          <input type="number" value={customWidth} onChange={(e) => onCustomSizeChange(+e.target.value || 100, customHeight)}
            style={S.input} min="100" title="Width" />
          <span style={{ color: '#555', fontSize: '10px' }}>×</span>
          <input type="number" value={customHeight} onChange={(e) => onCustomSizeChange(customWidth, +e.target.value || 100)}
            style={S.input} min="100" title="Height" />
        </div>
      )}

      <div style={S.divider} />
      <div style={S.label}>Layout</div>
      <div style={S.row}>
        <button onClick={toggleOrientation} style={S.btn(true)}>
          {orientation === 'portrait' ? '↕ Portrait' : '↔ Landscape'}
        </button>
        <button onClick={toggleTitleBlock} style={S.btn(showTitleBlock)}>
          {showTitleBlock ? 'TB ON' : 'TB OFF'}
        </button>
      </div>
    </div>
  );
}
