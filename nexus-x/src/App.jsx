import { useState, useRef, useEffect, useCallback } from 'react';
import Node from './components/Node';

// Paper size constants (96 DPI)
const PAPER_SIZES = {
  'ANSI_A': { width: 816, height: 1056, label: 'Letter (8.5×11)' },
  'ANSI_B': { width: 1056, height: 1632, label: 'Tabloid (11×17)' },
  'ANSI_C': { width: 1632, height: 2112, label: 'ANSI C (17×22)' },
  'ANSI_D': { width: 2112, height: 3264, label: 'ANSI D (22×34)' },
  'A4': { width: 794, height: 1123, label: 'A4' },
  'A3': { width: 1123, height: 1588, label: 'A3' },
};

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

const PRINT_MARGINS = {
  top: 48,
  right: 48,
  bottom: 48,
  left: 48
};

const SIGNAL_COLORS = [
  { id: 'emerald', hex: '#10b981' },
  { id: 'cyan', hex: '#06b6d4' },
  { id: 'blue', hex: '#3b82f6' },
  { id: 'violet', hex: '#8b5cf6' },
  { id: 'pink', hex: '#ec4899' },
  { id: 'red', hex: '#ef4444' },
  { id: 'orange', hex: '#f97316' },
  { id: 'yellow', hex: '#eab308' },
];

// Dash patterns for enhanced wires
const DASH_PATTERNS = [
  { id: 'solid', pattern: null, label: '───' },
  { id: 'long', pattern: '12 6', label: '── ──' },
  { id: 'medium', pattern: '8 4', label: '─ ─ ─' },
  { id: 'short', pattern: '4 4', label: '· · ·' },
  { id: 'dashdot', pattern: '12 4 4 4', label: '─·─·' },
];

// Create empty page
const createPage = (id, name) => ({
  id,
  name,
  nodes: {},
  connections: []
});

// Create empty node with default config
const createNode = (id) => ({
  id,
  title: 'New Device',
  signalColor: null,
  position: { x: 100, y: 100 },
  scale: 1, // Proportional scale factor (0.5 - 2.0)
  layout: {
    systemPosition: 'top',
    ioArrangement: 'columns',
    inputPosition: 'left',
    inputAnchorSide: 'left',
    outputAnchorSide: 'right',
    sectionOrder: ['system', 'input', 'output'],
    systemCollapsed: false
  },
  system: {
    settings: [],
    cards: []
  },
  inputSection: {
    columnName: 'INPUTS',
    columnOrder: ['port', 'connector', 'resolution', 'rate'],
    ports: []
  },
  outputSection: {
    columnName: 'OUTPUTS',
    columnOrder: ['port', 'connector', 'resolution', 'rate'],
    ports: []
  }
});

// Create a Laptop node (source with capture card)
const createLaptopNode = (id) => ({
  id,
  title: 'LAPTOP',
  signalColor: 'emerald',
  position: { x: 100, y: 100 },
  scale: 1, // Proportional scale factor (0.5 - 2.0)
  layout: {
    systemPosition: 'top',
    ioArrangement: 'columns',
    inputPosition: 'left',
    inputAnchorSide: 'left',
    outputAnchorSide: 'right',
    sectionOrder: ['system', 'input', 'output'],
    systemCollapsed: false
  },
  system: {
    settings: [
      { key: 'Model', value: 'MacBook Pro' },
      { key: 'OS', value: 'macOS' },
      { key: 'Capture', value: 'Blackmagic Decklink' }
    ],
    cards: []
  },
  inputSection: {
    columnName: 'INPUTS',
    columnOrder: ['port', 'connector', 'resolution', 'rate'],
    ports: [
      {
        id: 'in-1',
        number: 1,
        connector: 'SDI',
        resolution: '1920x1080',
        refreshRate: '59.94'
      }
    ]
  },
  outputSection: {
    columnName: 'OUTPUTS',
    columnOrder: ['port', 'connector', 'resolution', 'rate'],
    ports: [
      {
        id: 'out-1',
        number: 1,
        connector: 'HDMI',
        resolution: '1920x1080',
        refreshRate: '60'
      }
    ]
  }
});

export default function App() {
  // Paper and zoom state
  const [paperSize, setPaperSize] = useState('ANSI_B');
  const [orientation, setOrientation] = useState('portrait');
  const [zoom, setZoom] = useState(1.0);

  // Multi-page state
  const [pages, setPages] = useState([createPage('page-1', 'Page 1')]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Wire drawing state
  const [activeWire, setActiveWire] = useState(null);
  const [anchorPositions, setAnchorPositions] = useState({});

  // Wire selection state
  const [selectedWires, setSelectedWires] = useState(new Set());

  const canvasRef = useRef(null);

  // Get current page
  const currentPage = pages[currentPageIndex];

  // Get canvas dimensions based on paper size and orientation
  const getCanvasDimensions = () => {
    const paper = PAPER_SIZES[paperSize];
    if (orientation === 'landscape') {
      return { width: paper.height, height: paper.width };
    }
    return { width: paper.width, height: paper.height };
  };

  const canvasDimensions = getCanvasDimensions();

  // Page navigation
  const goToPrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };

  const addPage = () => {
    const newPage = createPage(`page-${Date.now()}`, `Page ${pages.length + 1}`);
    setPages([...pages, newPage]);
    setCurrentPageIndex(pages.length);
  };

  const deletePage = () => {
    if (pages.length <= 1) return;
    if (!confirm(`Delete "${currentPage.name}"? This cannot be undone.`)) return;

    const newPages = pages.filter((_, i) => i !== currentPageIndex);
    setPages(newPages);
    setCurrentPageIndex(Math.min(currentPageIndex, newPages.length - 1));
  };

  // Node management
  const addNode = (type = 'generic') => {
    const nodeId = `node-${Date.now()}`;
    const newNode = type === 'laptop' ? createLaptopNode(nodeId) : createNode(nodeId);

    // Position new node in visible area
    newNode.position = {
      x: PRINT_MARGINS.left + Math.random() * 200,
      y: PRINT_MARGINS.top + Math.random() * 200
    };

    setPages(pages.map((page, i) => {
      if (i === currentPageIndex) {
        return {
          ...page,
          nodes: { ...page.nodes, [nodeId]: newNode }
        };
      }
      return page;
    }));
  };

  const updateNode = (nodeId, updates) => {
    setPages(pages.map((page, i) => {
      if (i === currentPageIndex && page.nodes[nodeId]) {
        return {
          ...page,
          nodes: {
            ...page.nodes,
            [nodeId]: { ...page.nodes[nodeId], ...updates }
          }
        };
      }
      return page;
    }));
  };

  const deleteNode = (nodeId) => {
    setPages(pages.map((page, i) => {
      if (i === currentPageIndex) {
        const { [nodeId]: removed, ...remainingNodes } = page.nodes;
        // Remove connections involving this node
        const remainingConnections = page.connections.filter(
          c => !c.from.startsWith(nodeId) && !c.to.startsWith(nodeId)
        );
        return {
          ...page,
          nodes: remainingNodes,
          connections: remainingConnections
        };
      }
      return page;
    }));
  };

  // Get source node for an anchor (finds the originating source of a signal)
  const getSourceNode = useCallback((anchorId, visited = new Set()) => {
    if (visited.has(anchorId)) return null;
    visited.add(anchorId);

    const nodeId = anchorId.split('-')[0] + '-' + anchorId.split('-')[1];
    const node = currentPage.nodes[nodeId];

    if (!node) return null;

    // If this node has a signal color, it's the source
    if (node.signalColor) return node;

    // Otherwise, trace back through input connections
    const inputConn = currentPage.connections.find(c => c.to === anchorId);
    if (inputConn) {
      return getSourceNode(inputConn.from, visited);
    }

    return null;
  }, [currentPage.nodes, currentPage.connections]);

  // Get signal color for a connection
  const getConnectionColor = useCallback((conn) => {
    const sourceAnchorId = conn.from;
    const nodeId = sourceAnchorId.split('-').slice(0, 2).join('-');
    const node = currentPage.nodes[nodeId];

    if (node?.signalColor) {
      return SIGNAL_COLORS.find(c => c.id === node.signalColor)?.hex || '#22d3ee';
    }

    // Try to trace back to source
    const sourceNode = getSourceNode(conn.from);
    if (sourceNode?.signalColor) {
      return SIGNAL_COLORS.find(c => c.id === sourceNode.signalColor)?.hex || '#22d3ee';
    }

    return '#22d3ee'; // Default cyan
  }, [currentPage.nodes, getSourceNode]);

  // Connection management
  const handleAnchorClick = (anchorId, direction) => {
    if (!activeWire) {
      setActiveWire({ from: anchorId, direction });
    } else {
      if (activeWire.from !== anchorId && activeWire.direction !== direction) {
        const newConnection = {
          id: `wire-${Date.now()}`,
          from: activeWire.direction === 'out' ? activeWire.from : anchorId,
          to: activeWire.direction === 'out' ? anchorId : activeWire.from,
          label: '',           // Optional wire label
          enhanced: false,     // Enhanced styling (outline, dash, animation)
          dashPattern: null    // Dash pattern when enhanced
        };

        // Check if connection already exists
        const exists = currentPage.connections.some(
          c => c.from === newConnection.from && c.to === newConnection.to
        );

        if (!exists) {
          setPages(pages.map((page, i) => {
            if (i === currentPageIndex) {
              return {
                ...page,
                connections: [...page.connections, newConnection]
              };
            }
            return page;
          }));
        }
      }
      setActiveWire(null);
    }
  };

  const deleteConnection = (connId) => {
    setPages(pages.map((page, i) => {
      if (i === currentPageIndex) {
        return {
          ...page,
          connections: page.connections.filter(c => c.id !== connId)
        };
      }
      return page;
    }));
    // Also remove from selection
    setSelectedWires(prev => {
      const next = new Set(prev);
      next.delete(connId);
      return next;
    });
  };

  // Wire click handling (for selection)
  const handleWireClick = (wireId, event) => {
    event.stopPropagation();

    if (event.shiftKey) {
      // Shift+click: add/remove from selection
      setSelectedWires(prev => {
        const next = new Set(prev);
        if (next.has(wireId)) {
          next.delete(wireId);
        } else {
          next.add(wireId);
        }
        return next;
      });
    } else {
      // Regular click: toggle single selection
      setSelectedWires(prev => {
        if (prev.has(wireId) && prev.size === 1) {
          return new Set(); // Deselect if already selected alone
        }
        return new Set([wireId]); // Select only this wire
      });
    }
  };

  // Deselect all wires (when clicking canvas)
  const handleCanvasClick = (event) => {
    // Only deselect if clicking directly on the canvas (not a node or wire)
    if (event.target.getAttribute('data-canvas') === 'true') {
      setSelectedWires(new Set());
      setActiveWire(null);
    }
  };

  // Toggle enhanced styling for selected wires
  const toggleWireEnhanced = () => {
    if (selectedWires.size === 0) return;

    setPages(pages.map((page, i) => {
      if (i === currentPageIndex) {
        return {
          ...page,
          connections: page.connections.map(conn => {
            if (selectedWires.has(conn.id)) {
              return { ...conn, enhanced: !conn.enhanced };
            }
            return conn;
          })
        };
      }
      return page;
    }));
  };

  // Set dash pattern for selected wires
  const setWireDashPattern = (patternId) => {
    const pattern = DASH_PATTERNS.find(p => p.id === patternId)?.pattern || null;

    setPages(pages.map((page, i) => {
      if (i === currentPageIndex) {
        return {
          ...page,
          connections: page.connections.map(conn => {
            if (selectedWires.has(conn.id)) {
              return { ...conn, dashPattern: pattern };
            }
            return conn;
          })
        };
      }
      return page;
    }));
  };

  // Set label for a wire
  const setWireLabel = (wireId, label) => {
    setPages(pages.map((page, i) => {
      if (i === currentPageIndex) {
        return {
          ...page,
          connections: page.connections.map(conn => {
            if (conn.id === wireId) {
              return { ...conn, label };
            }
            return conn;
          })
        };
      }
      return page;
    }));
  };

  // Register anchor position for wire drawing (in paper-space coordinates)
  const registerAnchor = useCallback((anchorId, position) => {
    setAnchorPositions(prev => {
      if (prev[anchorId]?.x === position.x && prev[anchorId]?.y === position.y) {
        return prev;
      }
      return { ...prev, [anchorId]: position };
    });
  }, []);

  // Generate wire path (in paper-space coordinates - zoom applied at container level)
  const getWirePath = (fromId, toId) => {
    const from = anchorPositions[fromId];
    const to = anchorPositions[toId];
    if (!from || !to) return '';

    const midX = (from.x + to.x) / 2;
    return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
  };

  // Save/Load functionality
  const saveProject = () => {
    const projectData = {
      version: '1.0',
      savedAt: new Date().toISOString(),
      settings: { paperSize, orientation, zoom },
      pages,
      currentPageIndex
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'signal-flow-project.sfw.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadProject = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const projectData = JSON.parse(e.target.result);
        if (projectData.version && projectData.pages) {
          setPaperSize(projectData.settings?.paperSize || 'ANSI_B');
          setOrientation(projectData.settings?.orientation || 'portrait');
          setZoom(projectData.settings?.zoom || 1.0);
          setPages(projectData.pages);
          setCurrentPageIndex(projectData.currentPageIndex || 0);
        }
      } catch (err) {
        alert('Failed to load project file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col">
      {/* Header Toolbar */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded border-2 border-cyan-500 flex items-center justify-center font-mono font-bold text-sm text-cyan-400">
              SF
            </div>
            <div>
              <h1 className="font-mono text-sm font-semibold tracking-wide text-zinc-100">
                SIGNAL FLOW WORKSPACE
              </h1>
              <p className="font-mono text-xs text-zinc-600">
                {currentPage.name} • {Object.keys(currentPage.nodes).length} nodes • {currentPage.connections.length} wires
              </p>
            </div>
          </div>

          {/* Save/Load */}
          <div className="flex items-center gap-2">
            <button
              onClick={saveProject}
              className="px-2 py-1 border border-zinc-700 rounded text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
            >
              Save
            </button>
            <label className="px-2 py-1 border border-zinc-700 rounded text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 cursor-pointer">
              Open
              <input type="file" accept=".json,.sfw" onChange={loadProject} className="hidden" />
            </label>
          </div>

          {/* Paper Size & Orientation */}
          <div className="flex items-center gap-2">
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-300"
            >
              {Object.entries(PAPER_SIZES).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <button
              onClick={() => setOrientation(o => o === 'portrait' ? 'landscape' : 'portrait')}
              className={`px-2 py-1 border rounded text-xs font-mono ${
                orientation === 'portrait'
                  ? 'border-zinc-700 text-zinc-400'
                  : 'border-cyan-500 text-cyan-400'
              }`}
            >
              {orientation === 'portrait' ? '↕ Portrait' : '↔ Landscape'}
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-500">Zoom:</span>
            <select
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-300"
            >
              {ZOOM_LEVELS.map(z => (
                <option key={z} value={z}>{Math.round(z * 100)}%</option>
              ))}
            </select>
          </div>

          {/* Page Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevPage}
              disabled={currentPageIndex === 0}
              className="px-2 py-1 border border-zinc-700 rounded text-xs font-mono text-zinc-400 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ◄
            </button>
            <span className="text-xs font-mono text-zinc-300">
              Page {currentPageIndex + 1} of {pages.length}
            </span>
            <button
              onClick={goToNextPage}
              disabled={currentPageIndex === pages.length - 1}
              className="px-2 py-1 border border-zinc-700 rounded text-xs font-mono text-zinc-400 hover:text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ►
            </button>
            <button
              onClick={addPage}
              className="px-2 py-1 border border-zinc-700 rounded text-xs font-mono text-emerald-400 hover:bg-emerald-500/10"
            >
              + Add Page
            </button>
            <button
              onClick={deletePage}
              disabled={pages.length <= 1}
              className="px-2 py-1 border border-zinc-700 rounded text-xs font-mono text-red-400 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              - Delete Page
            </button>
          </div>

          {/* Add Node */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => addNode('generic')}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded text-xs font-mono text-white"
            >
              + Node
            </button>
            <button
              onClick={() => addNode('laptop')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-mono text-white"
              title="Add Laptop node with capture card"
            >
              + Laptop
            </button>
          </div>
        </div>

        {/* Active Wire Indicator */}
        {activeWire && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs font-mono text-cyan-400 animate-pulse">
              Wire active — Click another anchor to connect
            </span>
            <button
              onClick={() => setActiveWire(null)}
              className="text-xs font-mono text-zinc-500 hover:text-zinc-300 underline"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Wire Selection Toolbar */}
        {selectedWires.size > 0 && (
          <div className="mt-2 flex items-center gap-3 py-2 px-3 bg-cyan-500/10 border border-cyan-500/30 rounded">
            <span className="text-xs font-mono text-cyan-400">
              {selectedWires.size} wire{selectedWires.size > 1 ? 's' : ''} selected
            </span>

            <div className="h-4 border-l border-zinc-700" />

            <button
              onClick={toggleWireEnhanced}
              className="px-2 py-1 border border-zinc-600 rounded text-xs font-mono text-zinc-300 hover:bg-zinc-700 hover:text-white"
            >
              Toggle Enhanced
            </button>

            <div className="flex items-center gap-1">
              <span className="text-xs font-mono text-zinc-500">Dash:</span>
              <select
                onChange={(e) => setWireDashPattern(e.target.value)}
                className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-xs font-mono text-zinc-300"
              >
                {DASH_PATTERNS.map(p => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="h-4 border-l border-zinc-700" />

            <button
              onClick={() => setSelectedWires(new Set())}
              className="text-xs font-mono text-zinc-500 hover:text-zinc-300 underline"
            >
              Deselect
            </button>
          </div>
        )}
      </header>

      {/* Main Canvas Area */}
      <main className="flex-1 overflow-auto p-4 flex items-start justify-center bg-zinc-900/50">
        {/* Zoom container - scales everything uniformly */}
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center'
          }}
        >
          <div
            ref={canvasRef}
            data-canvas="true"
            className="relative bg-zinc-950 border border-zinc-700 shadow-2xl"
            style={{
              width: canvasDimensions.width,
              height: canvasDimensions.height,
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
              `,
              backgroundSize: '8px 8px'
            }}
            onClick={handleCanvasClick}
          >
          {/* Print margin guides */}
          <div
            className="absolute border border-dashed border-zinc-800 pointer-events-none"
            style={{
              top: PRINT_MARGINS.top,
              left: PRINT_MARGINS.left,
              width: canvasDimensions.width - PRINT_MARGINS.left - PRINT_MARGINS.right,
              height: canvasDimensions.height - PRINT_MARGINS.top - PRINT_MARGINS.bottom
            }}
          />

          {/* SVG Layer for Wires */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            style={{ overflow: 'visible' }}
          >
            {currentPage.connections.map(conn => {
              const wireColor = getConnectionColor(conn);
              const wirePath = getWirePath(conn.from, conn.to);
              const fromPos = anchorPositions[conn.from];
              const toPos = anchorPositions[conn.to];
              const isSelected = selectedWires.has(conn.id);
              const isEnhanced = conn.enhanced || false;

              return (
                <g key={conn.id}>
                  {/* Selection highlight (behind everything) */}
                  {isSelected && (
                    <path
                      d={wirePath}
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth={8}
                      strokeOpacity={0.3}
                      strokeLinecap="round"
                    />
                  )}

                  {/* Enhanced: White outline */}
                  {isEnhanced && (
                    <path
                      d={wirePath}
                      fill="none"
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth={5}
                      strokeDasharray={conn.dashPattern || undefined}
                      strokeLinecap="round"
                    />
                  )}

                  {/* Main wire */}
                  <path
                    d={wirePath}
                    fill="none"
                    stroke={wireColor}
                    strokeWidth={2}
                    strokeDasharray={isEnhanced && conn.dashPattern ? conn.dashPattern : undefined}
                    strokeLinecap="round"
                    style={{
                      filter: `drop-shadow(0 0 4px ${wireColor}50)`
                    }}
                  />

                  {/* Enhanced: Animated flow indicator */}
                  {isEnhanced && (
                    <path
                      d={wirePath}
                      fill="none"
                      stroke={wireColor}
                      strokeWidth={1}
                      strokeDasharray="4 12"
                      strokeOpacity={0.6}
                      strokeLinecap="round"
                      className="wire-animated"
                    />
                  )}

                  {/* Wire label */}
                  {conn.label && fromPos && toPos && (
                    <text
                      x={(fromPos.x + toPos.x) / 2}
                      y={(fromPos.y + toPos.y) / 2 - 12}
                      textAnchor="middle"
                      className="fill-zinc-400 font-mono pointer-events-none"
                      style={{ fontSize: 9 }}
                    >
                      {conn.label}
                    </text>
                  )}

                  {/* Invisible click hit area (wider than visible wire) */}
                  <path
                    d={wirePath}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={12}
                    strokeLinecap="round"
                    className="pointer-events-auto cursor-pointer"
                    onClick={(e) => handleWireClick(conn.id, e)}
                  />

                  {/* Delete button for wire */}
                  {fromPos && toPos && (
                    <g
                      className="pointer-events-auto cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConnection(conn.id);
                      }}
                    >
                      <circle
                        cx={(fromPos.x + toPos.x) / 2}
                        cy={(fromPos.y + toPos.y) / 2}
                        r={8}
                        fill="#18181b"
                        stroke="#ef4444"
                        strokeWidth={1.5}
                      />
                      <text
                        x={(fromPos.x + toPos.x) / 2}
                        y={(fromPos.y + toPos.y) / 2 + 1}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="fill-red-400 font-bold"
                        style={{ fontSize: 10 }}
                      >
                        ×
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {Object.values(currentPage.nodes).map(node => (
            <Node
              key={node.id}
              node={node}
              zoom={zoom}
              onUpdate={(updates) => updateNode(node.id, updates)}
              onDelete={() => deleteNode(node.id)}
              onAnchorClick={handleAnchorClick}
              registerAnchor={registerAnchor}
              activeWire={activeWire}
            />
          ))}
        </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-900/95 px-4 py-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-zinc-600">
            Signal Flow Workspace v1.0
          </span>
          <div className="flex items-center gap-4">
            <span className="text-zinc-500">
              Canvas: {canvasDimensions.width} × {canvasDimensions.height}px
            </span>
            <span className="text-zinc-500">
              Paper: {PAPER_SIZES[paperSize].label}
            </span>
            <span className="text-zinc-500">
              Zoom: {Math.round(zoom * 100)}%
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
