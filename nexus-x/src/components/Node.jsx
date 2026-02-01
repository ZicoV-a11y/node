import { useState, useRef, useEffect, useCallback } from 'react';

// Dropdown options
const RESOLUTIONS = [
  '640x480', '800x600', '1024x768',
  '1280x720', '1920x1080',
  '2560x1440', '3840x2160',
  '7680x4320',
  'Custom...'
];

const REFRESH_RATES = [
  '23.98', '24', '25', '29.97', '30',
  '50', '59.94', '60', '120',
  'Custom...'
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

// Column definitions for port rows
const COLUMN_DEFS = {
  port: { id: 'port', label: 'Port', width: 'w-[38px]' },
  connector: { id: 'connector', label: 'Connector', width: 'w-[82px]' },
  resolution: { id: 'resolution', label: 'Resolution', width: 'w-[82px]' },
  rate: { id: 'rate', label: 'Rate', width: 'w-[62px]' }
};

// Platform presets
const PLATFORMS = [
  'MacBook Pro', 'MacBook Air', 'Mac Mini', 'Mac Studio', 'Mac Pro',
  'Windows PC', 'Windows Laptop',
  'Linux PC',
  'Custom...'
];

// Software presets
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

// Capture card presets
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
  { id: 'aja-corvid', label: 'AJA Corvid' },
  { id: 'aja-kona', label: 'AJA Kona' },
  { id: 'custom', label: 'Custom...' },
];

// Port Row component - anchor is inline in the row
const PortRow = ({ port, type, onUpdate, onDelete, anchorId, isActive, onAnchorClick, signalColor, columnOrder, anchorSide, isStacked }) => {
  const isInput = type === 'in';
  const colorHex = signalColor ? SIGNAL_COLORS.find(c => c.id === signalColor)?.hex : null;
  const cols = columnOrder || ['port', 'connector', 'resolution', 'rate'];
  // Determine anchor position: inputs default to left, outputs default to right
  // Use explicit anchorSide if provided, otherwise use type-based default
  const effectiveAnchorSide = anchorSide || (isInput ? 'left' : 'right');
  const anchorOnLeft = effectiveAnchorSide === 'left';
  const anchorOnRight = effectiveAnchorSide === 'right';

  const AnchorInline = () => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onAnchorClick(anchorId, type);
      }}
      data-anchor-id={anchorId}
      className={`w-3 h-3 border-2 transition-all hover:scale-125 shrink-0
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

  // Render a dropdown based on column type
  const renderColumn = (colId) => {
    const colDef = COLUMN_DEFS[colId];
    if (!colDef) return null;

    switch (colId) {
      case 'port':
        return (
          <span key={colId} className={`font-mono text-zinc-400 shrink-0 ${colDef.width}`}>
            {isInput ? 'IN' : 'OUT'} {port.number}
          </span>
        );
      case 'connector':
        return (
          <select
            key={colId}
            value={port.connector || 'HDMI'}
            onChange={(e) => onUpdate({ connector: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className={`bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 font-mono text-zinc-300 text-[10px] ${colDef.width}`}
          >
            {CONNECTOR_TYPES.map(conn => (
              <option key={conn} value={conn}>{conn}</option>
            ))}
          </select>
        );
      case 'resolution':
        return (
          <select
            key={colId}
            value={port.resolution}
            onChange={(e) => onUpdate({ resolution: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className={`bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 font-mono text-zinc-300 text-[10px] ${colDef.width}`}
          >
            {RESOLUTIONS.map(res => (
              <option key={res} value={res}>{res}</option>
            ))}
          </select>
        );
      case 'rate':
        return (
          <select
            key={colId}
            value={port.refreshRate}
            onChange={(e) => onUpdate({ refreshRate: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            className={`bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 font-mono text-zinc-300 text-[10px] ${colDef.width}`}
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

  // Delete button component - stays on "inside" (between inputs and outputs)
  const DeleteButton = () => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 px-1 shrink-0 w-[16px]"
    >
      ×
    </button>
  );

  return (
    <div className={`flex items-center gap-2 py-1.5 hover:bg-zinc-800/50 group text-[11px] whitespace-nowrap w-full ${anchorOnLeft ? 'pr-2' : 'pl-2'} ${anchorOnRight ? 'pl-2' : 'pr-2'}`}>
      {/* Anchor on left side */}
      {anchorOnLeft && <AnchorInline />}

      {/* Delete button on left for outputs (inside position) */}
      {!isInput && <DeleteButton />}

      {/* Render columns in specified order */}
      {cols.map(colId => renderColumn(colId))}

      {/* Delete button on right for inputs (inside position) */}
      {isInput && <DeleteButton />}

      {/* Anchor on right side */}
      {anchorOnRight && <AnchorInline />}
    </div>
  );
};

// Input Section
const InputSection = ({ data, onUpdate, anchorSide, onToggleAnchorSide, isStacked, nodeId, activeWire, onAnchorClick }) => {
  const [draggedCol, setDraggedCol] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const columnOrder = data.columnOrder || ['port', 'connector', 'resolution', 'rate'];

  const addPort = () => {
    const newPort = {
      id: `in-${Date.now()}`,
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

  // Column drag handlers
  const handleColDragStart = (e, colId) => {
    e.stopPropagation();
    setDraggedCol(colId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', colId);
  };

  const handleColDragOver = (e, colId) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedCol && draggedCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const handleColDragEnd = () => {
    setDraggedCol(null);
    setDragOverCol(null);
  };

  const handleColDrop = (e, targetColId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedCol || draggedCol === targetColId) return;

    const newOrder = [...columnOrder];
    const draggedIndex = newOrder.indexOf(draggedCol);
    const targetIndex = newOrder.indexOf(targetColId);

    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedCol);

    onUpdate({ columnOrder: newOrder });
    setDraggedCol(null);
    setDragOverCol(null);
  };

  return (
    <div className="flex flex-col w-full border-t border-zinc-700/50">
      {/* Column header - name follows anchor side */}
      <div className={`flex items-center justify-between px-2 py-1 bg-emerald-500/10 border-b border-zinc-700/50 ${anchorSide === 'right' ? 'flex-row-reverse' : ''}`}>
        <input
          type="text"
          value={data.columnName}
          onChange={(e) => onUpdate({ columnName: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          className={`bg-transparent font-mono font-bold text-emerald-400 text-[11px] focus:outline-none flex-1 ${anchorSide === 'right' ? 'text-right' : ''}`}
        />
        <div className="flex items-center gap-1">
          {/* Anchor side toggle - only in stacked mode */}
          {isStacked && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleAnchorSide && onToggleAnchorSide();
              }}
              className="text-emerald-400 hover:text-emerald-300 text-[9px] px-1 font-mono opacity-70 hover:opacity-100"
              title={`Anchors on ${anchorSide || 'left'} side - click to toggle`}
            >
              {anchorSide === 'right' ? '■ ▶' : '◀ ■'}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              addPort();
            }}
            className="text-emerald-400 hover:text-emerald-300 font-mono text-[10px] shrink-0"
          >
            +
          </button>
        </div>
      </div>

      {/* Column headers row - only show when there are ports */}
      {data.ports.length > 0 && (
        <div className={`flex items-center gap-2 py-1 bg-zinc-800/30 border-b border-zinc-700/30 text-[9px] font-mono text-zinc-500 uppercase tracking-wide ${anchorSide === 'right' ? 'pl-2' : 'pr-2'}`}>
          {/* Spacer for anchor on left */}
          {(anchorSide !== 'right') && <span className="shrink-0 w-3"></span>}
          {columnOrder.map(colId => {
            const colDef = COLUMN_DEFS[colId];
            if (!colDef) return null;
            return (
              <span
                key={colId}
                draggable
                onDragStart={(e) => handleColDragStart(e, colId)}
                onDragOver={(e) => handleColDragOver(e, colId)}
                onDragEnd={handleColDragEnd}
                onDrop={(e) => handleColDrop(e, colId)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`${colDef.width} cursor-grab select-none transition-all
                  ${draggedCol === colId ? 'opacity-40' : ''}
                  ${dragOverCol === colId ? 'bg-emerald-500/20 rounded' : ''}
                  hover:text-emerald-400`}
                title="Drag to reorder"
              >
                {colDef.label}
              </span>
            );
          })}
          <span className="w-[16px]"></span>
          {/* Spacer for anchor on right */}
          {(anchorSide === 'right') && <span className="shrink-0 w-3"></span>}
        </div>
      )}

      {/* Ports */}
      <div className="flex-1">
        {data.ports.length === 0 ? (
          <div className="px-2 py-2 text-zinc-600 font-mono italic text-[10px]">
            No inputs
          </div>
        ) : (
          data.ports.map(port => (
            <PortRow
              key={port.id}
              port={port}
              type="in"
              onUpdate={(updates) => updatePort(port.id, updates)}
              onDelete={() => deletePort(port.id)}
              anchorId={`${nodeId}-${port.id}`}
              isActive={activeWire?.from === `${nodeId}-${port.id}`}
              onAnchorClick={onAnchorClick}
              columnOrder={columnOrder}
              anchorSide={anchorSide}
              isStacked={isStacked}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Output Section
const OutputSection = ({ data, onUpdate, anchorSide, onToggleAnchorSide, isStacked, nodeId, activeWire, onAnchorClick, signalColor }) => {
  const [draggedCol, setDraggedCol] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const columnOrder = data.columnOrder || ['port', 'connector', 'resolution', 'rate'];

  const addPort = () => {
    const newPort = {
      id: `out-${Date.now()}`,
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

  // Column drag handlers
  const handleColDragStart = (e, colId) => {
    e.stopPropagation();
    setDraggedCol(colId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', colId);
  };

  const handleColDragOver = (e, colId) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedCol && draggedCol !== colId) {
      setDragOverCol(colId);
    }
  };

  const handleColDragEnd = () => {
    setDraggedCol(null);
    setDragOverCol(null);
  };

  const handleColDrop = (e, targetColId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedCol || draggedCol === targetColId) return;

    const newOrder = [...columnOrder];
    const draggedIndex = newOrder.indexOf(draggedCol);
    const targetIndex = newOrder.indexOf(targetColId);

    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedCol);

    onUpdate({ columnOrder: newOrder });
    setDraggedCol(null);
    setDragOverCol(null);
  };

  return (
    <div className="flex flex-col w-full border-t border-zinc-700/50">
      {/* Column header - name follows anchor side */}
      <div className={`flex items-center justify-between px-2 py-1 bg-amber-500/10 border-b border-zinc-700/50 ${anchorSide === 'right' ? 'flex-row-reverse' : ''}`}>
        <input
          type="text"
          value={data.columnName}
          onChange={(e) => onUpdate({ columnName: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          className={`bg-transparent font-mono font-bold text-amber-400 text-[11px] focus:outline-none flex-1 ${anchorSide === 'right' ? 'text-right' : ''}`}
        />
        <div className="flex items-center gap-1">
          {/* Anchor side toggle - only in stacked mode */}
          {isStacked && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleAnchorSide && onToggleAnchorSide();
              }}
              className="text-amber-400 hover:text-amber-300 text-[9px] px-1 font-mono opacity-70 hover:opacity-100"
              title={`Anchors on ${anchorSide || 'right'} side - click to toggle`}
            >
              {anchorSide === 'left' ? '◀ ●' : '● ▶'}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              addPort();
            }}
            className="text-amber-400 hover:text-amber-300 font-mono text-[10px] shrink-0"
          >
            +
          </button>
        </div>
      </div>

      {/* Column headers row - only show when there are ports */}
      {data.ports.length > 0 && (
        <div className={`flex items-center gap-2 py-1 bg-zinc-800/30 border-b border-zinc-700/30 text-[9px] font-mono text-zinc-500 uppercase tracking-wide ${anchorSide === 'left' ? 'pr-2' : 'pl-2'}`}>
          {/* Spacer for anchor on left */}
          {(anchorSide === 'left') && <span className="shrink-0 w-3"></span>}
          {/* Spacer for delete button (outputs have X on left/inside) */}
          <span className="w-[16px]"></span>
          {columnOrder.map(colId => {
            const colDef = COLUMN_DEFS[colId];
            if (!colDef) return null;
            return (
              <span
                key={colId}
                draggable
                onDragStart={(e) => handleColDragStart(e, colId)}
                onDragOver={(e) => handleColDragOver(e, colId)}
                onDragEnd={handleColDragEnd}
                onDrop={(e) => handleColDrop(e, colId)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`${colDef.width} cursor-grab select-none transition-all
                  ${draggedCol === colId ? 'opacity-40' : ''}
                  ${dragOverCol === colId ? 'bg-amber-500/20 rounded' : ''}
                  hover:text-amber-400`}
                title="Drag to reorder"
              >
                {colDef.label}
              </span>
            );
          })}
          {/* Spacer for anchor on right (default for outputs) */}
          {(anchorSide !== 'left') && <span className="shrink-0 w-3"></span>}
        </div>
      )}

      {/* Ports */}
      <div className="flex-1">
        {data.ports.length === 0 ? (
          <div className="px-2 py-2 text-zinc-600 font-mono italic text-[10px]">
            No outputs
          </div>
        ) : (
          data.ports.map(port => (
            <PortRow
              key={port.id}
              port={port}
              type="out"
              onUpdate={(updates) => updatePort(port.id, updates)}
              onDelete={() => deletePort(port.id)}
              anchorId={`${nodeId}-${port.id}`}
              isActive={activeWire?.from === `${nodeId}-${port.id}`}
              onAnchorClick={onAnchorClick}
              signalColor={signalColor}
              columnOrder={columnOrder}
              anchorSide={anchorSide}
              isStacked={isStacked}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Draggable Section wrapper for stacked mode reordering
const DraggableSection = ({
  sectionId,
  children,
  isStacked,
  anchorSide,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isDraggedOver,
  isDragging
}) => {
  if (!isStacked) {
    return children;
  }

  // Drag handle goes on OPPOSITE side of anchor
  // anchors on left → handle on right (flex-row-reverse)
  // anchors on right → handle on left (no reverse)
  const handleOnRight = anchorSide !== 'right';

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
      {/* Drag handle - absolute positioned, doesn't affect content layout */}
      <div
        draggable
        onDragStart={(e) => onDragStart(e, sectionId)}
        onDragEnd={onDragEnd}
        onMouseDown={(e) => e.stopPropagation()}
        className={`absolute top-0 ${handleOnRight ? 'right-0' : 'left-0'} w-4 h-6 flex items-center justify-center bg-zinc-700/50 cursor-grab
                   hover:bg-zinc-600/70 transition-colors z-10
                   ${handleOnRight ? 'border-l border-zinc-600/50 rounded-bl' : 'border-r border-zinc-600/50 rounded-br'}`}
        title="Drag to reorder section"
      >
        <span className="text-zinc-500 text-[7px]">⋮⋮</span>
      </div>
      {/* Content takes full width - no offset from handle */}
      <div className="w-full">{children}</div>
    </div>
  );
};

// System Section with dropdown presets
const SystemSection = ({ data, onUpdate, collapsed, onToggleCollapse }) => {
  return (
    <div className="flex flex-col border-t border-zinc-700/50 bg-purple-500/5">
      {/* Smaller header with collapse toggle */}
      <div
        className="flex items-center justify-between px-2 py-0.5 bg-purple-500/10 border-b border-zinc-700/50 cursor-pointer hover:bg-purple-500/20"
        onClick={(e) => {
          e.stopPropagation();
          onToggleCollapse && onToggleCollapse();
        }}
      >
        <span className="font-mono font-bold text-purple-400 text-[9px]">
          SYS
        </span>
        <span className="text-purple-400 text-[8px]">
          {collapsed ? '▶' : '▼'}
        </span>
      </div>

      {/* Content - hidden when collapsed */}
      {!collapsed && (
        <div className="p-2 space-y-2 text-[10px]">
          {/* Platform Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-mono w-24 shrink-0">Platform</span>
            <select
              value={data.platform || 'MacBook Pro'}
              onChange={(e) => {
                e.stopPropagation();
                onUpdate({ platform: e.target.value });
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 font-mono text-zinc-300"
            >
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Software Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-mono w-24 shrink-0">Software</span>
            <select
              value={data.software || 'none'}
              onChange={(e) => {
                e.stopPropagation();
                onUpdate({ software: e.target.value });
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 font-mono text-zinc-300"
            >
              {SOFTWARE_PRESETS.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Capture Card Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-mono w-24 shrink-0">Capture Card</span>
            <select
              value={data.captureCard || 'none'}
              onChange={(e) => {
                e.stopPropagation();
                onUpdate({ captureCard: e.target.value });
              }}
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

// Legacy SystemSection helper functions (kept for backwards compatibility with old data)
const LegacySystemSection = ({ data, onUpdate }) => {
  const addSetting = () => {
    onUpdate({
      settings: [...(data.settings || []), { key: '', value: '' }]
    });
  };

  const updateSetting = (index, field, value) => {
    const updated = [...(data.settings || [])];
    updated[index][field] = value;
    onUpdate({ settings: updated });
  };

  const deleteSetting = (index) => {
    onUpdate({
      settings: (data.settings || []).filter((_, i) => i !== index)
    });
  };

  // Only render if there are legacy settings
  if (!data.settings || data.settings.length === 0) return null;

  return (
    <div className="p-2 space-y-1.5 text-[10px] border-t border-zinc-700/30">
      {data.settings.map((setting, i) => (
        <div key={i} className="flex items-center gap-1 group">
          <input
            type="text"
            value={setting.key}
            onChange={(e) => updateSetting(i, 'key', e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Key"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 font-mono text-zinc-300"
          />
          <span className="text-zinc-600">:</span>
          <input
            type="text"
            value={setting.value}
            onChange={(e) => updateSetting(i, 'value', e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Value"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 font-mono text-zinc-300"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              deleteSetting(i);
            }}
            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={(e) => {
          e.stopPropagation();
          addSetting();
        }}
        className="text-purple-400 hover:text-purple-300 font-mono"
      >
        + Custom
      </button>
    </div>
  );
};

// Anchor Button component - rendered on outer edges
const AnchorButton = ({ anchorId, type, isActive, signalColor, onClick }) => {
  const isInput = type === 'in';
  const colorHex = signalColor ? SIGNAL_COLORS.find(c => c.id === signalColor)?.hex : null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(anchorId, type);
      }}
      data-anchor-id={anchorId}
      className={`w-4 h-4 border-2 transition-all hover:scale-125
        ${isInput ? 'rounded-sm' : 'rounded-full'}
        ${isActive
          ? 'bg-cyan-500 border-cyan-400 shadow-lg shadow-cyan-500/50'
          : isInput
            ? 'bg-zinc-800 border-emerald-500 hover:bg-emerald-500/20'
            : 'bg-zinc-800 border-amber-500 hover:bg-amber-500/20'
        }`}
      style={colorHex && !isInput ? { borderColor: colorHex, boxShadow: `0 0 8px ${colorHex}50` } : {}}
      title={isInput ? 'Input anchor - click to connect' : 'Output anchor - click to connect'}
    />
  );
};

// Resize Handle component
const ResizeHandle = ({ position, onResizeStart }) => {
  const getCursor = () => {
    switch (position) {
      case 'e': return 'ew-resize';
      case 's': return 'ns-resize';
      case 'se': return 'nwse-resize';
      default: return 'pointer';
    }
  };

  const getStyle = () => {
    const base = {
      position: 'absolute',
      zIndex: 20,
      cursor: getCursor(),
    };

    switch (position) {
      case 'e': // Right edge
        return {
          ...base,
          top: 0,
          right: -4,
          width: 8,
          height: '100%',
        };
      case 's': // Bottom edge
        return {
          ...base,
          bottom: -4,
          left: 0,
          width: '100%',
          height: 8,
        };
      case 'se': // SE corner
        return {
          ...base,
          bottom: -6,
          right: -6,
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: '#3b82f6',
          opacity: 0.7,
        };
      default:
        return base;
    }
  };

  return (
    <div
      style={getStyle()}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onResizeStart(e, position);
      }}
      className={position === 'se' ? 'hover:opacity-100 hover:scale-110 transition-all' : 'hover:bg-blue-500/20'}
    />
  );
};

// Main Node component
export default function Node({ node, zoom, onUpdate, onDelete, onAnchorClick, registerAnchor, activeWire }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, scale: 1 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Drag state for section reordering in stacked mode
  const [draggedSection, setDraggedSection] = useState(null);
  const [dragOverSection, setDragOverSection] = useState(null);

  const nodeRef = useRef(null);
  const inputSectionRef = useRef(null);
  const outputSectionRef = useRef(null);

  // Get the effective scale (node scale * zoom)
  const nodeScale = node.scale || 1;

  // Register anchor positions - query DOM for inline anchor positions
  useEffect(() => {
    if (!registerAnchor || !nodeRef.current) return;

    const scale = node.scale || 1;

    // Query DOM for inline anchor positions
    const allPorts = [...node.inputSection.ports, ...node.outputSection.ports];
    allPorts.forEach((port) => {
      const anchorId = `${node.id}-${port.id}`;
      const anchorEl = nodeRef.current?.querySelector(`[data-anchor-id="${anchorId}"]`);

      if (anchorEl) {
        const anchorRect = anchorEl.getBoundingClientRect();
        const nodeRect = nodeRef.current.getBoundingClientRect();

        // Calculate center of anchor relative to node, accounting for zoom and scale
        // Screen coords → divide by totalScale → paper-space coords relative to node
        const totalScale = zoom * scale;
        const localX = (anchorRect.left + anchorRect.width / 2 - nodeRect.left) / totalScale;
        const localY = (anchorRect.top + anchorRect.height / 2 - nodeRect.top) / totalScale;

        // localX/Y are already in paper-space, just add node position
        registerAnchor(anchorId, {
          x: node.position.x + localX,
          y: node.position.y + localY
        });
      }
    });
  }, [node.position, node.inputSection, node.outputSection, node.scale, node.layout, registerAnchor, node.id, zoom]);

  // Resize handling
  const handleResizeStart = (e, direction) => {
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      scale: node.scale || 1
    });
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleResizeMove = (e) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      // Calculate scale change based on drag direction and distance
      // Use the larger delta for proportional scaling
      let scaleDelta = 0;

      if (resizeDirection === 'e') {
        scaleDelta = deltaX / 200; // Sensitivity factor
      } else if (resizeDirection === 's') {
        scaleDelta = deltaY / 200;
      } else if (resizeDirection === 'se') {
        // Use the average for corner resize
        scaleDelta = (deltaX + deltaY) / 400;
      }

      const newScale = Math.max(0.5, Math.min(2.0, resizeStart.scale + scaleDelta));

      onUpdate({ scale: newScale });
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      setResizeDirection(null);
    };

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);

    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, resizeDirection, resizeStart, onUpdate]);

  // Drag handling - position is in paper-space coordinates
  // Since zoom is applied at container level, we need to convert screen coords to paper coords
  const handleMouseDown = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') return;
    if (isResizing) return; // Don't start drag if resizing

    e.preventDefault();
    setIsDragging(true);
    // Store the offset from mouse to node position (in screen space)
    const rect = nodeRef.current.getBoundingClientRect();
    setDragStart({
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      // Get the canvas container to calculate relative position
      const canvas = nodeRef.current?.closest('[data-canvas]');
      if (!canvas) return;

      const canvasRect = canvas.getBoundingClientRect();

      // Convert screen position to paper-space position (accounting for zoom)
      const newX = (e.clientX - canvasRect.left - dragStart.offsetX) / zoom;
      const newY = (e.clientY - canvasRect.top - dragStart.offsetY) / zoom;

      onUpdate({
        position: {
          x: Math.max(0, newX),
          y: Math.max(0, newY)
        }
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, zoom, onUpdate]);

  // Drag handlers for section reordering in stacked mode
  const handleSectionDragStart = (e, sectionId) => {
    e.stopPropagation();
    setDraggedSection(sectionId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sectionId);
  };

  const handleSectionDragOver = (e, sectionId) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedSection && draggedSection !== sectionId) {
      setDragOverSection(sectionId);
    }
  };

  const handleSectionDragEnd = () => {
    setDraggedSection(null);
    setDragOverSection(null);
  };

  const handleSectionDrop = (e, targetSectionId) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedSection || draggedSection === targetSectionId) return;

    const currentOrder = node.layout.sectionOrder || ['system', 'input', 'output'];
    const newOrder = [...currentOrder];

    const draggedIndex = newOrder.indexOf(draggedSection);
    const targetIndex = newOrder.indexOf(targetSectionId);

    // Remove dragged item and insert at target position
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedSection);

    onUpdate({
      layout: { ...node.layout, sectionOrder: newOrder }
    });

    setDraggedSection(null);
    setDragOverSection(null);
  };

  // Generate grid template based on layout
  const getGridTemplate = () => {
    const { systemPosition, ioArrangement, inputPosition } = node.layout;

    // Get section order for stacked mode, with fallback for backward compatibility
    const sectionOrder = node.layout.sectionOrder || ['system', 'input', 'output'];

    // Use minmax to ensure columns are equal width while respecting minimum content size
    const equalCols = 'minmax(min-content, 1fr) minmax(min-content, 1fr)';

    if (ioArrangement === 'stacked') {
      // Stacked mode: use sectionOrder for dynamic grid areas
      const areas = ['"title"', ...sectionOrder.map(s => `"${s}"`)].join(' ');
      return {
        type: 'grid',
        areas,
        columns: 'minmax(min-content, 1fr)',
        rows: `auto ${sectionOrder.map(() => 'auto').join(' ')}`
      };
    }

    if (systemPosition === 'top') {
      return {
        type: 'grid',
        areas: inputPosition === 'left'
          ? '"title title" "system system" "input output"'
          : '"title title" "system system" "output input"',
        columns: equalCols,
        rows: 'auto auto auto'
      };
    } else if (systemPosition === 'bottom-left' || systemPosition === 'bottom-right') {
      // For bottom system positions with columns, use flex-columns layout
      // This allows each column to size independently, so System appears
      // directly below its column regardless of the other column's height
      return {
        type: 'flex-columns',
        systemPosition,
        inputPosition
      };
    }

    return {
      type: 'grid',
      areas: '"title title" "system system" "input output"',
      columns: equalCols,
      rows: 'auto auto auto'
    };
  };

  const gridTemplate = getGridTemplate();

  // Get signal color hex for display
  const signalColorHex = node.signalColor
    ? SIGNAL_COLORS.find(c => c.id === node.signalColor)?.hex
    : null;

  // Get software label for dynamic title
  const getSoftwareLabel = () => {
    const softwareId = node.system?.software;
    if (!softwareId || softwareId === 'none') return null;
    const software = SOFTWARE_PRESETS.find(s => s.id === softwareId);
    return software ? software.label : null;
  };

  // Dynamic title display: "SOFTWARE DEVICE" or just "DEVICE"
  const displayTitle = () => {
    const softwareLabel = getSoftwareLabel();
    if (softwareLabel) {
      return `${softwareLabel} ${node.title}`.toUpperCase();
    }
    return node.title;
  };

  // Title Section component (reused in both layouts)
  const TitleContent = () => (
    <div
      className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border-b border-zinc-700 rounded-t-lg"
      style={{
        borderLeft: signalColorHex ? `4px solid ${signalColorHex}` : undefined
      }}
    >
      {/* Display combined title (software + device) */}
      <span className="font-mono font-bold text-zinc-100 text-sm">
        {displayTitle()}
      </span>
      {/* Hidden input for editing the base device name */}
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
        {/* Signal Color Picker (for sources) */}
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

        {/* Layout controls */}
        <select
          value={node.layout.systemPosition}
          onChange={(e) => onUpdate({ layout: { ...node.layout, systemPosition: e.target.value } })}
          onClick={(e) => e.stopPropagation()}
          className="bg-zinc-700 border-none rounded px-1 py-0.5 text-zinc-400 text-[9px]"
          title="System position"
        >
          <option value="top">Sys: Top</option>
          <option value="bottom-left">Sys: BL</option>
          <option value="bottom-right">Sys: BR</option>
        </select>
        <select
          value={node.layout.ioArrangement}
          onChange={(e) => onUpdate({ layout: { ...node.layout, ioArrangement: e.target.value } })}
          onClick={(e) => e.stopPropagation()}
          className="bg-zinc-700 border-none rounded px-1 py-0.5 text-zinc-400 text-[9px]"
          title="I/O arrangement"
        >
          <option value="columns">Cols</option>
          <option value="stacked">Stack</option>
        </select>
        <select
          value={node.layout.inputPosition}
          onChange={(e) => onUpdate({ layout: { ...node.layout, inputPosition: e.target.value } })}
          onClick={(e) => e.stopPropagation()}
          className="bg-zinc-700 border-none rounded px-1 py-0.5 text-zinc-400 text-[9px]"
          title="Input position"
        >
          <option value="left">In: L</option>
          <option value="right">In: R</option>
        </select>
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

  // Determine if we're using flex-columns layout
  const isFlexColumns = gridTemplate.type === 'flex-columns';

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
        // Conditionally apply grid or flex styles
        ...(isFlexColumns ? {
          display: 'flex',
          flexDirection: 'column'
        } : {
          display: 'grid',
          gridTemplateAreas: gridTemplate.areas,
          gridTemplateColumns: gridTemplate.columns,
          gridTemplateRows: gridTemplate.rows,
          alignItems: 'start'
        })
      }}
      onMouseDown={handleMouseDown}
    >
      {isFlexColumns ? (
        // Flex-columns layout for bottom system positions
        // Each column sizes independently, so System appears directly below its column
        <>
          {/* Title - full width */}
          <TitleContent />

          {/* Two-column flex container */}
          <div className="flex">
            {/* Left column */}
            <div className="flex-1 flex flex-col">
              {node.layout.inputPosition === 'left' ? (
                <div ref={inputSectionRef} className="relative">
                  <InputSection
                    data={node.inputSection}
                    onUpdate={(updates) => onUpdate({ inputSection: { ...node.inputSection, ...updates } })}
                    anchorSide={node.layout.inputAnchorSide || 'left'}
                    onToggleAnchorSide={() => onUpdate({ layout: { ...node.layout, inputAnchorSide: node.layout.inputAnchorSide === 'right' ? 'left' : 'right' } })}
                    isStacked={false}
                    nodeId={node.id}
                    activeWire={activeWire}
                    onAnchorClick={onAnchorClick}
                  />
                </div>
              ) : (
                <div ref={outputSectionRef} className="relative">
                  <OutputSection
                    data={node.outputSection}
                    onUpdate={(updates) => onUpdate({ outputSection: { ...node.outputSection, ...updates } })}
                    anchorSide={node.layout.outputAnchorSide || 'right'}
                    onToggleAnchorSide={() => onUpdate({ layout: { ...node.layout, outputAnchorSide: node.layout.outputAnchorSide === 'left' ? 'right' : 'left' } })}
                    isStacked={false}
                    nodeId={node.id}
                    activeWire={activeWire}
                    onAnchorClick={onAnchorClick}
                    signalColor={node.signalColor}
                  />
                </div>
              )}
              {gridTemplate.systemPosition === 'bottom-left' && (
                <SystemSection
                  data={node.system}
                  onUpdate={(updates) => onUpdate({ system: { ...node.system, ...updates } })}
                  collapsed={node.layout.systemCollapsed}
                  onToggleCollapse={() => onUpdate({ layout: { ...node.layout, systemCollapsed: !node.layout.systemCollapsed } })}
                />
              )}
            </div>

            {/* Right column */}
            <div className="flex-1 flex flex-col">
              {node.layout.inputPosition === 'left' ? (
                <div ref={outputSectionRef} className="relative">
                  <OutputSection
                    data={node.outputSection}
                    onUpdate={(updates) => onUpdate({ outputSection: { ...node.outputSection, ...updates } })}
                    anchorSide={node.layout.outputAnchorSide || 'right'}
                    onToggleAnchorSide={() => onUpdate({ layout: { ...node.layout, outputAnchorSide: node.layout.outputAnchorSide === 'left' ? 'right' : 'left' } })}
                    isStacked={false}
                    nodeId={node.id}
                    activeWire={activeWire}
                    onAnchorClick={onAnchorClick}
                    signalColor={node.signalColor}
                  />
                </div>
              ) : (
                <div ref={inputSectionRef} className="relative">
                  <InputSection
                    data={node.inputSection}
                    onUpdate={(updates) => onUpdate({ inputSection: { ...node.inputSection, ...updates } })}
                    anchorSide={node.layout.inputAnchorSide || 'left'}
                    onToggleAnchorSide={() => onUpdate({ layout: { ...node.layout, inputAnchorSide: node.layout.inputAnchorSide === 'right' ? 'left' : 'right' } })}
                    isStacked={false}
                    nodeId={node.id}
                    activeWire={activeWire}
                    onAnchorClick={onAnchorClick}
                  />
                </div>
              )}
              {gridTemplate.systemPosition === 'bottom-right' && (
                <SystemSection
                  data={node.system}
                  onUpdate={(updates) => onUpdate({ system: { ...node.system, ...updates } })}
                  collapsed={node.layout.systemCollapsed}
                  onToggleCollapse={() => onUpdate({ layout: { ...node.layout, systemCollapsed: !node.layout.systemCollapsed } })}
                />
              )}
            </div>
          </div>
        </>
      ) : (
        // Original grid layout for top system position and stacked layouts
        <>
          {/* Title Section */}
          <div style={{ gridArea: 'title' }}>
            <TitleContent />
          </div>

          {/* Render sections based on sectionOrder */}
          {(node.layout.sectionOrder || ['system', 'input', 'output']).map((sectionId) => {
            const isStacked = node.layout.ioArrangement === 'stacked';

            const getSectionContent = () => {
              switch (sectionId) {
                case 'system':
                  return (
                    <SystemSection
                      data={node.system}
                      onUpdate={(updates) => onUpdate({ system: { ...node.system, ...updates } })}
                      collapsed={node.layout.systemCollapsed}
                      onToggleCollapse={() => onUpdate({ layout: { ...node.layout, systemCollapsed: !node.layout.systemCollapsed } })}
                    />
                  );
                case 'input':
                  return (
                    <InputSection
                      data={node.inputSection}
                      onUpdate={(updates) => onUpdate({ inputSection: { ...node.inputSection, ...updates } })}
                      anchorSide={node.layout.inputAnchorSide || 'left'}
                      onToggleAnchorSide={() => onUpdate({ layout: { ...node.layout, inputAnchorSide: node.layout.inputAnchorSide === 'right' ? 'left' : 'right' } })}
                      isStacked={isStacked}
                      nodeId={node.id}
                      activeWire={activeWire}
                      onAnchorClick={onAnchorClick}
                    />
                  );
                case 'output':
                  return (
                    <OutputSection
                      data={node.outputSection}
                      onUpdate={(updates) => onUpdate({ outputSection: { ...node.outputSection, ...updates } })}
                      anchorSide={node.layout.outputAnchorSide || 'right'}
                      onToggleAnchorSide={() => onUpdate({ layout: { ...node.layout, outputAnchorSide: node.layout.outputAnchorSide === 'left' ? 'right' : 'left' } })}
                      isStacked={isStacked}
                      nodeId={node.id}
                      activeWire={activeWire}
                      onAnchorClick={onAnchorClick}
                      signalColor={node.signalColor}
                    />
                  );
                default:
                  return null;
              }
            };

            const refProp = sectionId === 'input' ? inputSectionRef :
                           sectionId === 'output' ? outputSectionRef : null;

            // Get anchor side for this section (system defaults to 'left' so handle goes right)
            const sectionAnchorSide = sectionId === 'input'
              ? (node.layout.inputAnchorSide || 'left')
              : sectionId === 'output'
                ? (node.layout.outputAnchorSide || 'right')
                : 'left';

            return (
              <div
                key={sectionId}
                ref={refProp}
                style={{ gridArea: sectionId }}
                className="relative"
              >
                <DraggableSection
                  sectionId={sectionId}
                  isStacked={isStacked}
                  anchorSide={sectionAnchorSide}
                  onDragStart={handleSectionDragStart}
                  onDragOver={handleSectionDragOver}
                  onDragEnd={handleSectionDragEnd}
                  onDrop={handleSectionDrop}
                  isDragging={draggedSection === sectionId}
                  isDraggedOver={dragOverSection === sectionId}
                >
                  {getSectionContent()}
                </DraggableSection>
              </div>
            );
          })}
        </>
      )}

      {/* Resize handle - only SE corner for proportional scaling */}
      <ResizeHandle position="se" onResizeStart={handleResizeStart} />

      {/* Scale indicator (shown when not 1.0) */}
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
