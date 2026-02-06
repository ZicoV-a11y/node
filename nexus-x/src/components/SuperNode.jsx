import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo, memo, Fragment } from 'react';

// ============================================
// CONSTANTS - Single source of truth for sizes
// ============================================

const SIZES = {
  ANCHOR: 'w-3 h-3',        // 12px
  DELETE: 'w-4',            // 16px
  PADDING_X: 'px-1.5',      // slightly tighter
  PADDING_Y: 'py-1',        // slightly tighter
  ROW_HEIGHT: 30,           // Approximate row height in pixels
  SPACING_SNAP: 15,         // Snap spacing to half-row increments (ROW_HEIGHT / 2)
};

// Colors per section type
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

// Signal colors lookup Map for O(1) access by id
const SIGNAL_COLORS_BY_ID = new Map(SIGNAL_COLORS.map(c => [c.id, c]));

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

// Common input field className for consistency
const INPUT_FIELD_CLASS = "w-full bg-zinc-800 border border-zinc-700 rounded px-1.5 py-1 font-mono text-zinc-300 text-[10px] placeholder-zinc-600";

// System section wrapper style (static)
const SYSTEM_WRAPPER_STYLE = { position: 'relative', zIndex: 1, isolation: 'isolate' };

// Checkmark button size (static)
const CHECKMARK_BUTTON_STYLE = { width: '28px', height: '28px' };

// Drop zone z-index style (static)
const DROP_ZONE_STYLE = { zIndex: 10000 };

// Spacing column width style (static)
const SPACING_COLUMN_STYLE = { width: '24px' };

// Spacing drag handle style (static)
const SPACING_HANDLE_STYLE = {
  width: '20px',
  height: '20px',
  background: '#27272a',
  border: '1px solid #3f3f46',
  borderRadius: '3px',
  color: HEX_COLORS.zinc[500],
  fontSize: '16px',
  fontWeight: 'bold',
  cursor: 'ns-resize',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: '1',
  transition: 'all 0.2s',
  userSelect: 'none',
};

// Utility function to convert hex color to rgba (extracted to avoid duplication)
const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Dark color scheme style for select elements (static)
const DARK_COLOR_SCHEME_STYLE = { colorScheme: 'dark' };

// White text color style (static)
const WHITE_TEXT_STYLE = { color: '#ffffff' };

// Shared event handlers (prevents anonymous function creation)
const stopPropagation = (e) => e.stopPropagation();

// Helper to check if section is INPUT or OUTPUT (not SYSTEM)
const isIOSectionType = (sectionId) => sectionId === 'input' || sectionId === 'output';

// Reusable drag-and-drop reorder hook (used by ColumnHeaders and CollapsedColumnHeaders)
function useDragReorder(order, onReorder) {
  const [draggedItem, setDraggedItem] = useState(null);

  const handleDragStart = useCallback((e, itemId) => {
    e.stopPropagation();
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('reorder', itemId);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem || draggedItem === targetId || !onReorder) {
      setDraggedItem(null);
      return;
    }
    const newOrder = [...order];
    const dragIdx = newOrder.indexOf(draggedItem);
    const targetIdx = newOrder.indexOf(targetId);
    if (dragIdx === -1 || targetIdx === -1) {
      setDraggedItem(null);
      return;
    }
    newOrder.splice(dragIdx, 1);
    newOrder.splice(targetIdx, 0, draggedItem);
    onReorder(newOrder);
    setDraggedItem(null);
  }, [draggedItem, order, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
  }, []);

  return { draggedItem, handleDragStart, handleDragOver, handleDrop, handleDragEnd };
}

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

const MANUFACTURERS = [
  'Barco', 'Black Magic', 'AJA', 'Apple', 'Dell', 'HP', 'Lenovo', 'Custom...'
];

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

// Pre-mapped label arrays (computed once at module load)
const SOFTWARE_PRESET_LABELS = SOFTWARE_PRESETS.map(s => s.label);
const CAPTURE_CARD_LABELS = CAPTURE_CARDS.map(c => c.label);

// Pre-mapped lookup Maps for O(1) access by id
const SOFTWARE_PRESETS_BY_ID = new Map(SOFTWARE_PRESETS.map(s => [s.id, s]));

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

const SelectWithCustom = memo(({
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

  const baseStyle = `bg-zinc-800 border rounded px-1 py-0.5 font-mono text-[11px] w-full max-w-full overflow-hidden text-ellipsis text-center ${
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
          onClick={stopPropagation}
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
      onClick={stopPropagation}
      className={`${baseStyle} ${className}`}
    >
      <option value="">{placeholder}</option>
      {/* Show custom value as first option if it exists */}
      {isCustomValue && (
        <option value={value}>{value}</option>
      )}
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
});
SelectWithCustom.displayName = 'SelectWithCustom';

// ============================================
// CARD WRAPPER COMPONENT
// Symmetrical visual wrapper - colored stripe on anchor side
// Minimal header that doesn't break column alignment
// ============================================

const CardWrapper = memo(({
  card,
  children,
  onToggleCollapse,
  onRemoveCard,
  anchorSide,
  colors: passedColors
}) => {
  // Use passed hex colors or fallback to zinc (memoized)
  const colorHex = useMemo(() => passedColors?.hex || HEX_COLORS.zinc[500], [passedColors?.hex]);
  const colorHexLight = useMemo(() => passedColors?.hexLight || HEX_COLORS.zinc[400], [passedColors?.hexLight]);
  const isReversed = anchorSide === 'right';

  // Memoized style objects (prevent recreation on every render)
  const stripeStyle = useMemo(() => ({ backgroundColor: `${colorHex}66` }), [colorHex]);
  const labelBarStyle = useMemo(() => ({ backgroundColor: `${colorHex}1a` }), [colorHex]);
  const iconStyle = useMemo(() => ({ color: colorHexLight }), [colorHexLight]);
  const nameStyle = useMemo(() => ({ color: colorHexLight }), [colorHexLight]);

  // Memoized event handlers
  const handleToggle = useCallback(() => onToggleCollapse && onToggleCollapse(card.id), [onToggleCollapse, card.id]);
  const handleRemove = useCallback((e) => {
    e.stopPropagation();
    onRemoveCard && onRemoveCard(card.id);
  }, [onRemoveCard, card.id]);

  return (
    <div className="relative">
      {/* Colored stripe indicator on anchor side */}
      <div
        className={`absolute top-0 bottom-0 w-1 ${isReversed ? 'right-0' : 'left-0'}`}
        style={stripeStyle}
      />

      {/* Card label bar - minimal, symmetric */}
      <div
        className={`
          flex items-center justify-between
          py-0.5 text-[9px] font-mono
          cursor-pointer select-none
          px-1
          ${isReversed ? 'flex-row-reverse' : ''}
        `}
        style={labelBarStyle}
        onClick={handleToggle}
      >
        {/* Left/anchor side: collapse + name */}
        <div className={`flex items-center gap-1 ${isReversed ? 'flex-row-reverse' : ''}`}>
          <span
            className={`transition-transform ${card.collapsed ? '' : 'rotate-90'}`}
            style={iconStyle}
          >
            ▶
          </span>
          <span className="font-bold tracking-wider" style={nameStyle}>
            {card.name}
          </span>
          <span className="text-zinc-500 bg-zinc-700/50 px-1 rounded">
            {card.portCount}p
          </span>
        </div>

        {/* Right side: remove button */}
        <button
          onClick={handleRemove}
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
});
CardWrapper.displayName = 'CardWrapper';

// Column definitions - ALL row elements as columns for template layout
// minWidth is the minimum, but columns can grow based on content
const COLUMN_DEFS = {
  spacing: { id: 'spacing', label: '', minWidth: 20, draggable: false },
  anchor: { id: 'anchor', label: '', minWidth: 24, draggable: true },
  delete: { id: 'delete', label: '🗑', minWidth: 32, draggable: true },
  port: { id: 'port', label: 'Port', minWidth: 52, draggable: true },
  source: { id: 'source', label: 'Source', minWidth: 90, draggable: true },
  destination: { id: 'destination', label: 'Destination', minWidth: 90, draggable: true },
  connector: { id: 'connector', label: 'Connector', minWidth: 90, draggable: true },
  resolution: { id: 'resolution', label: 'Resolution', minWidth: 90, draggable: true },
  rate: { id: 'rate', label: 'Rate', minWidth: 60, draggable: true },
  flip: { id: 'flip', label: '', minWidth: 42, draggable: true },
};

// Collapsed view column configuration
const COLLAPSED_ELIGIBLE_COLUMNS = ['port', 'source', 'destination', 'connector', 'resolution', 'rate'];
const DEFAULT_COLLAPSED_COLUMNS_INPUT = ['port', 'source'];
const DEFAULT_COLLAPSED_COLUMNS_OUTPUT = ['port', 'destination'];
const MAX_COLLAPSED_COLUMNS = 3;
const MIN_COLLAPSED_COLUMNS = 1;

// Fixed widths for collapsed columns (ensures header/data alignment)
const COLLAPSED_COLUMN_WIDTHS = {
  port: 45,
  source: 90,
  destination: 90,
  connector: 50,
  resolution: 75,
  rate: 45,
};

// Width calculation constants
const CHAR_WIDTH = 7; // Character width for text estimation
const PADDING = 16; // Padding inside cells
const DROPDOWN_ARROW_WIDTH = 20; // Width reserved for native select dropdown arrow
const SEPARATOR_WIDTH = 9; // 1px content + 8px margins (mx-2)

const estimateTextWidth = (text, isDropdown = false) => {
  if (!text) return 0;
  const baseWidth = text.length * CHAR_WIDTH + PADDING;
  const width = isDropdown ? baseWidth + DROPDOWN_ARROW_WIDTH : baseWidth;
  // Return calculated width without artificial cap - let node expand to fit all columns
  return width;
};

// Calculate dynamic column widths based on port data
const calculateColumnWidths = (ports) => {
  const widths = {
    spacing: COLUMN_DEFS.spacing.minWidth,
    anchor: COLUMN_DEFS.anchor.minWidth,
    delete: COLUMN_DEFS.delete.minWidth,
    port: COLUMN_DEFS.port.minWidth,
    source: COLUMN_DEFS.source.minWidth,
    destination: COLUMN_DEFS.destination.minWidth,
    connector: COLUMN_DEFS.connector.minWidth,
    resolution: COLUMN_DEFS.resolution.minWidth,
    rate: COLUMN_DEFS.rate.minWidth,
    flip: COLUMN_DEFS.flip.minWidth,
  };

  // Also consider header labels and placeholder text (with dropdown arrow width)
  widths.source = Math.max(widths.source, estimateTextWidth('Source', true));
  widths.destination = Math.max(widths.destination, estimateTextWidth('Destination', true));
  widths.connector = Math.max(widths.connector, estimateTextWidth('Connector', true), estimateTextWidth('Type', true));
  widths.resolution = Math.max(widths.resolution, estimateTextWidth('Resolution', true), estimateTextWidth('Choose', true));
  widths.rate = Math.max(widths.rate, estimateTextWidth('Rate', true), estimateTextWidth('Choose', true));

  // Scan all ports to find max width needed (with dropdown arrow width)
  ports.forEach(port => {
    if (port.source) {
      widths.source = Math.max(widths.source, estimateTextWidth(port.source, true));
    }
    if (port.destination) {
      widths.destination = Math.max(widths.destination, estimateTextWidth(port.destination, true));
    }
    if (port.connector) {
      widths.connector = Math.max(widths.connector, estimateTextWidth(port.connector, true));
    }
    if (port.resolution) {
      widths.resolution = Math.max(widths.resolution, estimateTextWidth(port.resolution, true));
    }
    if (port.refreshRate) {
      widths.rate = Math.max(widths.rate, estimateTextWidth(port.refreshRate, true));
    }
  });

  // Make source and destination use the same width for alignment
  const maxSourceDestWidth = Math.max(widths.source, widths.destination);
  widths.source = maxSourceDestWidth;
  widths.destination = maxSourceDestWidth;

  return widths;
};

// Data columns that can be reordered by dragging (includes delete)
const DATA_COLUMNS = ['delete', 'port', 'connector', 'resolution', 'rate'];

// Build full column order based on mode
// Spacing positioned between anchor and port columns
const getFullColumnOrder = (dataOrder, canToggleAnchor, isReversed) => {
  // Base order: anchor, data columns (includes delete, port, etc.), flip (if stacked)
  const baseOrder = canToggleAnchor
    ? ['anchor', ...dataOrder, 'flip']
    : ['anchor', ...dataOrder];

  // Insert spacing after anchor (between anchor and delete/port)
  const withSpacing = [baseOrder[0], 'spacing', ...baseOrder.slice(1)];

  // Reverse if anchor is on right
  return isReversed ? [...withSpacing].reverse() : withSpacing;
};

// ============================================
// SIDE DROP ZONE COMPONENT
// Two modes:
// - Full width for side-by-side swap (covers entire section)
// - Edge mode for adding to side (small edge indicator)
// ============================================

const SideDropZone = memo(({ side, onDrop, fullWidth = false }) => (
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
    className={`absolute top-0 bottom-0 ${side === 'left' ? 'left-0' : 'right-0'} ${fullWidth ? 'w-full' : 'w-16'}
      border-4 border-dashed transition-all flex items-center justify-center
      border-emerald-400 bg-emerald-400/30 hover:bg-emerald-400/50 animate-pulse cursor-pointer px-1`}
    style={DROP_ZONE_STYLE}
  >
    <span className="text-emerald-200 text-[10px] font-bold pointer-events-none uppercase">
      {fullWidth
        ? (side === 'left' ? '◄◄◄ SWAP ◄◄◄' : '►►► SWAP ►►►')
        : (side === 'left' ? '◄ DROP' : 'DROP ►')
      }
    </span>
  </div>
));
SideDropZone.displayName = 'SideDropZone';

// ============================================
// THREE ZONE DROP AREA COMPONENT
// For stacked mode: shows left, center (swap), and right zones
// ============================================

const ThreeZoneDropArea = memo(({ onDropToSide, onDropToSwap }) => (
  <div className="absolute inset-0 flex" style={DROP_ZONE_STYLE}>
    {/* LEFT ZONE */}
    <div
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDropToSide('left'); }}
      onMouseUp={() => { onDropToSide('left'); }}
      className="flex-1 border-4 border-dashed border-emerald-400 bg-emerald-400/30
        hover:bg-emerald-400/50 animate-pulse cursor-pointer flex items-center justify-center"
    >
      <span className="text-emerald-200 text-[10px] font-bold pointer-events-none uppercase">
        ◄◄◄ LEFT
      </span>
    </div>

    {/* CENTER ZONE (SWAP) */}
    <div
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDropToSwap(); }}
      onMouseUp={() => { onDropToSwap(); }}
      className="flex-1 border-4 border-dashed border-cyan-400 bg-cyan-400/30
        hover:bg-cyan-400/50 animate-pulse cursor-pointer flex items-center justify-center mx-1"
    >
      <span className="text-cyan-200 text-[10px] font-bold pointer-events-none uppercase">
        ⇅ SWAP ⇅
      </span>
    </div>

    {/* RIGHT ZONE */}
    <div
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDropToSide('right'); }}
      onMouseUp={() => { onDropToSide('right'); }}
      className="flex-1 border-4 border-dashed border-emerald-400 bg-emerald-400/30
        hover:bg-emerald-400/50 animate-pulse cursor-pointer flex items-center justify-center"
    >
      <span className="text-emerald-200 text-[10px] font-bold pointer-events-none uppercase">
        RIGHT ►►►
      </span>
    </div>
  </div>
));
ThreeZoneDropArea.displayName = 'ThreeZoneDropArea';

// ============================================
// BOTTOM DROP ZONE COMPONENT
// Appears at bottom when dragging to add new row
// ============================================

const BottomDropZone = memo(({ onDrop }) => (
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
    className="w-full h-16 border-4 border-dashed border-emerald-400 bg-emerald-400/30
      flex items-center justify-center hover:bg-emerald-400/50 transition-all cursor-pointer
      animate-pulse px-2"
    style={DROP_ZONE_STYLE}
  >
    <span className="text-emerald-200 text-[10px] font-bold pointer-events-none uppercase truncate">
      ▼▼▼ DROP TO BOTTOM ▼▼▼
    </span>
  </div>
));
BottomDropZone.displayName = 'BottomDropZone';

// ============================================
// TOP DROP ZONE COMPONENT
// Appears at top when dragging System section to move it to top position
// ============================================

const TopDropZone = memo(({ onDrop }) => (
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
    className="w-full h-16 border-4 border-dashed border-emerald-400 bg-emerald-400/30
      flex items-center justify-center hover:bg-emerald-400/50 transition-all cursor-pointer mb-2
      animate-pulse px-2"
    style={DROP_ZONE_STYLE}
  >
    <span className="text-emerald-200 text-[10px] font-bold pointer-events-none uppercase truncate">▲▲▲ DROP TO TOP ▲▲▲</span>
  </div>
));
TopDropZone.displayName = 'TopDropZone';

// ============================================
// ANCHOR COMPONENT
// ============================================

// Visible anchor point built into the node column
const Anchor = memo(({ anchorId, type, isActive, onClick, signalColor, isConnected, themeColor }) => {
  const isInput = type === 'in';

  // Use theme color if provided, otherwise fallback to signal color or default (memoized)
  const baseColor = useMemo(
    () => themeColor || (isInput ? HEX_COLORS.zinc[500] : (signalColor || HEX_COLORS.zinc[500])),
    [themeColor, isInput, signalColor]
  );
  const lightColor = useMemo(
    () => themeColor ? `${themeColor}cc` : (isInput ? HEX_COLORS.zinc[400] : (signalColor ? `${signalColor}cc` : HEX_COLORS.zinc[400])),
    [themeColor, isInput, signalColor]
  );

  const handleMouseDown = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault(); // Prevent the subsequent click event
    // Start wire connection
    onClick && onClick(anchorId, type);
  }, [onClick, anchorId, type]);

  // Determine if anchor should be "lit" - when connected or actively being used
  const isLit = isConnected || isActive;

  // Memoized style object (prevents recreation on every render)
  const anchorStyle = useMemo(() => ({
    width: isActive ? '8px' : '7px',
    height: isActive ? '8px' : '7px',
    backgroundColor: isLit ? baseColor : HEX_COLORS.zinc[600], // zinc-600 when off
    border: `1px solid ${isLit ? lightColor : HEX_COLORS.zinc[500]}`, // zinc-500 when off
    boxShadow: isLit ? (isActive ? `0 0 6px ${baseColor}` : `0 0 3px ${baseColor}66`) : 'none',
    opacity: isLit ? 1 : 0.4
  }), [isActive, isLit, baseColor, lightColor]);

  return (
    <div
      data-anchor-id={anchorId}
      data-anchor-type={type}
      className="rounded-full transition-all cursor-pointer select-none"
      onMouseDown={handleMouseDown}
      style={anchorStyle}
    />
  );
});
Anchor.displayName = 'Anchor';

// ============================================
// DELETE BUTTON COMPONENT
// ============================================

const DeleteButton = memo(({ onClick }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick && onClick();
    }}
    className={`opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 ${SIZES.DELETE} shrink-0 text-center`}
  >
    ×
  </button>
));
DeleteButton.displayName = 'DeleteButton';

// ============================================
// PORT ROW COMPONENT
// Unified column structure - matches ColumnHeaders exactly
// ALL columns render in same order with markers between
// ============================================

const PortRow = memo(({
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
  connectedAnchorIds,
  themeColor,
  onSpacingMouseDown, // Handler for spacing drag
}) => {
  const isInput = type === 'in';
  const isReversed = anchorSide === 'right';

  // Memoized color fallback
  const colorHexLight = useMemo(() => passedColors?.hexLight || HEX_COLORS.zinc[400], [passedColors?.hexLight]);

  // Memoized connection check
  const isConnected = useMemo(
    () => connectedAnchorIds ? connectedAnchorIds.has(anchorId) : false,
    [connectedAnchorIds, anchorId]
  );

  // Memoized column order
  const dataOrder = useMemo(() => columnOrder || DATA_COLUMNS, [columnOrder]);

  // Memoized full column order with reversal
  const fullColumnOrder = useMemo(
    () => getFullColumnOrder(dataOrder, canToggleAnchor, isReversed),
    [dataOrder, canToggleAnchor, isReversed]
  );

  // Generic memoized handler for field changes (bulk or single update)
  const handleFieldChange = useCallback((field, value) => {
    if (isSelected && onBulkUpdate) {
      onBulkUpdate(field, value);
    } else {
      onUpdate({ [field]: value });
    }
  }, [isSelected, onBulkUpdate, onUpdate]);

  // Render column content based on column ID
  const renderColumnContent = (colId) => {
    const colDef = COLUMN_DEFS[colId];
    if (!colDef) return null;

    switch (colId) {
      case 'spacing':
        return (
          <div
            className="spacing-drag-handle nodrag"
            onMouseDown={(e) => onSpacingMouseDown && onSpacingMouseDown(e, port.id, port.spacing || 0)}
            title="Drag down to move row and create space above"
            style={SPACING_HANDLE_STYLE}
          >
            ⋮
          </div>
        );
      case 'anchor':
        return (
          <Anchor
            anchorId={anchorId}
            type={type}
            isActive={isActive}
            signalColor={signalColor}
            onClick={onAnchorClick}
            isConnected={isConnected}
            themeColor={themeColor}
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
            onChange={(value) => handleFieldChange('connector', value)}
          />
        );
      case 'resolution':
        return (
          <SelectWithCustom
            value={port.resolution || ''}
            options={RESOLUTIONS}
            placeholder="Choose"
            isSelected={isSelected}
            onChange={(value) => handleFieldChange('resolution', value)}
          />
        );
      case 'rate':
        return (
          <SelectWithCustom
            value={port.refreshRate || ''}
            options={REFRESH_RATES}
            placeholder="Choose"
            isSelected={isSelected}
            onChange={(value) => handleFieldChange('refreshRate', value)}
          />
        );
      case 'source':
        return (
          <SelectWithCustom
            value={port.source || ''}
            options={['Custom...']}
            placeholder="Source"
            isSelected={isSelected}
            onChange={(value) => handleFieldChange('source', value)}
          />
        );
      case 'destination':
        return (
          <SelectWithCustom
            value={port.destination || ''}
            options={['Custom...']}
            placeholder="Destination"
            isSelected={isSelected}
            onChange={(value) => handleFieldChange('destination', value)}
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
    <div
      className={`flex items-center ${SIZES.PADDING_Y} hover:bg-zinc-800/50 group text-[12px] whitespace-nowrap px-2`}
    >
      {fullColumnOrder.map((colId, index) => {
        const colDef = COLUMN_DEFS[colId];
        if (!colDef) return null;

        return (
          <div key={colId} className="flex items-center">
            {/* Divider between columns (except before first) */}
            {index > 0 && (
              <span className="w-px h-4 bg-zinc-600/40 shrink-0 mx-2" />
            )}
            <span
              className="shrink-0 flex items-center justify-center"
              style={{ minWidth: `${getColumnWidth(colId)}px` }}
            >
              {renderColumnContent(colId)}
            </span>
          </div>
        );
      })}
    </div>
  );
});
PortRow.displayName = 'PortRow';

// ============================================
// COLUMN HEADERS COMPONENT
// Unified column structure - matches PortRow exactly
// ============================================

const ColumnHeaders = memo(({ anchorSide, canToggleAnchor, columnOrder, onReorderColumns, selectedCount = 0, totalCount = 0, onToggleSelectAll, columnWidths = {} }) => {
  const isReversed = anchorSide === 'right';

  // Get width for a column (use dynamic width if available, else minWidth)
  const getColumnWidth = useCallback((colId) => {
    return columnWidths[colId] || COLUMN_DEFS[colId]?.minWidth || 60;
  }, [columnWidths]);

  // Use provided columnOrder or default
  const dataOrder = columnOrder || DATA_COLUMNS;

  // Drag-and-drop reordering (shared hook)
  const { draggedItem: draggedColumn, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragReorder(dataOrder, onReorderColumns);

  // Selection state indicator
  const getSelectionIndicator = useCallback(() => {
    if (totalCount === 0) return '☐';
    if (selectedCount === 0) return '☐';
    if (selectedCount === totalCount) return '☑';
    return '▣'; // Partial selection
  }, [totalCount, selectedCount]);

  // Get full column order (anchor, delete, data, flip) with proper reversal
  const fullColumnOrder = getFullColumnOrder(dataOrder, canToggleAnchor, isReversed);

  // Pre-compute column width styles (prevents calling getColumnWidth twice per column)
  const columnStyles = useMemo(() => {
    const styles = {};
    fullColumnOrder.forEach(colId => {
      const width = getColumnWidth(colId);
      styles[colId] = { minWidth: `${width}px` };
    });
    return styles;
  }, [fullColumnOrder, getColumnWidth]);

  return (
    <div
      data-column-zone="true"
      className={`flex items-center py-1 bg-zinc-800/30 border-b border-zinc-700/30
        text-[10px] font-mono text-white uppercase tracking-wide w-full px-2`}
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
            {/* Divider between columns (except before first) */}
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
                  selectedCount > 0 ? 'text-cyan-400' : 'text-white hover:text-zinc-300'
                } ${isDragging ? 'opacity-50' : ''}`}
                style={columnStyles[colId]}
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
                style={columnStyles[colId]}
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
});
ColumnHeaders.displayName = 'ColumnHeaders';

// ============================================
// COLLAPSED COLUMN SELECTOR
// Dropdown to choose which columns appear in collapsed mode
// ============================================

const CollapsedColumnSelector = memo(({ sectionType, currentColumns, onColumnsChange, onClose }) => {
  // Filter eligible columns based on section type
  const eligibleColumns = useMemo(() =>
    COLLAPSED_ELIGIBLE_COLUMNS.filter(col => {
      if (sectionType === 'input' && col === 'destination') return false;
      if (sectionType === 'output' && col === 'source') return false;
      return true;
    }),
    [sectionType]
  );

  const toggleColumn = useCallback((colId) => {
    const isSelected = currentColumns.includes(colId);
    if (isSelected && currentColumns.length <= MIN_COLLAPSED_COLUMNS) return;
    if (!isSelected && currentColumns.length >= MAX_COLLAPSED_COLUMNS) return;

    const newColumns = isSelected
      ? currentColumns.filter(c => c !== colId)
      : [...currentColumns, colId];
    onColumnsChange(newColumns);
  }, [currentColumns, onColumnsChange]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('[data-collapsed-selector]')) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      data-collapsed-selector="true"
      className="absolute top-full left-0 mt-1 bg-zinc-800 border border-zinc-600 rounded shadow-lg py-1 min-w-[140px] z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1 text-[10px] text-zinc-400 border-b border-zinc-700">
        Columns ({currentColumns.length}/{MAX_COLLAPSED_COLUMNS})
      </div>
      {eligibleColumns.map(colId => {
        const isSelected = currentColumns.includes(colId);
        const isDisabled = isSelected && currentColumns.length <= MIN_COLLAPSED_COLUMNS;
        const isMaxed = !isSelected && currentColumns.length >= MAX_COLLAPSED_COLUMNS;

        return (
          <button
            key={colId}
            onClick={() => toggleColumn(colId)}
            disabled={isDisabled || isMaxed}
            className={`w-full text-left px-3 py-1.5 text-[11px] flex items-center gap-2
              ${isSelected ? 'text-cyan-400' : 'text-zinc-300'}
              ${isDisabled || isMaxed ? 'opacity-40 cursor-not-allowed' : 'hover:bg-zinc-700 cursor-pointer'}`}
          >
            <span>{isSelected ? '✓' : '○'}</span>
            <span>{COLUMN_DEFS[colId]?.label || colId.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
});
CollapsedColumnSelector.displayName = 'CollapsedColumnSelector';

// ============================================
// COLLAPSED COLUMN HEADERS
// Draggable headers for collapsed mode
// ============================================

const CollapsedColumnHeaders = memo(({
  anchorSide,
  columnOrder,
  sectionType,
  onReorderColumns,
  onOpenSettings,
  showSettings,
  onColumnsChange,
  onCloseSettings,
}) => {
  const isReversed = anchorSide === 'right';

  // Drag-and-drop reordering (shared hook)
  const { draggedItem: draggedColumn, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragReorder(columnOrder, onReorderColumns);

  // Anchor element (fixed on outside edge, never moves)
  const anchorSpacer = <span key="anchor" className="shrink-0" style={SPACING_COLUMN_STYLE} />;

  // Settings gear button (positioned on inside edge)
  const gearButton = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onOpenSettings();
      }}
      className="text-zinc-400 hover:text-white text-[10px] px-1 shrink-0"
      title="Configure columns"
    >
      ⚙
    </button>
  );

  return (
    <div
      className={`flex items-center py-1 px-2 bg-zinc-800/30 border-b border-zinc-700/30
        text-[10px] font-mono text-white uppercase tracking-wide relative w-full`}
    >
      {/* Anchor on LEFT for input sections */}
      {!isReversed && anchorSpacer}

      {/* Gear on LEFT (inside) for output sections */}
      {isReversed && gearButton}

      {/* Draggable column headers with dividers */}
      <div className={`flex items-center ${isReversed ? 'justify-end' : ''}`}>
        {columnOrder.map((colId, index) => {
          const colDef = COLUMN_DEFS[colId];
          const isDragging = draggedColumn === colId;
          const isLast = index === columnOrder.length - 1;
          const colWidth = COLLAPSED_COLUMN_WIDTHS[colId] || 60;

          return (
            <span
              key={colId}
              draggable="true"
              onDragStart={(e) => handleDragStart(e, colId)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, colId)}
              onDragEnd={handleDragEnd}
              className={`cursor-grab select-none px-2 ${isDragging ? 'opacity-50' : ''} ${!isLast ? 'border-r border-zinc-600/50' : ''}`}
              style={{ width: colWidth, minWidth: colWidth }}
            >
              {colDef?.label || colId.toUpperCase()}
            </span>
          );
        })}
      </div>

      {/* Gear on RIGHT (inside) for input sections */}
      {!isReversed && gearButton}

      {/* Anchor on RIGHT for output sections */}
      {isReversed && anchorSpacer}

      {showSettings && (
        <CollapsedColumnSelector
          sectionType={sectionType}
          currentColumns={columnOrder}
          onColumnsChange={onColumnsChange}
          onClose={onCloseSettings}
        />
      )}
    </div>
  );
});
CollapsedColumnHeaders.displayName = 'CollapsedColumnHeaders';

// ============================================
// DRAGGABLE SECTION WRAPPER
// Wraps sections with drag handle and drop zones
// ============================================

const DraggableSection = memo(({
  sectionId,
  children,
  onDragOver,
  onDrop,
  onDropToSide,
  isDraggedOver,
  isDragging,
  showLeftDropZone,
  showRightDropZone,
  draggedSection, // What section is currently being dragged
}) => {
  // STRICT RULE: Side drop zones ONLY for Input/Output going side-by-side
  // System can NEVER be side-by-side with anything
  const isIOSection = isIOSectionType(sectionId);
  const isDraggingIO = isIOSectionType(draggedSection);

  // Determine drop zone mode
  // - Both left and right = stacked mode (show 3 zones: left, center/swap, right)
  // - Only left OR only right = side-by-side swap (show full-width zone)
  const showThreeZones = showLeftDropZone && showRightDropZone;
  const showFullWidthSwap = (showLeftDropZone || showRightDropZone) && !showThreeZones;

  // Memoized event handlers
  const handleDragOver = useCallback((e) => onDragOver(e, sectionId), [onDragOver, sectionId]);
  const handleDrop = useCallback((e) => onDrop(e, sectionId), [onDrop, sectionId]);
  const handleMouseUp = useCallback(() => onDrop(null, sectionId), [onDrop, sectionId]);

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseUp={handleMouseUp}
      className={`
        relative w-full
        transition-all duration-150
        ${isDragging && sectionId !== 'system' ? 'opacity-40' : ''}
        ${isDragging && sectionId === 'system' ? 'opacity-90' : ''}
        ${!showThreeZones && isDraggedOver ? 'ring-2 ring-cyan-400 ring-inset' : ''}
      `}
    >
      {/* ONLY for Input/Output (system NEVER side-by-side) */}
      {isIOSection && isDraggingIO && (
        <>
          {/* THREE ZONE MODE: Stacked layout - show left, center (swap), right */}
          {showThreeZones && (
            <ThreeZoneDropArea
              onDropToSide={(side) => onDropToSide(sectionId, side)}
              onDropToSwap={() => onDrop(null, sectionId)}
            />
          )}

          {/* FULL WIDTH SWAP MODE: Side-by-side swap */}
          {showFullWidthSwap && showLeftDropZone && (
            <SideDropZone
              side="left"
              onDrop={(side) => onDropToSide(sectionId, side)}
              isActive={false}
              fullWidth={true}
            />
          )}
          {showFullWidthSwap && showRightDropZone && (
            <SideDropZone
              side="right"
              onDrop={(side) => onDropToSide(sectionId, side)}
              isActive={false}
              fullWidth={true}
            />
          )}
        </>
      )}

      {/* Content takes full width - drag handle moved to header text */}
      <div className="w-full">{children}</div>
    </div>
  );
});
DraggableSection.displayName = 'DraggableSection';

// ============================================
// SECTION HEADER COMPONENT
// Template: Title on anchor side, + button centered
// ============================================

const SectionHeader = memo(({
  type,
  title,
  anchorSide,
  onAdd,
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
  const colorHexLight = '#ffffff'; // White text for section headers

  // Filter presets by section type (input/output) - memoized
  const availablePresets = useMemo(
    () => Object.entries(CARD_PRESETS)
      .filter(([_, preset]) => preset.category === type)
      .map(([id, preset]) => ({ id, ...preset })),
    [type]
  );

  const handlePresetSelect = useCallback((presetId) => {
    const preset = CARD_PRESETS[presetId];
    if (preset && onApplyPreset) {
      onApplyPreset(preset.ports, presetId);
    }
    setShowPresetMenu(false);
  }, [onApplyPreset]);

  // Memoized event handlers
  const handleAddClick = useCallback((e) => {
    e.stopPropagation();
    onAdd && onAdd();
  }, [onAdd]);

  const handlePresetClick = useCallback((e) => {
    e.stopPropagation();
    setShowPresetMenu(prev => !prev);
  }, []);

  const handleMouseDown = useCallback((e) => e.stopPropagation(), []);

  // Shared button style for consistency (color applied via inline style)
  const buttonBaseStyle = "px-2.5 py-1 bg-zinc-600 hover:bg-zinc-500 rounded text-[12px] font-mono";

  // Buttons container - mirrored order: INPUTS [⊞][+] ... [+][⊞] OUTPUTS - memoized
  const buttonsJSX = useMemo(() => (
    <div className="flex items-center gap-1.5 shrink-0 relative">
      {isReversed ? (
        <>
          {/* Add button */}
          <button
            onClick={handleAddClick}
            onMouseDown={handleMouseDown}
            className={buttonBaseStyle}
            style={{ color: colorHexLight }}
            title="Add port"
          >
            +
          </button>
          {/* Preset button */}
          <button
            onClick={handlePresetClick}
            onMouseDown={handleMouseDown}
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
            onClick={handlePresetClick}
            onMouseDown={handleMouseDown}
            className={buttonBaseStyle}
            style={{ color: colorHexLight }}
            title="Load card preset"
          >
            ⊞
          </button>
          {/* Add button */}
          <button
            onClick={handleAddClick}
            onMouseDown={handleMouseDown}
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
          onMouseDown={handleMouseDown}
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
  ), [isReversed, handlePresetClick, handleMouseDown, handleAddClick, buttonBaseStyle, colorHexLight, showPresetMenu, availablePresets, handlePresetSelect]);

  // Create gradient background based on signal direction towards anchor
  const gradientStyle = useMemo(() => {
    const baseColor = passedColors?.hexLight || HEX_COLORS.zinc[400];

    // Signal flows from anchor (reversed gradient)
    // If anchor is on left: gradient goes left to right (heavy on left, light on right)
    // If anchor is on right: gradient goes right to left (heavy on right, light on left)
    const gradientDirection = anchorSide === 'left' ? 'to right' : 'to left';
    const startColor = hexToRgba(baseColor, 0.4); // Heavier on anchor side (40%)
    const endColor = hexToRgba(baseColor, 0); // Transparent on port side

    return {
      background: `linear-gradient(${gradientDirection}, ${startColor}, ${endColor})`
    };
  }, [passedColors?.hexLight, anchorSide]);

  return (
    <div
      className={`flex items-center justify-between gap-2 ${SIZES.PADDING_X} py-1 border-b border-zinc-700/50`}
      style={gradientStyle}
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
});
SectionHeader.displayName = 'SectionHeader';

// ============================================
// IO SECTION COMPONENT (Input or Output)
// ============================================

const IOSection = memo(({
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
  connectedAnchorIds,
  themeColor,
  sharedColumnWidths,
}) => {
  const sectionType = type === 'input' ? 'input' : 'output';
  const sectionId = type === 'input' ? 'input' : 'output';
  const portType = type === 'input' ? 'in' : 'out';

  // Multi-select state for bulk editing (Set of port IDs)
  const [selectedPorts, setSelectedPorts] = useState(new Set());

  // Get cards from data (or empty array)
  const cards = data.cards || [];

  // Spacing drag state
  const dragStartY = useRef(0);
  const dragStartSpacing = useRef(0);

  // Toggle individual port selection
  const togglePortSelection = useCallback((portId) => {
    setSelectedPorts(prev => {
      const next = new Set(prev);
      if (next.has(portId)) {
        next.delete(portId);
      } else {
        next.add(portId);
      }
      return next;
    });
  }, []);

  // Select all / deselect all
  const toggleSelectAll = useCallback(() => {
    if (selectedPorts.size === data.ports.length && data.ports.length > 0) {
      setSelectedPorts(new Set()); // Deselect all
    } else {
      setSelectedPorts(new Set(data.ports.map(p => p.id))); // Select all
    }
  }, [selectedPorts.size, data.ports]);

  // Spacing drag handler with half-row snapping
  const handleSpacingMouseDown = useCallback(
    (e, portId, currentSpacing) => {
      e.preventDefault();
      e.stopPropagation();
      dragStartY.current = e.clientY;
      dragStartSpacing.current = currentSpacing || 0;

      const handleMouseMove = (moveEvent) => {
        const deltaY = moveEvent.clientY - dragStartY.current;
        const rawSpacing = Math.max(0, dragStartSpacing.current + deltaY);

        // Snap to half-row increments (15px)
        const snapIncrement = SIZES.SPACING_SNAP;
        const newSpacing = Math.round(rawSpacing / snapIncrement) * snapIncrement;

        const newPorts = data.ports.map((port) =>
          port.id === portId ? { ...port, spacing: newSpacing } : port
        );
        onUpdate({ ports: newPorts });
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [data.ports, onUpdate]
  );

  const addPort = useCallback(() => {
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
  }, [type, data.ports, collapsed, onToggleCollapse, onUpdate]);

  const updatePort = useCallback((portId, updates) => {
    onUpdate({
      ports: data.ports.map(p => p.id === portId ? { ...p, ...updates } : p)
    });
  }, [data.ports, onUpdate]);

  // Bulk update ONLY selected ports with a specific field value
  const bulkUpdatePorts = useCallback((field, value) => {
    if (selectedPorts.size === 0) return;
    onUpdate({
      ports: data.ports.map(p =>
        selectedPorts.has(p.id) ? { ...p, [field]: value } : p
      )
    });
  }, [data.ports, selectedPorts, onUpdate]);

  const deletePort = useCallback((portId) => {
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
  }, [data.ports, cards, onUpdate]);

  const reorderColumns = useCallback((newOrder) => {
    onUpdate({ columnOrder: newOrder });
  }, [onUpdate]);

  // Collapsed column settings state
  const [showCollapsedSettings, setShowCollapsedSettings] = useState(false);

  // Get collapsed columns from data or use section-specific defaults
  const collapsedColumns = useMemo(() => {
    const defaultCols = sectionType === 'input'
      ? DEFAULT_COLLAPSED_COLUMNS_INPUT
      : DEFAULT_COLLAPSED_COLUMNS_OUTPUT;
    return data.collapsedColumnOrder || defaultCols;
  }, [sectionType, data.collapsedColumnOrder]);

  // Reorder collapsed columns
  const reorderCollapsedColumns = useCallback((newOrder) => {
    onUpdate({ collapsedColumnOrder: newOrder });
  }, [onUpdate]);

  // Apply a preset - creates a card with grouped ports
  const applyPreset = useCallback((presetPorts, presetId) => {
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
  }, [type, data.ports, cards, collapsed, onToggleCollapse, onUpdate]);

  // Toggle card collapse
  const toggleCardCollapse = useCallback((cardId) => {
    onUpdate({
      cards: cards.map(c => c.id === cardId ? { ...c, collapsed: !c.collapsed } : c)
    });
  }, [cards, onUpdate]);

  // Remove entire card and its ports
  const removeCard = useCallback((cardId) => {
    const remainingPorts = data.ports.filter(p => p.cardId !== cardId);
    const renumberedPorts = remainingPorts.map((p, i) => ({ ...p, number: i + 1 }));
    onUpdate({
      ports: renumberedPorts,
      cards: cards.filter(c => c.id !== cardId)
    });
  }, [data.ports, cards, onUpdate]);

  // Get column order from data or use default
  // Conditionally include 'source' for inputs or 'destination' for outputs
  const columnOrder = useMemo(() => {
    const baseColumns = sectionType === 'input'
      ? ['delete', 'port', 'source', 'connector', 'resolution', 'rate']
      : ['delete', 'port', 'destination', 'connector', 'resolution', 'rate'];

    // Ensure all required columns are present (in case saved order is missing new columns like 'delete')
    const savedOrder = data.columnOrder || [];

    // Create Maps for O(1) lookup instead of O(n) indexOf
    const savedOrderMap = new Map(savedOrder.map((col, idx) => [col, idx]));
    const baseColumnsMap = new Map(baseColumns.map((col, idx) => [col, idx]));

    return baseColumns.map(col => col).sort((a, b) => {
      const aIdx = savedOrderMap.get(a) ?? -1;
      const bIdx = savedOrderMap.get(b) ?? -1;
      // If both are in saved order, use that order
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      // If only one is in saved order, it comes first
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      // Neither in saved order, use baseColumns order
      return (baseColumnsMap.get(a) ?? 0) - (baseColumnsMap.get(b) ?? 0);
    });
  }, [sectionType, data.columnOrder]);

  // Group ports: by cardId or standalone (null cardId)
  const standalonePorts = useMemo(() => data.ports.filter(p => !p.cardId), [data.ports]);
  const portsByCard = useMemo(() => cards.map(card => ({
    card,
    ports: data.ports.filter(p => p.cardId === card.id)
  })), [cards, data.ports]);

  // Calculate dynamic column widths based on port content (use shared widths if provided)
  const columnWidths = useMemo(() =>
    sharedColumnWidths || calculateColumnWidths(data.ports),
    [sharedColumnWidths, data.ports]
  );

  // Pre-calculate collapsed port data to avoid IIFE recalculation on every render
  const collapsedPortData = useMemo(() =>
    data.ports.map(port => {
      const anchorId = `${nodeId}-${port.id}`;
      const isConnected = connectedAnchorIds?.has(anchorId);
      const sourceColumnWidth = columnWidths['source'] || 90;
      const destColumnWidth = columnWidths['destination'] || 90;
      const portColumnWidth = columnWidths['port'] || 52;
      const portLabel = port.label || `${type === 'input' ? 'IN' : 'OUT'} ${port.number}`;
      const portTitle = `${portLabel} (collapsed)`;

      // Pre-calculate anchor styles for INPUT (left anchor)
      const inputAnchorStyle = {
        backgroundColor: isConnected ? (themeColor || HEX_COLORS.zinc[500]) : HEX_COLORS.zinc[500],
        border: `1px solid ${isConnected ? (themeColor ? `${themeColor}cc` : HEX_COLORS.zinc[400]) : HEX_COLORS.zinc[400]}`,
      };

      // Pre-calculate anchor styles for OUTPUT (right anchor)
      const outputAnchorStyle = {
        backgroundColor: isConnected ? (themeColor || (signalColor || HEX_COLORS.zinc[500])) : HEX_COLORS.zinc[500],
        border: `1px solid ${isConnected ? (themeColor ? `${themeColor}cc` : (signalColor ? `${signalColor}cc` : HEX_COLORS.zinc[400])) : HEX_COLORS.zinc[400]}`,
      };

      return {
        port,
        anchorId,
        isConnected,
        sourceColumnWidth,
        destColumnWidth,
        portColumnWidth,
        portLabel,
        portTitle,
        inputAnchorStyle,
        outputAnchorStyle
      };
    }),
    [data.ports, nodeId, connectedAnchorIds, columnWidths, themeColor, signalColor]
  );

  // Helper to render port rows with spacing support
  const renderPortRows = (ports) => (
    ports.map(port => (
      <div key={port.id} style={{ marginTop: `${port.spacing || 0}px` }}>
        <PortRow
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
          connectedAnchorIds={connectedAnchorIds}
          themeColor={themeColor}
          onSpacingMouseDown={handleSpacingMouseDown}
        />
      </div>
    ))
  );

  return (
    <div className="flex flex-col border-t border-zinc-700/50 shrink-0">
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
        /* When collapsed, render configurable columns with drag-drop reordering */
        <div className="w-full">
          {/* Collapsed header with drag-drop and settings */}
          {data.ports.length > 0 && (
            <CollapsedColumnHeaders
              anchorSide={anchorSide}
              columnOrder={collapsedColumns}
              sectionType={sectionType}
              onReorderColumns={reorderCollapsedColumns}
              onOpenSettings={() => setShowCollapsedSettings(true)}
              showSettings={showCollapsedSettings}
              onColumnsChange={reorderCollapsedColumns}
              onCloseSettings={() => setShowCollapsedSettings(false)}
            />
          )}
          {/* Collapsed port rows with dynamic columns */}
          {collapsedPortData.map((portData) => {
            const shouldAnchorBeOnRight = anchorSide === 'right';
            const isOutput = type === 'output';
            const { port, anchorId, inputAnchorStyle, outputAnchorStyle, portTitle, portLabel } = portData;
            const anchorType = isOutput ? 'out' : 'in';
            const anchorStyle = isOutput ? outputAnchorStyle : inputAnchorStyle;

            // Helper to get cell content with divider and fixed width
            const getCellContent = (colId, isLast) => {
              const colWidth = COLLAPSED_COLUMN_WIDTHS[colId] || 60;
              const cellClass = `text-[10px] text-white truncate overflow-hidden uppercase font-mono px-2 ${!isLast ? 'border-r border-zinc-600/50' : ''}`;
              const cellStyle = { width: colWidth, minWidth: colWidth };

              switch (colId) {
                case 'port':
                  return <span key={colId} className={cellClass} style={cellStyle}>{portLabel}</span>;
                case 'source':
                  return <span key={colId} className={cellClass} style={cellStyle}>{port.source || ''}</span>;
                case 'destination':
                  return <span key={colId} className={cellClass} style={cellStyle}>{port.destination || ''}</span>;
                case 'connector':
                  return <span key={colId} className={cellClass} style={cellStyle}>{port.connector || ''}</span>;
                case 'resolution':
                  return <span key={colId} className={cellClass} style={cellStyle}>{port.resolution || ''}</span>;
                case 'rate':
                  return <span key={colId} className={cellClass} style={cellStyle}>{port.refreshRate || ''}</span>;
                default:
                  return null;
              }
            };

            // Gear spacer (matches gear button width for alignment)
            const gearSpacer = <span className="shrink-0" style={{ width: 20 }} />;

            // Anchor element (fixed on outside edge)
            const anchorElement = (
              <span key="anchor" className="shrink-0 flex items-center justify-center" style={SPACING_COLUMN_STYLE}>
                <div
                  data-anchor-id={anchorId}
                  data-anchor-type={anchorType}
                  className="w-2 h-2 rounded-full cursor-pointer"
                  style={anchorStyle}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnchorClick && onAnchorClick(anchorId, anchorType);
                  }}
                  title={portTitle}
                />
              </span>
            );

            return (
              <div
                key={port.id}
                className="flex items-center py-1.5 px-2 w-full opacity-40 hover:opacity-100 transition-opacity"
              >
                {/* Anchor on LEFT for input sections */}
                {!shouldAnchorBeOnRight && anchorElement}

                {/* Gear spacer on LEFT for output sections (matches header) */}
                {shouldAnchorBeOnRight && gearSpacer}

                {/* Column data with dividers */}
                <div className={`flex items-center ${shouldAnchorBeOnRight ? 'justify-end' : ''}`}>
                  {collapsedColumns.map((colId, index) => getCellContent(colId, index === collapsedColumns.length - 1))}
                </div>

                {/* Gear spacer on RIGHT for input sections (matches header) */}
                {!shouldAnchorBeOnRight && gearSpacer}

                {/* Anchor on RIGHT for output sections */}
                {shouldAnchorBeOnRight && anchorElement}
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

          <div className="flex-1 relative">
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
});
IOSection.displayName = 'IOSection';

// ============================================
// SYSTEM HEADER COMPONENT
// Specialized header for System section with approved fields display
// ============================================

const SystemHeader = memo(({
  collapsed,
  onToggleCollapse,
  onDragStart,
  onDragEnd,
  sectionId,
  colors: passedColors,
  approvedFields,
}) => {
  // Use passed hex colors or fallback to zinc (memoized)
  const colorHexLight = useMemo(() => passedColors?.hexLight || HEX_COLORS.zinc[400], [passedColors?.hexLight]);

  // Track drag state for visual feedback
  const [isDragging, setIsDragging] = useState(false);

  // Use MOUSE EVENTS for drag (not HTML5 drag API)
  // This is needed for System section to work properly with drop zones
  const handleMouseDown = useCallback((e) => {
    // Only left mouse button
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    setIsDragging(true);

    // Manually trigger the drag start
    onDragStart && onDragStart(e, sectionId);

    // Global mouse handlers for drag
    const handleMouseMove = (moveEvent) => {
      moveEvent.preventDefault();
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onDragEnd && onDragEnd();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [onDragStart, sectionId, onDragEnd]);

  // Create gradient background
  const gradientStyle = useMemo(() => {
    const baseColor = passedColors?.hexLight || HEX_COLORS.zinc[400];

    const startColor = hexToRgba(baseColor, 0.4);
    const endColor = hexToRgba(baseColor, 0);

    return {
      background: `linear-gradient(to right, ${startColor}, ${endColor})`
    };
  }, [passedColors?.hexLight]);

  // Check if there are any approved fields to display (memoized)
  const hasDisplayFields = useMemo(
    () => approvedFields && (
      approvedFields['Platform'] ||
      approvedFields['Software'] ||
      approvedFields['Capture'] ||
      approvedFields['IP Address']
    ),
    [approvedFields]
  );

  // Pre-calculate approved fields display elements (prevents repeated conditional checks in render)
  const displayFieldsContent = useMemo(() => {
    if (!hasDisplayFields) return null;

    const parts = [];
    if (approvedFields['IP Address']) {
      parts.push(<span key="ip">IP: {approvedFields['IP Address']}</span>);
    }
    if (approvedFields['Platform']) {
      parts.push(
        <span key="platform" className={parts.length > 0 ? 'ml-1' : ''}>
          {parts.length > 0 ? '| ' : ''}{approvedFields['Platform']}
        </span>
      );
    }
    if (approvedFields['Software']) {
      parts.push(<span key="software" className="ml-1">| {approvedFields['Software']}</span>);
    }
    if (approvedFields['Capture']) {
      parts.push(<span key="capture" className="ml-1">| {approvedFields['Capture']}</span>);
    }
    return parts;
  }, [hasDisplayFields, approvedFields]);

  return (
    <div
      data-section-drag="true"
      onMouseDown={handleMouseDown}
      className={`flex items-center justify-between gap-2 px-2 py-1 border-b border-zinc-700/50 cursor-grab select-none ${isDragging ? 'cursor-grabbing' : ''}`}
      style={{
        ...gradientStyle,
      }}
      title="Drag to reorder section"
    >
      <div className="flex items-center gap-1">
        <span
          className="font-mono font-bold text-[12px] hover:opacity-80 px-1 py-0.5 rounded whitespace-nowrap pointer-events-none"
          style={WHITE_TEXT_STYLE}
        >
          SYSTEM
        </span>
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

      {/* Display approved fields (excluding Manufacturer/Model which go to title bar) */}
      {hasDisplayFields ? (
        <div className="flex-1 px-2 text-[9px] font-mono opacity-70 pointer-events-none">
          <div className="truncate">
            {displayFieldsContent}
          </div>
        </div>
      ) : (
        <span className="flex-1 pointer-events-none" />
      )}
    </div>
  );
});
SystemHeader.displayName = 'SystemHeader';

// ============================================
// SYSTEM SECTION COMPONENT
// ============================================

const SystemSection = memo(({
  data,
  onUpdate,
  collapsed,
  onToggleCollapse,
  onSectionDragStart,
  onSectionDragEnd,
  colors,
  leftSectionWidth,
  rightSectionWidth,
  leftSectionCollapsed,
  rightSectionCollapsed,
  areIOSideBySide,
}) => {
  // Use passed hex colors or fallback to zinc (memoized)
  const colorHex = useMemo(() => colors?.hex || HEX_COLORS.zinc[500], [colors?.hex]);

  // Handler for approving field/value (used by checkmark button and Enter key)
  const handleApprove = useCallback(() => {
    const field = data.selectedField || 'Manufacturer';
    const value = data.selectedValue || '';

    // Add to approved fields
    const approvedFields = data.approvedFields || {};
    approvedFields[field] = value;

    onUpdate({
      approvedFields: approvedFields,
      selectedValue: '' // Clear value after approve
    });
  }, [data.selectedField, data.selectedValue, data.approvedFields, onUpdate]);

  // Memoized background style (prevents object recreation)
  const sectionStyle = useMemo(() => ({ backgroundColor: `${colorHex}0d` }), [colorHex]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL: SYSTEM DROPDOWN ALIGNMENT WITH IO SECTIONS - DO NOT MODIFY
  // ═══════════════════════════════════════════════════════════════════════════
  // This alignment between the System section dropdowns and the center divider
  // (gap between INPUT and OUTPUT sections) is a PERMANENT architectural feature.
  //
  // The dropdowns MUST align with the IO section widths so that:
  // - Left dropdown aligns with left IO section (INPUT or OUTPUT depending on layout)
  // - Right dropdown aligns with right IO section
  // - The gap between dropdowns aligns with the divider between IO sections
  //
  // This uses CSS Grid with the SAME widths as the IO section containers.
  // Any changes to IO section width calculations MUST be reflected here.
  // ═══════════════════════════════════════════════════════════════════════════
  const gridStyle = useMemo(() => {
    // Only align with IO sections when they are side-by-side
    if (areIOSideBySide && leftSectionWidth && rightSectionWidth) {
      // When left is collapsed and right is expanded: left fixed, right fills
      if (leftSectionCollapsed && !rightSectionCollapsed) {
        return {
          display: 'grid',
          gridTemplateColumns: `${leftSectionWidth}px 1fr`,
          gap: '16px',
          alignItems: 'stretch',
        };
      }
      // When right is collapsed and left is expanded: left fills, right fixed
      if (!leftSectionCollapsed && rightSectionCollapsed) {
        return {
          display: 'grid',
          gridTemplateColumns: `1fr ${rightSectionWidth}px`,
          gap: '16px',
          alignItems: 'stretch',
        };
      }
      // Both expanded or both collapsed: use proportional fr units
      return {
        display: 'grid',
        gridTemplateColumns: `${leftSectionWidth}fr ${rightSectionWidth}fr`,
        gap: '16px',
        alignItems: 'stretch',
      };
    }
    // When IO sections are stacked, use flex layout so dropdowns size to content
    // This allows the node to shrink to fit the content naturally
    return {
      display: 'flex',
      gap: '16px',
      alignItems: 'stretch',
    };
  }, [areIOSideBySide, leftSectionWidth, rightSectionWidth, leftSectionCollapsed, rightSectionCollapsed]);

  return (
    <div
      className="flex flex-col border-t border-zinc-700/50"
      style={sectionStyle}
    >
      {/* Use SystemHeader component */}
      <SystemHeader
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        onDragStart={onSectionDragStart}
        onDragEnd={onSectionDragEnd}
        sectionId="system"
        colors={colors}
        approvedFields={data.approvedFields}
      />

      {/* Content when expanded - dropdowns aligned with left/right section widths using CSS Grid */}
      {!collapsed && (
        <div className="py-2">
          <div style={gridStyle}>
            {/* Column 1: Field selector - aligns with left section */}
            <SelectWithCustom
              value={data.selectedField || 'Manufacturer'}
              options={['Manufacturer', 'Model', 'Platform', 'Software', 'Capture', 'IP Address', 'Custom...']}
              placeholder="Select field..."
              onChange={(value) => onUpdate({ selectedField: value, selectedValue: '' })}
              className="h-[26px]"
            />

            {/* Column 2: Value input + Checkmark - aligns with right section */}
            <div className="flex items-stretch gap-2 w-full">
              <div className="flex-1 flex items-stretch">
                {(!data.selectedField || data.selectedField === 'Manufacturer') && (
                  <SelectWithCustom
                    value={data.selectedValue || ''}
                    options={MANUFACTURERS}
                    placeholder="Select..."
                    onChange={(value) => onUpdate({ selectedValue: value })}
                    className="h-[26px]"
                  />
                )}
                {data.selectedField === 'Model' && (
                  <input
                    type="text"
                    value={data.selectedValue || ''}
                    onChange={(e) => {
                      e.stopPropagation();
                      onUpdate({ selectedValue: e.target.value });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleApprove();
                      }
                    }}
                    onClick={stopPropagation}
                    placeholder="Enter..."
                    className={`${INPUT_FIELD_CLASS} h-[26px]`}
                  />
                )}
                {data.selectedField === 'Platform' && (
                  <SelectWithCustom
                    value={data.selectedValue || ''}
                    options={PLATFORMS}
                    placeholder="Select..."
                    onChange={(value) => onUpdate({ selectedValue: value })}
                    className="h-[26px]"
                  />
                )}
                {data.selectedField === 'Software' && (
                  <SelectWithCustom
                    value={data.selectedValue || ''}
                    options={SOFTWARE_PRESET_LABELS}
                    placeholder="Select..."
                    onChange={(value) => onUpdate({ selectedValue: value })}
                    className="h-[26px]"
                  />
                )}
                {data.selectedField === 'Capture' && (
                  <SelectWithCustom
                    value={data.selectedValue || ''}
                    options={CAPTURE_CARD_LABELS}
                    placeholder="Select..."
                    onChange={(value) => onUpdate({ selectedValue: value })}
                    className="h-[26px]"
                  />
                )}
                {data.selectedField === 'IP Address' && (
                  <input
                    type="text"
                    value={data.selectedValue || ''}
                    onChange={(e) => {
                      e.stopPropagation();
                      onUpdate({ selectedValue: e.target.value });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleApprove();
                      }
                    }}
                    onClick={stopPropagation}
                    placeholder="Enter..."
                    className={`${INPUT_FIELD_CLASS} h-[26px]`}
                  />
                )}
              </div>
              {/* Checkmark Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleApprove();
                }}
                className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white border border-zinc-600 rounded text-[11px] flex items-center justify-center shrink-0"
                title="Approve and add to header (or press Enter)"
                style={CHECKMARK_BUTTON_STYLE}
              >
                ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
SystemSection.displayName = 'SystemSection';

// ============================================
// TITLE BAR COMPONENT
// ============================================

const TitleBar = memo(({ node, onUpdate, themeColors, areIOSideBySide, leftSectionWidth, rightSectionWidth }) => {
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showSettings) return;

    const handleClickOutside = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    };

    // Use setTimeout to avoid closing immediately on the same click that opened it
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  // Memoize signal color object lookup (O(1) Map access instead of O(n) find)
  const signalColorObj = useMemo(
    () => node.signalColor ? SIGNAL_COLORS_BY_ID.get(node.signalColor) || null : null,
    [node.signalColor]
  );

  const signalColorHex = useMemo(
    () => signalColorObj?.hex || null,
    [signalColorObj]
  );

  const displayTitle = useMemo(() => {
    const softwareId = node.system?.software;
    if (!softwareId || softwareId === 'none') return node.title;
    const software = SOFTWARE_PRESETS_BY_ID.get(softwareId);
    const softwareLabel = software ? software.label : null;
    if (softwareLabel) {
      return `${softwareLabel} ${node.title}`.toUpperCase();
    }
    return node.title;
  }, [node.system?.software, node.title]);

  const handleResetSystemSettings = useCallback(() => {
    onUpdate({
      system: {
        ...node.system,
        approvedFields: {},
        selectedField: 'Manufacturer',
        selectedValue: ''
      }
    });
    setShowSettings(false);
  }, [node.system, onUpdate]);

  // Use theme header colors (hex values for inline styles) - memoized
  const headerHex = useMemo(
    () => themeColors?.header?.hex || HEX_COLORS.zinc[700],
    [themeColors?.header?.hex]
  );
  const headerTextHex = '#ffffff'; // White text for all headers

  // Memoized title bar style (prevents object recreation on every render)
  const titleBarStyle = useMemo(() => ({
    borderLeft: signalColorHex ? `4px solid ${signalColorHex}` : undefined,
    backgroundColor: `${headerHex}33`, // 20% opacity
  }), [signalColorHex, headerHex]);

  // Memoized signal label for title attribute
  const signalLabel = useMemo(
    () => signalColorObj ? `Signal: ${signalColorObj.label || 'None'}` : 'No Signal Color',
    [signalColorObj]
  );

  // Memoized color picker style
  const colorPickerStyle = useMemo(() => ({
    backgroundColor: signalColorHex || HEX_COLORS.zinc[600],
    boxShadow: signalColorHex ? `0 0 6px ${signalColorHex}66` : 'none',
    borderColor: signalColorHex ? `${signalColorHex}cc` : HEX_COLORS.zinc[500]
  }), [signalColorHex]);

  // Calculate the divider position as a percentage for centering the title
  // The divider is the gap between left and right sections
  const dividerPosition = useMemo(() => {
    if (!areIOSideBySide || !leftSectionWidth || !rightSectionWidth) {
      return null;
    }
    // The divider center is at the proportion of left width to total width
    // This matches where the gap between SystemSection dropdowns falls
    const totalWidth = leftSectionWidth + rightSectionWidth;
    return (leftSectionWidth / totalWidth) * 100;
  }, [areIOSideBySide, leftSectionWidth, rightSectionWidth]);

  // Shared left corner content (manufacturer/model + color picker)
  const leftCornerContent = (
    <div className="flex items-center gap-2">
      {(node.system?.approvedFields?.['Manufacturer'] || node.system?.approvedFields?.['Model']) && (
        <div className="flex flex-col gap-0 font-mono leading-tight" style={{ color: headerTextHex }}>
          {node.system?.approvedFields?.['Manufacturer'] && (
            <div className="opacity-90 text-[12px]">{node.system.approvedFields['Manufacturer']}</div>
          )}
          {node.system?.approvedFields?.['Model'] && (
            <div className="opacity-70 text-[10px]">{node.system.approvedFields['Model']}</div>
          )}
        </div>
      )}
      {/* Signal color picker */}
      <div className="relative">
        <select
          value={node.signalColor || ''}
          onChange={(e) => onUpdate({ signalColor: e.target.value || null })}
          onClick={stopPropagation}
          className="appearance-none cursor-pointer opacity-0 absolute inset-0 w-full h-full bg-zinc-800 text-zinc-300"
          title="Signal color"
          style={DARK_COLOR_SCHEME_STYLE}
        >
          <option value="" className="bg-zinc-800 text-zinc-300">No Color</option>
          {SIGNAL_COLORS.map(color => (
            <option key={color.id} value={color.id} className="bg-zinc-800 text-zinc-300">
              {color.label}
            </option>
          ))}
        </select>
        <div
          className="w-[19px] h-[19px] rounded cursor-pointer hover:opacity-80 transition-opacity border-2 border-zinc-600 pointer-events-none"
          style={colorPickerStyle}
          title={signalLabel}
        />
      </div>
    </div>
  );

  // When side-by-side: Position title at the divider between sections
  if (dividerPosition !== null) {
    return (
      <div
        className="relative border-b border-zinc-700 rounded-t-lg"
        style={titleBarStyle}
      >
        <div className="flex items-center justify-between py-2 px-3">
          {/* Left corner content */}
          {leftCornerContent}

          {/* Settings button - right side */}
          <div ref={settingsRef} className="relative z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSettings(!showSettings);
              }}
              className="text-zinc-300 hover:text-white text-[16px] px-1"
              title="Node settings"
            >
              ⚙
            </button>
            {showSettings && (
              <div
                className="absolute top-full right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded shadow-lg py-1 min-w-[160px]"
                style={{ zIndex: 9999 }}
                onClick={stopPropagation}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSettings(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-700 hover:text-white"
                >
                  Save Preset
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSettings(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-700 hover:text-white"
                >
                  Set as Default
                </button>
                <button
                  onClick={handleResetSystemSettings}
                  className="w-full text-left px-3 py-1.5 text-[11px] text-red-400 hover:bg-zinc-700 hover:text-red-300"
                >
                  Reset System Settings
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Title centered at the divider position */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap"
          style={{ left: `${dividerPosition}%` }}
        >
          <span className="font-mono font-bold text-lg" style={{ color: headerTextHex }}>{displayTitle}</span>
        </div>
      </div>
    );
  }

  // Stacked mode: Use standard flex layout with centered title
  return (
    <div
      className="flex items-center px-3 py-2 border-b border-zinc-700 rounded-t-lg relative"
      style={titleBarStyle}
    >
      {/* Left corner */}
      <div className="z-10">{leftCornerContent}</div>

      {/* Centered title */}
      <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap">
        <span className="font-mono font-bold text-lg" style={{ color: headerTextHex }}>{displayTitle}</span>
      </div>

      {/* Settings button - top right */}
      <div ref={settingsRef} className="flex items-center gap-1 ml-auto z-10 relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowSettings(!showSettings);
          }}
          className="text-zinc-300 hover:text-white text-[16px] px-1"
          title="Node settings"
        >
          ⚙
        </button>

        {/* Settings dropdown menu */}
        {showSettings && (
          <div
            className="absolute top-full right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded shadow-lg py-1 min-w-[160px]"
            style={{ zIndex: 9999 }}
            onClick={stopPropagation}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Implement save preset
                setShowSettings(false);
              }}
              className="w-full text-left px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-700 hover:text-white"
            >
              Save Preset
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Implement set as default
                setShowSettings(false);
              }}
              className="w-full text-left px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-700 hover:text-white"
            >
              Set as Default
            </button>
            <button
              onClick={handleResetSystemSettings}
              className="w-full text-left px-3 py-1.5 text-[11px] text-red-400 hover:bg-zinc-700 hover:text-red-300"
            >
              Reset System Settings
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
TitleBar.displayName = 'TitleBar';

// ============================================
// RESIZE HANDLE COMPONENT
// ============================================

// Resize handle style (static)
const RESIZE_HANDLE_STYLE = {
  position: 'absolute',
  bottom: -6,
  right: -6,
  width: 12,
  height: 12,
  borderRadius: '50%',
  backgroundColor: HEX_COLORS.blue[500],
  opacity: 0.7,
  cursor: 'nwse-resize',
  zIndex: 20,
};

const ResizeHandle = memo(({ onResizeStart }) => (
  <div
    style={RESIZE_HANDLE_STYLE}
    onMouseDown={(e) => {
      e.stopPropagation();
      e.preventDefault();
      onResizeStart(e);
    }}
    className="hover:opacity-100 hover:scale-110 transition-all"
  />
));
ResizeHandle.displayName = 'ResizeHandle';

// ============================================
// SUPERNODE COMPONENT
// ============================================

function SuperNode({ node, zoom, isSelected, snapToGrid, gridSize, onUpdate, onDelete, onAnchorClick, registerAnchor, activeWire, onSelect, connectedAnchorIds }) {
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
  const themeColors = useMemo(() => getThemeColors(node.signalColor), [node.signalColor]);

  // Memoize divider gradient style for side-by-side sections
  // Gradient fades from solid at top to transparent at bottom

  // Extract theme color for anchors (use the header/main color)
  const anchorThemeColor = themeColors.header?.hex || null;

  // Calculate shared column widths for INPUT and OUTPUT sections to ensure alignment
  const allPorts = [...(node.inputSection?.ports || []), ...(node.outputSection?.ports || [])];
  const sharedColumnWidths = useMemo(() => calculateColumnWidths(allPorts), [allPorts]);

  // Calculate total widths for INPUT and OUTPUT sections (for center divider alignment)
  // When side-by-side, sections have: spacing(20) + anchor(24) + delete(32) + port(52) + source/dest(dynamic) + connector(dynamic) + resolution(dynamic) + rate(dynamic)
  // Gaps between columns: 8px each (via mx-2 on separator)
  // Calculate section widths directly (eliminates callback chain that caused dependency cascades)
  const inputContentWidth = useMemo(() => {
    const columns = [
      sharedColumnWidths.spacing,     // 20 (spacing drag handle - ALWAYS included)
      sharedColumnWidths.anchor,      // 24
      sharedColumnWidths.delete,      // 24
      sharedColumnWidths.port,        // 52
      sharedColumnWidths.source,      // dynamic
      sharedColumnWidths.connector,   // dynamic
      sharedColumnWidths.resolution,  // dynamic
      sharedColumnWidths.rate,        // dynamic
    ];
    const numGaps = columns.length - 1; // gaps between columns
    const gapWidth = SEPARATOR_WIDTH; // 9px (1px content + 8px mx-2 margins)
    return columns.reduce((sum, w) => sum + w, 0) + (numGaps * gapWidth);
  }, [sharedColumnWidths]);

  const outputContentWidth = useMemo(() => {
    const columns = [
      sharedColumnWidths.spacing,     // 20 (spacing drag handle - ALWAYS included)
      sharedColumnWidths.anchor,      // 24
      sharedColumnWidths.delete,      // 24
      sharedColumnWidths.port,        // 52
      sharedColumnWidths.destination, // dynamic (uses destination instead of source)
      sharedColumnWidths.connector,   // dynamic
      sharedColumnWidths.resolution,  // dynamic
      sharedColumnWidths.rate,        // dynamic
    ];
    const numGaps = columns.length - 1; // gaps between columns
    const gapWidth = SEPARATOR_WIDTH; // 9px (1px content + 8px mx-2 margins)
    return columns.reduce((sum, w) => sum + w, 0) + (numGaps * gapWidth);
  }, [sharedColumnWidths]);

  // Container widths include buffer for borders, CardWrapper stripe (4px), padding, and breathing room
  // Increased from +20 to +50 to prevent column overlap/cutoff in side-by-side mode
  const inputSectionWidth = useMemo(() => inputContentWidth + 50, [inputContentWidth]);
  const outputSectionWidth = useMemo(() => outputContentWidth + 50, [outputContentWidth]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL: COLLAPSED SECTION WIDTHS - REQUIRED FOR SYSTEM DROPDOWN ALIGNMENT
  // These widths are used by getWrapperStyle and SystemSection.gridStyle
  // to maintain alignment between System dropdowns and the IO center divider.
  // ═══════════════════════════════════════════════════════════════════════════
  // Collapsed section widths - dynamic based on selected columns
  // anchor (24) + columns + gaps (8px each) + buffer (50)
  const inputCollapsedWidth = useMemo(() => {
    const collapsedCols = node.inputSection.collapsedColumnOrder || DEFAULT_COLLAPSED_COLUMNS_INPUT;
    const columnsWidth = collapsedCols.reduce((sum, colId) =>
      sum + (sharedColumnWidths[colId] || COLUMN_DEFS[colId]?.minWidth || 60), 0);
    const gapsWidth = collapsedCols.length * 8; // gap between each column
    return 24 + gapsWidth + columnsWidth + 50; // anchor + gaps + columns + buffer
  }, [node.inputSection.collapsedColumnOrder, sharedColumnWidths]);

  const outputCollapsedWidth = useMemo(() => {
    const collapsedCols = node.outputSection.collapsedColumnOrder || DEFAULT_COLLAPSED_COLUMNS_OUTPUT;
    const columnsWidth = collapsedCols.reduce((sum, colId) =>
      sum + (sharedColumnWidths[colId] || COLUMN_DEFS[colId]?.minWidth || 60), 0);
    const gapsWidth = collapsedCols.length * 8;
    return columnsWidth + gapsWidth + 24 + 50; // columns + gaps + anchor + buffer
  }, [node.outputSection.collapsedColumnOrder, sharedColumnWidths]);

  // Computed widths based on collapsed state (memoized to avoid recalculation)
  const computedInputSectionWidth = useMemo(() =>
    node.layout.inputCollapsed ? inputCollapsedWidth : inputSectionWidth,
    [node.layout.inputCollapsed, inputCollapsedWidth, inputSectionWidth]
  );
  const computedOutputSectionWidth = useMemo(() =>
    node.layout.outputCollapsed ? outputCollapsedWidth : outputSectionWidth,
    [node.layout.outputCollapsed, outputCollapsedWidth, outputSectionWidth]
  );

  // ===========================================
  // SECTION LAYOUT RULES (STRICT)
  // ===========================================
  // 1. System section is ALWAYS in its own row (never side-by-side)
  // 2. System can only be at TOP or BOTTOM of the node
  // 3. Only Input and Output can be side-by-side
  // 4. Drop zones only appear for valid moves
  // ===========================================

  // Get rows from layout (default: all sections stacked)
  const layoutRows = useMemo(() => {
    if (node.layout.rows) {
      return node.layout.rows;
    }
    // Fallback: convert sectionOrder to rows
    const sectionOrder = node.layout.sectionOrder || ['system', 'input', 'output'];
    return sectionOrder.map(s => [s]);
  }, [node.layout.rows, node.layout.sectionOrder]);

  // Compute anchor local offsets via scoped DOM queries (only when layout changes)
  useLayoutEffect(() => {
    if (!registerAnchor || !nodeRef.current) return;
    const scale = node.scale || 1;
    const nodeRect = nodeRef.current.getBoundingClientRect();
    const totalScale = zoom * scale;

    // Determine anchor sides based on layout
    // Find if input/output are side-by-side and their column positions
    const rows = node.layout.rows || (node.layout.sectionOrder || ['system', 'input', 'output']).map(s => [s]);
    let inputSide = node.layout.inputAnchorSide || 'left';
    let outputSide = node.layout.outputAnchorSide || 'right';

    // Check for side-by-side layout - anchors face OUTWARD
    rows.forEach(row => {
      if (row.length === 2 && row.includes('input') && row.includes('output')) {
        // Side-by-side: left section gets left anchors, right section gets right anchors
        const inputColIndex = row.indexOf('input');
        inputSide = inputColIndex === 0 ? 'left' : 'right';
        outputSide = inputColIndex === 0 ? 'right' : 'left';
      }
    });

    node.inputSection.ports.forEach((port) => {
      const anchorId = `${node.id}-${port.id}`;
      const anchorEl = nodeRef.current.querySelector(`[data-anchor-id="${anchorId}"]`);
      if (anchorEl) {
        const r = anchorEl.getBoundingClientRect();
        registerAnchor(anchorId, {
          nodeId: node.id,
          localX: (r.left + r.width / 2 - nodeRect.left) / totalScale,
          localY: (r.top + r.height / 2 - nodeRect.top) / totalScale,
          type: 'in',
          side: inputSide
        });
      }
    });

    node.outputSection.ports.forEach((port) => {
      const anchorId = `${node.id}-${port.id}`;
      const anchorEl = nodeRef.current.querySelector(`[data-anchor-id="${anchorId}"]`);
      if (anchorEl) {
        const r = anchorEl.getBoundingClientRect();
        registerAnchor(anchorId, {
          nodeId: node.id,
          localX: (r.left + r.width / 2 - nodeRect.left) / totalScale,
          localY: (r.top + r.height / 2 - nodeRect.top) / totalScale,
          type: 'out',
          side: outputSide
        });
      }
    });
  }, [node.inputSection, node.outputSection, node.scale, node.layout, registerAnchor, node.id, zoom]);

  // Resize handling - proportional scaling keeps handle under cursor
  const handleResizeStart = useCallback((e) => {
    if (!nodeRef.current) return;
    const nodeRect = nodeRef.current.getBoundingClientRect();
    // Calculate initial distance from node's top-left to mouse
    const initialDist = Math.sqrt(
      Math.pow(e.clientX - nodeRect.left, 2) +
      Math.pow(e.clientY - nodeRect.top, 2)
    );
    setIsResizing(true);
    setResizeStart({
      nodeX: nodeRect.left,
      nodeY: nodeRect.top,
      initialDist,
      scale: node.scale || 0.5
    });
  }, [node.scale]);

  useEffect(() => {
    if (!isResizing) return;

    const handleResizeMove = (e) => {
      // Use stored node position (from resize start) for consistent reference point
      const currentDist = Math.sqrt(
        Math.pow(e.clientX - resizeStart.nodeX, 2) +
        Math.pow(e.clientY - resizeStart.nodeY, 2)
      );
      // Scale proportionally: newScale = initialScale * (currentDist / initialDist)
      const scaleFactor = currentDist / resizeStart.initialDist;
      const newScale = Math.max(0.40, Math.min(0.60, resizeStart.scale * scaleFactor));
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
  const handleMouseDown = useCallback((e) => {
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
  }, [isResizing]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const canvas = nodeRef.current?.closest('[data-canvas]');
      if (!canvas) return;

      const canvasRect = canvas.getBoundingClientRect();
      let newX = (e.clientX - canvasRect.left - dragStart.offsetX) / zoom;
      let newY = (e.clientY - canvasRect.top - dragStart.offsetY) / zoom;

      // Snap to grid if enabled
      if (snapToGrid && gridSize > 0) {
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
      }

      onUpdate({
        position: { x: newX, y: newY }
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, zoom, onUpdate, snapToGrid, gridSize]);

  // Helper to clean layout rows (remove nulls and empty rows)
  const cleanLayoutRows = useCallback((rows) => {
    return rows
      .map(row => row.filter(s => s !== null))
      .filter(row => row.length > 0);
  }, []);

  // Section drag handlers
  // Supports both HTML5 drag events (Input/Output) and mouse events (System)
  const handleSectionDragStart = useCallback((e, sectionId) => {
    e.stopPropagation();
    setDraggedSection(sectionId);
    // Only set dataTransfer for HTML5 drag events (not mouse events)
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('section-reorder', sectionId);
    }
  }, []);

  const handleSectionDragOver = useCallback((e, sectionId) => {
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
  }, [draggedSection, layoutRows]);

  const handleSectionDragEnd = useCallback(() => {
    setDraggedSection(null);
    setDragOverSection(null);
  }, []);

  // Drop on section (swap positions in same row or move to different row)
  // STRICT RULE: System can only be at TOP or BOTTOM (never middle, never side-by-side)
  const handleSectionDrop = useCallback((e, targetSectionId) => {
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

    // Find positions using findIndex (exits early, more efficient than forEach)
    const draggedRowIdx = newRows.findIndex(row => row.includes(draggedSection));
    const draggedColIdx = draggedRowIdx >= 0 ? newRows[draggedRowIdx].indexOf(draggedSection) : -1;
    const targetRowIdx = newRows.findIndex(row => row.includes(targetSectionId));
    const targetColIdx = targetRowIdx >= 0 ? newRows[targetRowIdx].indexOf(targetSectionId) : -1;

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
    let cleanedRows = cleanLayoutRows(newRows);

    onUpdate({ layout: { ...node.layout, rows: cleanedRows } });
    setDraggedSection(null);
    setDragOverSection(null);
  }, [draggedSection, layoutRows, node.layout, onUpdate]);

  // Drop to side (create or join column)
  // STRICT RULE: Only Input and Output can be side-by-side
  const handleDropToSide = useCallback((targetSectionId, side) => {
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

    // Find positions using findIndex (exits early, more efficient than forEach)
    const draggedRowIdx = newRows.findIndex(row => row.includes(draggedSection));
    const draggedColIdx = draggedRowIdx >= 0 ? newRows[draggedRowIdx].indexOf(draggedSection) : -1;
    const targetRowIdx = newRows.findIndex(row => row.includes(targetSectionId));
    const targetColIdx = targetRowIdx >= 0 ? newRows[targetRowIdx].indexOf(targetSectionId) : -1;

    if (draggedRowIdx === -1 || targetRowIdx === -1) {
      setDraggedSection(null);
      return;
    }

    // CASE 1: Already in same row - just swap positions
    if (draggedRowIdx === targetRowIdx) {
      const targetRow = newRows[targetRowIdx];
      // Simple swap
      [targetRow[draggedColIdx], targetRow[targetColIdx]] = [targetRow[targetColIdx], targetRow[draggedColIdx]];
    }
    // CASE 2: Different rows
    else {
      // Remove dragged section from its current position
      newRows[draggedRowIdx][draggedColIdx] = null;

      // Check target row (count BEFORE we removed the dragged section)
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
      } else if (targetSectionsCount === 1) {
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
    }

    // Clean up: remove nulls and empty rows
    const cleanedRows = cleanLayoutRows(newRows);

    onUpdate({ layout: { ...node.layout, rows: cleanedRows } });
    setDraggedSection(null);
    setDragOverSection(null);
  }, [draggedSection, layoutRows, node.layout, onUpdate]);

  // Drop to bottom (create new row at bottom)
  // CONSTRAINT: System always goes to very bottom; IO inserts above system if system is at bottom
  const handleDropToBottom = useCallback(() => {
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
    let cleanedRows = cleanLayoutRows(newRows);

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
  }, [draggedSection, layoutRows, node.layout, onUpdate]);

  // Drop to top (create new row at top)
  // CONSTRAINT: Only System section can drop to top position
  const handleDropToTop = useCallback(() => {
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
    let cleanedRows = cleanLayoutRows(newRows);

    // System goes to very top
    cleanedRows.unshift([draggedSection]);

    onUpdate({ layout: { ...node.layout, rows: cleanedRows } });
    setDraggedSection(null);
    setDragOverSection(null);
  }, [draggedSection, layoutRows, node.layout, onUpdate]);

  // Get anchor side for a section based on its position
  // RULE: When side-by-side, anchors ALWAYS face OUTWARD (left section = left anchors, right section = right anchors)
  const getAnchorSide = useCallback((sectionId, colIndex, isSingleSectionRow) => {
    if (!isSingleSectionRow) {
      // Side-by-side: anchors face OUTWARD (opposite side from divider)
      // colIndex 0 = leftmost section = anchors on LEFT (outside)
      // colIndex 1 = rightmost section = anchors on RIGHT (outside)
      return colIndex === 0 ? 'left' : 'right';
    }
    // Single section row: use stored preference
    if (sectionId === 'input') return node.layout.inputAnchorSide || 'left';
    if (sectionId === 'output') return node.layout.outputAnchorSide || 'right';
    return 'left';
  }, [node.layout.inputAnchorSide, node.layout.outputAnchorSide]);

  // Check if two sections are in the same row (side-by-side)
  const areInSameRow = useCallback((section1, section2) => {
    return layoutRows.some(row => row.includes(section1) && row.includes(section2));
  }, [layoutRows]);

  // Anchor side toggles (memoized)
  const toggleInputAnchorSide = useCallback(() => {
    onUpdate({
      layout: {
        ...node.layout,
        inputAnchorSide: node.layout.inputAnchorSide === 'right' ? 'left' : 'right'
      }
    });
  }, [onUpdate, node.layout]);

  const toggleOutputAnchorSide = useCallback(() => {
    onUpdate({
      layout: {
        ...node.layout,
        outputAnchorSide: node.layout.outputAnchorSide === 'left' ? 'right' : 'left'
      }
    });
  }, [onUpdate, node.layout]);

  // Section update handlers (memoized to prevent re-renders)
  const handleSystemUpdate = useCallback((updates) => {
    onUpdate({ system: { ...node.system, ...updates } });
  }, [onUpdate, node.system]);

  const handleInputUpdate = useCallback((updates) => {
    onUpdate({ inputSection: { ...node.inputSection, ...updates } });
  }, [onUpdate, node.inputSection]);

  const handleOutputUpdate = useCallback((updates) => {
    onUpdate({ outputSection: { ...node.outputSection, ...updates } });
  }, [onUpdate, node.outputSection]);

  // Section collapse handlers (memoized)
  const handleSystemCollapseToggle = useCallback(() => {
    onUpdate({ layout: { ...node.layout, systemCollapsed: !node.layout.systemCollapsed } });
  }, [onUpdate, node.layout]);

  const handleInputCollapseToggle = useCallback(() => {
    onUpdate({ layout: { ...node.layout, inputCollapsed: !node.layout.inputCollapsed } });
  }, [onUpdate, node.layout]);

  const handleOutputCollapseToggle = useCallback(() => {
    onUpdate({ layout: { ...node.layout, outputCollapsed: !node.layout.outputCollapsed } });
  }, [onUpdate, node.layout]);

  // Check if Input and Output are in the same row (side-by-side) - memoized
  const areIOSideBySide = useMemo(
    () => areInSameRow('input', 'output'),
    [areInSameRow]
  );

  // Calculate left/right section widths and collapse states based on actual layout position
  // This determines which section is visually on the left vs right when side-by-side
  const { leftSectionWidth, rightSectionWidth, leftSectionCollapsed, rightSectionCollapsed } = useMemo(() => {
    if (!areIOSideBySide) {
      // When stacked, default to input=left, output=right for System section alignment
      return {
        leftSectionWidth: computedInputSectionWidth,
        rightSectionWidth: computedOutputSectionWidth,
        leftSectionCollapsed: node.layout.inputCollapsed,
        rightSectionCollapsed: node.layout.outputCollapsed
      };
    }
    // Find the row containing both INPUT and OUTPUT to determine left/right order
    const sideBySideRow = layoutRows.find(row =>
      row.includes('input') && row.includes('output')
    );
    if (sideBySideRow) {
      const leftSection = sideBySideRow[0]; // First element is on the left
      return {
        leftSectionWidth: leftSection === 'input'
          ? computedInputSectionWidth
          : computedOutputSectionWidth,
        rightSectionWidth: leftSection === 'input'
          ? computedOutputSectionWidth
          : computedInputSectionWidth,
        leftSectionCollapsed: leftSection === 'input'
          ? node.layout.inputCollapsed
          : node.layout.outputCollapsed,
        rightSectionCollapsed: leftSection === 'input'
          ? node.layout.outputCollapsed
          : node.layout.inputCollapsed,
      };
    }
    return {
      leftSectionWidth: computedInputSectionWidth,
      rightSectionWidth: computedOutputSectionWidth,
      leftSectionCollapsed: node.layout.inputCollapsed,
      rightSectionCollapsed: node.layout.outputCollapsed
    };
  }, [areIOSideBySide, layoutRows, computedInputSectionWidth, computedOutputSectionWidth, node.layout.inputCollapsed, node.layout.outputCollapsed]);

  // Render section content (memoized to prevent recreation on every render)
  const renderSectionContent = useCallback((sectionId, anchorSide, canToggleAnchor) => {
    switch (sectionId) {
      case 'system':
        return (
          <SystemSection
            data={node.system}
            onUpdate={handleSystemUpdate}
            collapsed={node.layout.systemCollapsed}
            onToggleCollapse={handleSystemCollapseToggle}
            onSectionDragStart={handleSectionDragStart}
            onSectionDragEnd={handleSectionDragEnd}
            colors={themeColors.system}
            leftSectionWidth={leftSectionWidth}
            rightSectionWidth={rightSectionWidth}
            leftSectionCollapsed={leftSectionCollapsed}
            rightSectionCollapsed={rightSectionCollapsed}
            areIOSideBySide={areIOSideBySide}
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
            onUpdate={handleInputUpdate}
            canToggleAnchor={canToggleAnchor}
            onToggleAnchorSide={toggleInputAnchorSide}
            onSectionDragStart={handleSectionDragStart}
            onSectionDragEnd={handleSectionDragEnd}
            collapsed={node.layout.inputCollapsed}
            onToggleCollapse={handleInputCollapseToggle}
            colors={themeColors.input}
            connectedAnchorIds={connectedAnchorIds}
            themeColor={anchorThemeColor}
            sharedColumnWidths={sharedColumnWidths}
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
            onUpdate={handleOutputUpdate}
            signalColor={node.signalColor}
            canToggleAnchor={canToggleAnchor}
            onToggleAnchorSide={toggleOutputAnchorSide}
            onSectionDragStart={handleSectionDragStart}
            onSectionDragEnd={handleSectionDragEnd}
            collapsed={node.layout.outputCollapsed}
            onToggleCollapse={handleOutputCollapseToggle}
            colors={themeColors.output}
            connectedAnchorIds={connectedAnchorIds}
            themeColor={anchorThemeColor}
            sharedColumnWidths={sharedColumnWidths}
          />
        );
      default:
        return null;
    }
  }, [
    node.system, node.inputSection, node.outputSection, node.layout.systemCollapsed,
    node.layout.inputCollapsed, node.layout.outputCollapsed, node.id, node.signalColor,
    handleSystemUpdate, handleInputUpdate, handleOutputUpdate,
    handleSystemCollapseToggle, handleInputCollapseToggle, handleOutputCollapseToggle,
    toggleInputAnchorSide, toggleOutputAnchorSide,
    handleSectionDragStart, handleSectionDragEnd,
    themeColors, activeWire, onAnchorClick, connectedAnchorIds, anchorThemeColor,
    sharedColumnWidths, computedInputSectionWidth, computedOutputSectionWidth, areIOSideBySide,
    leftSectionWidth, rightSectionWidth
  ]);

  // Handle click to select (shift+click to add to selection)
  const handleClick = useCallback((e) => {
    if (onSelect && !isDragging) {
      e.stopPropagation();
      onSelect(node.id, e.shiftKey);
    }
  }, [onSelect, isDragging, node.id]);

  // Node width is now determined by content naturally (no explicit width constraints)
  // This allows sections to size based on their content and the node wraps to fit

  // Memoized helper functions for wrapper styling (prevent recreation on every render)
  const getWrapperClassName = useCallback((sectionId, isSingleSectionRow, isCollapsed) => {
    // When stacked, don't force full width - let content determine width
    if (isSingleSectionRow) return '';
    // When collapsed, don't use flex-1 (let it shrink to content)
    if (isCollapsed) return '';
    // When expanded, don't use flex-1 if we have a fixed width
    const hasFixedWidth = isIOSectionType(sectionId) && (inputSectionWidth || outputSectionWidth);
    if (hasFixedWidth) return '';
    // Fallback: use flex-1
    return 'flex-1';
  }, [inputSectionWidth, outputSectionWidth]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CRITICAL: IO SECTION WIDTHS - REQUIRED FOR SYSTEM DROPDOWN ALIGNMENT
  // ═══════════════════════════════════════════════════════════════════════════
  // These widths MUST be fixed values (not flex) to ensure System section
  // dropdowns align with the center divider between INPUT and OUTPUT sections.
  // See SystemSection gridStyle for the alignment implementation.
  // DO NOT change to flex-based sizing - it will break the alignment.
  // ═══════════════════════════════════════════════════════════════════════════
  const getWrapperStyle = useCallback((sectionId, isSingleSectionRow, isCollapsed) => {
    if (isSingleSectionRow) return {};

    // Use collapsed width when collapsed, minWidth when expanded
    // CRITICAL: Fixed widths required for System section dropdown alignment
    if (isCollapsed) {
      if (sectionId === 'input') {
        return { width: `${inputCollapsedWidth}px`, flexShrink: 0 };
      }
      if (sectionId === 'output') {
        return { width: `${outputCollapsedWidth}px`, flexShrink: 0 };
      }
    } else {
      if (sectionId === 'input' && inputSectionWidth) {
        return { minWidth: `${inputSectionWidth}px`, flexShrink: 0 };
      }
      if (sectionId === 'output' && outputSectionWidth) {
        return { minWidth: `${outputSectionWidth}px`, flexShrink: 0 };
      }
    }
    return {};
  }, [inputSectionWidth, outputSectionWidth, inputCollapsedWidth, outputCollapsedWidth]);

  // Memoized dragged section row index (prevents repeated findIndex in render loop and drop zone calculations)
  const draggedSectionRowIndex = useMemo(
    () => draggedSection ? layoutRows.findIndex(row => row.includes(draggedSection)) : -1,
    [draggedSection, layoutRows]
  );

  // Memoized column index of dragged section within its row
  const draggedColIndex = useMemo(
    () => draggedSection && draggedSectionRowIndex >= 0
      ? layoutRows[draggedSectionRowIndex].indexOf(draggedSection)
      : -1,
    [draggedSection, draggedSectionRowIndex, layoutRows]
  );

  // Calculate drop zone visibility for a section (memoized to prevent recalculation in render loop)
  const calculateDropZones = useCallback((sectionId, rowIndex, colIndex) => {
    const isDraggingIO = isIOSectionType(draggedSection);
    const isTargetIO = isIOSectionType(sectionId);
    let showLeftDropZone = false;
    let showRightDropZone = false;

    if (draggedSection && isDraggingIO && isTargetIO && draggedSection !== sectionId) {
      const draggedRowIdx = draggedSectionRowIndex;
      const targetRowIdx = rowIndex;

      // CASE 1: Side-by-side (same row) - show drop zone on opposite side only
      if (draggedRowIdx === targetRowIdx) {
        const targetColIdx = colIndex;

        if (draggedColIndex < targetColIdx) {
          // Dragging left section, show drop zone on RIGHT side of right section
          showRightDropZone = true;
        } else {
          // Dragging right section, show drop zone on LEFT side of left section
          showLeftDropZone = true;
        }
      }
      // CASE 2: Stacked (different rows) - show drop zones on adjacent section
      else {
        const isRowAbove = targetRowIdx === draggedRowIdx - 1;
        const isRowBelow = targetRowIdx === draggedRowIdx + 1;

        if (isRowAbove || isRowBelow) {
          // Show three-zone drop area on section directly above or below
          showLeftDropZone = true;
          showRightDropZone = true;
        }
      }
    }

    return { showLeftDropZone, showRightDropZone };
  }, [draggedSection, draggedSectionRowIndex, draggedColIndex]);

  // Memoized top drop zone (prevents IIFE recreation on every render)
  const topDropZone = useMemo(() => {
    // Only show for System section drag
    if (draggedSection !== 'system') return null;
    // Check if system is already solo at top
    const firstRow = layoutRows[0];
    const systemAlreadyAtTop = firstRow?.length === 1 && firstRow[0] === 'system';
    if (systemAlreadyAtTop) return null;
    return <TopDropZone onDrop={handleDropToTop} />;
  }, [draggedSection, layoutRows, handleDropToTop]);

  // Memoized bottom drop zone (prevents IIFE recreation on every render)
  const bottomDropZone = useMemo(() => {
    if (!draggedSection) return null;
    const lastRow = layoutRows[layoutRows.length - 1];
    const isSystemAlreadyAtBottom = lastRow?.length === 1 && lastRow[0] === 'system';
    // System: show bottom zone only if not already at bottom
    if (draggedSection === 'system') {
      return !isSystemAlreadyAtBottom ? <BottomDropZone onDrop={handleDropToBottom} /> : null;
    }
    // IO sections: show bottom zone ONLY when side-by-side
    // In stacked mode, use the three-zone drop area on adjacent section instead
    const isDraggingIO = isIOSectionType(draggedSection);
    if (isDraggingIO) {
      const isSideBySide = layoutRows[draggedSectionRowIndex]?.length > 1;
      // Show bottom zone only if side-by-side
      if (isSideBySide) {
        return <BottomDropZone onDrop={handleDropToBottom} />;
      }
    }
    return null;
  }, [draggedSection, layoutRows, draggedSectionRowIndex, handleDropToBottom]);

  // Memoized scale badge style (prevents style object recreation on every render)
  const scaleBadgeStyle = useMemo(
    () => ({ transform: `scale(${1 / nodeScale})`, transformOrigin: 'top left' }),
    [nodeScale]
  );

  // Memoized System section event handlers (prevent inline arrow function recreation)
  const handleSystemDragOver = useCallback((e) => handleSectionDragOver(e, 'system'), [handleSectionDragOver]);
  const handleSystemDrop = useCallback((e) => handleSectionDrop(e, 'system'), [handleSectionDrop]);
  const handleSystemMouseUp = useCallback(() => handleSectionDrop(null, 'system'), [handleSectionDrop]);

  // Memoized main wrapper className (prevents string concatenation on every render)
  const wrapperClassName = useMemo(() => {
    const baseClasses = 'absolute bg-zinc-900 border rounded-lg shadow-xl select-none';
    const borderClasses = isSelected ? 'border-cyan-400 ring-2 ring-cyan-500/50' : 'border-zinc-700';
    const cursorClasses = isDragging ? 'cursor-grabbing ring-2 ring-cyan-500/50' : isResizing ? 'ring-2 ring-blue-500/50' : 'cursor-grab';
    return `${baseClasses} ${borderClasses} ${cursorClasses}`;
  }, [isSelected, isDragging, isResizing]);

  // Memoized zIndex calculation (prevents ternary chain on every render)
  const wrapperZIndex = useMemo(() => {
    if (isDragging || isResizing) return 1000;
    if (isSelected) return 800;
    return 70;
  }, [isDragging, isResizing, isSelected]);

  // Memoized transform string (prevents template literal creation on every render)
  const wrapperTransform = useMemo(() => `scale(${nodeScale})`, [nodeScale]);

  return (
    <div
      ref={nodeRef}
      className={wrapperClassName}
      style={{
        left: node.position.x,
        top: node.position.y,
        // Let content determine width - no explicit width constraints
        zIndex: wrapperZIndex,
        transform: wrapperTransform,
        transformOrigin: 'top left',
        isolation: 'isolate', // Create new stacking context
      }}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <TitleBar
        node={node}
        onUpdate={onUpdate}
        onDelete={onDelete}
        themeColors={themeColors}
        areIOSideBySide={areIOSideBySide}
        leftSectionWidth={leftSectionWidth}
        rightSectionWidth={rightSectionWidth}
      />

      {/* Row-based layout */}
      <div className="flex flex-col">
        {/* Top drop zone - visible when dragging System and System is not already at top */}
        {topDropZone}

        {layoutRows.map((row, rowIndex) => {
          const isSingleSectionRow = row.length === 1;
          // Use content-based key for stable React reconciliation
          // This prevents event handler issues when sections move between positions
          const rowKey = row.join('-');

          return (
            <div key={rowKey} className="flex items-stretch">
              {row.map((sectionId, colIndex) => {
                const isLastInRow = colIndex === row.length - 1;
                if (!sectionId) return null;

                const anchorSide = getAnchorSide(sectionId, colIndex, isSingleSectionRow);
                const canToggleAnchor = isSingleSectionRow && sectionId !== 'system';

                // Calculate which side drop zones to show based on layout (memoized)
                const { showLeftDropZone, showRightDropZone } = calculateDropZones(sectionId, rowIndex, colIndex);

                // Force React to REMOUNT SystemSection when row position changes
                // This ensures event handlers are freshly attached
                if (sectionId === 'system') {
                  return (
                    <Fragment key={`system-row-${rowIndex}`}>
                      <div
                        className={isSingleSectionRow ? 'w-full' : 'flex-1'}
                        style={SYSTEM_WRAPPER_STYLE}
                        onDragOver={handleSystemDragOver}
                        onDrop={handleSystemDrop}
                        // Also support mouse-based drops
                        onMouseUp={handleSystemMouseUp}
                      >
                        {renderSectionContent(sectionId, anchorSide, canToggleAnchor)}
                      </div>
                      {/* Divider after non-last sections when side-by-side */}
                      {!isSingleSectionRow && !isLastInRow && (
                        <div
                          className="mx-1.5 self-stretch shrink-0"
                          style={{
                            width: '4px',
                            background: `linear-gradient(to bottom, ${themeColors?.header?.hex || '#10b981'} 0%, ${themeColors?.header?.hex || '#10b981'}80 60%, transparent 100%)`,
                            borderRadius: '2px',
                          }}
                        />
                      )}
                    </Fragment>
                  );
                }

                // Check if section is collapsed
                const isCollapsed = sectionId === 'input'
                  ? node.layout.inputCollapsed
                  : sectionId === 'output'
                  ? node.layout.outputCollapsed
                  : node.layout.systemCollapsed;

                return (
                  <Fragment key={sectionId}>
                    {/* Section wrapper */}
                    <div
                      className={getWrapperClassName(sectionId, isSingleSectionRow, isCollapsed)}
                      style={getWrapperStyle(sectionId, isSingleSectionRow, isCollapsed)}
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
                        showLeftDropZone={showLeftDropZone}
                        showRightDropZone={showRightDropZone}
                        isSingleSectionRow={isSingleSectionRow}
                        draggedSection={draggedSection}
                      >
                        {renderSectionContent(sectionId, anchorSide, canToggleAnchor)}
                      </DraggableSection>
                    </div>
                    {/* Divider after non-last sections when side-by-side */}
                    {!isSingleSectionRow && !isLastInRow && (
                      <div
                        className="mx-1.5 self-stretch shrink-0"
                        style={{
                          width: '4px',
                          background: `linear-gradient(to bottom, ${themeColors?.header?.hex || '#10b981'} 0%, ${themeColors?.header?.hex || '#10b981'}80 60%, transparent 100%)`,
                          borderRadius: '2px',
                        }}
                      />
                    )}
                  </Fragment>
                );
              })}
            </div>
          );
        })}

        {/* Bottom drop zone - visible based on layout and dragged section */}
        {bottomDropZone}
      </div>

      <ResizeHandle onResizeStart={handleResizeStart} />

      {nodeScale !== 1 && (
        <div
          className="absolute -bottom-5 left-0 text-[10px] font-mono text-zinc-500"
          style={scaleBadgeStyle}
        >
          {Math.round(nodeScale * 100)}%
        </div>
      )}
    </div>
  );
}

export default memo(SuperNode, (prev, next) =>
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
  prev.onSelect === next.onSelect &&
  prev.connectedAnchorIds === next.connectedAnchorIds
);
