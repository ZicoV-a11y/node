import { useEffect, useRef } from 'react';

const S = {
  panel: {
    position: 'absolute', zIndex: 10001,
    background: '#111111', border: '2px solid rgba(255,255,255,0.15)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
    padding: '4px 0', minWidth: '180px',
    fontFamily: "'Space Grotesk', sans-serif",
  },
  item: {
    display: 'block', width: '100%', textAlign: 'left',
    padding: '6px 14px', fontSize: '11px', letterSpacing: '1px',
    color: '#aaaaaa', background: 'none', border: 'none',
    cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif",
  },
  divider: {
    height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0',
  },
  label: {
    padding: '4px 14px', fontSize: '9px', color: '#555555',
    letterSpacing: '2px', textTransform: 'uppercase',
  },
};

export default function FileMenuPopover({
  isOpen, onClose, anchorRef,
  onNew, onOpen, onSaveAs,
  recentFiles, onLoadRecent,
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
      <button style={S.item} onClick={() => { onNew(); onClose(); }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
        New
      </button>
      <button style={S.item} onClick={() => { onOpen(); onClose(); }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
        Open
      </button>
      <button style={S.item} onClick={() => { onSaveAs(); onClose(); }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
        Save As
      </button>

      {recentFiles.length > 0 && (
        <>
          <div style={S.divider} />
          <div style={S.label}>Recent</div>
          {recentFiles.map((file, i) => (
            <button key={i} style={S.item}
              onClick={() => { onLoadRecent(file); onClose(); }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
              <div style={{ color: '#555', fontSize: '10px' }}>{new Date(file.timestamp).toLocaleDateString()}</div>
            </button>
          ))}
        </>
      )}
    </div>
  );
}
