import { useState, useRef, useEffect } from 'react';

// ============================================
// CONSTANTS - Single source of truth for sizes
// ============================================

const SIZES = {
  ANCHOR: 'w-3 h-3',        // 12px
  DELETE: 'w-4',            // 16px
  HANDLE: 'w-5',            // 20px
  GAP: 'gap-2',             // 8px
  PADDING_X: 'px-2',
  PADDING_Y: 'py-1.5',
};

// Colors per section type
const SECTION_COLORS = {
  input: {
    accent: 'emerald',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500',
    hoverBg: 'hover:bg-emerald-500/20',
  },
  output: {
    accent: 'amber',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500',
    hoverBg: 'hover:bg-amber-500/20',
  },
  system: {
    accent: 'purple',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500',
    hoverBg: 'hover:bg-purple-500/20',
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
  'HDMI', 'SDI', 'DisplayPort', 'DVI', 'VGA', 'USB-C', 'NDI', 'Custom...'
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

const PLATFORMS = [
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

// Card presets for Barco Tri-Combo cards
const CARD_PRESETS = {
  'tri-combo-in': {
    label: 'Tri-Combo Input',
    category: 'input',
    ports: [
      { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' },
      { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' },
      { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' },
      { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' },
      { connector: 'HDMI', resolution: '3840x2160', refreshRate: '60' },
      { connector: 'DisplayPort', resolution: '3840x2160', refreshRate: '60' },
    ]
  },
  'tri-combo-out': {
    label: 'Tri-Combo Output',
    category: 'output',
    ports: [
      { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' },
      { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' },
      { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' },
      { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' },
      { connector: 'HDMI', resolution: '3840x2160', refreshRate: '60' },
      { connector: 'DisplayPort', resolution: '3840x2160', refreshRate: '60' },
    ]
  },
};

// Column definitions - ALL row elements as columns for template layout
const COLUMN_DEFS = {
  anchor: { id: 'anchor', label: '', width: 'w-[24px]', draggable: false },
  delete: { id: 'delete', label: '🗑', width: 'w-[24px]', draggable: false },
  port: { id: 'port', label: 'Port', width: 'w-[52px]', draggable: true },
  connector: { id: 'connector', label: 'Connector', width: 'w-[90px]', draggable: true },
  resolution: { id: 'resolution', label: 'Resolution', width: 'w-[100px]', draggable: true },
  rate: { id: 'rate', label: 'Rate', width: 'w-[70px]', draggable: true },
  flip: { id: 'flip', label: '', width: 'w-[42px]', draggable: false },
};

// Data columns that can be reordered by dragging
const DATA_COLUMNS = ['port', 'connector', 'resolution', 'rate'];

// Build full column order based on mode
const getFullColumnOrder = (dataOrder, canToggleAnchor, isReversed) => {
  // Base order: anchor, delete, data columns, flip (if stacked)
  const baseOrder = canToggleAnchor
    ? ['anchor', 'delete', ...dataOrder, 'flip']
    : ['anchor', 'delete', ...dataOrder];

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
    className={`absolute top-0 bottom-0 ${side === 'left' ? 'left-0' : 'right-0'} w-10
      border-2 border-dashed transition-all z-20 flex items-center justify-center
      ${isActive
        ? 'border-cyan-400 bg-cyan-400/20'
        : 'border-zinc-600/50 bg-zinc-800/30 hover:border-cyan-400/50 hover:bg-cyan-400/10'}`}
  >
    <span className="text-cyan-400 text-[8px] font-bold">
      {side === 'left' ? '◀' : '▶'}
    </span>
  </div>
);

// ============================================
// ROW DROP ZONE COMPONENT
// Appears above/below rows when dragging SYSTEM to indicate new row placement
// ============================================

const RowDropZone = ({ position, onDrop }) => (
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
    className="w-full h-6 border-2 border-dashed border-purple-400 bg-purple-400/20
      flex items-center justify-center hover:bg-purple-400/40 transition-all cursor-pointer"
  >
    <span className="text-purple-300 text-[9px] font-bold">
      {position === 'top' ? '▲ DROP SYS HERE ▲' : '▼ DROP SYS HERE ▼'}
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
    className="w-full h-10 border-2 border-dashed border-cyan-400 bg-cyan-400/20
      flex items-center justify-center hover:bg-cyan-400/40 transition-all cursor-pointer"
  >
    <span className="text-cyan-300 text-[10px] font-bold">▼ DROP HERE FOR NEW ROW ▼</span>
  </div>
);

// ============================================
// ANCHOR COMPONENT
// ============================================

const Anchor = ({ anchorId, type, isActive, signalColor, onClick }) => {
  const isInput = type === 'in';
  const colorHex = signalColor ? SIGNAL_COLORS.find(c => c.id === signalColor)?.hex : null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick && onClick(anchorId, type);
      }}
      data-anchor-id={anchorId}
      className={`${SIZES.ANCHOR} border-2 transition-all hover:scale-125 shrink-0
        ${isInput ? 'rounded-sm' : 'rounded-full'}
        ${isActive
          ? 'bg-cyan-500 border-cyan-400 shadow-lg shadow-cyan-500/50'
          : isInput
            ? 'bg-zinc-800 border-emerald-500 hover:bg-emerald-500/20'
            : 'bg-zinc-800 border-amber-500 hover:bg-amber-500/20'
        }`}
      style={colorHex && !isInput ? { borderColor: colorHex, boxShadow: `0 0 8px ${colorHex}50` } : {}}
      title={isInput ? 'Input - click to connect' : 'Output - click to connect'}
    />
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
}) => {
  const isInput = type === 'in';
  const isReversed = anchorSide === 'right';
  const colors = SECTION_COLORS[isInput ? 'input' : 'output'];

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
            className={`px-1.5 py-0.5 bg-zinc-700/50 hover:bg-zinc-600 rounded text-[9px] font-mono ${colors.text}`}
            title={`Anchors on ${anchorSide} side - click to toggle`}
          >
            {anchorSide === 'right' ? '■ ▶' : '◀ ■'}
          </button>
        );
      case 'port':
        return (
          <span className="font-mono text-zinc-400 text-center w-full">
            {isInput ? 'IN' : 'OUT'} {port.number}
          </span>
        );
      case 'connector':
        return (
          <select
            value={port.connector || 'HDMI'}
            onChange={(e) => onUpdate({ connector: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 font-mono text-zinc-300 text-[10px] w-full"
          >
            {CONNECTOR_TYPES.map(conn => (
              <option key={conn} value={conn}>{conn}</option>
            ))}
          </select>
        );
      case 'resolution':
        return (
          <select
            value={port.resolution}
            onChange={(e) => onUpdate({ resolution: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 font-mono text-zinc-300 text-[10px] w-full"
          >
            {RESOLUTIONS.map(res => (
              <option key={res} value={res}>{res}</option>
            ))}
          </select>
        );
      case 'rate':
        return (
          <select
            value={port.refreshRate}
            onChange={(e) => onUpdate({ refreshRate: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 font-mono text-zinc-300 text-[10px] w-full"
          >
            {REFRESH_RATES.map(rate => (
              <option key={rate} value={rate}>{rate}</option>
            ))}
          </select>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`flex items-center ${SIZES.PADDING_Y} hover:bg-zinc-800/50 group text-[11px] whitespace-nowrap w-full`}>
      {fullColumnOrder.map((colId, index) => {
        const colDef = COLUMN_DEFS[colId];
        if (!colDef) return null;

        return (
          <div key={colId} className="flex items-center">
            {/* Marker between ALL columns (except first) - matches ColumnHeaders */}
            {index > 0 && (
              <span className="w-px h-4 bg-zinc-600/40 shrink-0" />
            )}
            <span className={`${colDef.width} shrink-0 flex items-center justify-center`}>
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

const ColumnHeaders = ({ anchorSide, canToggleAnchor, columnOrder, onReorderColumns }) => {
  const isReversed = anchorSide === 'right';
  const [draggedColumn, setDraggedColumn] = useState(null);

  // Use provided columnOrder or default
  const dataOrder = columnOrder || DATA_COLUMNS;

  // Get full column order (anchor, delete, data, flip) with proper reversal
  const fullColumnOrder = getFullColumnOrder(dataOrder, canToggleAnchor, isReversed);

  const handleDragStart = (e, colId) => {
    setDraggedColumn(colId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', colId);
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
    <div className={`flex items-center py-1 bg-zinc-800/30 border-b border-zinc-700/30
        text-[9px] font-mono text-zinc-500 uppercase tracking-wide w-full`}
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
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            onDrop={(e) => isDraggable && handleDrop(e, colId)}
          >
            {/* Marker between ALL columns (except first) */}
            {index > 0 && (
              <span className="w-px h-4 bg-zinc-600/40 shrink-0" />
            )}
            <span
              draggable={isDraggable}
              onMouseDown={(e) => isDraggable && e.stopPropagation()}
              onDragStart={(e) => isDraggable && handleDragStart(e, colId)}
              onDragEnd={handleDragEnd}
              className={`${colDef.width} shrink-0 flex items-center justify-center transition-opacity
                ${isDraggable ? 'cursor-grab select-none hover:text-zinc-300' : ''}
                ${isDragging ? 'opacity-50' : ''}`}
              title={isDraggable ? "Drag to reorder" : undefined}
            >
              {colDef.label}
            </span>
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
}) => {
  // Drag handle goes on OPPOSITE side of anchor
  const handleOnRight = anchorSide !== 'right';

  // System sections never show side drop zones (system always in own row)
  const isSystemSection = sectionId === 'system';
  const canShowSideZones = showSideDropZones && !isSystemSection;

  return (
    <div
      onDragOver={(e) => onDragOver(e, sectionId)}
      onDrop={(e) => onDrop(e, sectionId)}
      className={`
        relative w-full
        transition-all duration-150
        ${isDragging ? 'opacity-40' : ''}
        ${isDraggedOver ? 'ring-2 ring-cyan-400 ring-inset' : ''}
      `}
    >
      {/* Side drop zones - only for INPUT/OUTPUT sections (system never side-by-side) */}
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
}) => {
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const isReversed = anchorSide === 'right';
  const colors = SECTION_COLORS[type];

  // Filter presets by section type (input/output)
  const availablePresets = Object.entries(CARD_PRESETS)
    .filter(([_, preset]) => preset.category === type)
    .map(([id, preset]) => ({ id, ...preset }));

  const handlePresetSelect = (presetId) => {
    const preset = CARD_PRESETS[presetId];
    if (preset && onApplyPreset) {
      onApplyPreset(preset.ports);
    }
    setShowPresetMenu(false);
  };

  return (
    <div
      className={`flex items-center ${SIZES.PADDING_X} py-1 ${colors.bg} border-b border-zinc-700/50`}
    >
      {/* Left side - title when anchor is left, spacer when anchor is right */}
      <div className="flex-1 min-w-0">
        {!isReversed && (
          <span className={`font-mono font-bold ${colors.text} text-[11px]`}>
            {title}
          </span>
        )}
      </div>

      {/* Center - Drag handle, Card preset button, and Add button */}
      <div className="flex items-center gap-1 shrink-0 relative">
        {/* Drag handle */}
        <span
          draggable
          onDragStart={(e) => onDragStart && onDragStart(e, sectionId)}
          onDragEnd={onDragEnd}
          onMouseDown={(e) => e.stopPropagation()}
          className={`px-1 py-0.5 bg-zinc-700/50 hover:bg-zinc-600 rounded text-[10px] cursor-grab select-none ${colors.text}`}
          title="Drag to reorder section"
        >
          ⋮⋮
        </span>

        {/* Card preset button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowPresetMenu(!showPresetMenu);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className={`px-1.5 py-0.5 bg-zinc-700/50 hover:bg-zinc-600 rounded text-[10px] font-mono ${colors.text}`}
          title="Load card preset"
        >
          ⊞
        </button>

        {/* Preset dropdown menu */}
        {showPresetMenu && (
          <div
            className="absolute top-full left-0 mt-1 bg-zinc-800 border border-zinc-600 rounded shadow-lg z-50 min-w-[180px]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="px-2 py-1 text-[9px] text-zinc-500 border-b border-zinc-700 font-mono">
              CARD PRESETS
            </div>
            {availablePresets.map((preset) => (
              <button
                key={preset.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePresetSelect(preset.id);
                }}
                className="w-full text-left px-2 py-1.5 text-[10px] font-mono text-zinc-300 hover:bg-zinc-700 flex items-center gap-2"
              >
                <span className="text-zinc-500">{preset.ports.length}p</span>
                <span>{preset.label}</span>
              </button>
            ))}
            {availablePresets.length === 0 && (
              <div className="px-2 py-1.5 text-[10px] font-mono text-zinc-500">
                No presets available
              </div>
            )}
          </div>
        )}

        {/* Add button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd && onAdd();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className={`px-2 py-0.5 bg-zinc-700/50 hover:bg-zinc-600 rounded text-[10px] font-mono ${colors.text}`}
          title="Add port"
        >
          +
        </button>
      </div>

      {/* Right side - title when anchor is right, spacer when anchor is left */}
      <div className="flex-1 min-w-0 text-right">
        {isReversed && (
          <span className={`font-mono font-bold ${colors.text} text-[11px]`}>
            {title}
          </span>
        )}
      </div>
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
}) => {
  const sectionType = type === 'input' ? 'input' : 'output';
  const sectionId = type === 'input' ? 'input' : 'output';
  const portType = type === 'input' ? 'in' : 'out';

  const addPort = () => {
    const prefix = type === 'input' ? 'in' : 'out';
    const newPort = {
      id: `${prefix}-${Date.now()}`,
      number: data.ports.length + 1,
      connector: 'HDMI',
      resolution: '1920x1080',
      refreshRate: '59.94'
    };
    onUpdate({ ports: [...data.ports, newPort] });
  };

  const updatePort = (portId, updates) => {
    onUpdate({
      ports: data.ports.map(p => p.id === portId ? { ...p, ...updates } : p)
    });
  };

  const deletePort = (portId) => {
    onUpdate({
      ports: data.ports.filter(p => p.id !== portId).map((p, i) => ({ ...p, number: i + 1 }))
    });
  };

  const reorderColumns = (newOrder) => {
    onUpdate({ columnOrder: newOrder });
  };

  // Apply a preset (replaces all ports with preset configuration)
  const applyPreset = (presetPorts) => {
    const prefix = type === 'input' ? 'in' : 'out';
    const newPorts = presetPorts.map((p, i) => ({
      id: `${prefix}-${Date.now()}-${i}`,
      number: i + 1,
      connector: p.connector,
      resolution: p.resolution,
      refreshRate: p.refreshRate,
    }));
    onUpdate({ ports: newPorts });
  };

  // Get column order from data or use default
  const columnOrder = data.columnOrder || DATA_COLUMNS;

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
      />

      {data.ports.length > 0 && (
        <ColumnHeaders
          anchorSide={anchorSide}
          canToggleAnchor={canToggleAnchor}
          columnOrder={columnOrder}
          onReorderColumns={reorderColumns}
        />
      )}

      <div className="flex-1 w-full">
        {data.ports.length === 0 ? (
          <div className={`${SIZES.PADDING_X} py-2 text-zinc-600 font-mono italic text-[10px]`}>
            No {type}s
          </div>
        ) : (
          data.ports.map(port => (
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
            />
          ))
        )}
      </div>
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
}) => {
  return (
    <div className="flex flex-col border-t border-zinc-700/50 bg-purple-500/5">
      {/* Header with collapse toggle */}
      <div
        className="flex items-center px-2 py-0.5 bg-purple-500/10 border-b border-zinc-700/50 cursor-pointer hover:bg-purple-500/20"
        onClick={(e) => {
          e.stopPropagation();
          onToggleCollapse && onToggleCollapse();
        }}
      >
        {/* Left side - title */}
        <span className="font-mono font-bold text-purple-400 text-[9px] flex-1">
          SYS
        </span>

        {/* Center - Drag handle */}
        <span
          draggable
          onDragStart={(e) => onSectionDragStart && onSectionDragStart(e, 'system')}
          onDragEnd={onSectionDragEnd}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="px-1 py-0.5 bg-zinc-700/50 hover:bg-zinc-600 rounded text-[10px] cursor-grab select-none text-purple-400 mx-1"
          title="Drag to reorder section"
        >
          ⋮⋮
        </span>

        {/* Right side - Collapse toggle */}
        <span
          className="text-purple-400 text-[8px] flex-1 text-right"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse && onToggleCollapse();
          }}
        >
          {collapsed ? '▶' : '▼'}
        </span>
      </div>

      {!collapsed && (
        <div className="p-2 space-y-2 text-[10px]">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-mono w-24 shrink-0">Platform</span>
            <select
              value={data.platform || 'MacBook Pro'}
              onChange={(e) => onUpdate({ platform: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 font-mono text-zinc-300"
            >
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-mono w-24 shrink-0">Software</span>
            <select
              value={data.software || 'none'}
              onChange={(e) => onUpdate({ software: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 font-mono text-zinc-300"
            >
              {SOFTWARE_PRESETS.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-mono w-24 shrink-0">Capture Card</span>
            <select
              value={data.captureCard || 'none'}
              onChange={(e) => onUpdate({ captureCard: e.target.value })}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 font-mono text-zinc-300"
            >
              {CAPTURE_CARDS.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// TITLE BAR COMPONENT
// ============================================

const TitleBar = ({ node, onUpdate, onDelete }) => {
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

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border-b border-zinc-700 rounded-t-lg"
      style={{ borderLeft: signalColorHex ? `4px solid ${signalColorHex}` : undefined }}
    >
      <span className="font-mono font-bold text-zinc-100 text-sm">{displayTitle()}</span>
      <input
        type="text"
        value={node.title}
        onChange={(e) => onUpdate({ title: e.target.value })}
        onClick={(e) => e.stopPropagation()}
        className="bg-transparent font-mono text-zinc-400 focus:outline-none text-[10px] w-20 opacity-50 hover:opacity-100"
        title="Edit device name"
        placeholder="Device"
      />

      <div className="flex items-center gap-1 ml-auto shrink-0">
        {/* Signal color picker */}
        <select
          value={node.signalColor || ''}
          onChange={(e) => onUpdate({ signalColor: e.target.value || null })}
          onClick={(e) => e.stopPropagation()}
          className="bg-zinc-700 border-none rounded px-1 py-0.5 text-[9px] text-zinc-300"
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

export default function SuperNode({ node, zoom, onUpdate, onDelete, onAnchorClick, registerAnchor, activeWire }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, scale: 1 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Section drag state
  const [draggedSection, setDraggedSection] = useState(null);
  const [dragOverSection, setDragOverSection] = useState(null);

  const nodeRef = useRef(null);
  const nodeScale = node.scale || 1;

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

  // Register anchor positions
  useEffect(() => {
    if (!registerAnchor || !nodeRef.current) return;

    const scale = node.scale || 1;
    const allPorts = [...node.inputSection.ports, ...node.outputSection.ports];

    allPorts.forEach((port) => {
      const anchorId = `${node.id}-${port.id}`;
      const anchorEl = nodeRef.current?.querySelector(`[data-anchor-id="${anchorId}"]`);

      if (anchorEl) {
        const anchorRect = anchorEl.getBoundingClientRect();
        const nodeRect = nodeRef.current.getBoundingClientRect();
        const totalScale = zoom * scale;
        const localX = (anchorRect.left + anchorRect.width / 2 - nodeRect.left) / totalScale;
        const localY = (anchorRect.top + anchorRect.height / 2 - nodeRect.top) / totalScale;

        registerAnchor(anchorId, {
          x: node.position.x + localX,
          y: node.position.y + localY
        });
      }
    });
  }, [node.position, node.inputSection, node.outputSection, node.scale, node.layout, registerAnchor, node.id, zoom]);

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
  const handleSectionDragStart = (e, sectionId) => {
    e.stopPropagation();
    setDraggedSection(sectionId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sectionId);
  };

  const handleSectionDragOver = (e, sectionId) => {
    // Only handle if we're actually dragging a section (not a column header)
    if (!draggedSection) return;

    e.preventDefault();
    e.stopPropagation();

    // Don't highlight sections in multi-section rows when dragging SYSTEM
    // The RowDropZone provides the visual feedback instead
    if (draggedSection === 'system') {
      const targetRow = layoutRows.find(row => row.includes(sectionId));
      if (targetRow && targetRow.length > 1) {
        setDragOverSection(null);
        return;
      }
    }

    if (draggedSection !== sectionId) {
      setDragOverSection(sectionId);
    }
  };

  const handleSectionDragEnd = () => {
    setDraggedSection(null);
    setDragOverSection(null);
  };

  // Drop on section (swap positions in same row or move to different row)
  // CONSTRAINT: System can only be at TOP or BOTTOM (never middle, never side-by-side)
  const handleSectionDrop = (e, targetSectionId) => {
    // Only handle if we're actually dragging a section (not a column header)
    if (!draggedSection) return;

    e.preventDefault();
    e.stopPropagation();

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

    const targetRowHasMultipleSections = newRows[targetRowIdx].filter(s => s !== null).length > 1;
    const draggedRowHasMultipleSections = newRows[draggedRowIdx].filter(s => s !== null).length > 1;

    // SPECIAL CASE: Dragging SYSTEM when target is in a side-by-side row
    // System can't go into a multi-section row, so just move it to top/bottom
    if (draggedSection === 'system' && targetRowHasMultipleSections) {
      // Remove system from current position
      newRows[draggedRowIdx][draggedColIdx] = null;

      // Clean up
      let cleanedRows = newRows
        .map(row => row.filter(s => s !== null))
        .filter(row => row.length > 0);

      // Add system to top or bottom based on target position
      if (targetRowIdx <= draggedRowIdx) {
        cleanedRows.unshift(['system']); // Moving toward top
      } else {
        cleanedRows.push(['system']); // Moving toward bottom
      }

      onUpdate({ layout: { ...node.layout, rows: cleanedRows } });
      setDraggedSection(null);
      setDragOverSection(null);
      return;
    }

    // SPECIAL CASE: Dropping onto SYSTEM when dragged section is in side-by-side row
    // Just move the dragged section to its own row near system
    if (targetSectionId === 'system' && draggedRowHasMultipleSections) {
      // Remove dragged section from current position
      newRows[draggedRowIdx][draggedColIdx] = null;

      // Clean up
      let cleanedRows = newRows
        .map(row => row.filter(s => s !== null))
        .filter(row => row.length > 0);

      // Find where system is now and insert the dragged section appropriately
      const systemIdx = cleanedRows.findIndex(row => row.includes('system'));
      if (systemIdx === 0) {
        // System at top, insert dragged section below it
        cleanedRows.splice(1, 0, [draggedSection]);
      } else {
        // System at bottom, insert dragged section above it
        cleanedRows.splice(systemIdx, 0, [draggedSection]);
      }

      onUpdate({ layout: { ...node.layout, rows: cleanedRows } });
      setDraggedSection(null);
      setDragOverSection(null);
      return;
    }

    // Normal swap for single-section rows
    newRows[draggedRowIdx][draggedColIdx] = targetSectionId;
    newRows[targetRowIdx][targetColIdx] = draggedSection;

    // Clean up empty rows
    let cleanedRows = newRows
      .map(row => row.filter(s => s !== null))
      .filter(row => row.length > 0);

    // CONSTRAINT: Ensure system is at top or bottom (never middle)
    const systemRowIdx = cleanedRows.findIndex(row => row.includes('system'));
    if (systemRowIdx > 0 && systemRowIdx < cleanedRows.length - 1) {
      // System is in the middle - move it to top or bottom based on drag direction
      const systemRow = cleanedRows.splice(systemRowIdx, 1)[0];
      if (targetRowIdx < draggedRowIdx) {
        cleanedRows.unshift(systemRow); // Moving up → go to top
      } else {
        cleanedRows.push(systemRow); // Moving down → go to bottom
      }
    }

    // CONSTRAINT: System should never be side-by-side (extra safety check)
    const systemRowIdxFinal = cleanedRows.findIndex(row => row.includes('system'));
    if (systemRowIdxFinal !== -1 && cleanedRows[systemRowIdxFinal].length > 1) {
      // Extract system to its own row
      const systemRow = cleanedRows[systemRowIdxFinal];
      const otherSections = systemRow.filter(s => s !== 'system');
      cleanedRows[systemRowIdxFinal] = otherSections;
      // Add system back as its own row at bottom
      cleanedRows.push(['system']);
      // Clean up any empty rows
      cleanedRows = cleanedRows.filter(row => row.length > 0);
    }

    onUpdate({ layout: { ...node.layout, rows: cleanedRows } });
    setDraggedSection(null);
    setDragOverSection(null);
  };

  // Drop to side (create or join column)
  // CONSTRAINT: System can never be side-by-side (only INPUT/OUTPUT can share a row)
  const handleDropToSide = (targetSectionId, side) => {
    if (!draggedSection || draggedSection === targetSectionId) {
      setDraggedSection(null);
      return;
    }

    // Reject: System cannot go side-by-side with anything
    if (draggedSection === 'system' || targetSectionId === 'system') {
      setDraggedSection(null);
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
  const handleDropToTop = () => {
    if (!draggedSection) return;

    const newRows = layoutRows.map(row => [...row]);

    // Remove dragged section from current position
    newRows.forEach((row) => {
      const idx = row.indexOf(draggedSection);
      if (idx !== -1) row[idx] = null;
    });

    // Clean up
    let cleanedRows = newRows
      .map(row => row.filter(s => s !== null))
      .filter(row => row.length > 0);

    // Add to top
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
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={nodeRef}
      className={`absolute bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl select-none ${
        isDragging ? 'cursor-grabbing ring-2 ring-cyan-500/50' : isResizing ? 'ring-2 ring-blue-500/50' : 'cursor-grab'
      }`}
      style={{
        left: node.position.x,
        top: node.position.y,
        width: 'auto',
        minWidth: 320,
        zIndex: isDragging || isResizing ? 100 : 10,
        transform: `scale(${nodeScale})`,
        transformOrigin: 'top left',
      }}
      onMouseDown={handleMouseDown}
    >
      <TitleBar node={node} onUpdate={onUpdate} onDelete={onDelete} />

      {/* Row-based layout */}
      <div className="flex flex-col">
        {layoutRows.map((row, rowIndex) => {
          const isSingleSectionRow = row.length === 1;
          // Show top drop zone above side-by-side rows when dragging SYSTEM
          const showTopDropZone = draggedSection === 'system' && !isSingleSectionRow;

          return (
            <div key={rowIndex}>
              {/* Top drop zone for SYSTEM above side-by-side rows */}
              {showTopDropZone && (
                <RowDropZone position="top" onDrop={handleDropToTop} />
              )}

              <div className={`flex ${!isSingleSectionRow ? 'gap-3' : ''}`}>
              {row.map((sectionId, colIndex) => {
                if (!sectionId) return null;

                const anchorSide = getAnchorSide(sectionId, rowIndex, colIndex, isSingleSectionRow);
                const canToggleAnchor = isSingleSectionRow && sectionId !== 'system';
                // Side drop zones only when:
                // 1. Dragging an IO section (not system)
                // 2. Target is not the dragged section
                // 3. NOT already side-by-side (if same row, just swap - no zones needed)
                const showSideDropZones = draggedSection &&
                  draggedSection !== sectionId &&
                  draggedSection !== 'system' &&
                  !areInSameRow(draggedSection, sectionId);

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
                    >
                      {renderSectionContent(sectionId, anchorSide, canToggleAnchor)}
                    </DraggableSection>
                  </div>
                );
              })}
              </div>
            </div>
          );
        })}

        {/* Bottom drop zone - only visible when dragging */}
        {draggedSection && (
          <BottomDropZone onDrop={handleDropToBottom} />
        )}
      </div>

      <ResizeHandle onResizeStart={handleResizeStart} />

      {nodeScale !== 1 && (
        <div
          className="absolute -bottom-5 left-0 text-[9px] font-mono text-zinc-500"
          style={{ transform: `scale(${1 / nodeScale})`, transformOrigin: 'top left' }}
        >
          {Math.round(nodeScale * 100)}%
        </div>
      )}
    </div>
  );
}
