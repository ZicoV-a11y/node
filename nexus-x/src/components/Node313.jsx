import { useState, useRef, useEffect, useCallback, useMemo, useLayoutEffect, memo } from 'react';
import { createPortal } from 'react-dom';

// ============================================
// SIGNAL COLORS
// ============================================

// Grouped by hue — columns read top-to-bottom as shade families
// Layout: 6 columns × 6 rows. Each column is a hue group.
//         Reds      Oranges     Greens      Blues       Purples     Muted
const SIGNAL_COLORS = [
  // Row 1
  { id: 'red',       hex: '#ef4444', label: 'Red' },
  { id: 'orange',    hex: '#f97316', label: 'Orange' },
  { id: 'emerald',   hex: '#10b981', label: 'Emerald' },
  { id: 'cyan',      hex: '#06b6d4', label: 'Cyan' },
  { id: 'violet',    hex: '#8b5cf6', label: 'Violet' },
  { id: 'lavender',  hex: '#c084fc', label: 'Lavender' },
  // Row 2
  { id: 'crimson',   hex: '#dc2626', label: 'Crimson' },
  { id: 'tangerine', hex: '#ea580c', label: 'Tangerine' },
  { id: 'green',     hex: '#22c55e', label: 'Green' },
  { id: 'sky',       hex: '#0ea5e9', label: 'Sky' },
  { id: 'indigo',    hex: '#6366f1', label: 'Indigo' },
  { id: 'wine',      hex: '#881337', label: 'Wine' },
  // Row 3
  { id: 'rose',      hex: '#f43f5e', label: 'Rose' },
  { id: 'amber',     hex: '#f59e0b', label: 'Amber' },
  { id: 'jade',      hex: '#059669', label: 'Jade' },
  { id: 'blue',      hex: '#3b82f6', label: 'Blue' },
  { id: 'purple',    hex: '#a855f7', label: 'Purple' },
  { id: 'bronze',    hex: '#b45309', label: 'Bronze' },
  // Row 4
  { id: 'coral',     hex: '#fb7185', label: 'Coral' },
  { id: 'gold',      hex: '#fbbf24', label: 'Gold' },
  { id: 'mint',      hex: '#34d399', label: 'Mint' },
  { id: 'sapphire',  hex: '#2563eb', label: 'Sapphire' },
  { id: 'plum',      hex: '#9333ea', label: 'Plum' },
  { id: 'navy',      hex: '#1e40af', label: 'Navy' },
  // Row 5
  { id: 'salmon',    hex: '#f87171', label: 'Salmon' },
  { id: 'yellow',    hex: '#eab308', label: 'Yellow' },
  { id: 'lime',      hex: '#84cc16', label: 'Lime' },
  { id: 'teal',      hex: '#14b8a6', label: 'Teal' },
  { id: 'fuchsia',   hex: '#d946ef', label: 'Fuchsia' },
  { id: 'steel',     hex: '#475569', label: 'Steel' },
  // Row 6
  { id: 'pink',      hex: '#ec4899', label: 'Pink' },
  { id: 'peach',     hex: '#fdba74', label: 'Peach' },
  { id: 'chartreuse',hex: '#a3e635', label: 'Chartreuse' },
  { id: 'turquoise', hex: '#2dd4bf', label: 'Turquoise' },
  { id: 'magenta',   hex: '#e879f9', label: 'Magenta' },
  { id: 'slate',     hex: '#64748b', label: 'Slate' },
];

const SIGNAL_COLORS_BY_ID = new Map(SIGNAL_COLORS.map(c => [c.id, c]));

// ============================================
// LAYOUT SYSTEM
// ============================================

const SPACING_SNAP = 9; // Snap to half-row increments (matches SuperNode)

// All valid layout arrangements for 3 sections (a, b, c)
// c is always alone in its row; a and b can be side-by-side or stacked
const LAYOUTS = {
  'ab_c':  [['a','b'],['c']],
  'ba_c':  [['b','a'],['c']],
  'c_ab':  [['c'],['a','b']],
  'c_ba':  [['c'],['b','a']],
  'a_b_c': [['a'],['b'],['c']],
  'b_a_c': [['b'],['a'],['c']],
  'c_a_b': [['c'],['a'],['b']],
  'c_b_a': [['c'],['b'],['a']],
};

// Generate layout key from a layout array
const getLayoutKey = (layout) => layout.map(r => r.join('')).join('_');

// Get current position of a section within a layout
function getPosition(layoutKey, sectionId) {
  const layout = LAYOUTS[layoutKey];
  if (!layout) return null;
  if (sectionId === 'c') {
    return layout.findIndex(r => r.includes('c')) === 0 ? 'top' : 'bottom';
  }
  const other = sectionId === 'a' ? 'b' : 'a';
  const myRow = layout.findIndex(r => r.includes(sectionId));
  const otherRow = layout.findIndex(r => r.includes(other));
  if (myRow === otherRow) {
    return layout[myRow].indexOf(sectionId) < layout[myRow].indexOf(other) ? 'left' : 'right';
  }
  return myRow < otherRow ? 'above' : 'below';
}

// Apply a drop: move section `did` to position `pos`, return new layout key
function applyDrop(currentKey, droppedId, position) {
  const current = LAYOUTS[currentKey];
  if (!current) return currentKey;

  if (droppedId === 'c') {
    const withoutC = current.map(r => r.filter(x => x !== 'c')).filter(r => r.length);
    const newLayout = position === 'top' ? [['c'], ...withoutC] : [...withoutC, ['c']];
    const key = getLayoutKey(newLayout);
    return LAYOUTS[key] ? key : currentKey;
  }

  const other = droppedId === 'a' ? 'b' : 'a';
  const cOnTop = current.findIndex(r => r.includes('c')) === 0;
  let ab;
  if (position === 'left') ab = [[droppedId, other]];
  else if (position === 'right') ab = [[other, droppedId]];
  else if (position === 'above') ab = [[droppedId], [other]];
  else if (position === 'below') ab = [[other], [droppedId]];
  else return currentKey;

  const newLayout = cOnTop ? [['c'], ...ab] : [...ab, ['c']];
  const key = getLayoutKey(newLayout);
  return LAYOUTS[key] ? key : currentKey;
}

// ============================================
// STYLES (inline to match prototype exactly)
// ============================================

const STYLES = {
  node: {
    position: 'absolute',
    border: '1px solid #333',
    background: '#0a0a0a',
    display: 'inline-flex',
    flexDirection: 'column',
    whiteSpace: 'nowrap',
    fontFamily: "'Courier New', monospace",
    color: '#ddd',
    userSelect: 'none',
  },
  nodeTitle: {
    background: '#111',
    borderBottom: '1px solid #333',
    display: 'flex',
    alignItems: 'center',
  },
  grip: {
    color: '#444',
    fontSize: '10px',
    padding: '0 3px',
    cursor: 'grab',
    flexShrink: 0,
  },
  titleInput: {
    fontSize: '14px',
    fontWeight: 700,
    textAlign: 'center',
    width: '100%',
    height: '14px',
  },
  sectionTitle: {
    background: '#111',
    borderBottom: '1px solid #333',
    display: 'flex',
    alignItems: 'center',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  },
  sectionTitleInput: {
    fontSize: '12px',
    fontWeight: 700,
    width: '100%',
    height: '12px',
  },
  input: {
    background: 'transparent',
    border: 'none',
    color: '#ddd',
    fontFamily: "'Courier New', monospace",
    outline: 'none',
    margin: 0,
    padding: '0 4px',
    lineHeight: 1,
    display: 'block',
  },
  table: {
    borderCollapse: 'collapse',
    whiteSpace: 'nowrap',
  },
  cell: {
    borderBottom: '1px solid #333',
    borderRight: '1px solid #333',
    padding: 0,
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
    lineHeight: 1,
    background: '#141414',
  },
  headerCell: {
    background: '#111',
  },
  xc: {
    width: '12px',
    minWidth: '12px',
    maxWidth: '12px',
    textAlign: 'center',
    verticalAlign: 'middle',
    lineHeight: 1,
  },
  xcSpan: {
    color: '#444',
    cursor: 'pointer',
    fontSize: '10px',
    userSelect: 'none',
    lineHeight: '16px',
  },
  sp: {
    width: '12px',
    minWidth: '12px',
    maxWidth: '12px',
    textAlign: 'center',
    verticalAlign: 'middle',
    lineHeight: 1,
    padding: 0,
  },
  spHandle: {
    color: '#333',
    cursor: 'ns-resize',
    fontSize: '10px',
    userSelect: 'none',
    lineHeight: '16px',
  },
  ac: {
    width: '14px',
    minWidth: '14px',
    maxWidth: '14px',
    textAlign: 'center',
    verticalAlign: 'middle',
    lineHeight: 1,
    padding: 0,
  },
  dropZone: {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px dashed #06b6d4',
    fontSize: '10px',
    fontWeight: 700,
    color: '#06b6d4',
    background: 'rgba(6, 182, 212, 0.15)',
    userSelect: 'none',
    zIndex: 10,
    pointerEvents: 'auto',
  },
  dropZoneHover: {
    borderColor: '#22d3ee',
    color: '#fff',
    background: 'rgba(6, 182, 212, 0.3)',
  },
  dragHighlight: {
    outline: '2px solid #06b6d4',
    outlineOffset: '-2px',
    opacity: 0.6,
  },
  abRow: {
    display: 'inline-flex',
    alignSelf: 'stretch',
    width: '100%',
  },
  sectionWrap: {
    display: 'inline-block',
    verticalAlign: 'top',
  },
  sectionWrapBorder: {
    borderLeft: '1px solid #333',
  },
  sectionFull: {
    display: 'block',
    width: '100%',
    alignSelf: 'stretch',
  },
  contextMenuItem: {
    padding: '4px 12px',
    fontSize: '11px',
    fontFamily: 'ui-monospace, monospace',
    color: '#ccc',
    cursor: 'pointer',
  },
  // Settings & color picker
  titleRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginLeft: 'auto',
    flexShrink: 0,
  },
  colorSwatch: {
    width: '12px',
    height: '12px',
    borderRadius: '2px',
    border: '1px solid #555',
    cursor: 'pointer',
    flexShrink: 0,
  },
  gearBtn: {
    background: 'none',
    border: 'none',
    color: '#666',
    fontSize: '13px',
    cursor: 'pointer',
    padding: '0 2px',
    fontFamily: 'sans-serif',
    lineHeight: 1,
    flexShrink: 0,
  },
  settingsDropdown: {
    position: 'fixed',
    background: '#1a1a1e',
    border: '1px solid #333',
    padding: '4px 0',
    minWidth: '150px',
    zIndex: 10001,
    fontFamily: "'Courier New', monospace",
  },
  settingsItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 10px',
    fontSize: '11px',
    fontFamily: "'Courier New', monospace",
    color: '#ccc',
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    width: '100%',
    textAlign: 'left',
  },
  settingsLabel: {
    padding: '3px 10px',
    fontSize: '9px',
    fontFamily: "'Courier New', monospace",
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  settingsDivider: {
    height: '1px',
    background: '#333',
    margin: '3px 0',
  },
  colorGrid: {
    position: 'fixed',
    background: '#1a1a1e',
    border: '1px solid #333',
    padding: '6px',
    zIndex: 10001,
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '3px',
  },
  colorGridItem: {
    width: '16px',
    height: '16px',
    borderRadius: '2px',
    border: '1px solid #444',
    cursor: 'pointer',
  },
  colorGridClear: {
    gridColumn: '1 / -1',
    padding: '3px 0',
    fontSize: '10px',
    fontFamily: "'Courier New', monospace",
    color: '#888',
    cursor: 'pointer',
    textAlign: 'center',
    borderTop: '1px solid #333',
    marginTop: '2px',
  },
};

// ============================================
// DROPDOWN PRESETS
// ============================================
const COLUMN_PRESETS = {
  RESOLUTION: [
    '4096x2160',
    '3840x2160',
    '2560x1440',
    '1920x1080',
    '1280x720',
  ],
  CONNECTOR: [
    'HDMI 2.0', '3G SDI', '12G SDI', 'DP 1.2', 'SMPTE FIBER', 'OPTICAL-CON QUAD FIBER', 'CAT5', 'CAT6A',
  ],
  RATE: [
    '23.98', '24', '25', '29.97', '30',
    '50', '59.94', '60', '120',
  ],
};

// Match column name to preset list (case-insensitive)
function getPresetsForColumn(colName) {
  if (!colName) return null;
  const upper = colName.toUpperCase().trim();
  if (upper.includes('RESOLUTION') || upper.includes('RES')) return COLUMN_PRESETS.RESOLUTION;
  if (upper.includes('CONNECTOR') || upper.includes('CONN')) return COLUMN_PRESETS.CONNECTOR;
  if (upper.includes('RATE') || upper.includes('REFRESH') || upper.includes('FPS')) return COLUMN_PRESETS.RATE;
  return null;
}

// ============================================
// PRE-COMPUTED CELL STYLES (avoid allocation per render)
// ============================================
const SZ_CELL_STYLE = { ...STYLES.cell, width: '1px' };
const SZ_CELL_HEADER_STYLE = { ...STYLES.cell, ...STYLES.headerCell, width: '1px' };
const SZ_INPUT_BODY = { ...STYLES.input, gridArea: '1/1', width: '100%', minWidth: 0, textAlign: 'center', fontSize: '16px', height: '16px' };
const SZ_INPUT_HEADER = { ...STYLES.input, gridArea: '1/1', width: '100%', minWidth: 0, textAlign: 'center', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', color: '#888', height: '16px' };
const XC_CELL_STYLE = { ...STYLES.xc, ...STYLES.cell };
const XC_CELL_HEADER_STYLE = { ...STYLES.xc, ...STYLES.cell, ...STYLES.headerCell };
const SP_CELL_STYLE = { ...STYLES.sp, ...STYLES.cell, background: 'transparent' };
const SP_CELL_HEADER_STYLE = { ...STYLES.sp, ...STYLES.cell, ...STYLES.headerCell, background: 'transparent' };

// Port selection highlight
const PORT_CELL_SELECTED = { color: '#67e8f9', background: 'rgba(6,182,212,0.2)' };

// Pre-computed port header styles (avoids allocation per render)
const PORT_HEADER_STYLE = { ...SZ_CELL_HEADER_STYLE, cursor: 'pointer' };
const PORT_HEADER_SEL_STYLE = { ...PORT_HEADER_STYLE, ...PORT_CELL_SELECTED };
const PORT_HDR_INPUT_SEL = { ...SZ_INPUT_HEADER, cursor: 'pointer', pointerEvents: 'none', color: '#67e8f9' };
const PORT_HDR_INPUT_NORM = { ...SZ_INPUT_HEADER, cursor: 'pointer', pointerEvents: 'none', color: '#888' };

// Pre-computed port display styles (PortCell read-only mode)
const PORT_DISPLAY_SEL = { ...SZ_INPUT_BODY, cursor: 'pointer', color: '#67e8f9' };
const PORT_DISPLAY_NORM = { ...SZ_INPUT_BODY, cursor: 'pointer', color: '#ddd' };

// Phantom column styles (invisible cells to equalize column counts between sections)
const PHANTOM_HEADER_STYLE = { ...SZ_CELL_HEADER_STYLE, visibility: 'hidden', padding: 0, borderRight: 'none' };
const PHANTOM_DATA_STYLE = { ...SZ_CELL_STYLE, visibility: 'hidden', padding: 0, borderRight: 'none' };

// Selected row background tint
const ROW_SELECTED_BG = { background: 'rgba(6,182,212,0.07)' };

// Spacer row cell style
const SPACER_TD_STYLE = { padding: 0, border: 'none', background: 'transparent' };

// Hover handler factory — returns onMouseEnter/onMouseLeave pair
const hover = (prop, normal, hovered) => ({
  onMouseEnter: (e) => { e.currentTarget.style[prop] = hovered; },
  onMouseLeave: (e) => { e.currentTarget.style[prop] = normal; },
});
const HOVER_444_999 = hover('color', '#444', '#999');
const HOVER_333_888 = hover('color', '#333', '#888');
const HOVER_888_CCC = hover('color', '#888', '#ccc');
const HOVER_BG_333 = hover('background', 'transparent', '#333');
const HOVER_BG_2A = hover('background', 'none', '#2a2a2e');

// ============================================
// SUB-COMPONENTS
// ============================================

// Auto-sizing input cell
const SzCell = memo(({ value, isHeader, onChange, onContextMenu, sizerValue }) => {
  const Tag = isHeader ? 'th' : 'td';
  // Use sizerValue for data-v when it's longer, so synced columns size to the longest string
  const sizer = sizerValue && sizerValue.length > (value || '').length ? sizerValue : (value || ' ');
  return (
    <Tag style={isHeader ? SZ_CELL_HEADER_STYLE : SZ_CELL_STYLE} onContextMenu={onContextMenu}>
      <div
        className="n313-sz"
        data-v={sizer}
        data-h={isHeader ? '' : undefined}
      >
        <input
          style={isHeader ? SZ_INPUT_HEADER : SZ_INPUT_BODY}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </Tag>
  );
});
SzCell.displayName = 'SzCell';

// Dropdown cell — looks like SzCell but click opens preset options
const DropdownCell = memo(({ value, presets, onChange, sizerValue }) => {
  const [open, setOpen] = useState(false);
  const cellRef = useRef(null);

  const handleInputClick = useCallback((e) => {
    e.stopPropagation();
    setOpen(prev => !prev);
  }, []);

  const handleSelect = useCallback((preset) => {
    onChange(preset);
    setOpen(false);
  }, [onChange]);

  // Dismiss on click outside
  useEffect(() => {
    if (!open) return;
    const dismiss = (e) => {
      if (cellRef.current && !cellRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener('mousedown', dismiss);
    return () => window.removeEventListener('mousedown', dismiss);
  }, [open]);

  // Get position for the portal dropdown
  const getDropdownPos = () => {
    if (!cellRef.current) return { left: 0, top: 0, width: 0 };
    const rect = cellRef.current.getBoundingClientRect();
    return { left: rect.left, top: rect.bottom, width: Math.max(rect.width, 120) };
  };

  const sizer = sizerValue && sizerValue.length > (value || '').length ? sizerValue : (value || ' ');

  return (
    <td style={SZ_CELL_STYLE} ref={cellRef}>
      <div className="n313-sz" data-v={sizer}>
        <input
          style={SZ_INPUT_BODY}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={handleInputClick}
        />
      </div>
      {open && createPortal(
        (() => {
          const pos = getDropdownPos();
          return (
            <div
              style={{
                position: 'fixed',
                left: pos.left,
                top: pos.top,
                minWidth: pos.width,
                zIndex: 10000,
                background: '#1f1f23',
                border: '1px solid #333',
                padding: '2px 0',
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {presets.map((p) => (
                <div
                  key={p}
                  style={STYLES.contextMenuItem}
                  {...HOVER_BG_333}
                  onMouseDown={(e) => { e.stopPropagation(); handleSelect(p); }}
                >
                  {p}
                </div>
              ))}
            </div>
          );
        })(),
        document.body
      )}
    </td>
  );
});
DropdownCell.displayName = 'DropdownCell';

// Flex centering wrapper for small-content cells (anchor, ×, +)
const CELL_CENTER = { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '16px' };

// Anchor dot style — visible circle that scales with the node
const ANCHOR_DOT_STYLE = {
  width: '8px', height: '8px', borderRadius: '50%',
  background: '#666', boxShadow: '0 0 0 1px #444',
};
const AC_BODY_STYLE = { ...STYLES.ac, ...STYLES.cell, background: 'transparent', padding: 0 };
const AC_HEAD_STYLE = { ...STYLES.ac, ...STYLES.cell, ...STYLES.headerCell, background: 'transparent', padding: 0 };

// X button cell (delete column, delete row, add column, or empty spacer)
const XCell = memo(({ isHeader, label, onClick }) => {
  const Tag = isHeader ? 'th' : 'td';
  return (
    <Tag style={isHeader ? XC_CELL_HEADER_STYLE : XC_CELL_STYLE}>
      <div style={CELL_CENTER}>
        {label && (
          <span
            style={STYLES.xcSpan}
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
            onMouseDown={(e) => e.stopPropagation()}
            {...HOVER_444_999}
          >
            {label}
          </span>
        )}
      </div>
    </Tag>
  );
});
XCell.displayName = 'XCell';

// Anchor dot cell — visible dot + row number, interaction handled by SVG layer
const AnchorCell = memo(({ isHeader, anchorId, label, onClick }) => {
  const Tag = isHeader ? 'th' : 'td';
  return (
    <Tag style={isHeader ? AC_HEAD_STYLE : AC_BODY_STYLE}>
      <div style={CELL_CENTER}>
        {isHeader && label && (
          <span
            style={STYLES.xcSpan}
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
            onMouseDown={(e) => e.stopPropagation()}
            {...HOVER_444_999}
          >
            {label}
          </span>
        )}
        {!isHeader && <div data-anchor-id={anchorId} style={ANCHOR_DOT_STYLE} />}
      </div>
    </Tag>
  );
});
AnchorCell.displayName = 'AnchorCell';

// Spacing drag handle cell — drag vertically to add space above a row
const SpacingCell = memo(({ isHeader, onMouseDown, headerLabel, onHeaderClick }) => {
  const Tag = isHeader ? 'th' : 'td';
  return (
    <Tag style={isHeader ? SP_CELL_HEADER_STYLE : SP_CELL_STYLE}>
      {isHeader && headerLabel && (
        <span style={STYLES.xcSpan} onClick={(e) => { e.stopPropagation(); onHeaderClick?.(); }} onMouseDown={(e) => e.stopPropagation()} {...HOVER_444_999} title="Flip anchor side">{headerLabel}</span>
      )}
      {!isHeader && (
        <span style={STYLES.spHandle} onMouseDown={onMouseDown} {...HOVER_333_888}>⋮</span>
      )}
    </Tag>
  );
});
SpacingCell.displayName = 'SpacingCell';

// Port cell — left-click toggles selection, right-click edits label
const PortCell = memo(({ value, isSelected, onToggle, onChange, sizerValue }) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef(null);

  const sizer = sizerValue && sizerValue.length > (value || '').length ? sizerValue : (value || ' ');

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (!editing) onToggle?.();
  }, [editing, onToggle]);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditValue(value || '');
    setEditing(true);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitEdit = useCallback(() => {
    onChange(editValue);
    setEditing(false);
  }, [editValue, onChange]);

  return (
    <td style={isSelected ? { ...SZ_CELL_STYLE, ...PORT_CELL_SELECTED } : SZ_CELL_STYLE}>
      <div className="n313-sz" data-v={sizer}>
        {editing ? (
          <input
            ref={inputRef}
            style={SZ_INPUT_BODY}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false); }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <input
            style={isSelected ? PORT_DISPLAY_SEL : PORT_DISPLAY_NORM}
            value={value}
            readOnly
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            onMouseDown={(e) => e.stopPropagation()}
            title="Click to select • Right-click to edit"
          />
        )}
      </div>
    </td>
  );
});
PortCell.displayName = 'PortCell';

// Drop zone for section rearranging — absolutely positioned overlay
const DropZone = memo(({ label, onDrop, placement }) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{ ...STYLES.dropZone, ...placement, ...(hover ? STYLES.dropZoneHover : {}) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onMouseUp={() => onDrop()}
    >
      {label}
    </div>
  );
});
DropZone.displayName = 'DropZone';

// ============================================
// SECTION COMPONENT
// ============================================

const Section313 = memo(({ sectionId, section, nodeId, fullWidth, mirrored, onUpdate, signalColorHex, onFlip, colSizerValues, onGripDown }) => {
  const nc = section.cols.length;
  const hiddenCols = section.hiddenCols || [];
  const rowSpacing = section.rowSpacing || [];
  const canDel = nc > 1;
  const [contextMenu, setContextMenu] = useState(null); // { x, y, colIndex }
  const [selectedRows, setSelectedRows] = useState(new Set());
  const tableRef = useRef(null);

  // Toggle port row selection
  const toggleRowSelection = useCallback((ri) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(ri)) next.delete(ri);
      else next.add(ri);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedRows(prev => {
      const rowCount = section.rows.length;
      if (prev.size === rowCount) return new Set();
      const all = new Set();
      for (let i = 0; i < rowCount; i++) all.add(i);
      return all;
    });
  }, [section.rows.length]);

  // Spacing drag refs
  const dragStartY = useRef(null);
  const dragStartSpacing = useRef(0);

  const updateSection = useCallback((updates) => {
    onUpdate(sectionId, updates);
  }, [sectionId, onUpdate]);

  const addColumn = useCallback(() => {
    updateSection({
      cols: [...section.cols, 'COL'],
      rows: section.rows.map(r => [...r, '']),
    });
  }, [section.cols, section.rows, updateSection]);

  const deleteColumn = useCallback((ci) => {
    updateSection({
      cols: section.cols.filter((_, i) => i !== ci),
      rows: section.rows.map(r => r.filter((_, i) => i !== ci)),
    });
  }, [section.cols, section.rows, updateSection]);

  // Detect the port-label prefix from existing rows (e.g. "IN", "OUT", or just "")
  const portPrefix = useMemo(() => {
    for (const row of section.rows) {
      if (row[0]) {
        const match = row[0].match(/^([A-Za-z]+\s*)\d+$/);
        if (match) return match[1];
      }
    }
    return '';
  }, [section.rows]);

  // Renumber the first column (port labels) sequentially: "IN 1", "IN 2", ...
  const renumberRows = useCallback((rows) => {
    if (!portPrefix) return rows;
    return rows.map((r, i) => {
      const newRow = [...r];
      newRow[0] = `${portPrefix}${i + 1}`;
      return newRow;
    });
  }, [portPrefix]);

  const addRow = useCallback(() => {
    const newRows = [...section.rows, section.cols.map(() => '')];
    const newSpacing = [...rowSpacing, 0];
    updateSection({ rows: renumberRows(newRows), rowSpacing: newSpacing });
  }, [section.cols, section.rows, rowSpacing, updateSection, renumberRows]);

  const deleteRow = useCallback((ri) => {
    const remaining = section.rows.filter((_, i) => i !== ri);
    const newSpacing = rowSpacing.filter((_, i) => i !== ri);
    updateSection({ rows: renumberRows(remaining), rowSpacing: newSpacing });
    // Rebuild selection indices after deletion
    setSelectedRows(prev => {
      const next = new Set();
      for (const idx of prev) {
        if (idx < ri) next.add(idx);
        else if (idx > ri) next.add(idx - 1);
      }
      return next;
    });
  }, [section.rows, rowSpacing, updateSection, renumberRows]);

  // Vertical spacing drag handler (like SuperNode)
  const handleSpacingMouseDown = useCallback((e, ri) => {
    e.preventDefault();
    e.stopPropagation();
    dragStartY.current = e.clientY;
    dragStartSpacing.current = rowSpacing[ri] || 0;

    let rafId = null;
    let pending = null;

    const handleMouseMove = (moveEvent) => {
      const delta = moveEvent.clientY - dragStartY.current;
      const raw = Math.max(0, dragStartSpacing.current + delta);
      const pixelMode = moveEvent.ctrlKey || moveEvent.metaKey;
      const snap = pixelMode ? 1 : SPACING_SNAP;
      const newSpacing = Math.round(raw / snap) * snap;

      pending = newSpacing;
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          if (pending !== null) {
            const updated = [...rowSpacing];
            // Ensure array is long enough
            while (updated.length < section.rows.length) updated.push(0);
            updated[ri] = pending;
            updateSection({ rowSpacing: updated });
          }
          rafId = null;
        });
      }
    };

    const handleMouseUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [rowSpacing, section.rows.length, updateSection]);

  const updateColName = useCallback((ci, value) => {
    const newCols = [...section.cols];
    newCols[ci] = value;
    updateSection({ cols: newCols });
  }, [section.cols, updateSection]);

  const updateCell = useCallback((ri, ci, value) => {
    // Bulk update: if the edited row is selected, apply to all selected rows
    const bulkTargets = selectedRows.has(ri) && selectedRows.size > 1 ? selectedRows : null;
    const newRows = section.rows.map((r, i) => {
      if (i === ri || (bulkTargets && bulkTargets.has(i))) {
        return r.map((c, j) => j === ci ? value : c);
      }
      return r;
    });
    updateSection({ rows: newRows });
  }, [section.rows, updateSection, selectedRows]);

  const updateTitle = useCallback((value) => {
    updateSection({ title: value });
  }, [updateSection]);

  // Column header right-click context menu
  const handleColContextMenu = useCallback((e, ci) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, colIndex: ci });
  }, []);

  const handleDeleteFromMenu = useCallback(() => {
    if (contextMenu) {
      deleteColumn(contextMenu.colIndex);
      setContextMenu(null);
    }
  }, [contextMenu, deleteColumn]);

  const handleHideFromMenu = useCallback(() => {
    if (contextMenu) {
      updateSection({ hiddenCols: [...hiddenCols, contextMenu.colIndex] });
      setContextMenu(null);
    }
  }, [contextMenu, hiddenCols, updateSection]);

  const handleUnhideAll = useCallback(() => {
    updateSection({ hiddenCols: [] });
    setContextMenu(null);
  }, [updateSection]);

  // Dismiss context menu on click anywhere
  useEffect(() => {
    if (!contextMenu) return;
    const dismiss = () => setContextMenu(null);
    window.addEventListener('mousedown', dismiss);
    return () => window.removeEventListener('mousedown', dismiss);
  }, [contextMenu]);

  // Build column order for header and body (right-click header to delete/hide column)
  // Phantom columns: when colSizerValues has more entries than this section's columns,
  // add invisible cells so both A/B tables have the same column count for equal space distribution
  const phantomCount = colSizerValues ? Math.max(0, colSizerValues.length - nc) : 0;
  // Count visible columns for spacer colspan
  const visibleColCount = nc - hiddenCols.length + phantomCount;
  // Total cell count: anchor(1) + visibleCols + x(1) + spacing(1)
  const totalColspan = visibleColCount + 3;

  const renderHeader = () => {
    const cells = [];
    const allSelected = selectedRows.size > 0 && selectedRows.size === section.rows.length;
    const renderHeaderCell = (ci) => {
      const sizer = colSizerValues ? colSizerValues[ci] : undefined;
      if (ci === 0) {
        return (
          <th key={`col-${ci}`} style={allSelected ? PORT_HEADER_SEL_STYLE : PORT_HEADER_STYLE} onClick={toggleSelectAll} onContextMenu={(e) => handleColContextMenu(e, ci)}>
            <div className="n313-sz" data-v={sizer && sizer.length > (section.cols[ci] || '').length ? sizer : (section.cols[ci] || ' ')} data-h="">
              <input style={allSelected ? PORT_HDR_INPUT_SEL : PORT_HDR_INPUT_NORM} value={section.cols[ci]} readOnly />
            </div>
          </th>
        );
      }
      return <SzCell key={`col-${ci}`} value={section.cols[ci]} isHeader onChange={(v) => updateColName(ci, v)} onContextMenu={(e) => handleColContextMenu(e, ci)} sizerValue={sizer} />;
    };
    // Phantom header cells for columns that exist in the other section but not this one
    const phantomHeaders = [];
    for (let pi = 0; pi < phantomCount; pi++) {
      const pci = nc + pi;
      const pSizer = colSizerValues[pci];
      phantomHeaders.push(
        <th key={`phantom-${pci}`} style={PHANTOM_HEADER_STYLE}>
          <div className="n313-sz" data-v={pSizer || ' '} data-h="" />
        </th>
      );
    }
    if (mirrored) {
      cells.push(<SpacingCell key="sp-h" isHeader headerLabel={onFlip ? '⇄' : undefined} onHeaderClick={onFlip} />);
      cells.push(<XCell key="rowx-h" isHeader label="+" onClick={addRow} />);
      cells.push(...phantomHeaders);
      for (let ci = nc - 1; ci >= 0; ci--) {
        if (hiddenCols.includes(ci)) continue;
        cells.push(renderHeaderCell(ci));
      }
      cells.push(<AnchorCell key="anchor-h" isHeader label="+" onClick={addColumn} />);
    } else {
      cells.push(<AnchorCell key="anchor-h" isHeader label="+" onClick={addColumn} />);
      for (let ci = 0; ci < nc; ci++) {
        if (hiddenCols.includes(ci)) continue;
        cells.push(renderHeaderCell(ci));
      }
      cells.push(...phantomHeaders);
      cells.push(<XCell key="rowx-h" isHeader label="+" onClick={addRow} />);
      cells.push(<SpacingCell key="sp-h" isHeader headerLabel={onFlip ? '⇄' : undefined} onHeaderClick={onFlip} />);
    }
    return <tr>{cells}</tr>;
  };

  const renderRow = (row, ri) => {
    const anchorId = `${nodeId}-${sectionId}-${ri}`;
    const spacing = rowSpacing[ri] || 0;
    const cells = [];
    const result = [];

    // Spacer row if this row has spacing > 0
    if (spacing > 0) {
      result.push(
        <tr key={`sp-${ri}`}>
          <td colSpan={totalColspan} style={{ ...SPACER_TD_STYLE, height: `${spacing}px` }} />
        </tr>
      );
    }

    const renderDataCell = (ci) => {
      const sizer = colSizerValues ? colSizerValues[ci] : undefined;
      // Port column (col 0): use PortCell with selection toggle
      if (ci === 0) {
        return <PortCell key={`cell-${ci}`} value={row[ci]} isSelected={selectedRows.has(ri)} onToggle={() => toggleRowSelection(ri)} onChange={(v) => updateCell(ri, ci, v)} sizerValue={sizer} />;
      }
      const presets = getPresetsForColumn(section.cols[ci]);
      if (presets) {
        return <DropdownCell key={`cell-${ci}`} value={row[ci]} presets={presets} onChange={(v) => updateCell(ri, ci, v)} sizerValue={sizer} />;
      }
      return <SzCell key={`cell-${ci}`} value={row[ci]} onChange={(v) => updateCell(ri, ci, v)} sizerValue={sizer} />;
    };

    // Phantom data cells for columns that exist in the other section but not this one
    const phantomCells = [];
    for (let pi = 0; pi < phantomCount; pi++) {
      const pci = nc + pi;
      const pSizer = colSizerValues[pci];
      phantomCells.push(
        <td key={`phantom-${pci}`} style={PHANTOM_DATA_STYLE}>
          <div className="n313-sz" data-v={pSizer || ' '} />
        </td>
      );
    }
    if (mirrored) {
      cells.push(<SpacingCell key="sp" onMouseDown={(e) => handleSpacingMouseDown(e, ri)} />);
      cells.push(<XCell key="rowx" label={section.rows.length > 1 ? '×' : null} onClick={() => deleteRow(ri)} />);
      cells.push(...phantomCells);
      for (let ci = nc - 1; ci >= 0; ci--) {
        if (hiddenCols.includes(ci)) continue;
        cells.push(renderDataCell(ci));
      }
      cells.push(<AnchorCell key="anchor" anchorId={anchorId} />);
    } else {
      cells.push(<AnchorCell key="anchor" anchorId={anchorId} />);
      for (let ci = 0; ci < nc; ci++) {
        if (hiddenCols.includes(ci)) continue;
        cells.push(renderDataCell(ci));
      }
      cells.push(...phantomCells);
      cells.push(<XCell key="rowx" label={section.rows.length > 1 ? '×' : null} onClick={() => deleteRow(ri)} />);
      cells.push(<SpacingCell key="sp" onMouseDown={(e) => handleSpacingMouseDown(e, ri)} />);
    }
    const rowSelected = selectedRows.has(ri);
    result.push(
      <tr key={ri} style={rowSelected ? ROW_SELECTED_BG : undefined}>
        {cells}
      </tr>
    );
    return result;
  };

  const wrapperStyle = fullWidth ? STYLES.sectionFull : undefined;

  // Tinted styles when signal color is set
  const tintedSectionTitle = useMemo(() => {
    const base = { ...STYLES.sectionTitle, ...(mirrored ? { flexDirection: 'row-reverse' } : {}) };
    if (signalColorHex) {
      base.background = `color-mix(in srgb, ${signalColorHex} 20%, #111)`;
      base.borderBottom = `1px solid ${signalColorHex}`;
    }
    return base;
  }, [mirrored, signalColorHex]);

  return (
    <div style={wrapperStyle}>
      {/* Section title bar */}
      <div style={tintedSectionTitle}>
        <span style={STYLES.grip} onMouseDown={onGripDown}>⠿</span>
        <input
          style={{ ...STYLES.input, ...STYLES.sectionTitleInput, ...(mirrored ? { textAlign: 'right' } : {}) }}
          value={section.title}
          onChange={(e) => updateTitle(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Scoped tint for cells */}
      {signalColorHex && (
        <style>{`
          [data-sec="${nodeId}-${sectionId}"] td { background: color-mix(in srgb, ${signalColorHex} 3%, #141414) !important; }
          [data-sec="${nodeId}-${sectionId}"] th { background: color-mix(in srgb, ${signalColorHex} 18%, #111) !important; }
          [data-sec="${nodeId}-${sectionId}"] td,
          [data-sec="${nodeId}-${sectionId}"] th { border-color: color-mix(in srgb, ${signalColorHex} 60%, #333) !important; }
        `}</style>
      )}

      {/* Data table */}
      <table ref={tableRef} style={{ ...STYLES.table, width: '100%' }} data-sec={`${nodeId}-${sectionId}`}>
        <thead>{renderHeader()}</thead>
        <tbody>{section.rows.flatMap((row, ri) => renderRow(row, ri))}</tbody>
      </table>

      {/* Column context menu (portaled to body to escape transform) */}
      {contextMenu && createPortal(
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 10000,
            background: '#1f1f23',
            border: '1px solid #333',
            padding: '2px 0',
            minWidth: 140,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {canDel && (
            <div style={STYLES.contextMenuItem} {...HOVER_BG_333} onMouseDown={(e) => { e.stopPropagation(); handleDeleteFromMenu(); }}>
              Delete Column
            </div>
          )}
          <div style={STYLES.contextMenuItem} {...HOVER_BG_333} onMouseDown={(e) => { e.stopPropagation(); handleHideFromMenu(); }}>
            Hide Column
          </div>
          {hiddenCols.length > 0 && (
            <>
              <div style={{ height: 1, background: '#333', margin: '2px 0' }} />
              <div style={STYLES.contextMenuItem} {...HOVER_BG_333} onMouseDown={(e) => { e.stopPropagation(); handleUnhideAll(); }}>
                Show All Columns ({hiddenCols.length} hidden)
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
});
Section313.displayName = 'Section313';

// ============================================
// MAIN NODE313 COMPONENT
// ============================================

function Node313({
  node, zoom, isSelected, snapToGrid, gridSize,
  onUpdate, registerAnchor, unregisterAnchors,
  onSelect, selectedNodes, onMoveSelectedNodes,
}) {
  const nodeRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragSec, setDragSec] = useState(null);
  const [isScaling, setIsScaling] = useState(false);
  const scaleStartRef = useRef(null);
  const lastPositionRef = useRef(null);

  // Settings dropdown & color picker state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const settingsBtnRef = useRef(null);
  const colorBtnRef = useRef(null);

  // Signal color
  const signalColorHex = useMemo(() => {
    if (!node.signalColor) return null;
    const c = SIGNAL_COLORS_BY_ID.get(node.signalColor);
    return c ? c.hex : null;
  }, [node.signalColor]);

  // Hidden sections
  const hiddenSections = node.hiddenSections || [];

  // Mirrored (flipped) sections
  const mirroredSections = node.mirroredSections || [];

  // Toggle section visibility
  const toggleSectionVisibility = useCallback((sectionId) => {
    const current = node.hiddenSections || [];
    const isHidden = current.includes(sectionId);
    const next = isHidden ? current.filter(s => s !== sectionId) : [...current, sectionId];
    onUpdate({ hiddenSections: next });
  }, [node.hiddenSections, onUpdate]);

  // Toggle section anchor side (flip)
  const toggleSectionMirrored = useCallback((sectionId) => {
    const current = node.mirroredSections || [];
    const isMirrored = current.includes(sectionId);
    const next = isMirrored ? current.filter(s => s !== sectionId) : [...current, sectionId];
    onUpdate({ mirroredSections: next });
  }, [node.mirroredSections, onUpdate]);

  // Dismiss settings/color picker on outside click
  useEffect(() => {
    if (!settingsOpen && !colorPickerOpen) return;
    const dismiss = (e) => {
      if (settingsBtnRef.current && settingsBtnRef.current.contains(e.target)) return;
      if (colorBtnRef.current && colorBtnRef.current.contains(e.target)) return;
      setSettingsOpen(false);
      setColorPickerOpen(false);
    };
    window.addEventListener('mousedown', dismiss);
    return () => window.removeEventListener('mousedown', dismiss);
  }, [settingsOpen, colorPickerOpen]);

  // Get dropdown position relative to a ref
  const getPortalPos = useCallback((ref, align) => {
    if (!ref.current) return { left: 0, top: 0 };
    const rect = ref.current.getBoundingClientRect();
    return {
      left: align === 'right' ? rect.right : rect.left,
      top: rect.bottom + 2,
    };
  }, []);

  const layoutKey = node.layout || 'ab_c';
  const layout = LAYOUTS[layoutKey] || LAYOUTS['ab_c'];

  // ---- Section updates ----
  const handleSectionUpdate = useCallback((sectionId, updates) => {
    onUpdate({
      sections: {
        ...node.sections,
        [sectionId]: { ...node.sections[sectionId], ...updates },
      },
    });
  }, [node.sections, onUpdate]);

  // ---- Layout drop ----
  const handleDrop = useCallback((position) => {
    if (!dragSec) return;
    const newKey = applyDrop(layoutKey, dragSec, position);
    setDragSec(null);
    onUpdate({ layout: newKey });
  }, [dragSec, layoutKey, onUpdate]);

  // ---- Section drag start (from grip) ----
  const handleSectionGripDown = useCallback((e, sectionId) => {
    if (e.target.tagName === 'INPUT') return;
    e.stopPropagation();
    setDragSec(sectionId);
  }, []);

  // Cancel drag on global mouseup
  useEffect(() => {
    if (!dragSec) return;
    const handleUp = () => setDragSec(null);
    window.addEventListener('mouseup', handleUp);
    return () => window.removeEventListener('mouseup', handleUp);
  }, [dragSec]);

  // ---- Node dragging ----
  const handleTitleMouseDown = useCallback((e) => {
    if (e.target.tagName === 'INPUT') return;
    e.stopPropagation();

    // Select this node
    if (onSelect) {
      onSelect(node.id, e.shiftKey || e.ctrlKey || e.metaKey);
    }

    const canvas = nodeRef.current?.closest('[data-canvas]');
    if (!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();

    setIsDragging(true);
    setDragStart({
      offsetX: e.clientX - canvasRect.left - node.position.x * zoom,
      offsetY: e.clientY - canvasRect.top - node.position.y * zoom,
    });
    lastPositionRef.current = { x: node.position.x, y: node.position.y };
  }, [node.id, node.position.x, node.position.y, zoom, onSelect]);

  useEffect(() => {
    if (!isDragging || !dragStart) return;

    let rafId = null;
    let pendingPosition = null;
    let pendingDelta = null;

    const handleMouseMove = (e) => {
      const canvas = nodeRef.current?.closest('[data-canvas]');
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();
      let newX = (e.clientX - canvasRect.left - dragStart.offsetX) / zoom;
      let newY = (e.clientY - canvasRect.top - dragStart.offsetY) / zoom;

      // Snap to grid (Ctrl/Cmd bypasses)
      if (snapToGrid && gridSize > 0 && !e.ctrlKey && !e.metaKey) {
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
      }

      const deltaX = newX - (lastPositionRef.current?.x || node.position.x);
      const deltaY = newY - (lastPositionRef.current?.y || node.position.y);

      pendingPosition = { x: newX, y: newY };
      pendingDelta = { x: deltaX, y: deltaY };
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

    const handleMouseUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      setIsDragging(false);
      lastPositionRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, zoom, onUpdate, snapToGrid, gridSize, selectedNodes, onMoveSelectedNodes, node.id, node.position.x, node.position.y]);

  // ---- Scale by dragging bottom-right handle ----
  const handleScaleMouseDown = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    const nodeEl = nodeRef.current;
    if (!nodeEl) return;
    const rect = nodeEl.getBoundingClientRect();
    scaleStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startScale: node.scale || 1,
      nodeWidth: rect.width,
      nodeHeight: rect.height,
    };
    setIsScaling(true);
  }, [node.scale]);

  useEffect(() => {
    if (!isScaling) return;
    const handleMove = (e) => {
      const s = scaleStartRef.current;
      if (!s) return;
      // Use diagonal distance for smooth scaling
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;
      const diagonal = Math.sqrt(s.nodeWidth * s.nodeWidth + s.nodeHeight * s.nodeHeight);
      const delta = (dx + dy) / diagonal;
      const newScale = Math.max(0.1, Math.min(3, s.startScale + delta * s.startScale));
      onUpdate({ scale: Math.round(newScale * 100) / 100 });
    };
    const handleUp = () => {
      setIsScaling(false);
      scaleStartRef.current = null;
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isScaling, onUpdate]);

  // ---- Anchor registration ----
  useLayoutEffect(() => {
    if (!nodeRef.current || !registerAnchor) return;
    const nodeRect = nodeRef.current.getBoundingClientRect();
    const totalScale = (node.scale || 1) * zoom;
    const currentAnchors = new Set();

    const currentHidden = node.hiddenSections || [];
    const nodeMidX = nodeRect.width / 2;
    ['a', 'b', 'c'].forEach(secId => {
      const sec = node.sections[secId];
      if (!sec || currentHidden.includes(secId)) return;
      sec.rows.forEach((_, ri) => {
        const anchorId = `${node.id}-${secId}-${ri}`;
        currentAnchors.add(anchorId);
        const dotEl = nodeRef.current.querySelector(`[data-anchor-id="${anchorId}"]`);
        if (dotEl) {
          const r = dotEl.getBoundingClientRect();
          const localX = (r.left + r.width / 2 - nodeRect.left) / totalScale;
          const localY = (r.top + r.height / 2 - nodeRect.top) / totalScale;
          // Determine wire routing side based on anchor position within the node
          const side = localX < nodeMidX / totalScale ? 'left' : 'right';
          registerAnchor(anchorId, {
            nodeId: node.id,
            localX,
            localY,
            type: 'both',
            side,
          });
        }
      });
    });

    return () => {
      if (unregisterAnchors) {
        unregisterAnchors(Array.from(currentAnchors));
      }
    };
  }, [node.id, node.sections, node.scale, node.layout, node.hiddenSections, zoom, registerAnchor, unregisterAnchors]);

  // ---- Click to select ----
  const handleNodeClick = useCallback((e) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(node.id, e.shiftKey || e.ctrlKey || e.metaKey);
    }
  }, [node.id, onSelect]);

  // ---- Sync ALL column widths between A and B via longest string per column ----
  const colSizerValues = useMemo(() => {
    const secA = node.sections.a;
    const secB = node.sections.b;
    if (!secA || !secB) return null;
    const count = Math.max(secA.cols.length, secB.cols.length);
    const sizers = [];
    for (let ci = 0; ci < count; ci++) {
      let longest = '';
      // Headers
      if (secA.cols[ci] && secA.cols[ci].length > longest.length) longest = secA.cols[ci];
      if (secB.cols[ci] && secB.cols[ci].length > longest.length) longest = secB.cols[ci];
      // Row values
      for (const row of secA.rows) {
        if (row[ci] && row[ci].length > longest.length) longest = row[ci];
      }
      for (const row of secB.rows) {
        if (row[ci] && row[ci].length > longest.length) longest = row[ci];
      }
      sizers.push(longest || null);
    }
    return sizers;
  }, [node.sections]);

  // ---- Render sections ----
  const renderSection = useCallback((sectionId, fullWidth, layoutMirrored) => {
    if (hiddenSections.includes(sectionId)) return null;
    const sec = node.sections[sectionId];
    if (!sec) return null;

    // In stacked (fullWidth) view, allow per-section flip override
    const flipped = mirroredSections.includes(sectionId);
    const mirrored = fullWidth ? flipped : layoutMirrored;

    // Sync all column widths between A and B (not C)
    const sizers = (sectionId === 'a' || sectionId === 'b') ? colSizerValues : null;

    return (
      <Section313
        sectionId={sectionId}
        section={sec}
        nodeId={node.id}
        fullWidth={fullWidth}
        mirrored={mirrored}
        onUpdate={handleSectionUpdate}
        signalColorHex={signalColorHex}
        onFlip={fullWidth ? () => toggleSectionMirrored(sectionId) : null}
        colSizerValues={sizers}
        onGripDown={(e) => handleSectionGripDown(e, sectionId)}
      />
    );
  }, [node.sections, node.id, handleSectionUpdate, hiddenSections, mirroredSections, signalColorHex, toggleSectionMirrored, colSizerValues, handleSectionGripDown]);

  // ---- Render layout with overlay drop zones (no shifting) ----
  const DZ_THICKNESS = 24; // px thickness for edge drop zones

  const renderLayout = () => {
    const currentPos = dragSec ? getPosition(layoutKey, dragSec) : null;
    const cZones = dragSec === 'c' ? ['top', 'bottom'].filter(p => p !== currentPos) : [];
    const abZones = (dragSec === 'a' || dragSec === 'b') ? ['left', 'right', 'above', 'below'].filter(p => p !== currentPos) : [];

    const otherAB = dragSec === 'a' ? 'b' : dragSec === 'b' ? 'a' : null;
    const otherRowIndex = otherAB ? layout.findIndex(r => r.includes(otherAB)) : -1;

    const elements = [];

    layout.forEach((row, rowIndex) => {
      if (row.length === 2) {
        // Side-by-side row
        elements.push(
          <div key={rowIndex} style={{ ...STYLES.abRow, position: 'relative' }}>
            <div style={STYLES.sectionWrap}>
              <div style={dragSec === row[0] ? STYLES.dragHighlight : undefined}>
                {renderSection(row[0], false, false)}
              </div>
            </div>
            <div style={{ ...STYLES.sectionWrap, ...STYLES.sectionWrapBorder }}>
              <div style={dragSec === row[1] ? STYLES.dragHighlight : undefined}>
                {renderSection(row[1], false, true)}
              </div>
            </div>
            {/* Overlay drop zones */}
            {abZones.includes('left') && (
              <DropZone key="dz-left" label="LEFT" onDrop={() => handleDrop('left')}
                placement={{ left: 0, top: 0, bottom: 0, width: `${DZ_THICKNESS}px` }} />
            )}
            {abZones.includes('right') && (
              <DropZone key="dz-right" label="RIGHT" onDrop={() => handleDrop('right')}
                placement={{ right: 0, top: 0, bottom: 0, width: `${DZ_THICKNESS}px` }} />
            )}
            {abZones.includes('above') && (
              <DropZone key="dz-above" label="ABOVE" onDrop={() => handleDrop('above')}
                placement={{ left: abZones.includes('left') ? DZ_THICKNESS : 0, right: abZones.includes('right') ? DZ_THICKNESS : 0, top: 0, height: `${DZ_THICKNESS}px` }} />
            )}
            {abZones.includes('below') && (
              <DropZone key="dz-below" label="BELOW" onDrop={() => handleDrop('below')}
                placement={{ left: abZones.includes('left') ? DZ_THICKNESS : 0, right: abZones.includes('right') ? DZ_THICKNESS : 0, bottom: 0, height: `${DZ_THICKNESS}px` }} />
            )}
            {rowIndex === 0 && cZones.includes('top') && (
              <DropZone key="dz-top" label="TOP" onDrop={() => handleDrop('top')}
                placement={{ left: 0, right: 0, top: 0, height: `${DZ_THICKNESS}px` }} />
            )}
            {rowIndex === layout.length - 1 && cZones.includes('bottom') && (
              <DropZone key="dz-bottom" label="BOTTOM" onDrop={() => handleDrop('bottom')}
                placement={{ left: 0, right: 0, bottom: 0, height: `${DZ_THICKNESS}px` }} />
            )}
          </div>
        );
      } else {
        // Single-section row
        elements.push(
          <div
            key={rowIndex}
            style={{ position: 'relative' }}
          >
            <div style={dragSec === row[0] ? STYLES.dragHighlight : undefined}>
              {renderSection(row[0], true, false)}
            </div>
            {/* Overlay drop zones for the OTHER section's row */}
            {rowIndex === otherRowIndex && abZones.includes('left') && (
              <DropZone key="dz-left" label="LEFT" onDrop={() => handleDrop('left')}
                placement={{ left: 0, top: 0, bottom: 0, width: `${DZ_THICKNESS}px` }} />
            )}
            {rowIndex === otherRowIndex && abZones.includes('right') && (
              <DropZone key="dz-right" label="RIGHT" onDrop={() => handleDrop('right')}
                placement={{ right: 0, top: 0, bottom: 0, width: `${DZ_THICKNESS}px` }} />
            )}
            {rowIndex === otherRowIndex && abZones.includes('above') && (
              <DropZone key="dz-above" label="ABOVE" onDrop={() => handleDrop('above')}
                placement={{ left: abZones.includes('left') ? DZ_THICKNESS : 0, right: abZones.includes('right') ? DZ_THICKNESS : 0, top: 0, height: `${DZ_THICKNESS}px` }} />
            )}
            {rowIndex === otherRowIndex && abZones.includes('below') && (
              <DropZone key="dz-below" label="BELOW" onDrop={() => handleDrop('below')}
                placement={{ left: abZones.includes('left') ? DZ_THICKNESS : 0, right: abZones.includes('right') ? DZ_THICKNESS : 0, bottom: 0, height: `${DZ_THICKNESS}px` }} />
            )}
            {/* C zones on first/last rows */}
            {rowIndex === 0 && cZones.includes('top') && (
              <DropZone key="dz-top" label="TOP" onDrop={() => handleDrop('top')}
                placement={{ left: 0, right: 0, top: 0, height: `${DZ_THICKNESS}px` }} />
            )}
            {rowIndex === layout.length - 1 && cZones.includes('bottom') && (
              <DropZone key="dz-bottom" label="BOTTOM" onDrop={() => handleDrop('bottom')}
                placement={{ left: 0, right: 0, bottom: 0, height: `${DZ_THICKNESS}px` }} />
            )}
          </div>
        );
      }
    });

    return elements;
  };

  const totalScale = node.scale || 1;

  // Build node style with solid color tint
  const nodeStyle = useMemo(() => {
    const base = {
      ...STYLES.node,
      left: `${node.position.x}px`,
      top: `${node.position.y}px`,
      transform: `scale(${totalScale})`,
      transformOrigin: 'top left',
      outline: isSelected ? '2px solid #3b82f6' : 'none',
      outlineOffset: '1px',
      zIndex: settingsOpen || colorPickerOpen ? 10000 : isDragging ? 1000 : isSelected ? 100 : 1,
    };
    if (signalColorHex) {
      base.background = `color-mix(in srgb, ${signalColorHex} 25%, #0a0a0a)`;
      base.borderColor = signalColorHex;
    }
    return base;
  }, [node.position.x, node.position.y, totalScale, isSelected, isDragging, settingsOpen, colorPickerOpen, signalColorHex]);

  // Tinted title bar
  const titleBarStyle = useMemo(() => {
    const base = { ...STYLES.nodeTitle };
    if (signalColorHex) {
      base.background = `color-mix(in srgb, ${signalColorHex} 35%, #111)`;
      base.borderBottom = `1px solid ${signalColorHex}`;
    }
    return base;
  }, [signalColorHex]);

  return (
    <div
      ref={nodeRef}
      style={nodeStyle}
      onClick={handleNodeClick}
      data-node-id={node.id}
    >
      {/* Title bar */}
      <div style={titleBarStyle}>
        <span style={STYLES.grip} onMouseDown={handleTitleMouseDown}>⠿</span>
        <input
          style={{ ...STYLES.input, ...STYLES.titleInput }}
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Color picker + Settings buttons */}
        <div style={STYLES.titleRight}>
          {/* Color swatch — matches the node body color */}
          <div
            ref={colorBtnRef}
            style={{
              ...STYLES.colorSwatch,
              backgroundColor: signalColorHex || '#333',
              boxShadow: signalColorHex ? `0 0 4px ${signalColorHex}66` : 'none',
            }}
            title={signalColorHex ? `Color: ${node.signalColor}` : 'Set color'}
            onClick={(e) => {
              e.stopPropagation();
              setColorPickerOpen(prev => !prev);
              setSettingsOpen(false);
            }}
            onMouseDown={(e) => e.stopPropagation()}
          />

          {/* Settings gear */}
          <button
            ref={settingsBtnRef}
            style={{
              ...STYLES.gearBtn,
              color: settingsOpen ? '#ccc' : '#666',
            }}
            title="Settings"
            onClick={(e) => {
              e.stopPropagation();
              setSettingsOpen(prev => !prev);
              setColorPickerOpen(false);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ccc'; }}
            onMouseLeave={(e) => { if (!settingsOpen) e.currentTarget.style.color = '#666'; }}
          >
            ⚙
          </button>
        </div>

        {/* Color picker grid (portaled) */}
        {colorPickerOpen && createPortal(
          (() => {
            const pos = getPortalPos(colorBtnRef, 'left');
            return (
              <div
                style={{ ...STYLES.colorGrid, left: pos.left, top: pos.top }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {SIGNAL_COLORS.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      ...STYLES.colorGridItem,
                      backgroundColor: c.hex,
                      borderColor: node.signalColor === c.id ? '#fff' : '#444',
                      boxShadow: node.signalColor === c.id ? `0 0 4px ${c.hex}` : 'none',
                    }}
                    title={c.label}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onUpdate({ signalColor: c.id });
                      setColorPickerOpen(false);
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#aaa'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = node.signalColor === c.id ? '#fff' : '#444'; }}
                  />
                ))}
                <div
                  style={STYLES.colorGridClear}
                  onMouseDown={(e) => { e.stopPropagation(); onUpdate({ signalColor: null }); setColorPickerOpen(false); }}
                  {...HOVER_888_CCC}
                >
                  Clear Color
                </div>
              </div>
            );
          })(),
          document.body
        )}

        {/* Settings dropdown (portaled) */}
        {settingsOpen && createPortal(
          (() => {
            const pos = getPortalPos(settingsBtnRef, 'right');
            return (
              <div
                style={{ ...STYLES.settingsDropdown, left: pos.left - 150, top: pos.top }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div style={STYLES.settingsLabel}>Device Type</div>
                {['Router', 'Switcher', 'Source', 'Destination', 'Converter'].map((dt) => {
                  const types = node.deviceTypes || [];
                  const isActive = types.includes(dt);
                  return (
                    <button key={dt} style={STYLES.settingsItem} {...HOVER_BG_2A}
                      onMouseDown={(e) => { e.stopPropagation(); onUpdate({ deviceTypes: isActive ? types.filter(t => t !== dt) : [...types, dt] }); }}>
                      <span>{dt}</span>
                      <span style={{ color: isActive ? '#4ade80' : '#555' }}>{isActive ? '✓' : '○'}</span>
                    </button>
                  );
                })}
                <div style={STYLES.settingsDivider} />
                <div style={STYLES.settingsLabel}>Sections</div>
                {[
                  { id: 'a', label: 'Input (A)' },
                  { id: 'b', label: 'Output (B)' },
                  { id: 'c', label: 'System (C)' },
                ].map((sec) => {
                  const isVisible = !hiddenSections.includes(sec.id);
                  return (
                    <button key={sec.id} style={STYLES.settingsItem} {...HOVER_BG_2A}
                      onMouseDown={(e) => { e.stopPropagation(); toggleSectionVisibility(sec.id); }}>
                      <span>{sec.label}</span>
                      <span style={{ color: isVisible ? '#4ade80' : '#555' }}>{isVisible ? '✓' : '○'}</span>
                    </button>
                  );
                })}
              </div>
            );
          })(),
          document.body
        )}
      </div>

      {/* Sections */}
      {renderLayout()}

      {/* Scale handle — bottom-right corner */}
      <div
        onMouseDown={handleScaleMouseDown}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 12,
          height: 12,
          cursor: 'nwse-resize',
          zIndex: 10,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" style={{ display: 'block' }}>
          <line x1="10" y1="2" x2="2" y2="10" stroke="#555" strokeWidth="1" />
          <line x1="10" y1="5" x2="5" y2="10" stroke="#555" strokeWidth="1" />
          <line x1="10" y1="8" x2="8" y2="10" stroke="#555" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}

export default Node313;
