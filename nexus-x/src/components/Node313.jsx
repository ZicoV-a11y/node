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

// Cell dimension constants
const CELL_H = 36;
const ACTION_W = 12;
const ANCHOR_W = 16;
const ACTION_AREA_W = ACTION_W * 2; // 24 — two action columns side by side
const SPACING_SNAP = CELL_H / 2; // Snap to half-cell height

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

// Noir theme palette
const T = {
  bg: '#0a0a0a', card: '#111111', rowHover: '#1a1a1a',
  border: 'rgba(255,255,255,0.10)', borderStrong: 'rgba(255,255,255,0.15)',
  borderSubtle: 'rgba(255,255,255,0.04)', divider: 'rgba(255,255,255,0.08)',
  colDivider: 'rgba(255,255,255,0.50)',
  accent: '#bbbbbb', accentLight: '#dddddd', accentDim: '#999999',
  green: '#66bb6a', red: '#ef5350',
  accentGlow: 'rgba(255,255,255,0.04)',
  text: '#cccccc', textSec: '#aaaaaa', textMuted: '#666666',
  white: '#e0e0e0',
  hFont: "'Space Grotesk', sans-serif", mono: "'Space Grotesk', sans-serif",
};

// Custom X cursor (16x16 SVG)
const X_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Cline x1='4' y1='4' x2='12' y2='12' stroke='white' stroke-width='2'/%3E%3Cline x1='12' y1='4' x2='4' y2='12' stroke='white' stroke-width='2'/%3E%3C/svg%3E") 8 8, crosshair`;
const DOT_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Ccircle cx='8' cy='8' r='5' fill='white'/%3E%3C/svg%3E") 8 8, pointer`;

const STYLES = {
  node: {
    position: 'absolute',
    border: `2px solid ${T.border}`,
    background: T.card,
    display: 'inline-flex',
    flexDirection: 'column',
    whiteSpace: 'nowrap',
    fontFamily: T.mono,
    color: T.text,
    userSelect: 'none',
    overflow: 'hidden',
  },
  nodeTitle: {
    background: T.card,
    borderBottom: `2px solid ${T.border}`,
    display: 'flex',
    alignItems: 'center',
    cursor: 'grab',
    padding: '6px 4px',
    gap: '2px',
  },
  grip: {
    color: T.textMuted,
    fontSize: '10px',
    padding: '0 3px',
    cursor: 'grab',
    flexShrink: 0,
    alignSelf: 'stretch',
    display: 'flex',
    alignItems: 'center',
  },
  titleInput: {
    fontSize: '14px',
    fontWeight: 300,
    fontFamily: T.hFont,
    letterSpacing: '2px',
    textAlign: 'left',
    height: '18px',
    minWidth: '30px',
    color: T.white,
  },
  tagInput: {
    fontSize: '10px',
    color: T.accent,
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: '20px',
    minWidth: '20px',
    border: `1px solid ${T.borderStrong}`,
    padding: '0 8px',
    marginLeft: '2px',
    fontFamily: T.mono,
    letterSpacing: '1px',
    background: T.accentGlow,
  },
  mfgModel: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    fontSize: '10px',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    marginLeft: '4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    flexShrink: 1,
    minWidth: 0,
    gap: '1px',
  },
  sectionTitle: {
    background: T.bg,
    borderBottom: `2px solid ${T.border}`,
    display: 'flex',
    alignItems: 'center',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    padding: '6px 8px',
    gap: '8px',
    height: '30px',
    boxSizing: 'border-box',
  },
  sectionTitleInput: {
    fontSize: '10px',
    fontWeight: 500,
    fontFamily: T.hFont,
    letterSpacing: '4px',
    textTransform: 'uppercase',
    height: '14px',
    lineHeight: '14px',
    color: T.accentDim,
    width: 'auto',
    flexShrink: 0,
  },
  input: {
    background: 'transparent',
    border: 'none',
    color: T.text,
    fontFamily: T.mono,
    outline: 'none',
    margin: 0,
    padding: '0 3px',
    lineHeight: 1,
    display: 'block',
  },
  table: {
    borderCollapse: 'collapse',
    whiteSpace: 'nowrap',
  },
  cell: {
    borderBottom: `1px solid ${T.divider}`,
    borderRight: `1px solid ${T.colDivider}`,
    padding: '4px 2px',
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
    lineHeight: 1,
    background: T.card,
    height: `${CELL_H}px`,
    boxSizing: 'border-box',
  },
  headerCell: {
    background: T.bg,
    borderBottom: `1px solid ${T.border}`,
    padding: '2px 2px',
    height: '22px',
    boxSizing: 'border-box',
  },
  actionCell: {
    width: `${ACTION_W}px`,
    minWidth: `${ACTION_W}px`,
    maxWidth: `${ACTION_W}px`,
    padding: '2px 1px',
    textAlign: 'center',
    verticalAlign: 'middle',
    lineHeight: 1,
    background: 'transparent',
  },
  actionCellLabel: {
    color: T.textMuted,
    cursor: 'pointer',
    fontSize: '10px',
    userSelect: 'none',
  },
  ac: {
    width: `${ANCHOR_W}px`,
    minWidth: `${ANCHOR_W}px`,
    maxWidth: `${ANCHOR_W}px`,
    textAlign: 'center',
    verticalAlign: 'middle',
    lineHeight: 1,
  },
  dropZone: {
    position: 'absolute',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: `2px dashed ${T.accent}`,
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '1px',
    color: '#1a1408',
    background: 'rgba(201,169,110,0.65)',
    userSelect: 'none',
    zIndex: 10,
    pointerEvents: 'auto',
  },
  dropZoneHover: {
    borderColor: T.white,
    color: '#000',
    background: 'rgba(201,169,110,0.85)',
  },
  dragHighlight: {
    outline: `2px solid ${T.accent}`,
    outlineOffset: '-2px',
    opacity: 0.6,
  },
  abRow: {
    display: 'flex',
    width: '100%',
  },
  sectionWrap: {
    flex: '1 1 auto',
    minWidth: 0,
    alignSelf: 'flex-start',
  },
  sectionFull: {
    display: 'block',
    width: '100%',
  },
  contextMenuItem: {
    padding: '4px 12px',
    fontSize: '11px',
    fontFamily: T.mono,
    color: T.text,
    cursor: 'pointer',
  },
  // Settings & color picker — icon-only
  titleRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    marginLeft: 'auto',
    flexShrink: 0,
  },
  gearBtn: {
    background: 'none',
    border: 'none',
    color: T.textMuted,
    fontSize: '10px',
    cursor: 'pointer',
    padding: 0,
    fontFamily: T.mono,
    lineHeight: 1,
    flexShrink: 0,
  },
  settingsDropdown: {
    position: 'fixed',
    backgroundColor: T.card,
    border: `2px solid ${T.borderStrong}`,
    padding: '4px 0',
    minWidth: '150px',
    zIndex: 10001,
    fontFamily: T.mono,
  },
  settingsItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 10px',
    fontSize: '11px',
    fontFamily: T.mono,
    color: T.text,
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    width: '100%',
    textAlign: 'left',
  },
  settingsLabel: {
    padding: '3px 10px',
    fontSize: '9px',
    fontFamily: T.mono,
    color: T.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
  },
  settingsDivider: {
    height: '1px',
    background: T.border,
    margin: '3px 0',
  },
  colorGridItem: {
    width: '16px',
    height: '16px',
    borderRadius: '2px',
    border: `1px solid ${T.textMuted}`,
    cursor: 'pointer',
  },
  colorGridClear: {
    gridColumn: '1 / -1',
    padding: '3px 0',
    fontSize: '10px',
    fontFamily: T.mono,
    color: T.textSec,
    cursor: 'pointer',
    textAlign: 'center',
    borderTop: `1px solid ${T.border}`,
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
    'HDMI 2.0', '3G SDI', '12G SDI', 'DP 1.2', 'SMPTE FIBER', 'OPTICAL-CON QUAD FIBER', 'CAT5', 'CAT6A', 'ETHERNET', 'BNC',
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
const SZ_CELL_HEADER_STYLE = { ...STYLES.cell, ...STYLES.headerCell, width: '1px', cursor: 'grab' };
const SZ_INPUT_BODY = { ...STYLES.input, gridArea: '1/1', width: '100%', minWidth: 0, textAlign: 'center', fontSize: '16px', fontWeight: 500, height: '28px', lineHeight: '28px', color: T.white };
const SZ_INPUT_HEADER = { ...STYLES.input, gridArea: '1/1', width: '100%', minWidth: 0, textAlign: 'center', fontSize: '9px', fontWeight: 400, textTransform: 'uppercase', color: T.textMuted, height: '16px', lineHeight: '16px', cursor: 'grab', letterSpacing: '2px' };
const ACTION_CELL_STYLE = { ...STYLES.cell, ...STYLES.actionCell };
const ACTION_CELL_HEADER_STYLE = { ...STYLES.cell, ...STYLES.headerCell, ...STYLES.actionCell };

// Port selection highlight
const PORT_CELL_SELECTED = { color: T.accent, background: T.accentGlow };

// Pre-computed port header styles (avoids allocation per render)
const PORT_HEADER_STYLE = SZ_CELL_HEADER_STYLE;
const PORT_HEADER_SEL_STYLE = { ...SZ_CELL_HEADER_STYLE, ...PORT_CELL_SELECTED };
const PORT_HDR_INPUT_SEL = { ...SZ_INPUT_HEADER, pointerEvents: 'none', color: T.accent };
const PORT_HDR_INPUT_NORM = { ...SZ_INPUT_HEADER, pointerEvents: 'none' };

// Pre-computed port display styles (PortCell read-only mode)
const PORT_DISPLAY_SEL = { ...SZ_INPUT_BODY, cursor: 'pointer', color: T.accent };
const PORT_DISPLAY_NORM = { ...SZ_INPUT_BODY, cursor: 'pointer', color: T.white };

// Selected row background tint
const ROW_SELECTED_BG = { background: T.accentGlow };

// Spacer row cell style
const SPACER_TD_STYLE = { padding: 0, border: 'none', background: 'transparent', boxSizing: 'border-box' };

// Hover handler factory — returns onMouseEnter/onMouseLeave pair
const hover = (prop, normal, hovered) => ({
  onMouseEnter: (e) => { e.currentTarget.style[prop] = hovered; },
  onMouseLeave: (e) => { e.currentTarget.style[prop] = normal; },
});
const HOVER_333_888 = hover('color', T.textMuted, T.textSec);
const HOVER_888_CCC = hover('color', T.textSec, T.accentLight);
const BLUR_ON_ENTER = { onKeyDown: (e) => { if (e.key === 'Enter') e.target.blur(); } };

// Manufacturer logos — keyed by uppercase manufacturer name
const MANUFACTURER_LOGOS = {
};
const HOVER_BG_333 = hover('background', 'transparent', T.rowHover);
const HOVER_BG_2A = hover('background', 'none', T.rowHover);
const HOVER_BG_CELL = { onMouseEnter: (e) => { e.currentTarget.style.setProperty('background', '#222', 'important'); }, onMouseLeave: (e) => { e.currentTarget.style.removeProperty('background'); } };

// ============================================
// SUB-COMPONENTS
// ============================================

// Auto-sizing input cell
const SzCell = memo(({ value, isHeader, onChange, onContextMenu, sizerValue, onMouseDown, colIndex }) => {
  const Tag = isHeader ? 'th' : 'td';
  // Use sizerValue for data-v when it's longer, so synced columns size to the longest string
  const sizer = sizerValue && sizerValue.length > (value || '').length ? sizerValue : (value || ' ');
  return (
    <Tag style={isHeader ? SZ_CELL_HEADER_STYLE : SZ_CELL_STYLE} onContextMenu={onContextMenu} onMouseDown={onMouseDown} data-ci={isHeader && colIndex != null ? colIndex : undefined}>
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
          {...BLUR_ON_ENTER}
        />
      </div>
    </Tag>
  );
});
SzCell.displayName = 'SzCell';

// Dropdown cell — looks like SzCell but click opens preset options
const DropdownCell = memo(({ value, presets, onChange, sizerValue, highlightColor }) => {
  const [open, setOpen] = useState(false);
  const cellRef = useRef(null);
  const inputRef = useRef(null);

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

  // Open dropdown when typing
  const handleChange = useCallback((e) => {
    onChange(e.target.value);
    if (!open) setOpen(true);
  }, [onChange, open]);

  // Get position for the portal dropdown
  const getDropdownPos = () => {
    if (!cellRef.current) return { left: 0, top: 0, width: 0 };
    const rect = cellRef.current.getBoundingClientRect();
    return { left: rect.left, top: rect.bottom, width: Math.max(rect.width, 120) };
  };

  // Filter presets by typed value
  const query = (value || '').toUpperCase().trim();
  const filtered = query ? presets.filter(p => p.toUpperCase().includes(query)) : presets;

  const sizer = sizerValue && sizerValue.length > (value || '').length ? sizerValue : (value || ' ');

  const cellStyle = highlightColor
    ? { ...SZ_CELL_STYLE, background: `${highlightColor}18` }
    : SZ_CELL_STYLE;
  const inputStyle = highlightColor
    ? { ...SZ_INPUT_BODY, color: highlightColor }
    : SZ_INPUT_BODY;

  return (
    <td style={cellStyle} ref={cellRef}>
      <div className="n313-sz" data-v={sizer}>
        <input
          ref={inputRef}
          style={inputStyle}
          value={value}
          onChange={handleChange}
          {...BLUR_ON_ENTER}
          onClick={handleInputClick}
        />
      </div>
      {open && filtered.length > 0 && createPortal(
        (() => {
          const pos = getDropdownPos();
          return (
            <div
              style={{
                position: 'fixed',
                left: pos.left,
                top: pos.top,
                minWidth: pos.width,
                maxHeight: 200,
                overflowY: 'auto',
                zIndex: 10000,
                background: T.card,
                border: `1px solid ${T.borderStrong}`,
                padding: '2px 0',
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {filtered.map((p) => (
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
const CELL_CENTER = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

// Anchor dot style — visible circle that scales with the node
const ANCHOR_DOT_STYLE = {
  width: '7px', height: '7px', borderRadius: '50%',
  background: T.accent, opacity: 0.7, boxShadow: `0 0 8px ${T.accent}44`,
};
const AC_BODY_STYLE = { ...STYLES.cell, ...STYLES.ac, background: 'transparent' };
const AC_HEAD_STYLE = { ...STYLES.cell, ...STYLES.headerCell, ...STYLES.ac, background: 'transparent' };

// Lucide icons — 24×24 viewBox, stroke-width 2, round caps/joins, currentColor
const SVG_STYLE = { display: 'block' };
const L = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', style: SVG_STYLE };
const ACTION_ICON_X = <svg width="9" height="9" viewBox="0 0 24 24" {...L}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const ACTION_ICON_PLUS = <svg width="9" height="9" viewBox="0 0 24 24" {...L}><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
const ACTION_ICON_PLUS_DOWN = <svg width="14" height="9" viewBox="0 0 34 24" {...L}><path d="M5 12h14"/><path d="M12 5v14"/><path d="M28 7v8"/><polygon points="24,15 28,21 32,15" fill="currentColor" stroke="none"/></svg>;
const ACTION_ICON_PLUS_LEFT = <svg width="9" height="14" viewBox="0 0 24 34" {...L}><path d="M5 12h14"/><path d="M12 5v14"/><path d="M17 28H9"/><polygon points="9,25 3,28 9,31" fill="currentColor" stroke="none"/></svg>;
const ACTION_ICON_PLUS_RIGHT = <svg width="9" height="14" viewBox="0 0 24 34" {...L}><path d="M5 12h14"/><path d="M12 5v14"/><path d="M7 28h8"/><polygon points="15,25 21,28 15,31" fill="currentColor" stroke="none"/></svg>;
const ACTION_ICON_FLIP = <svg width="10" height="7" viewBox="0 0 24 24" {...L}><polygon points="2,7 8,3 8,11" fill="currentColor" stroke="none"/><path d="M8 7h8"/><polygon points="22,17 16,21 16,13" fill="currentColor" stroke="none"/><path d="M16 17H8"/></svg>;
const ACTION_ICON_SPACING = <svg width="9" height="11" viewBox="0 0 24 24" {...L}><path d="M12 6v12"/><polygon points="8,18 12,23 16,18" fill="currentColor" stroke="none"/><polygon points="8,6 12,1 16,6" fill="currentColor" stroke="none"/></svg>;
const SETTINGS_ICON = <svg width="13" height="13" viewBox="0 0 24 24" {...L}><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>;
const ICON_CHEVRON_RIGHT = <svg width="10" height="10" viewBox="0 0 24 24" {...L}><polygon points="9,6 15,12 9,18" fill="currentColor" stroke="none"/></svg>;
const ICON_CHEVRON_DOWN = <svg width="10" height="10" viewBox="0 0 24 24" {...L}><polygon points="6,9 12,15 18,9" fill="currentColor" stroke="none"/></svg>;
const ICON_CHECK = <svg width="10" height="10" viewBox="0 0 24 24" {...L}><path d="M20 6 9 17l-5-5"/></svg>;
const ICON_CIRCLE = <svg width="10" height="10" viewBox="0 0 24 24" {...L}><circle cx="12" cy="12" r="10"/></svg>;

// Unified action cell — handles delete (×), add (+), drag (↕), flip (⇄)
const ActionCell = memo(({ isHeader, label, icon, onClick, onMouseDown, title, signalColor, cursor: cursorProp }) => {
  const Tag = isHeader ? 'th' : 'td';
  const hasContent = isHeader ? (!!label || !!icon) : !!icon;
  const interactive = isHeader ? (hasContent && !!onClick) : (!!onClick || !!onMouseDown);
  const cursor = cursorProp || (interactive && isHeader ? 'cell' : undefined);
  const sc = signalColor || T.accent;
  return (
    <Tag
      className="n313-ac"
      style={{ ...(isHeader ? ACTION_CELL_HEADER_STYLE : ACTION_CELL_STYLE), cursor }}
      onClick={interactive && onClick ? (e) => { e.stopPropagation(); onClick(); } : undefined}
      onMouseDown={onMouseDown || (interactive ? (e) => e.stopPropagation() : undefined)}
      title={title}
      onMouseEnter={interactive ? (e) => { e.currentTarget.style.setProperty('background', `${sc}30`, 'important'); } : undefined}
      onMouseLeave={interactive ? (e) => { e.currentTarget.style.removeProperty('background'); } : undefined}
    >
      <div style={CELL_CENTER}>
        {icon ? <span className="n313-icon-btn" style={{ color: sc }}>{icon}</span> : (label ? <span style={{ ...STYLES.actionCellLabel, cursor, color: sc }}>{label}</span> : null)}
      </div>
    </Tag>
  );
});
ActionCell.displayName = 'ActionCell';

// Anchor dot cell — visible dot + row number, interaction handled by SVG layer
const AnchorCell = memo(({ isHeader, anchorId, label, icon, onClick, title, onAnchorClick, anchorType, signalColor }) => {
  const Tag = isHeader ? 'th' : 'td';
  const hasContent = isHeader ? (!!label || !!icon) : !!anchorId;
  const interactive = isHeader ? (hasContent && !!onClick) : !!anchorId;
  const cursor = interactive ? (isHeader ? 'cell' : DOT_CURSOR) : undefined;
  const sc = signalColor || T.accent;
  return (
    <Tag
      style={{ ...(isHeader ? AC_HEAD_STYLE : AC_BODY_STYLE), cursor }}
      onClick={interactive ? (e) => { e.stopPropagation(); isHeader ? onClick() : onAnchorClick && onAnchorClick(anchorId, anchorType || 'both'); } : undefined}
      onMouseDown={interactive ? (e) => e.stopPropagation() : undefined}
      title={isHeader ? (interactive ? title : undefined) : 'Click to connect wire'}
      onMouseEnter={interactive ? (e) => { e.currentTarget.style.setProperty('background', `${sc}30`, 'important'); } : undefined}
      onMouseLeave={interactive ? (e) => { e.currentTarget.style.removeProperty('background'); } : undefined}
    >
      <div style={CELL_CENTER}>
        {isHeader && icon ? <span className="n313-icon-btn" style={{ color: sc }}>{icon}</span> : isHeader && label ? <span style={{ ...STYLES.actionCellLabel, cursor }}>{label}</span> : null}
        {!isHeader && <div className="n313-anchor-dot" data-anchor-id={anchorId} style={{ ...ANCHOR_DOT_STYLE, cursor }} />}
      </div>
    </Tag>
  );
});
AnchorCell.displayName = 'AnchorCell';



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
const DropZone = memo(({ label, onDrop, placement, signalColor }) => {
  const [hover, setHover] = useState(false);
  const sc = signalColor || T.accent;
  return (
    <div
      style={{
        ...STYLES.dropZone,
        ...placement,
        border: `2px dashed ${T.white}`,
        background: hover ? `${sc}50` : `${sc}30`,
        color: T.white,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onMouseUp={() => onDrop()}
    >
      <span style={{ background: `${sc}88`, padding: '1px 6px', color: T.white, fontSize: '10px', fontWeight: 700, letterSpacing: '1px' }}>{label}</span>
    </div>
  );
});
DropZone.displayName = 'DropZone';

// ============================================
// SECTION COMPONENT
// ============================================

const Section313 = memo(({ sectionId, section, nodeId, fullWidth, mirrored, onUpdate, signalColorHex, onFlip, colSizerValues, onGripDown, onSpacingDown, onAnchorClick, collapsible, isFirstRow, hiddenSystemFields, sourceNodeTags, destinationNodeTags, connectedSourceMap, connectedDestinationMap, getSpacingAxisSnap }) => {
  const nc = section.cols.length;
  const rawHidden = section.hiddenCols || [];
  const hiddenCols = rawHidden.filter(ci => ci >= 0 && ci < nc);
  const rowSpacing = section.rowSpacing || [];
  const canDel = nc > 1;
  const [contextMenu, setContextMenu] = useState(null); // { x, y, colIndex }
  const [selectedRows, setSelectedRows] = useState(new Set());
  const tableRef = useRef(null);

  // Card grouping (E3 Tricombo slots etc.)
  const cardSize = section.cardSize || 0;
  const cardStartSlot = section.cardStartSlot ?? 1;

  const cards = useMemo(() => {
    if (!cardSize || cardSize <= 0) return null;
    const result = [];
    for (let i = 0; i < section.rows.length; i += cardSize) {
      result.push({
        startRow: i,
        endRow: Math.min(i + cardSize, section.rows.length),
        slotNumber: cardStartSlot + result.length,
      });
    }
    return result;
  }, [section.rows.length, cardSize, cardStartSlot]);

  // Auto-repair stale hiddenCols and oversized rows
  useEffect(() => {
    const repairs = {};
    if (rawHidden.length !== hiddenCols.length) {
      repairs.hiddenCols = hiddenCols;
    }
    const badRows = section.rows.some(r => r.length !== nc);
    if (badRows) {
      repairs.rows = section.rows.map(r =>
        r.length > nc ? r.slice(0, nc) : r.length < nc ? [...r, ...Array(nc - r.length).fill('')] : r
      );
    }
    if (Object.keys(repairs).length > 0) {
      onUpdate(sectionId, repairs);
    }
  }, [rawHidden, hiddenCols, nc, section.rows, sectionId, onUpdate]);

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
    // Adjust hiddenCols indices: remove ci, shift down indices above ci
    const newHidden = hiddenCols
      .filter(h => h !== ci)
      .map(h => h > ci ? h - 1 : h);
    updateSection({
      cols: section.cols.filter((_, i) => i !== ci),
      rows: section.rows.map(r => r.filter((_, i) => i !== ci)),
      hiddenCols: newHidden,
    });
  }, [section.cols, section.rows, hiddenCols, updateSection]);

  const moveColumn = useCallback((ci, dir) => {
    const target = ci + dir;
    if (target < 0 || target >= section.cols.length) return;
    const newCols = [...section.cols];
    [newCols[ci], newCols[target]] = [newCols[target], newCols[ci]];
    const newRows = section.rows.map(r => {
      const nr = [...r];
      [nr[ci], nr[target]] = [nr[target], nr[ci]];
      return nr;
    });
    updateSection({ cols: newCols, rows: newRows });
  }, [section.cols, section.rows, updateSection]);

  const moveColumnTo = useCallback((fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    const newCols = [...section.cols];
    const [col] = newCols.splice(fromIdx, 1);
    newCols.splice(toIdx, 0, col);
    const newRows = section.rows.map(r => {
      const nr = [...r];
      const [val] = nr.splice(fromIdx, 1);
      nr.splice(toIdx, 0, val);
      return nr;
    });
    updateSection({ cols: newCols, rows: newRows });
  }, [section.cols, section.rows, updateSection]);

  const handleColDragStart = useCallback((e, ci) => {
    if (e.button !== 0) return;
    const startX = e.clientX;
    let dragging = false;
    let lastDropTarget = ci;
    let highlightEl = null;
    let dimmedCells = [];
    let ghost = null;
    const THRESHOLD = 5;

    const clearHighlight = () => {
      if (highlightEl) {
        highlightEl.style.boxShadow = '';
        highlightEl = null;
      }
    };

    const buildGhost = (clientX, clientY) => {
      const sourceTh = tableRef.current?.querySelector(`thead th[data-ci="${ci}"]`);
      if (!sourceTh) return;
      const colPos = sourceTh.cellIndex;
      const colWidth = sourceTh.getBoundingClientRect().width;

      // Collect cell text values for the ghost column
      const cells = [{ text: section.cols[ci], isHeader: true }];
      const bodyRows = tableRef.current?.querySelectorAll('tbody tr');
      bodyRows?.forEach(tr => {
        if (tr.cells.length > 1 && tr.cells[colPos]) {
          cells.push({ text: tr.cells[colPos]?.textContent || '', isHeader: false });
        }
      });

      // Build ghost element
      ghost = document.createElement('div');
      ghost.style.cssText = `position:fixed;z-index:99999;pointer-events:none;opacity:0.85;border:2px solid ${T.accent};background:${T.card};box-shadow:0 4px 16px rgba(0,0,0,0.5);font-family:'Space Grotesk',sans-serif;overflow:hidden;min-width:${colWidth}px;`;
      cells.forEach(({ text, isHeader }) => {
        const row = document.createElement('div');
        row.style.cssText = `padding:1px 4px;text-align:center;white-space:nowrap;border-bottom:1px solid ${T.borderSubtle};color:${isHeader ? T.textMuted : T.white};font-size:${isHeader ? '9px' : '16px'};font-weight:${isHeader ? '400' : '500'};text-transform:${isHeader ? 'uppercase' : 'none'};line-height:${isHeader ? '16px' : '20px'};letter-spacing:${isHeader ? '2px' : '0'};`;
        row.textContent = text;
        ghost.appendChild(row);
      });

      ghost.style.left = `${clientX + 8}px`;
      ghost.style.top = `${clientY - 10}px`;
      document.body.appendChild(ghost);
    };

    const dimSourceColumn = () => {
      const sourceTh = tableRef.current?.querySelector(`thead th[data-ci="${ci}"]`);
      if (!sourceTh) return;
      const colPos = sourceTh.cellIndex;
      sourceTh.style.opacity = '0.3';
      dimmedCells.push(sourceTh);
      const bodyRows = tableRef.current?.querySelectorAll('tbody tr');
      bodyRows?.forEach(tr => {
        if (tr.cells.length > 1 && tr.cells[colPos]) {
          tr.cells[colPos].style.opacity = '0.3';
          dimmedCells.push(tr.cells[colPos]);
        }
      });
    };

    const restoreSourceColumn = () => {
      dimmedCells.forEach(cell => { cell.style.opacity = ''; });
      dimmedCells = [];
    };

    const onMove = (moveEvent) => {
      if (!dragging && Math.abs(moveEvent.clientX - startX) > THRESHOLD) {
        dragging = true;
        document.activeElement?.blur();
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
        dimSourceColumn();
        buildGhost(moveEvent.clientX, moveEvent.clientY);
      }
      if (!dragging) return;

      if (ghost) {
        ghost.style.left = `${moveEvent.clientX + 8}px`;
        ghost.style.top = `${moveEvent.clientY - 10}px`;
      }

      const ths = tableRef.current?.querySelectorAll('thead th[data-ci]');
      if (!ths) return;
      let target = ci;
      for (const th of ths) {
        const rect = th.getBoundingClientRect();
        if (moveEvent.clientX >= rect.left && moveEvent.clientX < rect.right) {
          target = parseInt(th.dataset.ci, 10);
          break;
        }
      }
      if (target !== lastDropTarget) {
        clearHighlight();
        if (target !== ci) {
          for (const th of ths) {
            if (parseInt(th.dataset.ci, 10) === target) {
              th.style.boxShadow = `inset 0 0 0 1px ${T.accent}`;
              highlightEl = th;
              break;
            }
          }
        }
        lastDropTarget = target;
      }
    };

    const onUp = () => {
      clearHighlight();
      restoreSourceColumn();
      if (ghost) { ghost.remove(); ghost = null; }
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (dragging && lastDropTarget !== ci) {
        moveColumnTo(ci, lastDropTarget);
      }
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [moveColumnTo, section.cols]);

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
    updateSection({ rows: cards ? newRows : renumberRows(newRows), rowSpacing: newSpacing });
  }, [section.cols, section.rows, rowSpacing, updateSection, renumberRows, cards]);

  const deleteRow = useCallback((ri) => {
    const remaining = section.rows.filter((_, i) => i !== ri);
    const newSpacing = rowSpacing.filter((_, i) => i !== ri);
    updateSection({ rows: cards ? remaining : renumberRows(remaining), rowSpacing: newSpacing });
    setSelectedRows(prev => {
      const next = new Set();
      for (const idx of prev) {
        if (idx < ri) next.add(idx);
        else if (idx > ri) next.add(idx - 1);
      }
      return next;
    });
  }, [section.rows, rowSpacing, updateSection, renumberRows, cards]);

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
      let newSpacing;
      if ((moveEvent.ctrlKey || moveEvent.metaKey) && getSpacingAxisSnap) {
        // Ctrl: snap spacing so connected wires become straight
        const affected = [];
        for (let j = ri; j < section.rows.length; j++) {
          affected.push(`${nodeId}-${sectionId}-${j}`);
        }
        newSpacing = getSpacingAxisSnap(nodeId, affected, raw, dragStartSpacing.current);
      } else {
        newSpacing = Math.round(raw / SPACING_SNAP) * SPACING_SNAP;
      }

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
  }, [rowSpacing, section.rows.length, updateSection, getSpacingAxisSnap, nodeId, sectionId]);

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

  const handleUnhideCol = useCallback((ci) => {
    updateSection({ hiddenCols: hiddenCols.filter(h => h !== ci) });
    setContextMenu(null);
  }, [hiddenCols, updateSection]);

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

  // Count visible columns for spacer colspan
  const visibleColCount = nc - hiddenCols.length;
  // Total cell count: anchor(1) + visibleCols + x(1) + spacing(1)
  const totalColspan = visibleColCount + 3;

  const renderHeader = () => {
    const cells = [];
    const allSelected = selectedRows.size > 0 && selectedRows.size === section.rows.length;
    const renderHeaderCell = (ci) => {
      const sizer = colSizerValues ? colSizerValues[ci] : undefined;
      if (ci === 0) {
        return (
          <th key={`col-${ci}`} style={allSelected ? PORT_HEADER_SEL_STYLE : PORT_HEADER_STYLE} onClick={toggleSelectAll} onContextMenu={(e) => handleColContextMenu(e, ci)} onMouseDown={(e) => handleColDragStart(e, ci)} data-ci={ci}>
            <div className="n313-sz" data-v={sizer && sizer.length > (section.cols[ci] || '').length ? sizer : (section.cols[ci] || ' ')} data-h="">
              <input style={allSelected ? PORT_HDR_INPUT_SEL : PORT_HDR_INPUT_NORM} value={section.cols[ci]} readOnly />
            </div>
          </th>
        );
      }
      return <SzCell key={`col-${ci}`} value={section.cols[ci]} isHeader onChange={(v) => updateColName(ci, v)} onContextMenu={(e) => handleColContextMenu(e, ci)} sizerValue={sizer} onMouseDown={(e) => handleColDragStart(e, ci)} colIndex={ci} />;
    };
    if (mirrored) {
      cells.push(<ActionCell key="sp-h" isHeader icon={onFlip ? ACTION_ICON_FLIP : undefined} onClick={onFlip} title="Flip anchor side" cursor="ew-resize" signalColor={signalColorHex} />);
      cells.push(<ActionCell key="rowx-h" isHeader icon={ACTION_ICON_PLUS_RIGHT} onClick={addColumn} title="Add column" signalColor={T.green} />);
      for (let ci = nc - 1; ci >= 0; ci--) {
        if (hiddenCols.includes(ci)) continue;
        cells.push(renderHeaderCell(ci));
      }
      cells.push(<AnchorCell key="anchor-h" isHeader icon={ACTION_ICON_PLUS_DOWN} onClick={addRow} title="Add row" signalColor={T.green} />);
    } else {
      cells.push(<AnchorCell key="anchor-h" isHeader icon={ACTION_ICON_PLUS_DOWN} onClick={addRow} title="Add row" signalColor={T.green} />);
      for (let ci = 0; ci < nc; ci++) {
        if (hiddenCols.includes(ci)) continue;
        cells.push(renderHeaderCell(ci));
      }
      cells.push(<ActionCell key="rowx-h" isHeader icon={ACTION_ICON_PLUS_LEFT} onClick={addColumn} title="Add column" signalColor={T.green} />);
      cells.push(<ActionCell key="sp-h" isHeader icon={onFlip ? ACTION_ICON_FLIP : undefined} onClick={onFlip} title="Flip anchor side" cursor="ew-resize" signalColor={signalColorHex} />);
    }
    return <tr>{cells}</tr>;
  };

  const renderRow = (row, ri) => {
    const anchorId = `${nodeId}-${sectionId}-${ri}`;
    const spacing = rowSpacing[ri] || 0;
    const cells = [];
    const result = [];

    // Card mode calculations
    const inCardMode = cards && cardSize > 0;
    const cardIndex = inCardMode ? Math.floor(ri / cardSize) : -1;
    const isCardFirst = inCardMode && (ri % cardSize === 0);
    const isCardLast = inCardMode && (ri % cardSize === cardSize - 1 || ri === section.rows.length - 1);

    // Spacer row if this row has spacing > 0
    if (spacing > 0) {
      result.push(
        <tr key={`sp-${ri}`}>
          <td colSpan={totalColspan} style={{
            ...SPACER_TD_STYLE,
            height: `${spacing}px`,
            borderTop: signalColorHex ? `1px solid ${signalColorHex}44` : `1px solid ${T.border}`,
            borderBottom: '1px solid transparent',
          }} />
        </tr>
      );
    }

    // Card header row showing slot number
    if (inCardMode && isCardFirst) {
      const slotNum = cardStartSlot + cardIndex;
      result.push(
        <tr key={`card-hdr-${ri}`} className="n313-card-hdr">
          <td colSpan={totalColspan} style={{
            padding: '2px 8px', background: `${signalColorHex || T.accent}14`,
            borderTop: `2px solid ${signalColorHex || T.border}`,
            borderBottom: `1px solid ${signalColorHex || T.border}44`,
            fontSize: '9px', fontFamily: T.hFont, letterSpacing: '3px',
            textTransform: 'uppercase', color: signalColorHex || T.accent,
            height: '18px', boxSizing: 'border-box', lineHeight: 1,
          }}>
            SLOT {slotNum}
          </td>
        </tr>
      );
    }

    const renderDataCell = (ci) => {
      const sizer = colSizerValues ? colSizerValues[ci] : undefined;
      // Port column (col 0): use PortCell with selection toggle
      if (ci === 0) {
        return <PortCell key={`cell-${ci}`} value={row[ci]} isSelected={selectedRows.has(ri)} onToggle={() => toggleRowSelection(ri)} onChange={(v) => updateCell(ri, ci, v)} sizerValue={sizer} />;
      }
      const colUpper = (section.cols[ci] || '').toUpperCase().trim();
      const isSourceCol = (colUpper.includes('SOURCE') || colUpper.includes('SRC'));
      const isDestCol = (colUpper.includes('DESTINATION') || colUpper.includes('DEST'));
      const isResCol = (colUpper.includes('RESOLUTION') || colUpper.includes('RES'));
      const isRateCol = (colUpper.includes('RATE') || colUpper === 'FPS');
      const sourceKeys = isSourceCol && sourceNodeTags ? Object.keys(sourceNodeTags) : [];
      const destKeys = isDestCol && destinationNodeTags ? Object.keys(destinationNodeTags) : [];
      const presets = sourceKeys.length > 0 ? sourceKeys : destKeys.length > 0 ? destKeys : getPresetsForColumn(section.cols[ci]);

      // Auto-fill from connected signal data
      const anchorId = `${nodeId}-${sectionId}-${ri}`;
      const connected = connectedSourceMap?.[anchorId];
      let cellValue = row[ci];

      // Auto-fill from connected signal data
      if (connected && !cellValue) {
        if (isResCol && connected.resolution) cellValue = connected.resolution;
        if (isRateCol && connected.rate) cellValue = connected.rate;
      }
      if (presets) {
        let hlColor = null;
        if (isSourceCol) {
          if (connected && !cellValue) cellValue = connected.tag;
          hlColor = cellValue ? (sourceNodeTags[(cellValue || '').toUpperCase().trim()] || connected?.color || null) : null;
        }
        if (isDestCol) {
          const connectedDest = connectedDestinationMap?.[anchorId];
          hlColor = (cellValue ? destinationNodeTags[(cellValue || '').toUpperCase().trim()] : null)
            || connectedDest?.color || null;
        }
        return <DropdownCell key={`cell-${ci}`} value={cellValue} presets={presets} onChange={(v) => updateCell(ri, ci, v)} sizerValue={sizer} highlightColor={hlColor} />;
      }
      return <SzCell key={`cell-${ci}`} value={cellValue} onChange={(v) => updateCell(ri, ci, v)} sizerValue={sizer} />;
    };

    const deleteIcon = section.rows.length > 1 ? ACTION_ICON_X : null;
    const anchorType = sectionId === 'a' ? 'in' : sectionId === 'b' ? 'out' : 'both';

    const spacingCell = <ActionCell key="sp" icon={ACTION_ICON_SPACING} onMouseDown={(e) => handleSpacingMouseDown(e, ri)} signalColor={signalColorHex} cursor="ns-resize" title="Drag to space rows" />;

    if (mirrored) {
      cells.push(spacingCell);
      cells.push(<ActionCell key="rowx" icon={deleteIcon} onClick={deleteIcon ? () => deleteRow(ri) : undefined} signalColor={T.red} cursor={X_CURSOR} title="Delete row" />);
      for (let ci = nc - 1; ci >= 0; ci--) {
        if (hiddenCols.includes(ci)) continue;
        cells.push(renderDataCell(ci));
      }
      cells.push(<AnchorCell key="anchor" anchorId={anchorId} onAnchorClick={onAnchorClick} anchorType={anchorType} />);
    } else {
      cells.push(<AnchorCell key="anchor" anchorId={anchorId} onAnchorClick={onAnchorClick} anchorType={anchorType} />);
      for (let ci = 0; ci < nc; ci++) {
        if (hiddenCols.includes(ci)) continue;
        cells.push(renderDataCell(ci));
      }
      cells.push(<ActionCell key="rowx" icon={deleteIcon} onClick={deleteIcon ? () => deleteRow(ri) : undefined} signalColor={T.red} cursor={X_CURSOR} title="Delete row" />);
      cells.push(spacingCell);
    }
    const rowSelected = selectedRows.has(ri);

    // Card boundary classes and alternating tint
    const trClasses = [];
    if (isCardFirst) trClasses.push('n313-card-first');
    if (isCardLast) trClasses.push('n313-card-last');

    const trStyle = {};
    if (rowSelected) Object.assign(trStyle, ROW_SELECTED_BG);
    if (inCardMode && cardIndex % 2 === 1) trStyle.background = `${signalColorHex || T.accent}08`;

    result.push(
      <tr key={ri}
        className={trClasses.length > 0 ? trClasses.join(' ') : undefined}
        style={Object.keys(trStyle).length > 0 ? trStyle : undefined}
        data-card-idx={inCardMode ? cardIndex : undefined}
      >
        {cells}
      </tr>
    );
    return result;
  };

  const wrapperStyle = fullWidth ? STYLES.sectionFull : { borderBottom: `2px solid ${signalColorHex || T.border}` };

  // Tinted styles when signal color is set
  const tintedSectionTitle = useMemo(() => {
    const base = { ...STYLES.sectionTitle, position: 'relative', ...(mirrored ? { flexDirection: 'row-reverse' } : {}) };
    if (signalColorHex) {
      base.borderTop = `2px solid ${signalColorHex}`;
      base.borderBottom = `2px solid ${signalColorHex}`;
      if (isFirstRow) base.marginTop = '-1px';
      base.background = `linear-gradient(${mirrored ? '270deg' : '90deg'}, ${signalColorHex}30, ${signalColorHex}10 60%)`;
    }
    return base;
  }, [mirrored, signalColorHex, isFirstRow]);

  return (
    <div style={wrapperStyle}>
      {/* Section title bar */}
      <div className="n313-sec-title" style={tintedSectionTitle}>
        <div style={{ position: 'absolute', [mirrored ? 'left' : 'right']: ACTION_AREA_W, top: '25%', bottom: '25%', width: 0, borderLeft: `1px solid ${signalColorHex || T.accent}44`, pointerEvents: 'none' }} />
        <span style={STYLES.grip} onMouseDown={onGripDown}>⠿</span>
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
          <span className="n313-title-font" style={{ visibility: 'hidden', whiteSpace: 'pre', fontSize: '10px', fontFamily: T.hFont, letterSpacing: '4px', textTransform: 'uppercase', padding: '0 3px' }}>{section.title || 'SECTION'}</span>
          <input
            className="n313-title-font"
            style={{ ...STYLES.input, ...STYLES.sectionTitleInput, ...(mirrored ? { textAlign: 'right' } : {}), position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}
            value={section.title}
            onChange={(e) => updateTitle(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            {...BLUR_ON_ENTER}
          />
        </div>
        {collapsible && (<>
          {!(hiddenSystemFields || []).includes('ip') && (
          <div style={{ display: 'inline-flex', alignItems: 'center', minWidth: 0, border: `1px solid ${signalColorHex || T.borderStrong}`, background: `${signalColorHex || T.accent}08`, height: '18px' }}>
            <span style={{ fontSize: '8px', fontFamily: T.mono, color: signalColorHex || T.accentDim, letterSpacing: '1px', textTransform: 'uppercase', padding: '0 4px', borderRight: `1px solid ${signalColorHex || T.borderStrong}`, height: '100%', display: 'flex', alignItems: 'center', flexShrink: 0 }}>IP</span>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', minWidth: 0 }}>
              <span style={{ visibility: 'hidden', whiteSpace: 'pre', fontSize: '10px', fontFamily: T.mono, padding: '0 4px' }}>{section.ip || '0.0.0.0'}</span>
              <input
                style={{ ...STYLES.input, fontSize: '10px', fontFamily: T.mono, color: T.textSec, position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', padding: '0 4px' }}
                value={section.ip || ''}
                placeholder="0.0.0.0"
                onChange={(e) => updateSection({ ip: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                {...BLUR_ON_ENTER}
              />
            </div>
          </div>
          )}
          {!(hiddenSystemFields || []).includes('firmware') && (
          <div style={{ display: 'inline-flex', alignItems: 'center', minWidth: 0, border: `1px solid ${signalColorHex || T.borderStrong}`, background: `${signalColorHex || T.accent}08`, height: '18px' }}>
            <span style={{ fontSize: '8px', fontFamily: T.mono, color: signalColorHex || T.accentDim, letterSpacing: '1px', textTransform: 'uppercase', padding: '0 4px', borderRight: `1px solid ${signalColorHex || T.borderStrong}`, height: '100%', display: 'flex', alignItems: 'center', flexShrink: 0 }}>FW</span>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', minWidth: 0 }}>
              <span style={{ visibility: 'hidden', whiteSpace: 'pre', fontSize: '10px', fontFamily: T.mono, padding: '0 4px' }}>{section.firmware || '0.0.0'}</span>
              <input
                style={{ ...STYLES.input, fontSize: '10px', fontFamily: T.mono, color: T.textSec, position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', padding: '0 4px' }}
                value={section.firmware || ''}
                placeholder="0.0.0"
                onChange={(e) => updateSection({ firmware: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                {...BLUR_ON_ENTER}
              />
            </div>
          </div>
          )}
          {!(hiddenSystemFields || []).includes('software') && (
          <div style={{ display: 'inline-flex', alignItems: 'center', minWidth: 0, border: `1px solid ${signalColorHex || T.borderStrong}`, background: `${signalColorHex || T.accent}08`, height: '18px' }}>
            <span style={{ fontSize: '8px', fontFamily: T.mono, color: signalColorHex || T.accentDim, letterSpacing: '1px', textTransform: 'uppercase', padding: '0 4px', borderRight: `1px solid ${signalColorHex || T.borderStrong}`, height: '100%', display: 'flex', alignItems: 'center', flexShrink: 0 }}>SW</span>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', minWidth: 0 }}>
              <span style={{ visibility: 'hidden', whiteSpace: 'pre', fontSize: '10px', fontFamily: T.mono, padding: '0 4px' }}>{section.software || '0.0.0'}</span>
              <input
                style={{ ...STYLES.input, fontSize: '10px', fontFamily: T.mono, color: T.textSec, position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', padding: '0 4px' }}
                value={section.software || ''}
                placeholder="0.0.0"
                onChange={(e) => updateSection({ software: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                {...BLUR_ON_ENTER}
              />
            </div>
          </div>
          )}
        </>)}
        {/* Extending gradient line — tapers to pin near text */}
        <div style={{ flex: 1, minWidth: 0, height: '2px',
          [mirrored ? 'marginLeft' : 'marginRight']: ACTION_AREA_W + 4,
          background: mirrored
            ? `linear-gradient(270deg, ${signalColorHex || T.accent}, ${signalColorHex || T.accent}66 50%, transparent)`
            : `linear-gradient(90deg, ${signalColorHex || T.accent}, ${signalColorHex || T.accent}66 50%, transparent)`,
          clipPath: mirrored
            ? 'polygon(0% 0%, 0% 100%, 100% 50%)'
            : 'polygon(0% 50%, 100% 0%, 100% 100%)' }} />
        <div className="n313-sec-action" style={{ position: 'absolute', [mirrored ? 'left' : 'right']: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', width: ACTION_AREA_W }}>
          {collapsible && (
            <div
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); updateSection({ collapsed: !section.collapsed }); }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${signalColorHex || T.accent}18`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              <span className="n313-icon-btn" style={{ color: signalColorHex || T.accent, pointerEvents: 'none' }}>{section.collapsed ? ICON_CHEVRON_RIGHT : ICON_CHEVRON_DOWN}</span>
            </div>
          )}
          {onSpacingDown && (
            <div
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'ns-resize' }}
              onMouseDown={onSpacingDown}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${signalColorHex || T.accent}18`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              <span className="n313-icon-btn" style={{ color: signalColorHex || T.accent, pointerEvents: 'none' }}>{ACTION_ICON_SPACING}</span>
            </div>
          )}
        </div>
      </div>

      {!section.collapsed && <>
        {/* Scoped color for cells */}
        {(() => {
          const c = signalColorHex || T.accent;
          return (
            <style>{`
              [data-sec="${nodeId}-${sectionId}"] th:not(.n313-ac),
              [data-sec="${nodeId}-${sectionId}"] td:not(.n313-ac) { border-right: 1px solid ${c}66 !important; }
              [data-sec="${nodeId}-${sectionId}"] .n313-ac { border-right-color: transparent !important; border-left-color: transparent !important; }
              [data-sec="${nodeId}-${sectionId}"] .n313-ac:has(+ :not(.n313-ac)) { border-right: 1px solid ${c}44 !important; }
              [data-sec="${nodeId}-${sectionId}"] thead :not(.n313-ac):has(+ .n313-ac) { border-right: 1px solid ${c}66 !important; }
              ${fullWidth ? `[data-sec="${nodeId}-${sectionId}"] tbody tr:last-child td { border-bottom: none !important; }` : ''}
              ${signalColorHex ? `
              [data-sec="${nodeId}-${sectionId}"] th { border-bottom: 1px solid ${signalColorHex}44 !important; }
              [data-sec="${nodeId}-${sectionId}"] td { border-bottom-color: ${signalColorHex}66 !important; }
              ${fullWidth ? `[data-sec="${nodeId}-${sectionId}"] tbody tr:last-child td { border-bottom: none !important; }` : ''}
              [data-sec="${nodeId}-${sectionId}"] th:not(.n313-ac) { background: ${signalColorHex}0a !important; }
              ` : ''}
            `}</style>
          );
        })()}

        {/* Data table */}
        <table ref={tableRef} style={{ ...STYLES.table, width: '100%' }} data-sec={`${nodeId}-${sectionId}`}>
          <colgroup>
            {mirrored ? (
              <>
                <col style={{ width: 0 }} />
                <col style={{ width: 0 }} />
                {Array.from({ length: visibleColCount }, (_, i) => <col key={i} style={i === visibleColCount - 1 ? { width: '100%' } : undefined} />)}
                <col style={{ width: 0 }} />
              </>
            ) : (
              <>
                <col style={{ width: 0 }} />
                {Array.from({ length: visibleColCount }, (_, i) => <col key={i} style={i === visibleColCount - 1 ? { width: '100%' } : undefined} />)}
                <col style={{ width: 0 }} />
                <col style={{ width: 0 }} />
              </>
            )}
          </colgroup>
          <thead>{renderHeader()}</thead>
          <tbody>{section.rows.flatMap((row, ri) => renderRow(row, ri))}</tbody>
        </table>
      </>}

      {/* Column context menu (portaled to body to escape transform) */}
      {contextMenu && createPortal(
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 10000,
            background: T.card,
            border: `1px solid ${T.borderStrong}`,
            padding: '2px 0',
            minWidth: 140,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {contextMenu.colIndex > 0 && (
            <div style={STYLES.contextMenuItem} onMouseEnter={(e) => { e.currentTarget.style.background = `${signalColorHex || T.accent}18`; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }} onMouseDown={(e) => { e.stopPropagation(); moveColumn(contextMenu.colIndex, -1); setContextMenu(null); }}>
              Move Left
            </div>
          )}
          {contextMenu.colIndex < nc - 1 && (
            <div style={STYLES.contextMenuItem} onMouseEnter={(e) => { e.currentTarget.style.background = `${signalColorHex || T.accent}18`; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }} onMouseDown={(e) => { e.stopPropagation(); moveColumn(contextMenu.colIndex, 1); setContextMenu(null); }}>
              Move Right
            </div>
          )}
          {canDel && (
            <div style={STYLES.contextMenuItem} onMouseEnter={(e) => { e.currentTarget.style.background = `${signalColorHex || T.accent}18`; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }} onMouseDown={(e) => { e.stopPropagation(); handleDeleteFromMenu(); }}>
              Delete Column
            </div>
          )}
          <div style={STYLES.contextMenuItem} onMouseEnter={(e) => { e.currentTarget.style.background = `${signalColorHex || T.accent}18`; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }} onMouseDown={(e) => { e.stopPropagation(); handleHideFromMenu(); }}>
            Hide Column
          </div>
          {hiddenCols.length > 0 && (
            <>
              <div style={{ height: 1, background: T.border, margin: '2px 0' }} />
              <div style={{ padding: '2px 10px', fontSize: '9px', color: T.muted, letterSpacing: '1px', textTransform: 'uppercase' }}>
                Hidden
              </div>
              {hiddenCols.map(ci => (
                <div key={`unhide-${ci}`} style={STYLES.contextMenuItem} onMouseEnter={(e) => { e.currentTarget.style.background = `${signalColorHex || T.accent}18`; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }} onMouseDown={(e) => { e.stopPropagation(); handleUnhideCol(ci); }}>
                  Show "{section.cols[ci]}"
                </div>
              ))}
              {hiddenCols.length > 1 && (
                <div style={STYLES.contextMenuItem} onMouseEnter={(e) => { e.currentTarget.style.background = `${signalColorHex || T.accent}18`; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }} onMouseDown={(e) => { e.stopPropagation(); handleUnhideAll(); }}>
                  Show All ({hiddenCols.length})
                </div>
              )}
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
  onSelect, selectedNodes, onMoveSelectedNodes, onScaleSelectedNodes,
  onAnchorClick, onSavePreset, sourceNodeTags, destinationNodeTags, connectedSourceMap, connectedDestinationMap,
  getWireAxisSnap, getSpacingAxisSnap,
}) {
  const nodeRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragSec, setDragSec] = useState(null);
  const [isScaling, setIsScaling] = useState(false);
  const scaleStartRef = useRef(null);
  const lastPositionRef = useRef(null);
  const hasDraggedRef = useRef(false);
  const wasSelectedOnDownRef = useRef(false);

  // Settings dropdown state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState({});
  const toggleMenu = useCallback((key) => setOpenMenus(prev => ({ ...prev, [key]: !prev[key] })), []);
  const settingsBtnRef = useRef(null);

  // Signal color
  const signalColorHex = useMemo(() => {
    if (!node.signalColor) return null;
    const c = SIGNAL_COLORS_BY_ID.get(node.signalColor);
    return c ? c.hex : null;
  }, [node.signalColor]);

  // Hidden sections
  const hiddenSections = node.hiddenSections || [];
  const hiddenTitleFields = node.hiddenTitleFields || [];

  // Mirrored (flipped) sections
  const mirroredSections = node.mirroredSections || [];

  // Toggle section visibility
  const toggleSectionVisibility = useCallback((sectionId) => {
    const current = node.hiddenSections || [];
    const isHidden = current.includes(sectionId);
    const next = isHidden ? current.filter(s => s !== sectionId) : [...current, sectionId];
    onUpdate({ hiddenSections: next });
  }, [node.hiddenSections, onUpdate]);

  const toggleTitleField = useCallback((field) => {
    const current = node.hiddenTitleFields || [];
    const next = current.includes(field) ? current.filter(f => f !== field) : [...current, field];
    onUpdate({ hiddenTitleFields: next });
  }, [node.hiddenTitleFields, onUpdate]);

  const hiddenSystemFields = node.hiddenSystemFields || [];
  const toggleSystemField = useCallback((field) => {
    const current = node.hiddenSystemFields || [];
    const next = current.includes(field) ? current.filter(f => f !== field) : [...current, field];
    onUpdate({ hiddenSystemFields: next });
  }, [node.hiddenSystemFields, onUpdate]);

  // Toggle section anchor side (flip)
  const toggleSectionMirrored = useCallback((sectionId) => {
    const current = node.mirroredSections || [];
    const isMirrored = current.includes(sectionId);
    const next = isMirrored ? current.filter(s => s !== sectionId) : [...current, sectionId];
    onUpdate({ mirroredSections: next });
  }, [node.mirroredSections, onUpdate]);

  // Dismiss settings on outside click
  useEffect(() => {
    if (!settingsOpen) return;
    const dismiss = (e) => {
      if (settingsBtnRef.current && settingsBtnRef.current.contains(e.target)) return;
      setSettingsOpen(false);
    };
    window.addEventListener('mousedown', dismiss);
    return () => window.removeEventListener('mousedown', dismiss);
  }, [settingsOpen]);

  const layoutKey = node.layout || 'ab_c';
  const layout = LAYOUTS[layoutKey] || LAYOUTS['ab_c'];
  // L-shaped border: when columns (a+b) are the last row, each column gets its own border
  const sideBySideIsLastRow = layout[layout.length - 1].length === 2;
  const nodeBorderStyle = `2px solid ${signalColorHex || T.border}`;

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

  // ---- Section vertical spacing drag (like row spacing) ----
  const handleSectionSpacingDown = useCallback((e, sectionId) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startSpacing = (node.sectionSpacing?.[sectionId]) || 0;
    let rafId = null;
    let pending = null;

    const onMove = (moveEvent) => {
      const delta = moveEvent.clientY - startY;
      const raw = Math.max(0, startSpacing + delta);
      if ((moveEvent.ctrlKey || moveEvent.metaKey) && getSpacingAxisSnap) {
        // Ctrl: snap spacing so connected wires become straight
        const affected = [];
        const sec = node.sections[sectionId];
        if (sec) sec.rows.forEach((_, ri) => affected.push(`${node.id}-${sectionId}-${ri}`));
        pending = getSpacingAxisSnap(node.id, affected, raw, startSpacing);
      } else {
        pending = Math.round(raw / SPACING_SNAP) * SPACING_SNAP;
      }
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          if (pending !== null) {
            onUpdate({ sectionSpacing: { ...node.sectionSpacing, [sectionId]: pending } });
          }
          rafId = null;
        });
      }
    };
    const onUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [node.sectionSpacing, node.sections, node.id, onUpdate, getSpacingAxisSnap]);

  // ---- Node dragging ----
  const handleTitleMouseDown = useCallback((e) => {
    e.stopPropagation();

    const modifier = e.shiftKey || e.ctrlKey || e.metaKey;
    const alreadySelected = selectedNodes && selectedNodes.has(node.id);
    wasSelectedOnDownRef.current = alreadySelected;
    hasDraggedRef.current = false;

    if (onSelect) {
      if (modifier) {
        // Shift/Ctrl: toggle in selection immediately
        onSelect(node.id, true);
      } else if (!alreadySelected) {
        // Clicking unselected node: select only this one
        onSelect(node.id, false);
      }
      // If already selected without modifier: don't change selection (allow group drag)
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
  }, [node.id, node.position.x, node.position.y, zoom, onSelect, selectedNodes]);

  useEffect(() => {
    if (!isDragging || !dragStart) return;

    let rafId = null;
    let pendingPosition = null;
    let pendingDelta = null;

    const handleMouseMove = (e) => {
      hasDraggedRef.current = true;
      const canvas = nodeRef.current?.closest('[data-canvas]');
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();
      let newX = (e.clientX - canvasRect.left - dragStart.offsetX) / zoom;
      let newY = (e.clientY - canvasRect.top - dragStart.offsetY) / zoom;

      if ((e.ctrlKey || e.metaKey) && getWireAxisSnap) {
        // Ctrl/Cmd: snap node so connected wires become perfectly straight
        const snapped = getWireAxisSnap(node.id, newX, newY);
        newX = snapped.x;
        newY = snapped.y;
      } else if (snapToGrid && gridSize > 0) {
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
      }

      const deltaX = newX - (lastPositionRef.current?.x || node.position.x);
      const deltaY = newY - (lastPositionRef.current?.y || node.position.y);

      // Move DOM immediately — zero-latency visual (React state follows via RAF)
      if (nodeRef.current) {
        nodeRef.current.style.left = `${newX}px`;
        nodeRef.current.style.top = `${newY}px`;
      }

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
      // Deferred deselect: clicked an already-selected node without dragging → narrow selection
      if (!hasDraggedRef.current && wasSelectedOnDownRef.current && onSelect) {
        onSelect(node.id, false);
      }
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
  }, [isDragging, dragStart, zoom, onUpdate, snapToGrid, gridSize, selectedNodes, onMoveSelectedNodes, node.id, node.position.x, node.position.y, getWireAxisSnap]);

  // ---- Scale by dragging bottom-right handle ----
  // Scale via Pointer Events — uses setPointerCapture for reliable Ctrl+drag
  const scaleHandleRef = useRef(null);

  const STEP_PX = 10;
  const SCALE_STEP = 0.02;

  const onScalePointerDown = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    const nodeEl = nodeRef.current;
    const handle = scaleHandleRef.current;
    if (!nodeEl || !handle) return;
    handle.setPointerCapture(e.pointerId);
    // Collect other selected nodes' DOM elements and starting scales for live preview
    const peers = [];
    if (selectedNodes && selectedNodes.size > 1) {
      selectedNodes.forEach(id => {
        if (id === node.id) return;
        const el = document.querySelector(`[data-node-id="${id}"]`);
        if (el) peers.push({ el, startScale: parseFloat(el.dataset.nodeScale) || 1 });
      });
    }
    scaleStartRef.current = {
      startX: e.clientX,
      startScale: node.scale || 1,
      nodeWidth: nodeEl.getBoundingClientRect().width,
      pointerId: e.pointerId,
      peers,
    };
    setIsScaling(true);
  }, [node.scale, node.id, selectedNodes]);

  const onScalePointerMove = useCallback((e) => {
    const s = scaleStartRef.current;
    const nodeEl = nodeRef.current;
    if (!s || !nodeEl || !isScaling) return;
    const dx = e.clientX - s.startX;
    const newScale = Math.max(0.05, Math.min(4, s.startScale * Math.pow(2, dx / 300)));
    s.currentScale = newScale;
    nodeEl.style.transform = `scale(${newScale})`;
    // Live-preview scale on all other selected nodes
    const ratio = newScale / s.startScale;
    if (s.peers) {
      s.peers.forEach(p => {
        const peerScale = Math.max(0.05, Math.min(4, p.startScale * ratio));
        p.el.style.transform = `scale(${peerScale})`;
      });
    }
  }, [isScaling]);

  const onScalePointerUp = useCallback((e) => {
    e.stopPropagation();
    const handle = scaleHandleRef.current;
    if (handle) {
      try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    const s = scaleStartRef.current;
    if (s && s.currentScale != null) {
      // Reset DOM transforms so React takes over cleanly
      const nodeEl = nodeRef.current;
      if (nodeEl) nodeEl.style.transform = '';
      if (s.peers) s.peers.forEach(p => { p.el.style.transform = ''; });
      onUpdate({ scale: s.currentScale });
      // Commit scale to all other selected nodes
      if (selectedNodes && selectedNodes.size > 1 && onScaleSelectedNodes) {
        const scaleRatio = s.currentScale / s.startScale;
        onScaleSelectedNodes(scaleRatio, node.id);
      }
    }
    setIsScaling(false);
    scaleStartRef.current = null;
  }, [onUpdate, selectedNodes, onScaleSelectedNodes, node.id]);

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
            type: secId === 'a' ? 'in' : secId === 'b' ? 'out' : 'both',
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
  }, [node.id, node.sections, node.scale, node.layout, node.hiddenSections, node.mirroredSections, node.sectionSpacing, zoom, registerAnchor, unregisterAnchors]);

  // ---- Click to select ----
  const handleNodeClick = useCallback((e) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(node.id, e.shiftKey || e.ctrlKey || e.metaKey);
    }
  }, [node.id, onSelect]);

  // ---- Sync column widths: A+B sync together, C sizes independently ----
  const colSizerValues = useMemo(() => {
    return { a: null, b: null, c: null };
  }, [node.sections]);

  // ---- Render sections ----
  const renderSection = useCallback((sectionId, fullWidth, layoutMirrored, isFirstRow) => {
    if (hiddenSections.includes(sectionId)) return null;
    const sec = node.sections[sectionId];
    if (!sec) return null;

    // In stacked (fullWidth) view, allow per-section flip override
    const flipped = mirroredSections.includes(sectionId);
    const mirrored = fullWidth ? flipped : layoutMirrored;

    // A+B share column widths, C sizes on its own
    const sizers = colSizerValues[sectionId];

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
        onSpacingDown={(e) => handleSectionSpacingDown(e, sectionId)}
        onAnchorClick={onAnchorClick}
        collapsible={sectionId === 'c'}
        isFirstRow={isFirstRow}
        hiddenSystemFields={hiddenSystemFields}
        sourceNodeTags={sourceNodeTags}
        destinationNodeTags={destinationNodeTags}
        connectedSourceMap={connectedSourceMap}
        connectedDestinationMap={connectedDestinationMap}
        getSpacingAxisSnap={getSpacingAxisSnap}
      />
    );
  }, [node.sections, node.id, handleSectionUpdate, hiddenSections, mirroredSections, signalColorHex, toggleSectionMirrored, colSizerValues, handleSectionGripDown, handleSectionSpacingDown, onAnchorClick, sourceNodeTags, destinationNodeTags, connectedSourceMap, connectedDestinationMap, getSpacingAxisSnap]);

  // ---- Render layout with overlay drop zones (no shifting) ----
  const DZ_THICKNESS = 48; // px thickness for LEFT/RIGHT edge drop zones
  const DZ_THIN = 24; // px thickness for ABOVE/BELOW/TOP/BOTTOM zones

  const renderLayout = () => {
    const currentPos = dragSec ? getPosition(layoutKey, dragSec) : null;
    const cZones = dragSec === 'c' ? ['top', 'bottom'].filter(p => p !== currentPos) : [];
    const abZones = (dragSec === 'a' || dragSec === 'b') ? ['left', 'right', 'above', 'below'].filter(p => p !== currentPos) : [];

    const otherAB = dragSec === 'a' ? 'b' : dragSec === 'b' ? 'a' : null;
    const otherRowIndex = otherAB ? layout.findIndex(r => r.includes(otherAB)) : -1;

    const elements = [];

    layout.forEach((row, rowIndex) => {
      // Overlap with element above: first row (node title) or previous row's sections all collapsed
      const overlapTop = rowIndex === 0 || (rowIndex > 0 && layout[rowIndex - 1].every(secId => node.sections[secId]?.collapsed));

      if (row.length === 2) {
        // Side-by-side row
        const sp0 = node.sectionSpacing?.[row[0]] || 0;
        const sp1 = node.sectionSpacing?.[row[1]] || 0;
        const isLastRow = rowIndex === layout.length - 1;
        // L-shaped border: left col gets left+right(divider)+bottom, right col gets right+bottom
        const leftWrapStyle = sideBySideIsLastRow ? {
          ...STYLES.sectionWrap,
          borderLeft: nodeBorderStyle,
          borderRight: nodeBorderStyle,
          ...(isLastRow ? { borderBottom: nodeBorderStyle, borderBottomLeftRadius: '4px' } : {}),
          background: T.card,
        } : STYLES.sectionWrap;
        const rightWrapStyle = sideBySideIsLastRow ? {
          ...STYLES.sectionWrap,
          borderRight: nodeBorderStyle,
          ...(isLastRow ? { borderBottom: nodeBorderStyle, borderBottomRightRadius: '4px' } : {}),
          background: T.card,
        } : STYLES.sectionWrap;
        elements.push(
          <div key={rowIndex} style={{ ...STYLES.abRow, position: 'relative' }}>
            <div style={leftWrapStyle}>
              {sp0 > 0 && <div style={{ height: `${sp0}px`, borderTop: signalColorHex ? `1px solid ${signalColorHex}44` : `1px solid ${T.border}`, borderBottom: '1px solid transparent' }} />}
              <div style={dragSec === row[0] ? STYLES.dragHighlight : undefined}>
                {renderSection(row[0], false, false, overlapTop)}
              </div>
            </div>
            {!sideBySideIsLastRow && <div style={{ width: '2px', flexShrink: 0, background: signalColorHex || T.colDivider, pointerEvents: 'none' }} />}
            <div style={rightWrapStyle}>
              {sp1 > 0 && <div style={{ height: `${sp1}px`, borderTop: signalColorHex ? `1px solid ${signalColorHex}44` : `1px solid ${T.border}`, borderBottom: '1px solid transparent' }} />}
              <div style={dragSec === row[1] ? STYLES.dragHighlight : undefined}>
                {renderSection(row[1], false, true, overlapTop)}
              </div>
            </div>
            {/* Overlay drop zones */}
            {abZones.includes('left') && (
              <DropZone key="dz-left" label="LEFT" onDrop={() => handleDrop('left')} signalColor={signalColorHex}
                placement={{ left: 0, top: 0, bottom: 0, width: `${DZ_THICKNESS}px` }} />
            )}
            {abZones.includes('right') && (
              <DropZone key="dz-right" label="RIGHT" onDrop={() => handleDrop('right')} signalColor={signalColorHex}
                placement={{ right: 0, top: 0, bottom: 0, width: `${DZ_THICKNESS}px` }} />
            )}
            {abZones.includes('above') && (() => {
              const destLeft = dragSec !== row[0];
              const hasL = abZones.includes('left'), hasR = abZones.includes('right');
              return <DropZone key="dz-above" label="ABOVE" onDrop={() => handleDrop('above')} signalColor={signalColorHex}
                placement={{ left: destLeft ? (hasL ? DZ_THICKNESS : 0) : '50%', right: destLeft ? '50%' : (hasR ? DZ_THICKNESS : 0), top: 0, height: `${DZ_THIN}px` }} />;
            })()}
            {abZones.includes('below') && (() => {
              const destLeft = dragSec !== row[0];
              const hasL = abZones.includes('left'), hasR = abZones.includes('right');
              return <DropZone key="dz-below" label="BELOW" onDrop={() => handleDrop('below')} signalColor={signalColorHex}
                placement={{ left: destLeft ? (hasL ? DZ_THICKNESS : 0) : '50%', right: destLeft ? '50%' : (hasR ? DZ_THICKNESS : 0), bottom: 0, height: `${DZ_THIN}px` }} />;
            })()}
            {rowIndex === 0 && cZones.includes('top') && (
              <DropZone key="dz-top" label="TOP" onDrop={() => handleDrop('top')} signalColor={signalColorHex}
                placement={{ left: 0, right: 0, top: 0, height: `${DZ_THIN}px` }} />
            )}
            {rowIndex === layout.length - 1 && cZones.includes('bottom') && (
              <DropZone key="dz-bottom" label="BOTTOM" onDrop={() => handleDrop('bottom')} signalColor={signalColorHex}
                placement={{ left: 0, right: 0, bottom: 0, height: `${DZ_THIN}px` }} />
            )}
          </div>
        );
      } else {
        // Single-section row
        const secSpacing = node.sectionSpacing?.[row[0]] || 0;
        if (secSpacing > 0) {
          elements.push(<div key={`sec-sp-${rowIndex}`} style={{
            height: `${secSpacing}px`,
            borderTop: signalColorHex ? `1px solid ${signalColorHex}44` : `1px solid ${T.border}`,
            borderBottom: '1px solid transparent',
          }} />);
        }
        const isLastRow = rowIndex === layout.length - 1;
        elements.push(
          <div
            key={rowIndex}
            style={{
              position: 'relative',
              ...(sideBySideIsLastRow ? {
                borderLeft: nodeBorderStyle,
                borderRight: nodeBorderStyle,
                ...(isLastRow ? { borderBottom: nodeBorderStyle, borderBottomLeftRadius: '4px', borderBottomRightRadius: '4px' } : {}),
                background: T.card,
              } : {}),
            }}
          >
            <div style={dragSec === row[0] ? STYLES.dragHighlight : undefined}>
              {renderSection(row[0], true, false, overlapTop)}
            </div>
            {/* Overlay drop zones for the OTHER section's row */}
            {rowIndex === otherRowIndex && abZones.includes('left') && (
              <DropZone key="dz-left" label="LEFT" onDrop={() => handleDrop('left')} signalColor={signalColorHex}
                placement={{ left: 0, top: 0, bottom: 0, width: `${DZ_THICKNESS}px` }} />
            )}
            {rowIndex === otherRowIndex && abZones.includes('right') && (
              <DropZone key="dz-right" label="RIGHT" onDrop={() => handleDrop('right')} signalColor={signalColorHex}
                placement={{ right: 0, top: 0, bottom: 0, width: `${DZ_THICKNESS}px` }} />
            )}
            {rowIndex === otherRowIndex && abZones.includes('above') && (() => {
              const hasL = abZones.includes('left'), hasR = abZones.includes('right');
              return <DropZone key="dz-above" label="ABOVE" onDrop={() => handleDrop('above')} signalColor={signalColorHex}
                placement={{ left: hasL ? DZ_THICKNESS : 0, right: hasR ? DZ_THICKNESS : 0, top: 0, height: `${DZ_THIN}px` }} />;
            })()}
            {rowIndex === otherRowIndex && abZones.includes('below') && (() => {
              const hasL = abZones.includes('left'), hasR = abZones.includes('right');
              return <DropZone key="dz-below" label="BELOW" onDrop={() => handleDrop('below')} signalColor={signalColorHex}
                placement={{ left: hasL ? DZ_THICKNESS : 0, right: hasR ? DZ_THICKNESS : 0, bottom: 0, height: `${DZ_THIN}px` }} />;
            })()}
            {/* C zones on first/last rows */}
            {rowIndex === 0 && cZones.includes('top') && (
              <DropZone key="dz-top" label="TOP" onDrop={() => handleDrop('top')} signalColor={signalColorHex}
                placement={{ left: 0, right: 0, top: 0, height: `${DZ_THIN}px` }} />
            )}
            {rowIndex === layout.length - 1 && cZones.includes('bottom') && (
              <DropZone key="dz-bottom" label="BOTTOM" onDrop={() => handleDrop('bottom')} signalColor={signalColorHex}
                placement={{ left: 0, right: 0, bottom: 0, height: `${DZ_THIN}px` }} />
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
      outline: isSelected ? `2px solid ${signalColorHex || T.accent}` : 'none',
      outlineOffset: '1px',
      zIndex: settingsOpen ? 10000 : isDragging ? 1000 : 1,
    };
    if (signalColorHex) {
      base.borderColor = signalColorHex;
    }
    if (sideBySideIsLastRow) {
      base.border = 'none';
      base.background = 'transparent';
    }
    return base;
  }, [node.position.x, node.position.y, totalScale, isSelected, isDragging, settingsOpen, signalColorHex, sideBySideIsLastRow]);

  // Header resize
  const headerHeight = node.headerHeight || 36;
  const minHeaderHeight = 28;
  const maxHeaderHeight = 120;
  const headerScale = headerHeight / 36;
  const nameHeaderFontSize = Math.round(16 * headerScale);
  const mfgHeaderFontSize = Math.round(10 * headerScale);

  const handleHeaderResizeStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startHeight = headerHeight;
    const handleMouseMove = (me) => {
      const newH = Math.max(minHeaderHeight, Math.min(maxHeaderHeight, startHeight + me.clientY - startY));
      onUpdate({ headerHeight: newH });
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [headerHeight, onUpdate]);

  // Tinted title bar
  const titleBarStyle = useMemo(() => {
    const base = { ...STYLES.nodeTitle, position: 'relative', height: headerHeight, minHeight: headerHeight };
    if (signalColorHex) {
      base.borderBottom = `2px solid ${signalColorHex}`;
      base.backgroundColor = T.card;
      base.backgroundImage = `linear-gradient(180deg, ${signalColorHex}55, ${signalColorHex}33)`;
    }
    if (sideBySideIsLastRow) {
      base.borderTop = nodeBorderStyle;
      base.borderLeft = nodeBorderStyle;
      base.borderRight = nodeBorderStyle;
      if (!signalColorHex) base.background = T.card;
    }
    return base;
  }, [signalColorHex, sideBySideIsLastRow, nodeBorderStyle, headerHeight]);

  return (
    <div
      ref={nodeRef}
      style={nodeStyle}
      onClick={handleNodeClick}
      data-node-id={node.id}
      data-node-scale={node.scale || 1}
    >
      {/* Top accent line — tapers to pin on name (left) side; hidden in side-by-side mode where title bar borderTop provides the top edge */}
      {!sideBySideIsLastRow && <div style={{ height: '2px', background: signalColorHex || T.accent, opacity: 0.5, clipPath: 'polygon(0% 100%, 100% 0%, 100% 100%)' }} />}

      {/* Title bar — single row: Name | TAG | Manufacturer · Model | buttons */}
      <div className="n313-title-bar" style={titleBarStyle} onMouseDown={handleTitleMouseDown}>
          {/* Group indicator */}
          {node.group && (
            <span style={{ fontSize: '10px', color: signalColorHex || T.accent, opacity: 0.6, marginRight: '2px', pointerEvents: 'none' }} title="Grouped">&#x1F517;</span>
          )}
          {/* Name */}
          {!hiddenTitleFields.includes('name') && (
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', minWidth: '40px', height: `${Math.round(22 * headerScale)}px` }}>
            {!node.title && <span className="n313-title-font-light" style={{ fontSize: nameHeaderFontSize, letterSpacing: '2px', color: T.textMuted, pointerEvents: 'none', whiteSpace: 'pre', padding: '0 3px' }}>NAME</span>}
            {node.title && <span className="n313-title-font-light" style={{ visibility: 'hidden', whiteSpace: 'pre', fontSize: nameHeaderFontSize, letterSpacing: '2px', padding: '0 3px' }}>{node.title}</span>}
            <input
              className="n313-title-font-light"
              style={{ ...STYLES.input, ...STYLES.titleInput, fontSize: nameHeaderFontSize, position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}
              value={node.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              {...BLUR_ON_ENTER}
            />
          </div>
          )}
          {/* Tag pill */}
          {!hiddenTitleFields.includes('tag') && (
          <div style={{ position: 'relative', display: 'inline-block', minWidth: '24px', height: '20px', ...STYLES.tagInput, ...(signalColorHex ? { border: `1px solid ${signalColorHex}`, background: `${signalColorHex}15` } : {}) }}>
            <span style={{ visibility: 'hidden', whiteSpace: 'pre', fontSize: '10px', letterSpacing: '1px', padding: '0 3px', textTransform: 'uppercase' }}>{node.tag || 'Tag'}</span>
            <input
              className="n313-tag-input"
              style={{ ...STYLES.input, color: signalColorHex || T.accent, fontFamily: T.mono, letterSpacing: '1px', fontSize: '10px', textAlign: 'center', textTransform: 'uppercase', position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}
              value={node.tag || ''}
              onChange={(e) => onUpdate({ tag: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              placeholder="Tag"
              {...BLUR_ON_ENTER}
            />
          </div>
          )}
          {/* Manufacturer / Model stacked */}
          {(() => {
            const mfgKey = (node.manufacturer || '').toUpperCase().trim();
            const logoFn = Object.keys(MANUFACTURER_LOGOS).find(k => mfgKey.includes(k));
            const Logo = logoFn ? MANUFACTURER_LOGOS[logoFn] : null;
            return (!hiddenTitleFields.includes('manufacturer') || !hiddenTitleFields.includes('model')) && (
            <div style={STYLES.mfgModel}>
              {!hiddenTitleFields.includes('manufacturer') && (
                Logo ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', padding: '0 3px' }}>
                    {Logo(16)}
                  </div>
                ) : (
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', height: `${Math.round(12 * headerScale)}px` }}>
                  {!node.manufacturer && <span style={{ fontSize: mfgHeaderFontSize, letterSpacing: '1px', textTransform: 'uppercase', color: T.textMuted, pointerEvents: 'none', whiteSpace: 'pre', padding: '0 3px' }}>MANUFACTURER</span>}
                  {node.manufacturer && <span style={{ visibility: 'hidden', whiteSpace: 'pre', fontSize: mfgHeaderFontSize, letterSpacing: '1px', textTransform: 'uppercase', padding: '0 3px' }}>{node.manufacturer}</span>}
                  <input
                    style={{ ...STYLES.input, fontSize: mfgHeaderFontSize, color: T.textSec, letterSpacing: '1px', textTransform: 'uppercase', lineHeight: `${Math.round(12 * headerScale)}px`, position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}
                    value={node.manufacturer || ''}
                    maxLength={25}
                    onChange={(e) => onUpdate({ manufacturer: e.target.value.slice(0, 25) })}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    {...BLUR_ON_ENTER}
                  />
                </div>
                )
              )}
              {!hiddenTitleFields.includes('model') && (
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', height: `${Math.round(12 * headerScale)}px` }}>
                {!node.model && <span style={{ fontSize: mfgHeaderFontSize, letterSpacing: '1px', textTransform: 'uppercase', color: T.textMuted, pointerEvents: 'none', whiteSpace: 'pre', padding: '0 3px' }}>MODEL</span>}
                {node.model && <span style={{ visibility: 'hidden', whiteSpace: 'pre', fontSize: mfgHeaderFontSize, letterSpacing: '1px', textTransform: 'uppercase', padding: '0 3px' }}>{node.model}</span>}
                <input
                  style={{ ...STYLES.input, fontSize: mfgHeaderFontSize, color: T.accentDim, letterSpacing: '1px', textTransform: 'uppercase', lineHeight: `${Math.round(12 * headerScale)}px`, position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}
                  value={node.model || ''}
                  maxLength={25}
                  onChange={(e) => onUpdate({ model: e.target.value.slice(0, 25) })}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  {...BLUR_ON_ENTER}
                />
              </div>
              )}
            </div>
            );
          })()}
          {/* Header resize handle */}
          <div
            onMouseDown={handleHeaderResizeStart}
            style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, cursor: 'ns-resize', zIndex: 20 }}
            title="Drag to resize header"
          />
          {/* Vertical divider aligned with table header divider */}
          <div style={{ position: 'absolute', right: ACTION_AREA_W, top: 6, bottom: 6, width: 1, background: `${signalColorHex || T.accent}44`, pointerEvents: 'none' }} />
          {/* Settings button */}
          <div
            ref={settingsBtnRef}
            className="n313-title-action"
            style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: ACTION_AREA_W, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: settingsOpen ? T.accentLight : (signalColorHex || T.accent) }}
            title="Settings"
            onClick={(e) => {
              e.stopPropagation();
              setSettingsOpen(prev => !prev);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${signalColorHex || T.accent}18`; e.currentTarget.style.color = signalColorHex || T.accent; e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = signalColorHex || T.accent; e.currentTarget.style.opacity = ''; }}
          >
            <span className="n313-icon-btn">{SETTINGS_ICON}</span>
          </div>
      </div>

        {/* Color picker grid (portaled) */}
        {/* Settings dropdown (portaled) */}
        {settingsOpen && createPortal(
          (() => {
            const btnRect = settingsBtnRef.current?.getBoundingClientRect();
            if (!btnRect) return null;
            return (
              <div
                className="n313-settings-dropdown"
                ref={(el) => { if (el) { const rect = el.getBoundingClientRect(); if (rect.bottom > window.innerHeight - 10) el.style.top = `${window.innerHeight - rect.height - 10}px`; } }}
                style={{ ...STYLES.settingsDropdown, left: btnRect.right - 160, top: btnRect.top }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* Device Type */}
                <div style={STYLES.settingsLabel} onMouseDown={(e) => { e.stopPropagation(); toggleMenu('deviceType'); }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = `${signalColorHex || T.accent}10`; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}>
                  <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="n313-icon-btn" style={{ color: signalColorHex || T.accent }}>{openMenus.deviceType ? ICON_CHEVRON_DOWN : ICON_CHEVRON_RIGHT}</span>
                    Device Type
                  </span>
                </div>
                {openMenus.deviceType && ['Router', 'Switcher', 'Source', 'Destination', 'Converter'].map((dt) => {
                  const types = node.deviceTypes || [];
                  const isActive = types.includes(dt);
                  const isPrimary = node.primaryDeviceType === dt;
                  const multipleSelected = types.length > 1;
                  return (
                    <button key={dt} style={STYLES.settingsItem} onMouseEnter={(e) => { e.currentTarget.style.background = `${signalColorHex || T.accent}18`; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        if (isActive) {
                          // Remove the type
                          const newTypes = types.filter(t => t !== dt);
                          const updates = { deviceTypes: newTypes };
                          // Clear primary if removing the primary type, or auto-set if only one left
                          if (isPrimary) updates.primaryDeviceType = newTypes.length === 1 ? newTypes[0] : null;
                          else if (newTypes.length === 1) updates.primaryDeviceType = newTypes[0];
                          onUpdate(updates);
                        } else {
                          // Add the type
                          const newTypes = [...types, dt];
                          const updates = { deviceTypes: newTypes };
                          // Auto-set primary if this is the first type
                          if (newTypes.length === 1) updates.primaryDeviceType = dt;
                          onUpdate(updates);
                        }
                      }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {dt}
                        {isActive && multipleSelected && (
                          <span
                            style={{ fontSize: '7px', color: isPrimary ? (signalColorHex || T.accent) : T.textMuted, cursor: 'pointer' }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              onUpdate({ primaryDeviceType: dt });
                            }}
                            title={isPrimary ? 'Primary type' : 'Set as primary type'}
                          >{isPrimary ? '★' : '☆'}</span>
                        )}
                      </span>
                      <span className="n313-icon-btn" style={{ color: isActive ? T.accentLight : T.textMuted }}>{isActive ? ICON_CHECK : ICON_CIRCLE}</span>
                    </button>
                  );
                })}
                <div style={STYLES.settingsDivider} />
                {/* Sections */}
                <div style={STYLES.settingsLabel} onMouseDown={(e) => { e.stopPropagation(); toggleMenu('sections'); }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = `${signalColorHex || T.accent}10`; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}>
                  <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="n313-icon-btn" style={{ color: signalColorHex || T.accent }}>{openMenus.sections ? ICON_CHEVRON_DOWN : ICON_CHEVRON_RIGHT}</span>
                    Sections
                  </span>
                </div>
                {openMenus.sections && [
                  { id: 'a', label: 'Input (A)' },
                  { id: 'b', label: 'Output (B)' },
                  { id: 'c', label: 'System (C)' },
                ].map((sec) => {
                  const isVisible = !hiddenSections.includes(sec.id);
                  return (
                    <button key={sec.id} style={STYLES.settingsItem} onMouseEnter={(e) => { e.currentTarget.style.background = `${signalColorHex || T.accent}18`; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                      onMouseDown={(e) => { e.stopPropagation(); toggleSectionVisibility(sec.id); }}>
                      <span>{sec.label}</span>
                      <span className="n313-icon-btn" style={{ color: isVisible ? T.accentLight : T.textMuted }}>{isVisible ? ICON_CHECK : ICON_CIRCLE}</span>
                    </button>
                  );
                })}
                <div style={STYLES.settingsDivider} />
                {/* Title Bar */}
                <div style={STYLES.settingsLabel} onMouseDown={(e) => { e.stopPropagation(); toggleMenu('titleBar'); }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = `${signalColorHex || T.accent}10`; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}>
                  <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="n313-icon-btn" style={{ color: signalColorHex || T.accent }}>{openMenus.titleBar ? ICON_CHEVRON_DOWN : ICON_CHEVRON_RIGHT}</span>
                    Title Bar
                  </span>
                </div>
                {openMenus.titleBar && [
                  { id: 'name', label: 'Name' },
                  { id: 'tag', label: 'Tag' },
                  { id: 'manufacturer', label: 'Manufacturer' },
                  { id: 'model', label: 'Model' },
                ].map((field) => {
                  const isVisible = !hiddenTitleFields.includes(field.id);
                  return (
                    <button key={field.id} style={STYLES.settingsItem} onMouseEnter={(e) => { e.currentTarget.style.background = `${signalColorHex || T.accent}18`; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                      onMouseDown={(e) => { e.stopPropagation(); toggleTitleField(field.id); }}>
                      <span>{field.label}</span>
                      <span className="n313-icon-btn" style={{ color: isVisible ? T.accentLight : T.textMuted }}>{isVisible ? ICON_CHECK : ICON_CIRCLE}</span>
                    </button>
                  );
                })}
                <div style={STYLES.settingsDivider} />
                {/* System Bar */}
                <div style={STYLES.settingsLabel} onMouseDown={(e) => { e.stopPropagation(); toggleMenu('systemBar'); }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = `${signalColorHex || T.accent}10`; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}>
                  <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="n313-icon-btn" style={{ color: signalColorHex || T.accent }}>{openMenus.systemBar ? ICON_CHEVRON_DOWN : ICON_CHEVRON_RIGHT}</span>
                    System Bar
                  </span>
                </div>
                {openMenus.systemBar && [
                  { id: 'ip', label: 'IP Address' },
                  { id: 'firmware', label: 'Firmware' },
                  { id: 'software', label: 'Software' },
                ].map((field) => {
                  const isVisible = !hiddenSystemFields.includes(field.id);
                  return (
                    <button key={field.id} style={STYLES.settingsItem} onMouseEnter={(e) => { e.currentTarget.style.background = `${signalColorHex || T.accent}18`; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                      onMouseDown={(e) => { e.stopPropagation(); toggleSystemField(field.id); }}>
                      <span>{field.label}</span>
                      <span className="n313-icon-btn" style={{ color: isVisible ? T.accentLight : T.textMuted }}>{isVisible ? ICON_CHECK : ICON_CIRCLE}</span>
                    </button>
                  );
                })}
                <div style={STYLES.settingsDivider} />
                {/* Signal Color */}
                <div style={STYLES.settingsLabel} onMouseDown={(e) => { e.stopPropagation(); toggleMenu('signalColor'); }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = `${signalColorHex || T.accent}10`; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}>
                  <span style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="n313-icon-btn" style={{ color: signalColorHex || T.accent }}>{openMenus.signalColor ? ICON_CHEVRON_DOWN : ICON_CHEVRON_RIGHT}</span>
                    Signal Color
                  </span>
                </div>
                {openMenus.signalColor && <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '3px', padding: '4px 8px' }}>
                  {SIGNAL_COLORS.map((c) => (
                    <div
                      key={c.id}
                      className="n313-color-swatch"
                      style={{
                        ...STYLES.colorGridItem,
                        borderColor: node.signalColor === c.id ? T.white : T.textMuted,
                        backgroundColor: c.hex,
                        boxShadow: node.signalColor === c.id ? `0 0 4px ${c.hex}` : 'none',
                      }}
                      title={c.label}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onUpdate({ signalColor: c.id });
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.accentLight; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = node.signalColor === c.id ? T.white : T.textMuted; }}
                    />
                  ))}
                </div>
                <div
                  style={STYLES.colorGridClear}
                  onMouseDown={(e) => { e.stopPropagation(); onUpdate({ signalColor: null }); }}
                  {...HOVER_888_CCC}
                >
                  Clear Color
                </div>
                </>}
                {/* Save as Preset */}
                {onSavePreset && <>
                  <div style={STYLES.settingsDivider} />
                  <button
                    style={{ ...STYLES.settingsItem, color: T.accentLight }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = `${signalColorHex || T.accent}18`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      onSavePreset(node, 'new');
                      setSettingsOpen(false);
                    }}
                  >
                    <span>Save as Preset</span>
                    <span className="n313-icon-btn" style={{ color: signalColorHex || T.accent }}>+</span>
                  </button>
                  {node.presetId && (
                    <button
                      style={{ ...STYLES.settingsItem, color: T.accentDim }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = `${signalColorHex || T.accent}18`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        onSavePreset(node, 'overwrite');
                        setSettingsOpen(false);
                      }}
                    >
                      <span>Overwrite Preset</span>
                      <span className="n313-icon-btn" style={{ color: signalColorHex || T.accent }}>↻</span>
                    </button>
                  )}
                </>}
              </div>
            );
          })(),
          document.body
        )}

      {/* Sections */}
      {renderLayout()}

      {/* Scale handle — bottom-right corner (pointer events for reliable Ctrl+drag) */}
      <div
        ref={scaleHandleRef}
        onPointerDown={onScalePointerDown}
        onPointerMove={onScalePointerMove}
        onPointerUp={onScalePointerUp}
        onPointerCancel={onScalePointerUp}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 12,
          height: 12,
          cursor: 'nwse-resize',
          zIndex: 10,
          touchAction: 'none',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" style={{ display: 'block' }}>
          <line x1="10" y1="2" x2="2" y2="10" stroke={T.textMuted} strokeWidth="1" />
          <line x1="10" y1="5" x2="5" y2="10" stroke={T.textMuted} strokeWidth="1" />
          <line x1="10" y1="8" x2="8" y2="10" stroke={T.textMuted} strokeWidth="1" />
        </svg>
      </div>

      {/* Scale percentage badge */}
      {totalScale !== 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: -16,
            left: 0,
            fontSize: '10px',
            fontFamily: T.mono,
            color: T.textSec,
            transform: `scale(${1 / totalScale})`,
            transformOrigin: 'top left',
            whiteSpace: 'nowrap',
          }}
        >
          {Math.round(totalScale * 100)}%
        </div>
      )}
    </div>
  );
}

export default memo(Node313);
