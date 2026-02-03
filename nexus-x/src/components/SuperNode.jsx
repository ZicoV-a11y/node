import { useState, useRef, useEffect } from 'react';

// ============================================
// CONSTANTS - Single source of truth for sizes
// ============================================

const SIZES = {
  ANCHOR: 'w-3 h-3',        // 12px
  DELETE: 'w-4',            // 16px
  PADDING_X: 'px-1.5',      // slightly tighter
  PADDING_Y: 'py-1',        // slightly tighter
};

// Colors per section type
const SECTION_COLORS = {
  input: {
    accent: 'emerald',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500',
  },
  output: {
    accent: 'amber',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500',
  },
  system: {
    accent: 'purple',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500',
  },
};

// Dropdown options
const RESOLUTIONS = [
  '640x480', '800x600', '1024x768',
  '1280x720', '1920x1080',
  '2560x1440', '3840x2160',
  '7680x4320', 'Custom...'
];

const REFRESH_RATES = [
  '23.98', '24', '25', '29.97', '30',
  '50', '59.94', '60', '120', 'Custom...'
];

const CONNECTOR_TYPES = [
  'HDMI', 'SDI', '12G SDI', 'DisplayPort', 'DVI', 'VGA', 'USB-C', 'NDI', 'Custom...'
];

const SIGNAL_COLORS = [
  { id: 'emerald', hex: '#10b981', label: 'Emerald' },
  { id: 'cyan', hex: '#06b6d4', label: 'Cyan' },
  { id: 'blue', hex: '#3b82f6', label: 'Blue' },
  { id: 'violet', hex: '#8b5cf6', label: 'Violet' },
  { id: 'pink', hex: '#ec4899', label: 'Pink' },
  { id: 'red', hex: '#ef4444', label: 'Red' },
  { id: 'orange', hex: '#f97316', label: 'Orange' },
  { id: 'yellow', hex: '#eab308', label: 'Yellow' },
];

// Hex color values for theming (Tailwind 500/400 equivalents)
const HEX_COLORS = {
  zinc:    { 500: '#71717a', 400: '#a1a1aa', 600: '#52525b', 700: '#3f3f46' },
  emerald: { 500: '#10b981', 400: '#34d399' },
  teal:    { 500: '#14b8a6', 400: '#2dd4bf' },
  green:   { 500: '#22c55e', 400: '#4ade80' },
  cyan:    { 500: '#06b6d4', 400: '#22d3ee' },
  sky:     { 500: '#0ea5e9', 400: '#38bdf8' },
  blue:    { 500: '#3b82f6', 400: '#60a5fa' },
  indigo:  { 500: '#6366f1', 400: '#818cf8' },
  violet:  { 500: '#8b5cf6', 400: '#a78bfa' },
  purple:  { 500: '#a855f7', 400: '#c084fc' },
  fuchsia: { 500: '#d946ef', 400: '#e879f9' },
  pink:    { 500: '#ec4899', 400: '#f472b6' },
  rose:    { 500: '#f43f5e', 400: '#fb7185' },
  red:     { 500: '#ef4444', 400: '#f87171' },
  orange:  { 500: '#f97316', 400: '#fb923c' },
  amber:   { 500: '#f59e0b', 400: '#fbbf24' },
  yellow:  { 500: '#eab308', 400: '#facc15' },
  lime:    { 500: '#84cc16', 400: '#a3e635' },
};

// Generate cohesive color theme from signal color
// Returns hex values for inline styles
const getThemeColors = (signalColorId) => {
  // No color selected = neutral zinc theme
  if (!signalColorId) {
    const zinc = HEX_COLORS.zinc;
    return {
      header: { hex: zinc[500], hexLight: zinc[400], hexDark: zinc[600] },
      system: { hex: zinc[500], hexLight: zinc[400], hexDark: zinc[600] },
      input:  { hex: zinc[500], hexLight: zinc[400], hexDark: zinc[600] },
      output: { hex: zinc[500], hexLight: zinc[400], hexDark: zinc[600] },
    };
  }

  // Color family mappings - each signal color gets related variants
  const themes = {
    emerald: { base: 'emerald', system: 'teal',    input: 'emerald', output: 'green' },
    cyan:    { base: 'cyan',    system: 'sky',     input: 'cyan',    output: 'teal' },
    blue:    { base: 'blue',    system: 'indigo',  input: 'blue',    output: 'sky' },
    violet:  { base: 'violet',  system: 'purple',  input: 'violet',  output: 'indigo' },
    pink:    { base: 'pink',    system: 'fuchsia', input: 'pink',    output: 'rose' },
    red:     { base: 'red',     system: 'rose',    input: 'red',     output: 'orange' },
    orange:  { base: 'orange',  system: 'amber',   input: 'orange',  output: 'yellow' },
    yellow:  { base: 'yellow',  system: 'amber',   input: 'yellow',  output: 'lime' },
  };

  const theme = themes[signalColorId] || themes.cyan;

  return {
    header: { hex: HEX_COLORS[theme.base][500],   hexLight: HEX_COLORS[theme.base][400] },
    system: { hex: HEX_COLORS[theme.system][500], hexLight: HEX_COLORS[theme.system][400] },
    input:  { hex: HEX_COLORS[theme.input][500],  hexLight: HEX_COLORS[theme.input][400] },
    output: { hex: HEX_COLORS[theme.output][500], hexLight: HEX_COLORS[theme.output][400] },
  };
};

const PLATFORMS = [
  'none',
  'MacBook Pro', 'MacBook Air', 'Mac Mini', 'Mac Studio', 'Mac Pro',
  'Windows PC', 'Windows Laptop', 'Linux PC', 'Custom...'
];

const SOFTWARE_PRESETS = [
  { id: 'none', label: 'None' },
  { id: 'qlab', label: 'QLAB' },
  { id: 'resolume', label: 'Resolume' },
  { id: 'vmix', label: 'vMix' },
  { id: 'obs', label: 'OBS' },
  { id: 'disguise', label: 'disguise' },
  { id: 'notch', label: 'Notch' },
  { id: 'touchdesigner', label: 'TouchDesigner' },
  { id: 'madmapper', label: 'MadMapper' },
  { id: 'millumin', label: 'Millumin' },
  { id: 'propresenter', label: 'ProPresenter' },
  { id: 'playbackpro', label: 'PlaybackPro' },
  { id: 'wirecast', label: 'Wirecast' },
  { id: 'custom', label: 'Custom...' },
];

const CAPTURE_CARDS = [
  { id: 'none', label: 'None' },
  { id: 'decklink-duo-2', label: 'Blackmagic DeckLink Duo 2' },
  { id: 'decklink-quad-2', label: 'Blackmagic DeckLink Quad 2' },
  { id: 'decklink-8k', label: 'Blackmagic DeckLink 8K Pro' },
  { id: 'decklink-mini-recorder', label: 'Blackmagic DeckLink Mini Recorder' },
  { id: 'decklink-mini-monitor', label: 'Blackmagic DeckLink Mini Monitor' },
  { id: 'ultrastudio-4k-mini', label: 'Blackmagic UltraStudio 4K Mini' },
  { id: 'ultrastudio-recorder-3g', label: 'Blackmagic UltraStudio Recorder 3G' },
  { id: 'intensity-pro-4k', label: 'Blackmagic Intensity Pro 4K' },
  { id: 'elgato-4k60', label: 'Elgato 4K60 Pro' },
  { id: 'elgato-hd60', label: 'Elgato HD60 S+' },
  { id: 'magewell-pro-capture', label: 'Magewell Pro Capture' },
  { id: 'magewell-usb-capture', label: 'Magewell USB Capture' },
  { id: 'aja-kona', label: 'AJA Kona' },
  { id: 'aja-corvid', label: 'AJA Corvid' },
  { id: 'custom', label: 'Custom...' },
];

// Barco Tri-Combo Cards (DP, HDMI, 4x 12G SDI)
const CARD_PRESETS = {
  'tri-combo-in': {
    label: 'Tri-Combo Input',
    shortLabel: 'TRI-COMBO',
    category: 'input',
    ports: [
      { connector: 'DisplayPort', resolution: '3840x2160', refreshRate: '60' },
      { connector: 'HDMI', resolution: '3840x2160', refreshRate: '60' },
      { connector: '12G SDI', resolution: '3840x2160', refreshRate: '60' },
      { connector: '12G SDI', resolution: '3840x2160', refreshRate: '60' },
      { connector: '12G SDI', resolution: '3840x2160', refreshRate: '60' },
      { connector: '12G SDI', resolution: '3840x2160', refreshRate: '60' },
    ]
  },
  'tri-combo-out': {
    label: 'Tri-Combo Output',
    shortLabel: 'TRI-COMBO',
    category: 'output',
    ports: [
      { connector: 'DisplayPort', resolution: '3840x2160', refreshRate: '60' },
      { connector: 'HDMI', resolution: '3840x2160', refreshRate: '60' },
      { connector: '12G SDI', resolution: '3840x2160', refreshRate: '60' },
      { connector: '12G SDI', resolution: '3840x2160', refreshRate: '60' },
      { connector: '12G SDI', resolution: '3840x2160', refreshRate: '60' },
      { connector: '12G SDI', resolution: '3840x2160', refreshRate: '60' },
    ]
  },
};

// ============================================
// SELECT WITH CUSTOM INPUT COMPONENT
// Dropdown that switches to text input for custom values
// ============================================

const SelectWithCustom = ({
  value,
  options,
  onChange,
  placeholder = 'Choose',
  className = '',
  isSelected = false,
}) => {
  // Check if current value is custom (not in options list)
  const isCustomValue = value && value !== 'Custom...' && !options.includes(value);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customText, setCustomText] = useState(value || '');
  const inputRef = useRef(null);

  // Focus input when entering custom mode
  useEffect(() => {
    if (isCustomMode && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isCustomMode]);

  // Sync custom text when value changes externally
  useEffect(() => {
    setCustomText(value || '');
  }, [value]);

  const baseStyle = `bg-zinc-800 border rounded px-1 py-0.5 font-mono text-[11px] w-full ${
    isSelected ? 'border-cyan-500/50' : 'border-zinc-700'
  } ${value ? 'text-zinc-300' : 'text-zinc-500'}`;

  if (isCustomMode) {
    return (
      <div className={`flex items-center w-full bg-zinc-800 border rounded ${isSelected ? 'border-cyan-500/50' : 'border-zinc-700'}`}>
        <input
          ref={inputRef}
          type="text"
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          onBlur={() => {
            if (customText.trim()) {
              onChange(customText.trim());
              setIsCustomMode(false); // Save and return to dropdown
            } else {
              // Empty text = go back to dropdown with no value
              setIsCustomMode(false);
              onChange('');
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.target.blur();
            } else if (e.key === 'Escape') {
              // Escape = go back to dropdown, keep current saved value
              setIsCustomMode(false);
              setCustomText(value || '');
            }
          }}
          onClick={(e) => e.stopPropagation()}
          placeholder="Type custom..."
          className="flex-1 min-w-0 bg-transparent px-1 py-0.5 font-mono text-[11px] text-zinc-300 outline-none"
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Save current text and return to dropdown
            if (customText.trim()) {
              onChange(customText.trim());
            }
            setIsCustomMode(false);
          }}
          className="text-zinc-400 hover:text-zinc-200 text-[9px] px-1.5 py-0.5 shrink-0 border-l border-zinc-700"
          title="Back to dropdown"
        >
          ▼
        </button>
      </div>
    );
  }

  // Dropdown mode - show custom value as an option if it exists
  return (
    <select
      value={value || ''}
      onChange={(e) => {
        const newValue = e.target.value;
        if (newValue === 'Custom...') {
          setIsCustomMode(true);
          setCustomText(''); // Start fresh with empty input
        } else {
          onChange(newValue);
        }
      }}
      onClick={(e) => e.stopPropagation()}
      className={`${baseStyle} ${className}`}
    >
      <option value="">{placeholder}</option>
      {/* Show custom value as first option if it exists */}
      {isCustomValue && (
        <option value={value}>{value} (custom)</option>
      )}
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
};

// ============================================
// CARD WRAPPER COMPONENT
// Symmetrical visual wrapper - colored stripe on anchor side
// Minimal header that doesn't break column alignment
// ============================================

const CardWrapper = ({
  card,
  children,
  type,
  onToggleCollapse,
  onRemoveCard,
  anchorSide,
  colors: passedColors
}) => {
  // Use passed hex colors or fallback to zinc
  const colorHex = passedColors?.hex || HEX_COLORS.zinc[500];
  const colorHexLight = passedColors?.hexLight || HEX_COLORS.zinc[400];
  const isReversed = anchorSide === 'right';

  return (
    <div className="relative">
      {/* Colored stripe indicator on anchor side */}
      <div
        className={`absolute top-0 bottom-0 w-1 ${isReversed ? 'right-0' : 'left-0'}`}
        style={{ backgroundColor: `${colorHex}66` }} // ~40% opacity
      />

      {/* Card label bar - minimal, symmetric */}
      <div
        className={`
          flex items-center justify-between
          py-0.5 text-[9px] font-mono
          cursor-pointer select-none
          ${isReversed ? 'flex-row-reverse pl-2 pr-1' : 'pl-1 pr-2'}
        `}
        style={{ backgroundColor: `${colorHex}1a` }} // ~10% opacity
        onClick={() => onToggleCollapse && onToggleCollapse(card.id)}
      >
        {/* Left/anchor side: collapse + name */}
        <div className={`flex items-center gap-1 ${isReversed ? 'flex-row-reverse' : ''}`}>
          <span
            className={`transition-transform ${card.collapsed ? '' : 'rotate-90'}`}
            style={{ color: colorHexLight }}
          >
            ▶
          </span>
          <span className="font-bold tracking-wider" style={{ color: colorHexLight }}>
            {card.name}
          </span>
          <span className="text-zinc-500 bg-zinc-700/50 px-1 rounded">
            {card.portCount}p
          </span>
        </div>

        {/* Right side: remove button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemoveCard && onRemoveCard(card.id);
          }}
          className="text-zinc-500 hover:text-red-400 px-1"
          title="Remove card"
        >
          ×
        </button>
      </div>

      {/* Card ports */}
      {!card.collapsed && children}
    </div>
  );
};

// Column definitions - ALL row elements as columns for template layout
// minWidth is the minimum, but columns can grow based on content
const COLUMN_DEFS = {
  anchor: { id: 'anchor', label: '', minWidth: 24, draggable: true },
  delete: { id: 'delete', label: '🗑', minWidth: 24, draggable: true },
  port: { id: 'port', label: 'Port', minWidth: 52, draggable: true },
  connector: { id: 'connector', label: 'Connector', minWidth: 90, draggable: true },
  resolution: { id: 'resolution', label: 'Resolution', minWidth: 90, draggable: true },
  rate: { id: 'rate', label: 'Rate', minWidth: 60, draggable: true },
  flip: { id: 'flip', label: '', minWidth: 42, draggable: true },
};

// Estimate text width in pixels (monospace font at 10px ≈ 6px per character)
const CHAR_WIDTH = 6;
const PADDING = 16; // px padding inside cell

const estimateTextWidth = (text) => {
  if (!text) return 0;
  return text.length * CHAR_WIDTH + PADDING;
};

// Calculate dynamic column widths based on port data
const calculateColumnWidths = (ports) => {
  const widths = {
    anchor: COLUMN_DEFS.anchor.minWidth,
    delete: COLUMN_DEFS.delete.minWidth,
    port: COLUMN_DEFS.port.minWidth,
    connector: COLUMN_DEFS.connector.minWidth,
    resolution: COLUMN_DEFS.resolution.minWidth,
    rate: COLUMN_DEFS.rate.minWidth,
    flip: COLUMN_DEFS.flip.minWidth,
  };

  // Also consider header labels
  widths.connector = Math.max(widths.connector, estimateTextWidth('Connector'));
  widths.resolution = Math.max(widths.resolution, estimateTextWidth('Resolution'));
  widths.rate = Math.max(widths.rate, estimateTextWidth('Rate'));

  // Scan all ports to find max width needed
  ports.forEach(port => {
    if (port.connector) {
      widths.connector = Math.max(widths.connector, estimateTextWidth(port.connector));
    }
    if (port.resolution) {
      widths.resolution = Math.max(widths.resolution, estimateTextWidth(port.resolution));
    }
    if (port.refreshRate) {
      widths.rate = Math.max(widths.rate, estimateTextWidth(port.refreshRate));
    }
  });

  return widths;
};

// Data columns that can be reordered by dragging (includes delete)
const DATA_COLUMNS = ['delete', 'port', 'connector', 'resolution', 'rate'];

// Build full column order based on mode
// dataOrder now includes delete and port, so we just add anchor at start and flip at end
const getFullColumnOrder = (dataOrder, canToggleAnchor, isReversed) => {
  // Base order: anchor, data columns (includes delete, port, etc.), flip (if stacked)
  const baseOrder = canToggleAnchor
    ? ['anchor', ...dataOrder, 'flip']
    : ['anchor', ...dataOrder];

  // Reverse entire array if anchor is on right
  return isReversed ? [...baseOrder].reverse() : baseOrder;
};

// ============================================
// SIDE DROP ZONE COMPONENT
// Appears on left/right of sections when dragging
// ============================================

const SideDropZone = ({ side, onDrop, isActive }) => (
  <div
    onDragOver={(e) => {
      e.preventDefault();
      e.stopPropagation();
    }}
    onDragEnter={(e) => {
      e.preventDefault();
      e.stopPropagation();
    }}
    onDrop={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onDrop(side);
    }}
    // Also support mouse-based drops (for System section which uses mouse events)
    onMouseUp={() => {
      onDrop(side);
    }}
    className={`absolute top-0 bottom-0 ${side === 'left' ? 'left-0' : 'right-0'} w-16
      border-2 border-dashed transition-all z-20 flex items-center justify-center
      border-cyan-400 bg-cyan-400/20 hover:bg-cyan-400/40`}
  >
    <span className="text-cyan-300 text-[11px] font-mono font-bold pointer-events-none">
      {side === 'left' ? '← DROP' : 'DROP →'}
    </span>
  </div>
);

// ============================================
// BOTTOM DROP ZONE COMPONENT
// Appears at bottom when dragging to add new row
// ============================================

const BottomDropZone = ({ onDrop }) => (
  <div
    onDragOver={(e) => {
      e.preventDefault();
      e.stopPropagation();
    }}
    onDragEnter={(e) => {
      e.preventDefault();
      e.stopPropagation();
    }}
    onDrop={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onDrop();
    }}
    // Also support mouse-based drops (for System section which uses mouse events)
    // Don't stopPropagation - let window handler do cleanup
    onMouseUp={() => {
      onDrop();
    }}
    className="w-full h-10 border-2 border-dashed border-cyan-400 bg-cyan-400/20
      flex items-center justify-center hover:bg-cyan-400/40 transition-all cursor-pointer"
  >
    <span className="text-cyan-300 text-[11px] font-bold pointer-events-none">▼ DROP HERE FOR NEW ROW ▼</span>
  </div>
);

// ============================================
// TOP DROP ZONE COMPONENT
// Appears at top when dragging System section to move it to top position
// ============================================

const TopDropZone = ({ onDrop }) => (
  <div
    onDragOver={(e) => {
      e.preventDefault();
      e.stopPropagation();
    }}
    onDragEnter={(e) => {
      e.preventDefault();
      e.stopPropagation();
    }}
    onDrop={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onDrop();
    }}
    // Also support mouse-based drops (for System section which uses mouse events)
    // Don't stopPropagation - let window handler do cleanup
    onMouseUp={() => {
      onDrop();
    }}
    className="w-full h-10 border-2 border-dashed border-cyan-400 bg-cyan-400/20
      flex items-center justify-center hover:bg-cyan-400/40 transition-all cursor-pointer mb-1"
  >
    <span className="text-cyan-300 text-[11px] font-bold pointer-events-none">▲ DROP HERE FOR TOP ▲</span>
  </div>
);

// ============================================
// ANCHOR COMPONENT
// ============================================

// Visible anchor point built into the node column
const Anchor = ({ anchorId, type, isActive, onClick, signalColor }) => {
  const isInput = type === 'in';

  // Color logic: inputs are green, outputs use signalColor or amber
  const baseColor = isInput ? '#10b981' : (signalColor || '#f59e0b');
  const lightColor = isInput ? '#34d399' : (signalColor ? `${signalColor}cc` : '#fbbf24');

  const handleMouseDown = (e) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent the subsequent click event
    // Start wire connection
    onClick && onClick(anchorId, type);
  };

  return (
    <div
      data-anchor-id={anchorId}
      data-anchor-type={type}
      className="w-3 h-3 shrink-0 flex items-center justify-center cursor-pointer select-none"
      onMouseDown={handleMouseDown}
    >
      <div
        className="rounded-full transition-all"
        style={{
          width: isActive ? '8px' : '7px',
          height: isActive ? '8px' : '7px',
          backgroundColor: baseColor,
          border: `1px solid ${lightColor}`,
          boxShadow: isActive ? `0 0 6px ${baseColor}` : `0 0 3px ${baseColor}66`
        }}
      />
    </div>
  );
};

// ============================================
// DELETE BUTTON COMPONENT
// ============================================

const DeleteButton = ({ onClick }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick && onClick();
    }}
    className={`opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 ${SIZES.DELETE} shrink-0 text-center`}
  >
    ×
  </button>
);

// ============================================
// PORT ROW COMPONENT
// Unified column structure - matches ColumnHeaders exactly
// ALL columns render in same order with markers between
// ============================================

const PortRow = ({
  port,
  type,
  anchorSide,
  onUpdate,
  onDelete,
  anchorId,
  isActive,
  onAnchorClick,
  signalColor,
  canToggleAnchor,
  onToggleAnchor,
  columnOrder,
  isSelected,
  onToggleSelection,
  onBulkUpdate,
  columnWidths = {}, // Dynamic column widths
  colors: passedColors,
}) => {
  const isInput = type === 'in';
  const isReversed = anchorSide === 'right';
  // Use passed hex colors or fallback to zinc
  const colorHexLight = passedColors?.hexLight || HEX_COLORS.zinc[400];

  // Use provided columnOrder or default
  const dataOrder = columnOrder || DATA_COLUMNS;

  // Get full column order (anchor, delete, data, flip) with proper reversal - SAME as ColumnHeaders
  const fullColumnOrder = getFullColumnOrder(dataOrder, canToggleAnchor, isReversed);

  // Render column content based on column ID
  const renderColumnContent = (colId) => {
    const colDef = COLUMN_DEFS[colId];
    if (!colDef) return null;

    switch (colId) {
      case 'anchor':
        return (
          <Anchor
            anchorId={anchorId}
            type={type}
            isActive={isActive}
            signalColor={signalColor}
            onClick={onAnchorClick}
          />
        );
      case 'delete':
        return <DeleteButton onClick={onDelete} />;
      case 'flip':
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleAnchor && onToggleAnchor();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className="px-1.5 py-0.5 bg-zinc-700/50 hover:bg-zinc-600 rounded text-[10px] font-mono"
            style={{ color: colorHexLight }}
            title={`Anchors on ${anchorSide} side - click to toggle`}
          >
            {anchorSide === 'right' ? '■ ▶' : '◀ ■'}
          </button>
        );
      case 'port':
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelection && onToggleSelection();
            }}
            className={`font-mono text-center w-full cursor-pointer transition-colors rounded px-1 ${
              isSelected
                ? 'text-cyan-300 bg-cyan-500/20'
                : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700/50'
            }`}
            title={isSelected ? 'Click to deselect' : 'Click to select for bulk edit'}
          >
            {isInput ? 'IN' : 'OUT'} {port.number}
          </button>
        );
      case 'connector':
        return (
          <SelectWithCustom
            value={port.connector || ''}
            options={CONNECTOR_TYPES}
            placeholder="Type"
            isSelected={isSelected}
            onChange={(value) => {
              if (isSelected && onBulkUpdate) {
                onBulkUpdate('connector', value);
              } else {
                onUpdate({ connector: value });
              }
            }}
          />
        );
      case 'resolution':
        return (
          <SelectWithCustom
            value={port.resolution || ''}
            options={RESOLUTIONS}
            placeholder="Choose"
            isSelected={isSelected}
            onChange={(value) => {
              if (isSelected && onBulkUpdate) {
                onBulkUpdate('resolution', value);
              } else {
                onUpdate({ resolution: value });
              }
            }}
          />
        );
      case 'rate':
        return (
          <SelectWithCustom
            value={port.refreshRate || ''}
            options={REFRESH_RATES}
            placeholder="Choose"
            isSelected={isSelected}
            onChange={(value) => {
              if (isSelected && onBulkUpdate) {
                onBulkUpdate('refreshRate', value);
              } else {
                onUpdate({ refreshRate: value });
              }
            }}
          />
        );
      default:
        return null;
    }
  };

  // Get width for a column (use dynamic width if available, else minWidth)
  const getColumnWidth = (colId) => {
    return columnWidths[colId] || COLUMN_DEFS[colId]?.minWidth || 60;
  };

  return (
    <div className={`flex items-center ${SIZES.PADDING_Y} hover:bg-zinc-800/50 group text-[12px] whitespace-nowrap w-full`}>
      {fullColumnOrder.map((colId, index) => {
        const colDef = COLUMN_DEFS[colId];
        if (!colDef) return null;

        return (
          <div key={colId} className="flex items-center">
            {/* Marker between ALL columns (except first) - with spacing */}
            {index > 0 && (
              <span className="w-px h-4 bg-zinc-600/40 shrink-0 mx-2" />
            )}
            <span
              className="shrink-0 flex items-center justify-center"
              style={{ width: `${getColumnWidth(colId)}px` }}
            >
              {renderColumnContent(colId)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ============================================
// COLUMN HEADERS COMPONENT
// Unified column structure - matches PortRow exactly
// ============================================

const ColumnHeaders = ({ anchorSide, canToggleAnchor, columnOrder, onReorderColumns, selectedCount = 0, totalCount = 0, onToggleSelectAll, columnWidths = {} }) => {
  const isReversed = anchorSide === 'right';
  const [draggedColumn, setDraggedColumn] = useState(null);

  // Get width for a column (use dynamic width if available, else minWidth)
  const getColumnWidth = (colId) => {
    return columnWidths[colId] || COLUMN_DEFS[colId]?.minWidth || 60;
  };

  // Use provided columnOrder or default
  const dataOrder = columnOrder || DATA_COLUMNS;

  // Selection state indicator
  const getSelectionIndicator = () => {
    if (totalCount === 0) return '☐';
    if (selectedCount === 0) return '☐';
    if (selectedCount === totalCount) return '☑';
    return '▣'; // Partial selection
  };

  // Get full column order (anchor, delete, data, flip) with proper reversal
  const fullColumnOrder = getFullColumnOrder(dataOrder, canToggleAnchor, isReversed);

  const handleDragStart = (e, colId) => {
    e.stopPropagation();
    setDraggedColumn(colId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('column-reorder', colId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e, targetColId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedColumn || draggedColumn === targetColId || !onReorderColumns) {
      setDraggedColumn(null);
      return;
    }

    // Work with base data order (not reversed, not including anchor/delete/flip)
    const newOrder = [...dataOrder];
    const dragIdx = newOrder.indexOf(draggedColumn);
    const targetIdx = newOrder.indexOf(targetColId);

    if (dragIdx === -1 || targetIdx === -1) {
      setDraggedColumn(null);
      return;
    }

    newOrder.splice(dragIdx, 1);
    newOrder.splice(targetIdx, 0, draggedColumn);

    onReorderColumns(newOrder);
    setDraggedColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedColumn(null);
  };

  return (
    <div
      data-column-zone="true"
      className={`flex items-center py-1 bg-zinc-800/30 border-b border-zinc-700/30
        text-[10px] font-mono text-zinc-500 uppercase tracking-wide w-full`}
    >
      {fullColumnOrder.map((colId, index) => {
        const colDef = COLUMN_DEFS[colId];
        if (!colDef) return null;

        const isDragging = draggedColumn === colId;
        const isDraggable = colDef.draggable && colDef.label;

        return (
          <div
            key={colId}
            className="flex items-center"
            onDragOver={(e) => {
              if (isDraggable) {
                handleDragOver(e);
              }
            }}
            onDrop={(e) => isDraggable && handleDrop(e, colId)}
          >
            {/* Marker between ALL columns (except first) - with spacing */}
            {index > 0 && (
              <span className="w-px h-4 bg-zinc-600/40 shrink-0 mx-2" />
            )}
            {colId === 'port' ? (
              // PORT header is both draggable AND clickable for select all
              <span
                data-column-drag="true"
                draggable="true"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelectAll && onToggleSelectAll();
                }}
                onDragStart={(e) => handleDragStart(e, colId)}
                onDragEnd={handleDragEnd}
                className={`shrink-0 flex items-center justify-center gap-1 cursor-grab select-none transition-colors ${
                  selectedCount > 0 ? 'text-cyan-400' : 'text-zinc-500 hover:text-zinc-300'
                } ${isDragging ? 'opacity-50' : ''}`}
                style={{ width: `${getColumnWidth(colId)}px` }}
                title="Click to select all, drag to reorder"
              >
                <span>{getSelectionIndicator()}</span>
                <span>{colDef.label}</span>
              </span>
            ) : (
              <span
                data-column-drag={isDraggable ? "true" : undefined}
                draggable={isDraggable ? "true" : undefined}
                onMouseDown={(e) => e.stopPropagation()}
                onDragStart={(e) => {
                  if (isDraggable) handleDragStart(e, colId);
                }}
                onDragEnd={handleDragEnd}
                className={`shrink-0 flex items-center justify-center transition-opacity
                  ${isDraggable ? 'cursor-grab select-none hover:text-zinc-300' : ''}
                  ${isDragging ? 'opacity-50' : ''}`}
                style={{ width: `${getColumnWidth(colId)}px` }}
                title={isDraggable ? "Drag to reorder" : undefined}
              >
                {colDef.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ============================================
// DRAGGABLE SECTION WRAPPER
// Wraps sections with drag handle and drop zones
// ============================================

const DraggableSection = ({
  sectionId,
  children,
  anchorSide,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  onDropToSide,
  isDraggedOver,
  isDragging,
  showSideDropZones,
  isSingleSectionRow,
  draggedSection, // What section is currently being dragged
}) => {
  // STRICT RULE: Side drop zones ONLY for Input/Output going side-by-side
  // System can NEVER be side-by-side with anything
  const isIOSection = sectionId === 'input' || sectionId === 'output';
  const isDraggingIO = draggedSection === 'input' || draggedSection === 'output';
  const canShowSideZones = showSideDropZones && isIOSection && isDraggingIO;

  return (
    <div
      onDragOver={(e) => onDragOver(e, sectionId)}
      onDrop={(e) => onDrop(e, sectionId)}
      // Also support mouse-based drops (for System section which uses mouse events)
      onMouseUp={() => onDrop(null, sectionId)}
      className={`
        relative w-full
        transition-all duration-150
        ${isDragging ? 'opacity-40' : ''}
        ${isDraggedOver ? 'ring-2 ring-cyan-400 ring-inset' : ''}
      `}
    >
      {/* Side drop zones - ONLY for Input/Output going side-by-side (system NEVER side-by-side) */}
      {canShowSideZones && (
        <>
          <SideDropZone
            side="left"
            onDrop={(side) => onDropToSide(sectionId, side)}
            isActive={false}
          />
          <SideDropZone
            side="right"
            onDrop={(side) => onDropToSide(sectionId, side)}
            isActive={false}
          />
        </>
      )}

      {/* Content takes full width - drag handle moved to header text */}
      <div className="w-full">{children}</div>
    </div>
  );
};

// ============================================
// SECTION HEADER COMPONENT
// Template: Title on anchor side, + button centered
// ============================================

const SectionHeader = ({
  type,
  title,
  anchorSide,
  onAdd,
  onTitleChange,
  onDragStart,
  onDragEnd,
  sectionId,
  onApplyPreset,
  collapsed,
  onToggleCollapse,
  colors: passedColors,
}) => {
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const isReversed = anchorSide === 'right';
  // Use passed hex colors or fallback to zinc
  const colorHex = passedColors?.hex || HEX_COLORS.zinc[500];
  const colorHexLight = passedColors?.hexLight || HEX_COLORS.zinc[400];

  // Filter presets by section type (input/output)
  const availablePresets = Object.entries(CARD_PRESETS)
    .filter(([_, preset]) => preset.category === type)
    .map(([id, preset]) => ({ id, ...preset }));

  const handlePresetSelect = (presetId) => {
    const preset = CARD_PRESETS[presetId];
    if (preset && onApplyPreset) {
      onApplyPreset(preset.ports, presetId);
    }
    setShowPresetMenu(false);
  };

  // Shared button style for consistency (color applied via inline style)
  const buttonBaseStyle = "px-2.5 py-1 bg-zinc-600 hover:bg-zinc-500 rounded text-[12px] font-mono";

  // Buttons container - mirrored order: INPUTS [⊞][+] ... [+][⊞] OUTPUTS
  const buttonsJSX = (
    <div className="flex items-center gap-1.5 shrink-0 relative">
      {isReversed ? (
        <>
          {/* Add button */}
          <button
            onClick={(e) => { e.stopPropagation(); onAdd && onAdd(); }}
            onMouseDown={(e) => e.stopPropagation()}
            className={buttonBaseStyle}
            style={{ color: colorHexLight }}
            title="Add port"
          >
            +
          </button>
          {/* Preset button */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowPresetMenu(!showPresetMenu); }}
            onMouseDown={(e) => e.stopPropagation()}
            className={buttonBaseStyle}
            style={{ color: colorHexLight }}
            title="Load card preset"
          >
            ⊞
          </button>
        </>
      ) : (
        <>
          {/* Preset button */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowPresetMenu(!showPresetMenu); }}
            onMouseDown={(e) => e.stopPropagation()}
            className={buttonBaseStyle}
            style={{ color: colorHexLight }}
            title="Load card preset"
          >
            ⊞
          </button>
          {/* Add button */}
          <button
            onClick={(e) => { e.stopPropagation(); onAdd && onAdd(); }}
            onMouseDown={(e) => e.stopPropagation()}
            className={buttonBaseStyle}
            style={{ color: colorHexLight }}
            title="Add port"
          >
            +
          </button>
        </>
      )}

      {/* Preset dropdown menu - positioned relative to button container */}
      {showPresetMenu && (
        <div
          className={`absolute top-full mt-1 bg-zinc-800 border border-zinc-600 rounded shadow-lg z-50 min-w-[180px] ${isReversed ? 'right-0' : 'left-0'}`}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-2 py-1 text-[10px] text-zinc-500 border-b border-zinc-700 font-mono">
            CARD PRESETS
          </div>
          {availablePresets.map((preset) => (
            <button
              key={preset.id}
              onClick={(e) => { e.stopPropagation(); handlePresetSelect(preset.id); }}
              className="w-full text-left px-2 py-1.5 text-[11px] font-mono text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
            >
              <span className="text-zinc-500">{preset.ports.length}p</span>
              <span>{preset.label}</span>
            </button>
          ))}
          {availablePresets.length === 0 && (
            <div className="px-2 py-1.5 text-[11px] font-mono text-zinc-500">
              No presets available
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div
      className={`flex items-center justify-between gap-2 ${SIZES.PADDING_X} py-1 border-b border-zinc-700/50`}
      style={{ backgroundColor: `${colorHex}1a` }} // ~10% opacity
    >
      {isReversed ? (
        <>
          {/* OUTPUTS (anchor right): buttons on inner left, then arrow + title on right */}
          {buttonsJSX}
          <div className="flex items-center gap-1">
            <span
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse && onToggleCollapse();
              }}
              className={`text-[11px] cursor-pointer hover:opacity-80 px-0.5 rounded transition-transform shrink-0 ${collapsed ? '' : 'rotate-90'}`}
              style={{ fontFamily: 'inherit', color: colorHexLight }}
              title={collapsed ? 'Expand section' : 'Collapse section'}
            >
              ▸
            </span>
            <span
              data-section-drag="true"
              draggable="true"
              onDragStart={(e) => {
                e.stopPropagation();
                onDragStart && onDragStart(e, sectionId);
              }}
              onDragEnd={(e) => {
                e.stopPropagation();
                onDragEnd && onDragEnd();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="font-mono font-bold text-[12px] cursor-grab select-none hover:opacity-80 px-1 py-0.5 rounded whitespace-nowrap"
              style={{ color: colorHexLight }}
              title="Drag to reorder section"
            >
              {title}
            </span>
          </div>
        </>
      ) : (
        <>
          {/* INPUTS (anchor left): title + arrow on left, buttons on inner right */}
          <div className="flex items-center gap-1">
            <span
              data-section-drag="true"
              draggable="true"
              onDragStart={(e) => {
                e.stopPropagation();
                onDragStart && onDragStart(e, sectionId);
              }}
              onDragEnd={(e) => {
                e.stopPropagation();
                onDragEnd && onDragEnd();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="font-mono font-bold text-[12px] cursor-grab select-none hover:opacity-80 px-1 py-0.5 rounded whitespace-nowrap"
              style={{ color: colorHexLight }}
              title="Drag to reorder section"
            >
              {title}
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse && onToggleCollapse();
              }}
              className={`text-[11px] cursor-pointer hover:opacity-80 px-0.5 rounded transition-transform shrink-0 ${collapsed ? '' : 'rotate-90'}`}
              style={{ fontFamily: 'inherit', color: colorHexLight }}
              title={collapsed ? 'Expand section' : 'Collapse section'}
            >
              ▸
            </span>
          </div>
          {buttonsJSX}
        </>
      )}
    </div>
  );
};

// ============================================
// IO SECTION COMPONENT (Input or Output)
// ============================================

const IOSection = ({
  type,
  data,
  anchorSide,
  nodeId,
  activeWire,
  onAnchorClick,
  onUpdate,
  signalColor,
  canToggleAnchor,
  onToggleAnchorSide,
  onSectionDragStart,
  onSectionDragEnd,
  collapsed,
  onToggleCollapse,
  colors,
}) => {
  const sectionType = type === 'input' ? 'input' : 'output';
  const sectionId = type === 'input' ? 'input' : 'output';
  const portType = type === 'input' ? 'in' : 'out';

  // Multi-select state for bulk editing (Set of port IDs)
  const [selectedPorts, setSelectedPorts] = useState(new Set());

  // Get cards from data (or empty array)
  const cards = data.cards || [];

  // Toggle individual port selection
  const togglePortSelection = (portId) => {
    setSelectedPorts(prev => {
      const next = new Set(prev);
      if (next.has(portId)) {
        next.delete(portId);
      } else {
        next.add(portId);
      }
      return next;
    });
  };

  // Select all / deselect all
  const toggleSelectAll = () => {
    if (selectedPorts.size === data.ports.length && data.ports.length > 0) {
      setSelectedPorts(new Set()); // Deselect all
    } else {
      setSelectedPorts(new Set(data.ports.map(p => p.id))); // Select all
    }
  };

  const addPort = () => {
    const prefix = type === 'input' ? 'in' : 'out';
    const newPort = {
      id: `${prefix}-${Date.now()}`,
      number: data.ports.length + 1,
      connector: '',       // Empty = "Type" placeholder
      resolution: '',      // Empty = "Choose" placeholder
      refreshRate: '',     // Empty = "Choose" placeholder
      cardId: null // No card - standalone port
    };
    onUpdate({ ports: [...data.ports, newPort] });

    // Auto-expand section if collapsed so user can see the new port
    if (collapsed && onToggleCollapse) {
      onToggleCollapse();
    }
  };

  const updatePort = (portId, updates) => {
    onUpdate({
      ports: data.ports.map(p => p.id === portId ? { ...p, ...updates } : p)
    });
  };

  // Bulk update ONLY selected ports with a specific field value
  const bulkUpdatePorts = (field, value) => {
    if (selectedPorts.size === 0) return;
    onUpdate({
      ports: data.ports.map(p =>
        selectedPorts.has(p.id) ? { ...p, [field]: value } : p
      )
    });
  };

  const deletePort = (portId) => {
    const port = data.ports.find(p => p.id === portId);
    const remainingPorts = data.ports.filter(p => p.id !== portId);

    // If port belonged to a card, check if card is now empty
    let updatedCards = cards;
    if (port?.cardId) {
      const cardPorts = remainingPorts.filter(p => p.cardId === port.cardId);
      if (cardPorts.length === 0) {
        // Remove empty card
        updatedCards = cards.filter(c => c.id !== port.cardId);
      }
    }

    // Renumber remaining ports
    const renumberedPorts = remainingPorts.map((p, i) => ({ ...p, number: i + 1 }));

    onUpdate({ ports: renumberedPorts, cards: updatedCards });
  };

  const reorderColumns = (newOrder) => {
    onUpdate({ columnOrder: newOrder });
  };

  // Apply a preset - creates a card with grouped ports
  const applyPreset = (presetPorts, presetId) => {
    const prefix = type === 'input' ? 'in' : 'out';
    const preset = CARD_PRESETS[presetId];
    const cardId = `card-${Date.now()}`;

    // Create new card entry
    const newCard = {
      id: cardId,
      name: preset?.shortLabel || preset?.label || 'CARD',
      presetId: presetId,
      collapsed: false,
      portCount: presetPorts.length
    };

    // Create ports with cardId reference
    const startNumber = data.ports.length + 1;
    const newPorts = presetPorts.map((p, i) => ({
      id: `${prefix}-${Date.now()}-${i}`,
      number: startNumber + i,
      connector: p.connector,
      resolution: p.resolution,
      refreshRate: p.refreshRate,
      cardId: cardId // Link to card
    }));

    // Add to existing ports and cards (don't replace)
    onUpdate({
      ports: [...data.ports, ...newPorts],
      cards: [...cards, newCard]
    });

    // Auto-expand section if collapsed so user can see the new card
    if (collapsed && onToggleCollapse) {
      onToggleCollapse();
    }
  };

  // Toggle card collapse
  const toggleCardCollapse = (cardId) => {
    onUpdate({
      cards: cards.map(c => c.id === cardId ? { ...c, collapsed: !c.collapsed } : c)
    });
  };

  // Remove entire card and its ports
  const removeCard = (cardId) => {
    const remainingPorts = data.ports.filter(p => p.cardId !== cardId);
    const renumberedPorts = remainingPorts.map((p, i) => ({ ...p, number: i + 1 }));
    onUpdate({
      ports: renumberedPorts,
      cards: cards.filter(c => c.id !== cardId)
    });
  };

  // Get column order from data or use default
  // Ensure all required columns are present (in case saved order is missing new columns like 'delete')
  const savedOrder = data.columnOrder || [];
  const columnOrder = DATA_COLUMNS.map(col => col).sort((a, b) => {
    const aIdx = savedOrder.indexOf(a);
    const bIdx = savedOrder.indexOf(b);
    // If both are in saved order, use that order
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    // If only one is in saved order, it comes first
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    // Neither in saved order, use DATA_COLUMNS order
    return DATA_COLUMNS.indexOf(a) - DATA_COLUMNS.indexOf(b);
  });

  // Group ports: by cardId or standalone (null cardId)
  const standalonePorts = data.ports.filter(p => !p.cardId);
  const portsByCard = cards.map(card => ({
    card,
    ports: data.ports.filter(p => p.cardId === card.id)
  }));

  // Calculate dynamic column widths based on port content
  const columnWidths = calculateColumnWidths(data.ports);

  // Helper to render port rows
  const renderPortRows = (ports) => (
    ports.map(port => (
      <PortRow
        key={port.id}
        port={port}
        type={portType}
        anchorSide={anchorSide}
        onUpdate={(updates) => updatePort(port.id, updates)}
        onDelete={() => deletePort(port.id)}
        anchorId={`${nodeId}-${port.id}`}
        isActive={activeWire?.from === `${nodeId}-${port.id}`}
        onAnchorClick={onAnchorClick}
        signalColor={type === 'output' ? signalColor : null}
        canToggleAnchor={canToggleAnchor}
        onToggleAnchor={onToggleAnchorSide}
        columnOrder={columnOrder}
        columnWidths={columnWidths}
        isSelected={selectedPorts.has(port.id)}
        onToggleSelection={() => togglePortSelection(port.id)}
        onBulkUpdate={bulkUpdatePorts}
        colors={colors}
      />
    ))
  );

  return (
    <div className="flex flex-col w-full border-t border-zinc-700/50">
      <SectionHeader
        type={sectionType}
        title={data.columnName}
        anchorSide={anchorSide}
        onAdd={addPort}
        onTitleChange={(value) => onUpdate({ columnName: value })}
        onDragStart={onSectionDragStart}
        onDragEnd={onSectionDragEnd}
        sectionId={sectionId}
        onApplyPreset={applyPreset}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        colors={colors}
      />

      {collapsed ? (
        /* When collapsed, render minimal port rows to maintain exact anchor column positions */
        <div className="w-full">
          {data.ports.map((port) => {
            const isReversed = anchorSide === 'right';
            const dataOrder = columnOrder || ['delete', 'port', 'connector', 'resolution', 'rate'];
            const fullColumnOrder = canToggleAnchor
              ? (isReversed ? [...dataOrder, 'anchor'].reverse() : ['anchor', ...dataOrder])
              : (isReversed ? dataOrder.reverse() : ['anchor', ...dataOrder]);

            return (
              <div key={port.id} className="flex items-center py-0.5 opacity-40 hover:opacity-100 transition-opacity">
                {fullColumnOrder.map((colId, index) => {
                  if (colId === 'anchor') {
                    return (
                      <div key={colId} className="flex items-center">
                        {index > 0 && <span className="w-px shrink-0 mx-2" />}
                        <span className="shrink-0 flex items-center justify-center" style={{ width: '24px' }}>
                          <div
                            data-anchor-id={`${nodeId}-${port.id}`}
                            data-anchor-type={type === 'input' ? 'in' : 'out'}
                            className="w-2 h-2 rounded-full cursor-pointer"
                            style={{
                              backgroundColor: type === 'input' ? '#10b981' : (signalColor || '#f59e0b'),
                              border: `1px solid ${type === 'input' ? '#34d399' : (signalColor ? `${signalColor}cc` : '#fbbf24')}`,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAnchorClick && onAnchorClick(`${nodeId}-${port.id}`, type === 'input' ? 'in' : 'out');
                            }}
                            title={`${port.label || port.id} (collapsed)`}
                          />
                        </span>
                      </div>
                    );
                  } else if (colId === 'port') {
                    const portWidth = columnWidths['port'] || 52;
                    return (
                      <div key={colId} className="flex items-center">
                        {index > 0 && <span className="w-px shrink-0 mx-2" />}
                        <span className="shrink-0 text-[10px] text-zinc-600 truncate" style={{ width: `${portWidth}px` }}>
                          {port.label || port.id}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {data.ports.length > 0 && (
            <ColumnHeaders
              anchorSide={anchorSide}
              canToggleAnchor={canToggleAnchor}
              columnOrder={columnOrder}
              columnWidths={columnWidths}
              onReorderColumns={reorderColumns}
              selectedCount={selectedPorts.size}
              totalCount={data.ports.length}
              onToggleSelectAll={toggleSelectAll}
            />
          )}

          <div className="flex-1 w-full">
            {data.ports.length === 0 ? (
              <div className={`${SIZES.PADDING_X} py-2 text-zinc-600 font-mono italic text-[11px]`}>
                No {type}s
              </div>
            ) : (
              <>
                {/* Render card-grouped ports */}
                {portsByCard.map(({ card, ports }) => (
                  <CardWrapper
                    key={card.id}
                    card={card}
                    type={sectionType}
                    anchorSide={anchorSide}
                    onToggleCollapse={toggleCardCollapse}
                    onRemoveCard={removeCard}
                    colors={colors}
                  >
                    {renderPortRows(ports)}
                  </CardWrapper>
                ))}

                {/* Render standalone ports (not in any card) */}
                {standalonePorts.length > 0 && renderPortRows(standalonePorts)}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ============================================
// SYSTEM SECTION COMPONENT
// ============================================

const SystemSection = ({
  data,
  onUpdate,
  collapsed,
  onToggleCollapse,
  onSectionDragStart,
  onSectionDragEnd,
  colors,
  constrainToColumn = false, // When true, constrain content to column width
}) => {
  // Use passed hex colors or fallback to zinc
  const colorHex = colors?.hex || HEX_COLORS.zinc[500];
  const colorHexLight = colors?.hexLight || HEX_COLORS.zinc[400];

  // Track drag state for visual feedback
  const [isDragging, setIsDragging] = useState(false);

  // Use MOUSE EVENTS instead of HTML5 drag API
  const handleMouseDown = (e) => {
    // Only left mouse button
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    setIsDragging(true);

    // Manually trigger the drag start
    onSectionDragStart && onSectionDragStart(e, 'system');

    // Global mouse handlers for drag
    const handleMouseMove = (moveEvent) => {
      moveEvent.preventDefault();
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onSectionDragEnd && onSectionDragEnd();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      className="flex flex-col border-t border-zinc-700/50"
      style={{ backgroundColor: `${colorHex}0d` }}
    >
      {/* Header row - Using MOUSE EVENTS for drag */}
      <div
        data-section-drag="true"
        onMouseDown={handleMouseDown}
        className="flex items-center px-2 py-1.5 border-b border-zinc-700/50 cursor-grab select-none"
        style={{
          backgroundColor: isDragging ? `${colorHexLight}40` : `${colorHex}1a`,
        }}
        title="Drag to reorder section"
      >
        <div className="flex items-center gap-1">
          <span
            className="font-mono font-bold text-[12px] hover:opacity-80 px-1 py-0.5 rounded whitespace-nowrap pointer-events-none"
            style={{ color: colorHexLight }}
          >
            SYSTEM
          </span>
          {/* Collapse toggle */}
          <span
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onToggleCollapse && onToggleCollapse();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            className={`text-[11px] cursor-pointer hover:opacity-80 px-0.5 rounded transition-transform shrink-0 pointer-events-auto ${collapsed ? '' : 'rotate-90'}`}
            style={{ fontFamily: 'inherit', color: colorHexLight }}
            title={collapsed ? 'Expand section' : 'Collapse section'}
          >
            ▸
          </span>
        </div>

        <span className="flex-1 pointer-events-none" />
      </div>

      {!collapsed && (
        <div className="p-2 text-[11px] w-full">
          {/* Flex wrap - adapts to width set by Input/Output sections, wraps to new rows as needed */}
          <div className="flex flex-wrap gap-1.5 w-full">
            <div className="flex flex-col gap-0.5" style={{ flex: '1 1 auto', minWidth: '80px' }}>
              <span className="text-zinc-500 font-mono text-[10px]">Manufacturer</span>
              <input
                type="text"
                value={data.manufacturer || ''}
                onChange={(e) => onUpdate({ manufacturer: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                placeholder="Manufacturer..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 font-mono text-zinc-300 text-[10px] placeholder-zinc-600"
              />
            </div>

            <div className="flex flex-col gap-0.5" style={{ flex: '1 1 auto', minWidth: '80px' }}>
              <span className="text-zinc-500 font-mono text-[10px]">Model</span>
              <input
                type="text"
                value={data.model || ''}
                onChange={(e) => onUpdate({ model: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                placeholder="Model..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 font-mono text-zinc-300 text-[10px] placeholder-zinc-600"
              />
            </div>

            <div className="flex flex-col gap-0.5" style={{ flex: '1 1 auto', minWidth: '70px' }}>
              <span className="text-zinc-500 font-mono text-[10px]">Platform</span>
              <select
                value={data.platform || 'none'}
                onChange={(e) => onUpdate({ platform: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 font-mono text-zinc-300 text-[10px]"
              >
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-0.5" style={{ flex: '1 1 auto', minWidth: '80px' }}>
              <span className="text-zinc-500 font-mono text-[10px]">Software</span>
              <select
                value={data.software || 'none'}
                onChange={(e) => onUpdate({ software: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 font-mono text-zinc-300 text-[10px]"
              >
                {SOFTWARE_PRESETS.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-0.5" style={{ flex: '1 1 auto', minWidth: '70px' }}>
              <span className="text-zinc-500 font-mono text-[10px]">Capture</span>
              <select
                value={data.captureCard || 'none'}
                onChange={(e) => onUpdate({ captureCard: e.target.value })}
                onClick={(e) => e.stopPropagation()}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 font-mono text-zinc-300 text-[10px]"
              >
                {CAPTURE_CARDS.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// TITLE BAR COMPONENT
// ============================================

const TitleBar = ({ node, onUpdate, onDelete, themeColors }) => {
  const signalColorHex = node.signalColor
    ? SIGNAL_COLORS.find(c => c.id === node.signalColor)?.hex
    : null;

  const getSoftwareLabel = () => {
    const softwareId = node.system?.software;
    if (!softwareId || softwareId === 'none') return null;
    const software = SOFTWARE_PRESETS.find(s => s.id === softwareId);
    return software ? software.label : null;
  };

  const displayTitle = () => {
    const softwareLabel = getSoftwareLabel();
    if (softwareLabel) {
      return `${softwareLabel} ${node.title}`.toUpperCase();
    }
    return node.title;
  };

  // Use theme header colors (hex values for inline styles)
  const headerHex = themeColors?.header?.hex || HEX_COLORS.zinc[700];
  const headerTextHex = themeColors?.header?.hexLight || HEX_COLORS.zinc[400];

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 border-b border-zinc-700 rounded-t-lg"
      style={{
        borderLeft: signalColorHex ? `4px solid ${signalColorHex}` : undefined,
        backgroundColor: `${headerHex}33`, // 20% opacity
      }}
    >
      {/* Library drag handle - LEFT side for preset saving */}
      <div
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData('nodeId', node.id);
          e.dataTransfer.effectAllowed = 'copy';
        }}
        className="cursor-grab px-1 text-sm shrink-0"
        style={{ color: headerTextHex }}
        title="Drag to Library to save as preset"
      >
        ⊞
      </div>

      <span className="font-mono font-bold text-sm" style={{ color: headerTextHex }}>{displayTitle()}</span>
      <input
        type="text"
        value={node.title}
        onChange={(e) => onUpdate({ title: e.target.value })}
        onClick={(e) => e.stopPropagation()}
        className="bg-transparent font-mono text-zinc-400 focus:outline-none text-[11px] w-20 opacity-50 hover:opacity-100"
        title="Edit device name"
        placeholder="Device"
      />

      <div className="flex items-center gap-1 ml-auto shrink-0">
        {/* Signal color picker */}
        <select
          value={node.signalColor || ''}
          onChange={(e) => onUpdate({ signalColor: e.target.value || null })}
          onClick={(e) => e.stopPropagation()}
          className="bg-zinc-700 border-none rounded px-1 py-0.5 text-[10px] text-zinc-300"
          title="Signal color"
          style={{ color: signalColorHex || undefined }}
        >
          <option value="">No Color</option>
          {SIGNAL_COLORS.map(color => (
            <option key={color.id} value={color.id} style={{ color: color.hex }}>
              ● {color.label}
            </option>
          ))}
        </select>

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-red-400 hover:text-red-300 ml-1 text-sm font-bold"
          title="Delete node"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// ============================================
// RESIZE HANDLE COMPONENT
// ============================================

const ResizeHandle = ({ onResizeStart }) => (
  <div
    style={{
      position: 'absolute',
      bottom: -6,
      right: -6,
      width: 12,
      height: 12,
      borderRadius: '50%',
      backgroundColor: '#3b82f6',
      opacity: 0.7,
      cursor: 'nwse-resize',
      zIndex: 20,
    }}
    onMouseDown={(e) => {
      e.stopPropagation();
      e.preventDefault();
      onResizeStart(e);
    }}
    className="hover:opacity-100 hover:scale-110 transition-all"
  />
);

// ============================================
// SUPERNODE COMPONENT
// ============================================

export default function SuperNode({ node, zoom, isSelected, onUpdate, onDelete, onAnchorClick, registerAnchor, activeWire, onSelect }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, scale: 1 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Section drag state
  const [draggedSection, setDraggedSection] = useState(null);
  const [dragOverSection, setDragOverSection] = useState(null);

  const nodeRef = useRef(null);
  const nodeScale = node.scale || 1;

  // Generate cohesive theme colors from signal color
  const themeColors = getThemeColors(node.signalColor);

  // ===========================================
  // SECTION LAYOUT RULES (STRICT)
  // ===========================================
  // 1. System section is ALWAYS in its own row (never side-by-side)
  // 2. System can only be at TOP or BOTTOM of the node
  // 3. Only Input and Output can be side-by-side
  // 4. Drop zones only appear for valid moves
  // ===========================================

  // Get rows from layout (default: all sections stacked)
  const getRows = () => {
    if (node.layout.rows) {
      return node.layout.rows;
    }
    // Fallback: convert sectionOrder to rows
    const sectionOrder = node.layout.sectionOrder || ['system', 'input', 'output'];
    return sectionOrder.map(s => [s]);
  };

  const layoutRows = getRows();

  // Register anchors so App knows which ones exist (positions computed via useLayoutEffect in App)
  // CRITICAL: Always register all anchors - we render hidden placeholder elements for collapsed sections
  // to maintain wire connections and prevent "disappearing anchor" issues
  useEffect(() => {
    if (!registerAnchor) return;
    const allPorts = [...node.inputSection.ports, ...node.outputSection.ports];
    allPorts.forEach((port) => {
      registerAnchor(`${node.id}-${port.id}`);
    });
  }, [node.inputSection.ports, node.outputSection.ports, registerAnchor, node.id]);

  // Resize handling
  const handleResizeStart = (e) => {
    setIsResizing(true);
    setResizeStart({ x: e.clientX, y: e.clientY, scale: node.scale || 1 });
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleResizeMove = (e) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      const scaleDelta = (deltaX + deltaY) / 400;
      const newScale = Math.max(0.5, Math.min(2.0, resizeStart.scale + scaleDelta));
      onUpdate({ scale: newScale });
    };

    const handleResizeEnd = () => setIsResizing(false);

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, resizeStart, onUpdate]);

  // Node drag handling
  const handleMouseDown = (e) => {
    // Check if click is within a column-drag zone (allows column reordering)
    // This must be FIRST because closest() only searches ancestors, not descendants
    // and the draggable span is a child of wrapper divs within the zone
    if (e.target.closest('[data-column-zone="true"]')) return;

    // Allow any draggable element to initiate its own drag behavior
    // Check: DOM property, draggable attribute, section drag handle, or column-drag marker
    if (e.target.draggable ||
        e.target.getAttribute?.('draggable') === 'true' ||
        e.target.closest('[draggable="true"]') ||
        e.target.closest('[data-section-drag="true"]') ||
        e.target.closest('[data-column-drag="true"]')) return;

    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') return;
    if (isResizing) return;

    e.preventDefault();
    setIsDragging(true);
    const rect = nodeRef.current.getBoundingClientRect();
    setDragStart({
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const canvas = nodeRef.current?.closest('[data-canvas]');
      if (!canvas) return;

      const canvasRect = canvas.getBoundingClientRect();
      const newX = (e.clientX - canvasRect.left - dragStart.offsetX) / zoom;
      const newY = (e.clientY - canvasRect.top - dragStart.offsetY) / zoom;

      onUpdate({
        position: {
          x: Math.max(0, newX),
          y: Math.max(0, newY)
        }
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, zoom, onUpdate]);

  // Section drag handlers
  // Supports both HTML5 drag events (Input/Output) and mouse events (System)
  const handleSectionDragStart = (e, sectionId) => {
    e.stopPropagation();
    setDraggedSection(sectionId);
    // Only set dataTransfer for HTML5 drag events (not mouse events)
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('section-reorder', sectionId);
    }
  };

  const handleSectionDragOver = (e, sectionId) => {
    // Only handle if we're actually dragging a section (not a column header)
    if (!draggedSection) return;

    e.preventDefault();
    e.stopPropagation();

    if (draggedSection === sectionId) return;

    // Check if this would be a valid drop (don't highlight invalid targets)
    // Find row info for validation
    let targetRowLength = 0;
    let draggedRowLength = 0;
    layoutRows.forEach(row => {
      if (row.includes(sectionId)) targetRowLength = row.length;
      if (row.includes(draggedSection)) draggedRowLength = row.length;
    });

    // ENFORCE: Swapping would put System side-by-side
    if (draggedSection === 'system' && targetRowLength > 1) return;
    if (sectionId === 'system' && draggedRowLength > 1) return;

    setDragOverSection(sectionId);
  };

  const handleSectionDragEnd = () => {
    setDraggedSection(null);
    setDragOverSection(null);
  };

  // Drop on section (swap positions in same row or move to different row)
  // STRICT RULE: System can only be at TOP or BOTTOM (never middle, never side-by-side)
  const handleSectionDrop = (e, targetSectionId) => {
    // Only handle if we're actually dragging a section (not a column header)
    if (!draggedSection) return;

    // Handle both HTML5 drag events and mouse events (e can be null for mouse-based drops)
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (draggedSection === targetSectionId) {
      setDraggedSection(null);
      setDragOverSection(null);
      return;
    }

    const newRows = layoutRows.map(row => [...row]);

    // Find positions
    let draggedRowIdx = -1, draggedColIdx = -1;
    let targetRowIdx = -1, targetColIdx = -1;

    newRows.forEach((row, ri) => {
      row.forEach((sid, ci) => {
        if (sid === draggedSection) { draggedRowIdx = ri; draggedColIdx = ci; }
        if (sid === targetSectionId) { targetRowIdx = ri; targetColIdx = ci; }
      });
    });

    if (draggedRowIdx === -1 || targetRowIdx === -1) {
      setDraggedSection(null);
      setDragOverSection(null);
      return;
    }

    // ENFORCE: Swapping would put System side-by-side with something
    // If System would end up in a row with 2+ sections, reject
    const draggedRowLength = newRows[draggedRowIdx].filter(Boolean).length;
    const targetRowLength = newRows[targetRowIdx].filter(Boolean).length;

    if (draggedSection === 'system' && targetRowLength > 1) {
      // System can't go into a multi-section row
      setDraggedSection(null);
      setDragOverSection(null);
      return;
    }
    if (targetSectionId === 'system' && draggedRowLength > 1) {
      // Something can't swap into System's row if dragged row has multiple sections
      // (System would end up in a multi-section row)
      setDraggedSection(null);
      setDragOverSection(null);
      return;
    }

    // Swap positions
    newRows[draggedRowIdx][draggedColIdx] = targetSectionId;
    newRows[targetRowIdx][targetColIdx] = draggedSection;

    // Clean up empty rows
    let cleanedRows = newRows
      .map(row => row.filter(s => s !== null))
      .filter(row => row.length > 0);

    onUpdate({ layout: { ...node.layout, rows: cleanedRows } });
    setDraggedSection(null);
    setDragOverSection(null);
  };

  // Drop to side (create or join column)
  // STRICT RULE: Only Input and Output can be side-by-side
  const handleDropToSide = (targetSectionId, side) => {
    if (!draggedSection || draggedSection === targetSectionId) {
      setDraggedSection(null);
      return;
    }

    // ENFORCE: System can NEVER be side-by-side with anything
    if (draggedSection === 'system' || targetSectionId === 'system') {
      setDraggedSection(null);
      setDragOverSection(null);
      return;
    }

    const newRows = layoutRows.map(row => [...row]);

    // Find positions
    let draggedRowIdx = -1, draggedColIdx = -1;
    let targetRowIdx = -1, targetColIdx = -1;

    newRows.forEach((row, ri) => {
      row.forEach((sid, ci) => {
        if (sid === draggedSection) { draggedRowIdx = ri; draggedColIdx = ci; }
        if (sid === targetSectionId) { targetRowIdx = ri; targetColIdx = ci; }
      });
    });

    if (draggedRowIdx === -1 || targetRowIdx === -1) {
      setDraggedSection(null);
      return;
    }

    // Remove dragged section from its current position
    newRows[draggedRowIdx][draggedColIdx] = null;

    // Check target row
    const targetRow = newRows[targetRowIdx];
    const targetSectionsCount = targetRow.filter(Boolean).length;

    if (targetSectionsCount === 2) {
      // Row already has 2 sections - swap with the one at the drop position
      const swapColIdx = side === 'left' ? 0 : 1;
      const swappedSection = targetRow[swapColIdx];

      // Put dragged section in the swap position
      targetRow[swapColIdx] = draggedSection;

      // Put swapped section where dragged came from
      newRows[draggedRowIdx][draggedColIdx] = swappedSection;
    } else {
      // Row has 1 section - add dragged section to create columns
      if (side === 'left') {
        // Insert at beginning
        targetRow.unshift(draggedSection);
      } else {
        // Add at end
        targetRow.push(draggedSection);
      }

      // Ensure max 2
      while (targetRow.length > 2) {
        targetRow.pop();
      }
    }

    // Clean up: remove nulls and empty rows
    const cleanedRows = newRows
      .map(row => row.filter(s => s !== null))
      .filter(row => row.length > 0);

    onUpdate({ layout: { ...node.layout, rows: cleanedRows } });
    setDraggedSection(null);
    setDragOverSection(null);
  };

  // Drop to bottom (create new row at bottom)
  // CONSTRAINT: System always goes to very bottom; IO inserts above system if system is at bottom
  const handleDropToBottom = () => {
    if (!draggedSection) return;

    const newRows = layoutRows.map(row => [...row]);

    // Find and remove dragged section from its current position
    newRows.forEach((row) => {
      const idx = row.indexOf(draggedSection);
      if (idx !== -1) {
        row[idx] = null;
      }
    });

    // Clean up nulls first
    let cleanedRows = newRows
      .map(row => row.filter(s => s !== null))
      .filter(row => row.length > 0);

    // If dragging system, it goes to very bottom
    if (draggedSection === 'system') {
      cleanedRows.push([draggedSection]);
    } else {
      // IO section: check if system is at bottom - if so, insert ABOVE it
      const lastRow = cleanedRows[cleanedRows.length - 1];
      if (lastRow && lastRow.includes('system')) {
        cleanedRows.splice(cleanedRows.length - 1, 0, [draggedSection]);
      } else {
        cleanedRows.push([draggedSection]);
      }
    }

    onUpdate({ layout: { ...node.layout, rows: cleanedRows } });
    setDraggedSection(null);
    setDragOverSection(null);
  };

  // Drop to top (create new row at top)
  // CONSTRAINT: Only System section can drop to top position
  const handleDropToTop = () => {
    if (!draggedSection) return;
    // Only System section can use the top drop zone
    if (draggedSection !== 'system') return;

    const newRows = layoutRows.map(row => [...row]);

    // Find and remove dragged section from its current position
    newRows.forEach((row) => {
      const idx = row.indexOf(draggedSection);
      if (idx !== -1) {
        row[idx] = null;
      }
    });

    // Clean up nulls first
    let cleanedRows = newRows
      .map(row => row.filter(s => s !== null))
      .filter(row => row.length > 0);

    // System goes to very top
    cleanedRows.unshift([draggedSection]);

    onUpdate({ layout: { ...node.layout, rows: cleanedRows } });
    setDraggedSection(null);
    setDragOverSection(null);
  };

  // Get anchor side for a section based on its position
  const getAnchorSide = (sectionId, rowIndex, colIndex, isSingleSectionRow) => {
    if (!isSingleSectionRow) {
      // In columns: left col = left anchors, right col = right anchors
      return colIndex === 0 ? 'left' : 'right';
    }
    // Single section row: use stored preference
    if (sectionId === 'input') return node.layout.inputAnchorSide || 'left';
    if (sectionId === 'output') return node.layout.outputAnchorSide || 'right';
    return 'left';
  };

  // Check if two sections are in the same row (side-by-side)
  const areInSameRow = (section1, section2) => {
    return layoutRows.some(row => row.includes(section1) && row.includes(section2));
  };

  // Anchor side toggles
  const toggleInputAnchorSide = () => {
    onUpdate({
      layout: {
        ...node.layout,
        inputAnchorSide: node.layout.inputAnchorSide === 'right' ? 'left' : 'right'
      }
    });
  };

  const toggleOutputAnchorSide = () => {
    onUpdate({
      layout: {
        ...node.layout,
        outputAnchorSide: node.layout.outputAnchorSide === 'left' ? 'right' : 'left'
      }
    });
  };

  // Check if Input and Output are in the same row (side-by-side)
  const areIOSideBySide = areInSameRow('input', 'output');

  // Render section content
  const renderSectionContent = (sectionId, anchorSide, canToggleAnchor) => {
    switch (sectionId) {
      case 'system':
        return (
          <SystemSection
            data={node.system}
            onUpdate={(updates) => onUpdate({ system: { ...node.system, ...updates } })}
            collapsed={node.layout.systemCollapsed}
            onToggleCollapse={() => onUpdate({ layout: { ...node.layout, systemCollapsed: !node.layout.systemCollapsed } })}
            onSectionDragStart={handleSectionDragStart}
            onSectionDragEnd={handleSectionDragEnd}
            colors={themeColors.system}
            constrainToColumn={false}
          />
        );
      case 'input':
        return (
          <IOSection
            type="input"
            data={node.inputSection}
            anchorSide={anchorSide}
            nodeId={node.id}
            activeWire={activeWire}
            onAnchorClick={onAnchorClick}
            onUpdate={(updates) => onUpdate({ inputSection: { ...node.inputSection, ...updates } })}
            canToggleAnchor={canToggleAnchor}
            onToggleAnchorSide={toggleInputAnchorSide}
            onSectionDragStart={handleSectionDragStart}
            onSectionDragEnd={handleSectionDragEnd}
            collapsed={node.layout.inputCollapsed}
            onToggleCollapse={() => onUpdate({ layout: { ...node.layout, inputCollapsed: !node.layout.inputCollapsed } })}
            colors={themeColors.input}
          />
        );
      case 'output':
        return (
          <IOSection
            type="output"
            data={node.outputSection}
            anchorSide={anchorSide}
            nodeId={node.id}
            activeWire={activeWire}
            onAnchorClick={onAnchorClick}
            onUpdate={(updates) => onUpdate({ outputSection: { ...node.outputSection, ...updates } })}
            signalColor={node.signalColor}
            canToggleAnchor={canToggleAnchor}
            onToggleAnchorSide={toggleOutputAnchorSide}
            onSectionDragStart={handleSectionDragStart}
            onSectionDragEnd={handleSectionDragEnd}
            collapsed={node.layout.outputCollapsed}
            onToggleCollapse={() => onUpdate({ layout: { ...node.layout, outputCollapsed: !node.layout.outputCollapsed } })}
            colors={themeColors.output}
          />
        );
      default:
        return null;
    }
  };

  // Handle click to select (shift+click to add to selection)
  const handleClick = (e) => {
    if (onSelect && !isDragging) {
      e.stopPropagation();
      onSelect(node.id, e.shiftKey);
    }
  };

  return (
    <div
      ref={nodeRef}
      className={`absolute bg-zinc-900 border rounded-lg shadow-xl select-none ${
        isSelected ? 'border-cyan-400 ring-2 ring-cyan-500/50' : 'border-zinc-700'
      } ${
        isDragging ? 'cursor-grabbing ring-2 ring-cyan-500/50' : isResizing ? 'ring-2 ring-blue-500/50' : 'cursor-grab'
      }`}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: 'auto',
        minWidth: 320,
        zIndex: isDragging || isResizing ? 100 : isSelected ? 80 : 70,
        transform: `scale(${nodeScale})`,
        transformOrigin: 'top left',
        isolation: 'isolate', // Create new stacking context
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <TitleBar node={node} onUpdate={onUpdate} onDelete={onDelete} themeColors={themeColors} />

      {/* Row-based layout */}
      <div className="flex flex-col">
        {/* Top drop zone - visible when dragging System and System is not already at top */}
        {(() => {
          // Only show for System section drag
          if (draggedSection !== 'system') return null;

          // Check if system is already solo at top
          const firstRow = layoutRows[0];
          const systemAlreadyAtTop = firstRow?.length === 1 && firstRow[0] === 'system';

          if (systemAlreadyAtTop) return null;

          return <TopDropZone onDrop={handleDropToTop} />;
        })()}

        {layoutRows.map((row, rowIndex) => {
          const isSingleSectionRow = row.length === 1;
          // Use content-based key for stable React reconciliation
          // This prevents event handler issues when sections move between positions
          const rowKey = row.join('-');

          return (
            <div key={rowKey} className={`flex ${!isSingleSectionRow ? 'gap-3' : ''}`}>
              {row.map((sectionId, colIndex) => {
                if (!sectionId) return null;

                const anchorSide = getAnchorSide(sectionId, rowIndex, colIndex, isSingleSectionRow);
                const canToggleAnchor = isSingleSectionRow && sectionId !== 'system';
                // Side drop zones only when:
                // 1. Dragging an IO section (not system)
                // 2. Target is IO section (not system)
                // 3. Target is not the dragged section
                // 4. NOT already side-by-side (if same row, just swap - no zones needed)
                // STRICT RULE: System can NEVER be side-by-side
                const isDraggingIO = draggedSection === 'input' || draggedSection === 'output';
                const isTargetIO = sectionId === 'input' || sectionId === 'output';
                const showSideDropZones = draggedSection &&
                  isDraggingIO &&
                  isTargetIO &&
                  draggedSection !== sectionId &&
                  !areInSameRow(draggedSection, sectionId);

                // Force React to REMOUNT SystemSection when row position changes
                // This ensures event handlers are freshly attached
                if (sectionId === 'system') {
                  return (
                    <div
                      key={`system-row-${rowIndex}`}
                      className={isSingleSectionRow ? 'w-full' : 'flex-1'}
                      style={{ position: 'relative', zIndex: 9999, isolation: 'isolate' }}
                      onDragOver={(e) => handleSectionDragOver(e, 'system')}
                      onDrop={(e) => handleSectionDrop(e, 'system')}
                      // Also support mouse-based drops
                      onMouseUp={() => handleSectionDrop(null, 'system')}
                    >
                      {renderSectionContent(sectionId, anchorSide, canToggleAnchor)}
                    </div>
                  );
                }

                return (
                  <div
                    key={sectionId}
                    className={isSingleSectionRow ? 'w-full' : 'flex-1'}
                  >
                    <DraggableSection
                      sectionId={sectionId}
                      anchorSide={anchorSide}
                      onDragStart={handleSectionDragStart}
                      onDragOver={handleSectionDragOver}
                      onDragEnd={handleSectionDragEnd}
                      onDrop={handleSectionDrop}
                      onDropToSide={handleDropToSide}
                      isDragging={draggedSection === sectionId}
                      isDraggedOver={dragOverSection === sectionId}
                      showSideDropZones={showSideDropZones}
                      isSingleSectionRow={isSingleSectionRow}
                      draggedSection={draggedSection}
                    >
                      {renderSectionContent(sectionId, anchorSide, canToggleAnchor)}
                    </DraggableSection>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Bottom drop zone - visible when dragging any section to a new bottom row */}
        {(() => {
          if (!draggedSection) return null;

          const lastRow = layoutRows[layoutRows.length - 1];
          const isSystemAlreadyAtBottom = lastRow?.length === 1 && lastRow[0] === 'system';

          // System: show bottom zone only if not already at bottom
          if (draggedSection === 'system') {
            return !isSystemAlreadyAtBottom ? <BottomDropZone onDrop={handleDropToBottom} /> : null;
          }

          // IO sections: always show bottom zone (they can always move to bottom)
          return <BottomDropZone onDrop={handleDropToBottom} />;
        })()}
      </div>

      <ResizeHandle onResizeStart={handleResizeStart} />

      {nodeScale !== 1 && (
        <div
          className="absolute -bottom-5 left-0 text-[10px] font-mono text-zinc-500"
          style={{ transform: `scale(${1 / nodeScale})`, transformOrigin: 'top left' }}
        >
          {Math.round(nodeScale * 100)}%
        </div>
      )}
    </div>
  );
}
