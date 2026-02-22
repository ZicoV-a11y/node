import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import Node from './components/Node';
import SuperNode from './components/SuperNode';
import Node313 from './components/Node313';
import SidePanel from './components/SidePanel';
import CanvasControls from './components/canvas/CanvasControls';
import PageGridOverlay from './components/canvas/PageGridOverlay';
import TitleBlockOverlay from './components/canvas/TitleBlockOverlay';
import CablePrompt from './components/CablePrompt';
import { saveProject as dbSave, exportProject, importProject, loadProject as dbLoad, renderExportBlob, renderLayoutBlob, cropPageBlobs, downloadBlob, downloadZip, invertBlob, pngBlobsToPdf } from './services/storage';
import { getRecentFiles, addToRecentFiles } from './services/recentFiles';
import { useCanvasSettings, PAPER_SIZES } from './hooks/useCanvasSettings';
import { usePageGrid } from './hooks/usePageGrid';
import { getSubcategories } from './config/nodePresets';
import { findOpenPosition, getViewportCenter } from './utils/nodePosition';
import ChangelogPopup from './components/ChangelogPopup';
import { APP_VERSION } from './config/version';

const ZOOM_LEVELS = [0.05, 0.1, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0, 6.0, 8.0];
const ZOOM_BOUNDS = { MIN: 0.05, MAX: 8 };
const ZOOM_STEP = { IN: 1.2, OUT: 0.8 };
const ESTIMATED_NODE_SIZE = { WIDTH: 200, HEIGHT: 150 }; // For fitView calculations

// Signal colors - must match SuperNode.jsx
const SIGNAL_COLORS = [
  // Primary colors
  { id: 'emerald', hex: '#10b981' },
  { id: 'cyan', hex: '#06b6d4' },
  { id: 'blue', hex: '#3b82f6' },
  { id: 'violet', hex: '#8b5cf6' },
  { id: 'pink', hex: '#ec4899' },
  { id: 'red', hex: '#ef4444' },
  { id: 'orange', hex: '#f97316' },
  { id: 'yellow', hex: '#eab308' },
  // Extended colors
  { id: 'lime', hex: '#84cc16' },
  { id: 'teal', hex: '#14b8a6' },
  { id: 'sky', hex: '#0ea5e9' },
  { id: 'indigo', hex: '#6366f1' },
  { id: 'fuchsia', hex: '#d946ef' },
  { id: 'rose', hex: '#f43f5e' },
  { id: 'amber', hex: '#f59e0b' },
  { id: 'slate', hex: '#64748b' },
  // Additional colors
  { id: 'green', hex: '#22c55e' },
  { id: 'purple', hex: '#a855f7' },
  { id: 'coral', hex: '#fb7185' },
  { id: 'mint', hex: '#34d399' },
  { id: 'gold', hex: '#fbbf24' },
  { id: 'magenta', hex: '#e879f9' },
  { id: 'navy', hex: '#1e40af' },
  { id: 'bronze', hex: '#b45309' },
  // More colors
  { id: 'crimson', hex: '#dc2626' },
  { id: 'sapphire', hex: '#2563eb' },
  { id: 'jade', hex: '#059669' },
  { id: 'tangerine', hex: '#ea580c' },
  { id: 'lavender', hex: '#c084fc' },
  { id: 'salmon', hex: '#f87171' },
  { id: 'turquoise', hex: '#2dd4bf' },
  { id: 'plum', hex: '#9333ea' },
  { id: 'chartreuse', hex: '#a3e635' },
  { id: 'peach', hex: '#fdba74' },
  { id: 'steel', hex: '#475569' },
  { id: 'wine', hex: '#881337' },
];

// Signal colors lookup Map for O(1) access by id
const SIGNAL_COLORS_BY_ID = new Map(SIGNAL_COLORS.map(c => [c.id, c.hex]));
const DEFAULT_THEME_COLOR = '#71717a'; // zinc-500

// Print-friendly bold callback — applied to cloned DOM via onCloneNode.
// Bolds all text inside nodes except the title bar and cable labels.
const printBoldCloneNode = (cloned) => {
  if (!(cloned instanceof HTMLElement)) return;
  cloned.querySelectorAll('.bg-zinc-900.rounded-lg').forEach(node => {
    const titleBar = node.querySelector('.rounded-t-lg');
    node.querySelectorAll('span, div, td, th, button, input').forEach(el => {
      if (titleBar?.contains(el)) return;
      if (el instanceof HTMLElement) el.style.fontWeight = '700';
    });
  });
};

// Extract nodeId from anchorId (format: "node-12345-in-67890" -> "node-12345")
// Node IDs always have 2 segments: "node-TIMESTAMP"
const getNodeIdFromAnchor = (anchorId) => anchorId.split('-').slice(0, 2).join('-');

// Dash patterns for enhanced wires
const DASH_PATTERNS = [
  { id: 'solid', pattern: null, label: '───' },
  { id: 'long', pattern: '12 6', label: '── ──' },
  { id: 'medium', pattern: '8 4', label: '─ ─ ─' },
  { id: 'short', pattern: '4 4', label: '· · ·' },
  { id: 'dashdot', pattern: '12 4 4 4', label: '─·─·' },
];

// Memoized Cable component - only re-renders when its specific anchor positions change
const Cable = memo(({ conn, fromPos, toPos, wirePath, wireColor, isSelected, selectedWires, onWireClick }) => {
  const isEnhanced = conn.enhanced || false;

  if (!wirePath) return null;

  return (
    <g>
      {/* Selection highlight */}
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
        style={{ filter: `drop-shadow(0 0 4px ${wireColor}50)` }}
      />

      {/* Enhanced: Animated flow */}
      {isEnhanced && (
        <path
          d={wirePath}
          fill="none"
          stroke={wireColor}
          strokeWidth={1}
          strokeDasharray="4 12"
          strokeOpacity={0.6}
          strokeLinecap="round"
          className="animate-wire-flow"
        />
      )}

      {/* Cable length label */}
      {conn.length && fromPos && toPos && (
        <text
          x={(fromPos.x + toPos.x) / 2}
          y={(fromPos.y + toPos.y) / 2 - 10}
          fill={wireColor}
          fontSize={4}
          textAnchor="middle"
          className="select-none pointer-events-none"
          style={{ textShadow: '0 0 3px rgba(0,0,0,0.8)' }}
        >
          {conn.length}
        </text>
      )}

      {/* Invisible click hit area */}
      <path
        d={wirePath}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        strokeLinecap="round"
        className="pointer-events-auto cursor-pointer"
        onClick={(e) => onWireClick(e, conn.id)}
      />
    </g>
  );
}, (prev, next) => {
  // Custom comparison - only re-render if these specific props changed
  return (
    prev.wirePath === next.wirePath &&
    prev.wireColor === next.wireColor &&
    prev.isSelected === next.isSelected &&
    prev.conn.enhanced === next.conn.enhanced &&
    prev.conn.dashPattern === next.conn.dashPattern &&
    prev.conn.length === next.conn.length &&
    prev.fromPos?.x === next.fromPos?.x &&
    prev.fromPos?.y === next.fromPos?.y &&
    prev.toPos?.x === next.toPos?.x &&
    prev.toPos?.y === next.toPos?.y
  );
});
Cable.displayName = 'Cable';

// Memoized Anchor Point - only re-renders when its specific data changes
const AnchorPoint = memo(({ anchorId, pos, isActive, isConnected, themeColor, onAnchorClick }) => {
  const themeLightColor = themeColor + 'cc';
  const anchorColor = isConnected ? themeColor : '#52525b';
  const anchorStroke = isConnected ? themeLightColor : '#71717a';
  const anchorOpacity = isConnected ? 1 : 0.4;
  // Scale radius with node scale so anchors match the node's visual size
  const s = pos.scale || 1;
  const baseR = isActive ? 3 : 2.5;
  const glowR = 5;

  return (
    <g data-export-ignore="true">
      {(isConnected || isActive) && (
        <circle
          cx={pos.x}
          cy={pos.y}
          r={glowR * s}
          fill={isActive ? '#22d3ee' : anchorColor}
          opacity={0.3}
        />
      )}
      <circle
        cx={pos.x}
        cy={pos.y}
        r={baseR * s}
        fill={isActive ? '#22d3ee' : anchorColor}
        stroke={isActive ? '#67e8f9' : anchorStroke}
        strokeWidth={1}
        opacity={anchorOpacity}
        style={{ cursor: 'pointer', pointerEvents: 'auto' }}
        onClick={(e) => {
          e.stopPropagation();
          onAnchorClick(anchorId, pos.type);
        }}
      />
    </g>
  );
}, (prev, next) => (
  prev.pos.x === next.pos.x &&
  prev.pos.y === next.pos.y &&
  prev.pos.scale === next.pos.scale &&
  prev.isActive === next.isActive &&
  prev.isConnected === next.isConnected &&
  prev.themeColor === next.themeColor
));
AnchorPoint.displayName = 'AnchorPoint';

// Create empty node with default config
const createNode = (id) => ({
  id,
  title: 'New Device',
  signalColor: null,
  position: { x: 100, y: 100 },
  scale: 0.5, // Default 50% scale
  rpCode: '', // Equipment inventory code
  description: '', // Manufacturer and model description
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
    manufacturer: '', // Manufacturer name
    model: '', // Model name/number
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

// Create SuperNode (unified drag-based layout with columns)
const createSuperNode = (id) => ({
  id,
  title: 'SUPERNODE',
  version: 2, // Flag to use SuperNode component
  signalColor: null, // No color by default
  position: { x: 100, y: 100 },
  scale: 0.5, // Default 50% scale
  rpCode: '', // Equipment inventory code
  description: '', // Manufacturer and model description
  layout: {
    // Unified row-based layout (no more stacked/columns toggle)
    // Each row is an array of section IDs
    // Single item = spans full width, two items = side-by-side columns
    rows: [
      ['system'],           // System spans full width at top
      ['input', 'output'],  // Input and Output side-by-side
    ],
    // Anchor side preferences (used when section is in spanning row)
    inputAnchorSide: 'left',
    outputAnchorSide: 'right',
    systemAnchorSide: 'left',
    systemCollapsed: false,
    inputCollapsed: false,
    outputCollapsed: false
  },
  system: {
    manufacturer: '', // Manufacturer name
    model: '', // Model name/number
    platform: 'none',
    software: 'none',
    captureCard: 'none',
    settings: [],
    cards: [],
    systemSectionStyle: 'aligned' // 'aligned' or 'simplified'
  },
  inputSection: {
    columnName: 'INPUTS',
    columnOrder: ['port', 'connector', 'source', 'resolution', 'rate'],
    ports: [
      {
        id: 'in-1',
        number: 1,
        connector: 'HDMI',
        source: 'LAPTOP 1',
        resolution: '3840x2160',
        refreshRate: '60'
      },
      {
        id: 'in-2',
        number: 2,
        connector: 'HDMI',
        source: 'MACBOOKPRO 1',
        resolution: '3840x2160',
        refreshRate: '60'
      },
      {
        id: 'in-3',
        number: 3,
        connector: '',
        source: '',
        resolution: '',
        refreshRate: ''
      }
    ]
  },
  outputSection: {
    columnName: 'OUTPUTS',
    columnOrder: ['port', 'connector', 'destination', 'resolution', 'rate'],
    ports: [
      {
        id: 'out-1',
        number: 1,
        connector: '12G SDI',
        destination: 'BROMPTOM SX40',
        resolution: '3840x2160',
        refreshRate: '60'
      },
      {
        id: 'out-2',
        number: 2,
        connector: '12G SDI',
        destination: 'PROJECTOR 1',
        resolution: '3840x2160',
        refreshRate: '60'
      },
      {
        id: 'out-3',
        number: 3,
        connector: '',
        destination: '',
        resolution: '',
        refreshRate: ''
      }
    ]
  }
});

// Create Node 313 (generic 3-section table node)
const createNode313 = (id) => ({
  id,
  title: 'NODE 313',
  model: '',
  manufacturer: '',
  tag: '',
  version: 3,
  signalColor: null,
  deviceTypes: [],
  position: { x: 100, y: 100 },
  scale: 0.5,
  layout: 'a_b_c',
  sectionSpacing: { a: 0, b: 0, c: 0 },
  sections: {
    a: { title: 'INPUT', cols: ['PORT', 'RESOLUTION', 'RATE', 'CONNECTOR', 'SOURCE', 'DESTINATION'], rows: [['IN 1','4096x2160','23.98','HDMI 2.0','',''], ['IN 2','3840x2160','24','3G SDI','','']] },
    b: { title: 'OUTPUT', cols: ['PORT', 'RESOLUTION', 'RATE', 'CONNECTOR', 'SOURCE', 'DESTINATION'], rows: [['OUT 1','2560x1440','59.94','12G SDI','',''], ['OUT 2','1280x720','60','DP 1.2','','']] },
    c: { title: 'SYSTEM', cols: ['PORT', 'RESOLUTION', 'RATE', 'CONNECTOR', 'SOURCE', 'DESTINATION'], rows: [['NETWORK','','','','',''], ['MULTIVIEW','','','','','']] },
  }
});

export default function App() {
  // Paper and canvas settings (persisted to localStorage)
  const {
    paperSize, orientation, paperEnabled, setPaperEnabled,
    customWidth, customHeight, snapToGrid, showRatioOverlay, gridSize,
    canvasDimensions, handlePaperSizeChange, handleOrientationChange, toggleOrientation,
    handleCustomSizeChange, toggleSnapToGrid, toggleRatioOverlay, centerPage: centerPageFn,
  } = useCanvasSettings();

  const [zoom, setZoom] = useState(0.75);

  // Pan state (middle mouse drag)
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanningRef = useRef(false);

  // Selection box state (left click drag on canvas)
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null); // { startX, startY, endX, endY }
  const [selectedNodes, setSelectedNodes] = useState(new Set());

  // Side panel state
  const [sidePanelOpen, setSidePanelOpen] = useState(true);

  // Canvas state (single page)
  const [nodes, setNodes] = useState({});
  const [connections, setConnections] = useState([]);

  // Title block state
  const [showTitleBlock, setShowTitleBlock] = useState(() => {
    return localStorage.getItem('nx-showTitleBlock') === 'true';
  });
  const [showTitleBlockGrid, setShowTitleBlockGrid] = useState(() => {
    const saved = localStorage.getItem('nx-showTitleBlockGrid');
    return saved !== null ? saved === 'true' : false; // Default to false
  });
  const [canvasBackground, setCanvasBackground] = useState(() => {
    return localStorage.getItem('nx-canvasBackground') || 'dark';
  });
  const [titleBlockData, setTitleBlockData] = useState(() => {
    const saved = localStorage.getItem('nx-titleBlockData');
    return saved ? JSON.parse(saved) : {
      companyName: 'APEX',
      drawingBy: '',
      venue: '',
      project: '',
      scale: 'CUSTOM',
      sheetNumber: '1',
      pageSize: 'ASME B',
      sheetTitle: '',
    };
  });

  // Grid visibility state (independent of title block)
  const [showGrid, setShowGrid] = useState(() => {
    const saved = localStorage.getItem('nx-showGrid');
    return saved !== null ? saved === 'true' : true; // Default to true
  });

  const toggleGrid = useCallback(() => {
    setShowGrid(prev => {
      const next = !prev;
      localStorage.setItem('nx-showGrid', next.toString());
      return next;
    });
  }, []);

  // Title block toggle handlers
  const toggleTitleBlock = useCallback(() => {
    setShowTitleBlock(prev => {
      const next = !prev;
      localStorage.setItem('nx-showTitleBlock', next.toString());
      return next;
    });
  }, []);

  const toggleTitleBlockGrid = useCallback(() => {
    setShowTitleBlockGrid(prev => {
      const next = !prev;
      localStorage.setItem('nx-showTitleBlockGrid', next.toString());
      return next;
    });
  }, []);

  const toggleCanvasBackground = useCallback(() => {
    setCanvasBackground(prev => {
      const next = prev === 'dark' ? 'white' : 'dark';
      localStorage.setItem('nx-canvasBackground', next);
      return next;
    });
  }, []);

  const handleTitleBlockDataChange = useCallback((data) => {
    setTitleBlockData(data);
    localStorage.setItem('nx-titleBlockData', JSON.stringify(data));
  }, []);

  // Undo/Redo history
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const isUndoingRef = useRef(false);
  const lastStateRef = useRef(null);
  const HISTORY_LIMIT = 50;

  // Debounced history capture - records state after changes settle
  const historyTimeoutRef = useRef(null);
  const pendingStateRef = useRef(null);

  // Capture state changes with debounce (500ms)
  useEffect(() => {
    if (isUndoingRef.current) return;

    const currentState = { nodes, connections };
    const stateStr = JSON.stringify(currentState);

    // Skip if identical to last recorded state
    if (lastStateRef.current === stateStr) return;

    // Store pending state
    pendingStateRef.current = currentState;

    // Clear existing timeout
    if (historyTimeoutRef.current) {
      clearTimeout(historyTimeoutRef.current);
    }

    // Set new timeout - commit to history after 500ms of no changes
    historyTimeoutRef.current = setTimeout(() => {
      if (pendingStateRef.current && !isUndoingRef.current) {
        const stateToSave = pendingStateRef.current;
        const saveStr = JSON.stringify(stateToSave);
        if (lastStateRef.current !== saveStr) {
          // Save previous state (before current changes) to history
          if (lastStateRef.current) {
            const previousState = JSON.parse(lastStateRef.current);
            setHistory(prev => {
              const newHistory = [...prev, previousState];
              if (newHistory.length > HISTORY_LIMIT) {
                return newHistory.slice(-HISTORY_LIMIT);
              }
              return newHistory;
            });
            setFuture([]); // Clear redo stack on new action
          }
          lastStateRef.current = saveStr;
        }
        pendingStateRef.current = null;
      }
    }, 500);

    return () => {
      if (historyTimeoutRef.current) {
        clearTimeout(historyTimeoutRef.current);
      }
    };
  }, [nodes, connections]);

  // Undo - restore previous state
  const undo = useCallback(() => {
    if (history.length === 0) return;
    isUndoingRef.current = true;
    const currentState = { nodes, connections };
    const previousState = history[history.length - 1];
    setFuture(prev => [...prev, currentState]);
    setHistory(prev => prev.slice(0, -1));
    setNodes(previousState.nodes);
    setConnections(previousState.connections);
    lastStateRef.current = JSON.stringify(previousState);
    setTimeout(() => { isUndoingRef.current = false; }, 50);
  }, [history, nodes, connections]);

  // Redo - restore next state
  const redo = useCallback(() => {
    if (future.length === 0) return;
    isUndoingRef.current = true;
    const currentState = { nodes, connections };
    const nextState = future[future.length - 1];
    setHistory(prev => [...prev, currentState]);
    setFuture(prev => prev.slice(0, -1));
    setNodes(nextState.nodes);
    setConnections(nextState.connections);
    lastStateRef.current = JSON.stringify(nextState);
    setTimeout(() => { isUndoingRef.current = false; }, 50);
  }, [future, nodes, connections]);

  // User-created presets (saved by dragging nodes to library)
  const [userPresets, setUserPresets] = useState({});

  // User-created subcategories (custom folders in sidebar)
  const [userSubcategories, setUserSubcategories] = useState({});

  // Create a single Node313 on first load
  useEffect(() => {
    if (Object.keys(nodes).length === 0) {
      const node = createNode313(`node-${Date.now()}`);
      setNodes({ [node.id]: node });
    }
  }, []); // Empty deps - only run once on mount

  // Subcategory order tracking (categoryId -> array of subcategory IDs)
  const [subcategoryOrder, setSubcategoryOrder] = useState({});

  // Wire drawing state
  const [activeWire, setActiveWire] = useState(null);
  const [wireMousePos, setWireMousePos] = useState(null); // Mouse position for wire preview
  const [anchorLocalOffsets, setAnchorLocalOffsets] = useState({});

  // Wire selection state
  const [selectedWires, setSelectedWires] = useState(new Set());

  // Cable prompt state
  const [cablePromptData, setCablePromptData] = useState(null);
  const lastCableDataRef = useRef(null); // Remember last wire settings for new connections

  // Project identity
  const [projectName, setProjectName] = useState('Untitled Project');
  const [projectId, setProjectId] = useState(() => crypto.randomUUID());

  // Recent files
  const [recentFiles, setRecentFiles] = useState(() => getRecentFiles());
  const [showRecents, setShowRecents] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [exportProgress, setExportProgress] = useState(null);
  const [exportScale, setExportScale] = useState(8);
  const [printFriendly, setPrintFriendly] = useState(false);

  // Export resolution presets
  const EXPORT_PRESETS = [
    { label: 'Screen (1x)', scale: 1, desc: '~72 DPI' },
    { label: 'Draft (4x)', scale: 4, desc: '~150 DPI' },
    { label: 'Print (8x)', scale: 8, desc: '~300 DPI on 11×17' },
    { label: 'Large Print (16x)', scale: 16, desc: '~300 DPI on 24×36' },
    { label: 'Ultra (24x)', scale: 24, desc: '~600 DPI on 24×36' },
  ];

  // Refs for stable access in event handlers (avoids stale closures)
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const panStartRef = useRef({ x: 0, y: 0 });
  const transformRef = useRef(null);
  const zoomSyncTimer = useRef(null);
  const clipboardRef = useRef([]);

  // Sync state → refs (only when state changes, not during direct manipulation)
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);

  // Apply transform directly to DOM without React re-render
  const applyTransform = useCallback(() => {
    if (transformRef.current) {
      transformRef.current.style.transform =
        `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoomRef.current})`;
    }
  }, []);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const cachedExportBlob = useRef(null);

  // Multi-page grid (pages extend dynamically as nodes are placed)
  // CRITICAL: Memoize node array to prevent creating new object references on every render
  // Each node value should only change when that specific node's data changes
  const nodeArray = useMemo(() => Object.values(nodes), [nodes]);
  const pages = usePageGrid({
    nodes: nodeArray,
    pageWidth: canvasDimensions.width,
    pageHeight: canvasDimensions.height,
    canvasRef,
  });

  // Compute bounding box of all pages for canvas sizing
  const pageBounds = useMemo(() => {
    if (pages.length === 0) return null;
    const minX = Math.min(...pages.map(p => p.x));
    const minY = Math.min(...pages.map(p => p.y));
    const maxX = Math.max(...pages.map(p => p.x + p.width));
    const maxY = Math.max(...pages.map(p => p.y + p.height));
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }, [pages, paperEnabled]);

  // Effective canvas bounds - extends to cover all pages (so mouse events work everywhere)
  // Includes position offset for pages in negative space (above/left of origin)
  const effectiveCanvasBounds = useMemo(() => {
    if (!pageBounds) {
      return { x: 0, y: 0, width: canvasDimensions.width, height: canvasDimensions.height };
    }
    // Canvas must start at the minimum coordinate and extend to cover everything
    const minX = Math.min(0, pageBounds.x);
    const minY = Math.min(0, pageBounds.y);
    const maxX = Math.max(canvasDimensions.width, pageBounds.x + pageBounds.width);
    const maxY = Math.max(canvasDimensions.height, pageBounds.y + pageBounds.height);
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, [canvasDimensions, pageBounds]);

  // Node management
  const addNode = (typeOrConfig = 'generic') => {
    const nodeId = `node-${Date.now()}`;
    let newNode;

    // Handle object config (from SidePanel)
    if (typeof typeOrConfig === 'object') {
      const { type, preset } = typeOrConfig;

      if (type === 'supernode') {
        newNode = createSuperNode(nodeId);

        // Apply preset overrides if provided
        if (preset) {
          if (preset.title) newNode.title = preset.title;
          if (preset.signalColor) newNode.signalColor = preset.signalColor;
          if (preset.rpCode) newNode.rpCode = preset.rpCode;
          if (preset.description) newNode.description = preset.description;

          // Support both old 'systemSection' and new 'system' property names
          const systemData = preset.system || preset.systemSection;
          if (systemData) {
            newNode.system = {
              ...newNode.system,
              manufacturer: systemData.manufacturer || newNode.system.manufacturer,
              model: systemData.model || newNode.system.model,
              platform: systemData.platform || newNode.system.platform,
              software: systemData.software || newNode.system.software,
              captureCard: systemData.captureCard || newNode.system.captureCard
            };
          }
          if (preset.inputSection?.ports) {
            newNode.inputSection.ports = preset.inputSection.ports.map((p, i) => ({
              id: `in-${i + 1}`,
              number: i + 1,
              source: p.source || '',
              connector: p.connector || 'HDMI',
              resolution: p.resolution || '',
              refreshRate: p.refreshRate || ''
            }));
          }
          if (preset.outputSection?.ports) {
            newNode.outputSection.ports = preset.outputSection.ports.map((p, i) => ({
              id: `out-${i + 1}`,
              number: i + 1,
              destination: p.destination || '',
              connector: p.connector || 'HDMI',
              resolution: p.resolution || '',
              refreshRate: p.refreshRate || ''
            }));
          }
        }
      } else {
        newNode = createNode(nodeId);
      }
    }
    // Handle string type
    else if (typeOrConfig === 'node313') {
      newNode = createNode313(nodeId);
    } else if (typeOrConfig === 'supernode') {
      newNode = createSuperNode(nodeId);
    } else {
      newNode = createNode(nodeId);
    }

    // Position new node at center of current viewport, staggered from existing nodes
    const center = getViewportCenter(containerRef, panRef, zoomRef);
    newNode.position = findOpenPosition(
      Object.values(nodes),
      center.x,
      center.y,
      { isCenterTarget: true, snapToGrid, gridSize }
    );

    setNodes(prev => ({ ...prev, [nodeId]: newNode }));
  };

  // Save a node as a preset in a subcategory
  const savePreset = (nodeId, categoryId, subcategoryId) => {
    const node = nodes[nodeId];
    if (!node) return;

    const presetId = `preset-${Date.now()}`;
    const preset = {
      id: presetId,
      label: node.title || 'Untitled',
      title: node.title,
      signalColor: node.signalColor,
      rpCode: node.rpCode || '',
      description: node.description || '',
      system: node.system ? {
        manufacturer: node.system.manufacturer || '',
        model: node.system.model || '',
        platform: node.system.platform,
        software: node.system.software,
        captureCard: node.system.captureCard
      } : null,
      inputSection: {
        ports: node.inputSection?.ports?.map(p => ({
          connector: p.connector,
          resolution: p.resolution,
          refreshRate: p.refreshRate
        })) || []
      },
      outputSection: {
        ports: node.outputSection?.ports?.map(p => ({
          connector: p.connector,
          resolution: p.resolution,
          refreshRate: p.refreshRate
        })) || []
      },
      layout: node.layout
    };

    const key = `${categoryId}/${subcategoryId}`;
    setUserPresets(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), preset]
    }));
  };

  // Delete a preset from a subcategory
  const deletePreset = (categoryId, subcategoryId, presetId) => {
    const key = `${categoryId}/${subcategoryId}`;
    setUserPresets(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter(p => p.id !== presetId)
    }));
  };

  const updatePreset = (categoryId, subcategoryId, presetId, updatedPreset) => {
    const key = `${categoryId}/${subcategoryId}`;
    setUserPresets(prev => ({
      ...prev,
      [key]: (prev[key] || []).map(p => p.id === presetId ? updatedPreset : p)
    }));
  };

  // Add a new subcategory to a category
  const addSubcategory = ({ categoryId, subcategoryId, label, description, parentId = null }) => {
    setUserSubcategories(prev => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] || {}),
        [subcategoryId]: {
          label,
          description,
          parentId, // null = top-level, or another subcategoryId
          presets: {}
        }
      }
    }));

    // Add to order tracking
    setSubcategoryOrder(prev => ({
      ...prev,
      [categoryId]: [...(prev[categoryId] || []), subcategoryId]
    }));
  };

  // Move a subcategory into or out of another subcategory
  const moveSubcategory = (categoryId, subcategoryId, newParentId) => {
    setUserSubcategories(prev => {
      const updated = { ...prev };

      // Ensure category exists
      if (!updated[categoryId]) {
        updated[categoryId] = {};
      }

      if (updated[categoryId][subcategoryId]) {
        // Subcategory already in userSubcategories, just update parentId
        updated[categoryId] = {
          ...updated[categoryId],
          [subcategoryId]: {
            ...updated[categoryId][subcategoryId],
            parentId: newParentId
          }
        };
      } else {
        // This is a built-in subcategory being moved for the first time
        // Add it to userSubcategories with the parentId
        const baseSubcats = getSubcategories(categoryId);
        const baseSub = baseSubcats.find(s => s.id === subcategoryId);

        if (baseSub) {
          updated[categoryId] = {
            ...updated[categoryId],
            [subcategoryId]: {
              label: baseSub.label,
              description: baseSub.description,
              parentId: newParentId
            }
          };
        }
      }

      return updated;
    });
  };

  // Delete a subcategory and all its presets (and children recursively)
  const deleteSubcategory = (categoryId, subcategoryId) => {
    // Find all child subcategories recursively
    const findChildren = (parentId) => {
      const children = [];
      const subs = userSubcategories[categoryId] || {};
      Object.keys(subs).forEach(subId => {
        if (subs[subId].parentId === parentId) {
          children.push(subId);
          children.push(...findChildren(subId));
        }
      });
      return children;
    };

    const allToDelete = [subcategoryId, ...findChildren(subcategoryId)];

    // Remove subcategories from userSubcategories
    setUserSubcategories(prev => {
      const updated = { ...prev };
      if (updated[categoryId]) {
        const categoryUpdated = { ...updated[categoryId] };
        allToDelete.forEach(id => delete categoryUpdated[id]);
        if (Object.keys(categoryUpdated).length === 0) {
          delete updated[categoryId];
        } else {
          updated[categoryId] = categoryUpdated;
        }
      }
      return updated;
    });

    // Remove from order tracking
    setSubcategoryOrder(prev => ({
      ...prev,
      [categoryId]: (prev[categoryId] || []).filter(id => !allToDelete.includes(id))
    }));

    // Remove all presets for these subcategories
    setUserPresets(prev => {
      const updated = { ...prev };
      allToDelete.forEach(id => {
        const key = `${categoryId}/${id}`;
        delete updated[key];
      });
      return updated;
    });
  };

  // Reorder presets within a subcategory
  const reorderPresets = (categoryId, subcategoryId, fromIndex, toIndex) => {
    const key = `${categoryId}/${subcategoryId}`;
    setUserPresets(prev => {
      const presets = [...(prev[key] || [])];
      const [removed] = presets.splice(fromIndex, 1);
      presets.splice(toIndex, 0, removed);

      return {
        ...prev,
        [key]: presets
      };
    });
  };

  // Reorder subcategories within a category
  const reorderSubcategories = (categoryId, fromSubId, toSubId) => {
    setSubcategoryOrder(prev => {
      const currentOrder = prev[categoryId] || [];
      const fromIndex = currentOrder.indexOf(fromSubId);
      const toIndex = currentOrder.indexOf(toSubId);

      if (fromIndex === -1 || toIndex === -1) return prev;

      const newOrder = [...currentOrder];
      const [removed] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, removed);

      return {
        ...prev,
        [categoryId]: newOrder
      };
    });
  };

  const updateNode = useCallback((nodeId, updates) => {
    setNodes(prev => {
      if (prev[nodeId]) {
        return { ...prev, [nodeId]: { ...prev[nodeId], ...updates } };
      }
      return prev;
    });
  }, []);

  const deleteNode = useCallback((nodeId) => {
    setNodes(prev => {
      const { [nodeId]: removed, ...remainingNodes } = prev;
      return remainingNodes;
    });
    // Remove connections involving this node
    setConnections(prev => prev.filter(
      c => !c.from.startsWith(nodeId) && !c.to.startsWith(nodeId)
    ));
    // Clean up anchor offsets for this node
    setAnchorLocalOffsets(prev => {
      const cleaned = {};
      Object.entries(prev).forEach(([anchorId, offset]) => {
        if (offset.nodeId !== nodeId) cleaned[anchorId] = offset;
      });
      return cleaned;
    });
  }, []);

  // Move all selected nodes by a delta (for multi-select drag)
  const moveSelectedNodes = useCallback((deltaX, deltaY, excludeNodeId) => {
    setNodes(prev => {
      const updated = { ...prev };
      selectedNodes.forEach(nodeId => {
        // Skip the node being directly dragged (it moves via its own onUpdate)
        if (nodeId === excludeNodeId) return;
        if (!updated[nodeId]) return;

        const node = updated[nodeId];
        updated[nodeId] = {
          ...node,
          position: {
            x: node.position.x + deltaX,
            y: node.position.y + deltaY
          }
        };
      });
      return updated;
    });
  }, [selectedNodes]);

  // Get source node for an anchor (finds the originating source of a signal)
  // Traces back through the signal chain to find the node that has a signal color
  const getSourceNode = useCallback((anchorId, visited = new Set()) => {
    if (visited.has(anchorId)) return null;
    visited.add(anchorId);

    const nodeId = getNodeIdFromAnchor(anchorId);
    const node = nodes[nodeId];

    if (!node) return null;

    // If this node has a signal color, it's the source
    if (node.signalColor) return node;

    // Find any INPUT connection to this node (any anchor belonging to this node)
    // This handles the case where we're checking from an output anchor
    const inputConn = connections.find(c => {
      const toNodeId = getNodeIdFromAnchor(c.to);
      return toNodeId === nodeId;
    });

    if (inputConn) {
      return getSourceNode(inputConn.from, visited);
    }

    return null;
  }, [nodes, connections]);

  // Check if a node is a "source" device (works for both SuperNode deviceRoles and Node313 deviceTypes)
  const isSourceDevice = useCallback((node) =>
    node?.deviceRoles?.includes('source') || node?.deviceTypes?.includes('Source')
  , []);

  // Build a map of source names to colors from INPUT ports with wire connections
  // This is built first so it can be used by getConnectionColor
  const sourceNameToColor = useMemo(() => {
    const map = new Map();
    // First, collect all wire colors by anchor ID
    const anchorColors = new Map();
    connections.forEach(conn => {
      const fromNodeId = getNodeIdFromAnchor(conn.from);
      const fromNode = nodes[fromNodeId];
      // Get color from source device
      if (isSourceDevice(fromNode) && fromNode?.signalColor) {
        const color = SIGNAL_COLORS.find(c => c.id === fromNode.signalColor)?.hex;
        if (color) anchorColors.set(conn.to, color);
      }
    });
    // Then, map source names to colors from input ports
    Object.values(nodes).forEach(node => {
      (node.inputSection?.ports || []).forEach(port => {
        if (port.source) {
          const anchorId = `${node.id}-${port.id}`;
          const color = anchorColors.get(anchorId);
          if (color) {
            map.set(port.source, color);
          }
        }
      });
    });
    return map;
  }, [nodes, connections, isSourceDevice]);

  // Get signal color for a connection
  // Checks: 1) source device, 2) upstream source, 3) output port's source field
  const getConnectionColor = useCallback((conn) => {
    const sourceAnchorId = conn.from;
    const nodeId = getNodeIdFromAnchor(sourceAnchorId);
    const node = nodes[nodeId];

    // Check if this node is a "source" device type and has a signal color
    if (isSourceDevice(node) && node?.signalColor) {
      return SIGNAL_COLORS.find(c => c.id === node.signalColor)?.hex || '#22d3ee';
    }

    // Try to trace back to find a source device type upstream
    const upstreamSource = getSourceNode(conn.from);
    if (isSourceDevice(upstreamSource) && upstreamSource?.signalColor) {
      return SIGNAL_COLORS.find(c => c.id === upstreamSource.signalColor)?.hex || '#22d3ee';
    }

    // Check if the output port has a source field with a known color
    // This handles pass-through devices like switchers/routers
    const portId = sourceAnchorId.replace(`${nodeId}-`, '');
    const outputPort = node?.outputSection?.ports?.find(p => p.id === portId);
    if (outputPort?.source) {
      const sourceColor = sourceNameToColor.get(outputPort.source);
      if (sourceColor) return sourceColor;
    }

    return '#22d3ee'; // Default cyan
  }, [nodes, getSourceNode, sourceNameToColor, isSourceDevice]);

  // Pre-compute connected anchor IDs for O(1) lookup instead of O(connections) per anchor
  const connectedAnchorIds = useMemo(() => {
    const set = new Set();
    connections.forEach(c => { set.add(c.from); set.add(c.to); });
    return set;
  }, [connections]);

  // Pre-compute which signal colors are in use across all nodes
  const usedSignalColors = useMemo(() => {
    const set = new Set();
    Object.values(nodes).forEach(node => {
      if (node.signalColor) set.add(node.signalColor);
    });
    return set;
  }, [nodes]);

  // Pre-compute wire colors to avoid recursive graph traversal per wire per render
  // Depends on nodes because signal colors can change
  // Wire color override takes precedence over automatic color
  const connectionColorMap = useMemo(() => {
    const map = new Map();
    const colorIdToHex = {
      // Primary colors
      cyan: '#06b6d4',
      emerald: '#10b981',
      blue: '#3b82f6',
      violet: '#8b5cf6',
      pink: '#ec4899',
      red: '#ef4444',
      orange: '#f97316',
      yellow: '#eab308',
      // Extended colors
      lime: '#84cc16',
      teal: '#14b8a6',
      sky: '#0ea5e9',
      indigo: '#6366f1',
      fuchsia: '#d946ef',
      rose: '#f43f5e',
      amber: '#f59e0b',
      slate: '#64748b',
      // Additional colors
      green: '#22c55e',
      purple: '#a855f7',
      coral: '#fb7185',
      mint: '#34d399',
      gold: '#fbbf24',
      magenta: '#e879f9',
      navy: '#1e40af',
      bronze: '#b45309',
      // More colors
      crimson: '#dc2626',
      sapphire: '#2563eb',
      jade: '#059669',
      tangerine: '#ea580c',
      lavender: '#c084fc',
      salmon: '#f87171',
      turquoise: '#2dd4bf',
      plum: '#9333ea',
      chartreuse: '#a3e635',
      peach: '#fdba74',
      steel: '#475569',
      wine: '#881337',
    };
    connections.forEach(conn => {
      // Use manual override if set, otherwise auto-detect
      if (conn.wireColor && colorIdToHex[conn.wireColor]) {
        map.set(conn.id, colorIdToHex[conn.wireColor]);
      } else {
        map.set(conn.id, getConnectionColor(conn));
      }
    });
    return map;
  }, [connections, getConnectionColor, nodes]);

  // Global source names with colors - collected from ALL nodes
  // Maps sourceName -> hex color (from wire connections)
  const globalSourceNamesWithColors = useMemo(() => {
    const map = new Map(); // sourceName → color

    // First pass: collect colors from connections (anchorId -> color)
    const anchorColors = new Map();
    connections.forEach(conn => {
      const color = connectionColorMap.get(conn.id);
      if (color && conn.to) {
        anchorColors.set(conn.to, color);
      }
    });

    // Second pass: collect source names WITH colors from input ports first
    // This ensures colors are captured before we see the same name elsewhere
    Object.values(nodes).forEach(node => {
      (node.inputSection?.ports || []).forEach(port => {
        if (port.source) {
          const anchorId = `${node.id}-${port.id}`;
          const color = anchorColors.get(anchorId);
          // If we have a color, always set it (override null if already exists)
          if (color) {
            map.set(port.source, color);
          } else if (!map.has(port.source)) {
            map.set(port.source, null);
          }
        }
      });
    });

    // Third pass: add any remaining source names from output ports (without overriding colors)
    Object.values(nodes).forEach(node => {
      (node.outputSection?.ports || []).forEach(port => {
        if (port.source && !map.has(port.source)) {
          map.set(port.source, null);
        }
      });
    });

    return map;
  }, [nodes, connections, connectionColorMap]);

  // Pre-compute anchor theme colors to avoid lookups during render
  const anchorThemeColors = useMemo(() => {
    const map = new Map();
    Object.keys(anchorLocalOffsets).forEach(anchorId => {
      const nodeId = getNodeIdFromAnchor(anchorId);
      const node = nodes[nodeId];
      const themeColor = SIGNAL_COLORS_BY_ID.get(node?.signalColor) || DEFAULT_THEME_COLOR;
      map.set(anchorId, themeColor);
    });
    return map;
  }, [anchorLocalOffsets, nodes]);

  // Connection management - MEMOIZED to prevent node re-renders
  const handleAnchorClick = useCallback((anchorId, direction) => {
    setActiveWire(prev => {
      if (!prev) {
        // Start new wire with empty waypoints array
        return { from: anchorId, direction, waypoints: [] };
      } else {
        // Allow connection if directions are opposite, or either side is 'both' (Node313)
        const canConnect = prev.from !== anchorId && (
          prev.direction === 'both' || direction === 'both' || prev.direction !== direction
        );
        if (canConnect) {
          // Determine from/to: 'out' is always from, 'in' is always to, 'both' adapts
          let fromAnchor, toAnchor, fwd;
          if (prev.direction === 'out' || (prev.direction === 'both' && direction !== 'out')) {
            fromAnchor = prev.from;
            toAnchor = anchorId;
            fwd = true;
          } else {
            fromAnchor = anchorId;
            toAnchor = prev.from;
            fwd = false;
          }
          const waypoints = fwd ? (prev.waypoints || []) : (prev.waypoints || []).slice().reverse();

          // Check if connection already exists
          const exists = connections.some(
            c => c.from === fromAnchor && c.to === toAnchor
          );

          if (!exists) {
            setCablePromptData({
              mode: 'create',
              from: fromAnchor,
              to: toAnchor,
              waypoints: waypoints,
              initialData: lastCableDataRef.current
            });
          }
        }
        return null;
      }
    });
  }, [connections]);

  const deleteConnection = (connId) => {
    setConnections(prev => prev.filter(c => c.id !== connId));
    // Also remove from selection
    setSelectedWires(prev => {
      const next = new Set(prev);
      next.delete(connId);
      return next;
    });
  };

  // Cable prompt handlers
  const handleCablePromptSubmit = (cableData) => {
    if (!cablePromptData) return;

    if (cablePromptData.mode === 'edit') {
      // Update existing connection
      setConnections(prev => prev.map(conn => {
        if (conn.id === cablePromptData.connectionId) {
          return {
            ...conn,
            cableType: cableData.cableType || '',
            cableLength: cableData.cableLength || '',
            length: cableData.cableLength || '',  // Also store as 'length' for label display
            rpCode: cableData.rpCode || '',
            description: cableData.description || '',
            wireColor: cableData.wireColor || null
          };
        }
        return conn;
      }));
    } else {
      // Create new connection
      const newConnection = {
        id: `wire-${Date.now()}`,
        from: cablePromptData.from,
        to: cablePromptData.to,
        waypoints: cablePromptData.waypoints || [], // Waypoints for routing
        label: '',           // Optional wire label
        enhanced: false,     // Enhanced styling (outline, dash, animation)
        dashPattern: null,   // Dash pattern when enhanced
        cableType: cableData.cableType || '',
        cableLength: cableData.cableLength || '',
        length: cableData.cableLength || '',  // Also store as 'length' for label display
        rpCode: cableData.rpCode || '',
        description: cableData.description || '',
        wireColor: cableData.wireColor || null  // Color override (null = auto from source)
      };

      // Remember these settings for next wire
      lastCableDataRef.current = {
        cableType: cableData.cableType || '',
        cableLength: cableData.cableLength || '',
        wireColor: cableData.wireColor || null
      };

      setConnections(prev => [...prev, newConnection]);
      setActiveWire(null);
      setWireMousePos(null);
    }

    setCablePromptData(null);
  };

  const handleCablePromptCancel = () => {
    setCablePromptData(null);
    setActiveWire(null);
    setWireMousePos(null);
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

  // Wire double-click handling (for editing cable details)
  const handleWireDoubleClick = (wireId, event) => {
    event.stopPropagation();

    // Find the connection
    const connection = connections.find(c => c.id === wireId);
    if (!connection) return;

    // Show cable prompt with existing data for editing
    setCablePromptData({
      mode: 'edit',
      connectionId: wireId,
      initialData: {
        cableType: connection.cableType,
        cableLength: connection.cableLength,
        rpCode: connection.rpCode,
        description: connection.description,
        fontSize: connection.fontSize || 10,
        wireColor: connection.wireColor || null
      }
    });
  };

  // Deselect all wires (when clicking canvas) and close dropdowns
  // When wire is active, clicking canvas places a waypoint instead of canceling
  const handleCanvasClick = (event) => {
    // Only process if clicking directly on the canvas (not a node or wire)
    if (event.target.getAttribute('data-canvas') === 'true') {
      // If wire is active, place a waypoint
      if (activeWire) {
        const pos = screenToCanvasPosition({ x: event.clientX, y: event.clientY });
        const snappedPos = snapToGrid && gridSize > 0
          ? { x: Math.round(pos.x / gridSize) * gridSize, y: Math.round(pos.y / gridSize) * gridSize }
          : pos;

        setActiveWire(prev => ({
          ...prev,
          waypoints: [...(prev.waypoints || []), { id: `wp-${Date.now()}`, x: snappedPos.x, y: snappedPos.y }]
        }));
        return; // Don't deselect
      }

      setSelectedWires(new Set());
      setActiveWire(null);
      setWireMousePos(null);
    }
    setShowRecents(false);
  };

  // Cursor-centered zoom (zoom toward/away from mouse position)
  const handleWheel = useCallback((event) => {
    event.preventDefault();

    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;

    const prevZoom = zoomRef.current;
    const prevPan = panRef.current;
    // Smoother zoom: clamp delta and use exponential scaling
    const delta = Math.max(-5, Math.min(5, -event.deltaY * 0.01));
    const zoomFactor = Math.pow(1.1, delta);
    const newZoom = Math.max(ZOOM_BOUNDS.MIN, Math.min(ZOOM_BOUNDS.MAX, prevZoom * zoomFactor));

    // Adjust pan so the point under the cursor stays fixed
    const newPan = {
      x: cursorX - ((cursorX - prevPan.x) / prevZoom) * newZoom,
      y: cursorY - ((cursorY - prevPan.y) / prevZoom) * newZoom,
    };

    // Update refs and DOM directly — no React re-render
    zoomRef.current = newZoom;
    panRef.current = newPan;
    applyTransform();

    // Debounce React state sync (updates toolbar zoom display, etc.)
    clearTimeout(zoomSyncTimer.current);
    zoomSyncTimer.current = setTimeout(() => {
      setZoom(zoomRef.current);
      setPan({ ...panRef.current });
    }, 150);
  }, [applyTransform]);

  // Clean up zoom sync timer on unmount
  useEffect(() => () => clearTimeout(zoomSyncTimer.current), []);

  // Convert screen coordinates to canvas-space coordinates (accounting for pan + zoom)
  const screenToCanvasPosition = useCallback(({ x, y }) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return {
      x: (x - rect.left - panRef.current.x) / zoomRef.current,
      y: (y - rect.top - panRef.current.y) / zoomRef.current,
    };
  }, []);

  // Middle mouse pan - start
  const handleMouseDown = (event) => {
    // Middle mouse button (button === 1) - pan
    if (event.button === 1) {
      event.preventDefault();
      isPanningRef.current = true;
      if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
      panStartRef.current = { x: event.clientX - panRef.current.x, y: event.clientY - panRef.current.y };
    }
    // Left mouse button (button === 0) - start selection on canvas only
    else if (event.button === 0 && event.target.getAttribute('data-canvas') === 'true') {
      event.preventDefault(); // Prevent browser native text selection during drag
      const pos = screenToCanvasPosition({ x: event.clientX, y: event.clientY });
      if (containerRef.current) containerRef.current.style.cursor = 'crosshair';
      setIsSelecting(true);
      setSelectionBox({ startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y, active: false });
      // Clear selection unless shift is held
      if (!event.shiftKey) {
        setSelectedNodes(new Set());
      }
    }
  };

  // Mouse move - pan, selection box, or wire preview
  const handleMouseMove = (event) => {
    if (isPanningRef.current) {
      panRef.current = {
        x: event.clientX - panStartRef.current.x,
        y: event.clientY - panStartRef.current.y
      };
      applyTransform();
    }
    if (isSelecting && selectionBox) {
      const pos = screenToCanvasPosition({ x: event.clientX, y: event.clientY });
      const dx = Math.abs(pos.x - selectionBox.startX);
      const dy = Math.abs(pos.y - selectionBox.startY);
      // Require minimum 3px drag distance before showing selection box
      const isActive = selectionBox.active || dx > 3 || dy > 3;
      setSelectionBox(prev => prev ? { ...prev, endX: pos.x, endY: pos.y, active: isActive } : null);
    }
    // Track mouse position for wire preview during creation
    if (activeWire) {
      const pos = screenToCanvasPosition({ x: event.clientX, y: event.clientY });
      setWireMousePos(pos);
    }
  };

  // Mouse up - end pan or selection
  const handleMouseUp = (event) => {
    if (event.button === 1) {
      isPanningRef.current = false;
      if (containerRef.current) containerRef.current.style.cursor = '';
      setPan({ ...panRef.current });
    }
    if (event.button === 0 && isSelecting) {
      if (containerRef.current) containerRef.current.style.cursor = '';
      // Calculate which nodes overlap the selection box (AABB intersection)
      if (selectionBox && selectionBox.active) {
        const minX = Math.min(selectionBox.startX, selectionBox.endX);
        const maxX = Math.max(selectionBox.startX, selectionBox.endX);
        const minY = Math.min(selectionBox.startY, selectionBox.endY);
        const maxY = Math.max(selectionBox.startY, selectionBox.endY);

        // Use actual DOM measurements for accurate selection (works for any node type/size)
        const nodesInBox = new Set();
        const canvas = canvasRef.current;
        if (canvas) {
          const canvasRect = canvas.getBoundingClientRect();
          const zf = canvasRect.width / (canvas.offsetWidth || 1);

          Object.keys(nodes).forEach(nodeId => {
            const nodeEl = canvas.querySelector(`[data-node-id="${nodeId}"]`);
            if (!nodeEl) return;
            const cr = nodeEl.getBoundingClientRect();
            const nodeLeft = (cr.left - canvasRect.left) / zf;
            const nodeTop = (cr.top - canvasRect.top) / zf;
            const nodeRight = (cr.right - canvasRect.left) / zf;
            const nodeBottom = (cr.bottom - canvasRect.top) / zf;

            if (nodeRight >= minX && nodeLeft <= maxX &&
                nodeBottom >= minY && nodeTop <= maxY) {
              nodesInBox.add(nodeId);
            }
          });
        }

        if (event.shiftKey) {
          setSelectedNodes(prev => new Set([...prev, ...nodesInBox]));
        } else {
          setSelectedNodes(nodesInBox);
        }
      }
      setIsSelecting(false);
      setSelectionBox(null);
    }
  };

  // Center the paper in the viewport at default zoom
  const centerPage = useCallback(() => {
    centerPageFn(containerRef, zoomRef, panRef, applyTransform, setZoom, setPan);
  }, [centerPageFn, applyTransform]);

  // Fit all nodes into view with padding
  const fitView = useCallback((padding = 0.1) => {
    const container = containerRef.current;
    if (!container) return;
    const nodeArray = Object.values(nodes);
    if (nodeArray.length === 0) {
      centerPage();
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodeArray.forEach(node => {
      const w = ESTIMATED_NODE_SIZE.WIDTH * (node.scale || 1);
      const h = ESTIMATED_NODE_SIZE.HEIGHT * (node.scale || 1);
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + w);
      maxY = Math.max(maxY, node.position.y + h);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const rect = container.getBoundingClientRect();

    const scaleX = rect.width / (contentWidth * (1 + padding * 2));
    const scaleY = rect.height / (contentHeight * (1 + padding * 2));
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), ZOOM_BOUNDS.MIN), ZOOM_BOUNDS.MAX);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setZoom(newZoom);
    setPan({
      x: rect.width / 2 - centerX * newZoom,
      y: rect.height / 2 - centerY * newZoom,
    });
  }, [nodes, centerPage]);

  // Reset view = center page
  const resetView = () => {
    centerPage();
  };

  // Fit all nodes AND waypoints to the title block drawing area (scales and repositions everything)
  const fitNodesToDrawingArea = useCallback((padding = 20) => {
    const nodeArray = Object.values(nodes);
    if (nodeArray.length === 0 || pages.length === 0) return;

    // Get drawing area bounds (page bounds minus right panel and label margins)
    // Only subtract right panel if title block is visible
    const rightPanelWidth = showTitleBlock ? (titleBlockData?.rightPanelWidth || 200) : 0;
    const labelSize = showTitleBlock ? 20 : 0;

    const pageMinX = Math.min(...pages.map(p => p.x));
    const pageMinY = Math.min(...pages.map(p => p.y));
    const pageMaxX = Math.max(...pages.map(p => p.x + p.width));
    const pageMaxY = Math.max(...pages.map(p => p.y + p.height));

    // Drawing area is: page minus right panel, with label margins
    const drawingArea = {
      x: pageMinX + labelSize + padding,
      y: pageMinY + labelSize + padding,
      width: (pageMaxX - pageMinX) - rightPanelWidth - labelSize - padding * 2,
      height: (pageMaxY - pageMinY) - labelSize - padding * 2,
    };

    // Calculate current bounding box of NODES ONLY (not waypoints - they can extend outside)
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodeArray.forEach(node => {
      const w = ESTIMATED_NODE_SIZE.WIDTH * (node.scale || 1);
      const h = ESTIMATED_NODE_SIZE.HEIGHT * (node.scale || 1);
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + w);
      maxY = Math.max(maxY, node.position.y + h);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    if (contentWidth <= 0 || contentHeight <= 0) return;

    // Calculate scale factor to fit content into drawing area
    const scaleX = drawingArea.width / contentWidth;
    const scaleY = drawingArea.height / contentHeight;
    const scaleFactor = Math.min(scaleX, scaleY, 2); // Cap at 2x to avoid huge nodes

    // Update all nodes: scale and reposition
    const updatedNodes = {};
    nodeArray.forEach(node => {
      // Scale position relative to content bounding box origin
      const relX = node.position.x - minX;
      const relY = node.position.y - minY;

      const newX = drawingArea.x + relX * scaleFactor;
      const newY = drawingArea.y + relY * scaleFactor;
      const newScale = (node.scale || 1) * scaleFactor;

      updatedNodes[node.id] = {
        ...node,
        position: { x: newX, y: newY },
        scale: Math.max(0.25, Math.min(3, newScale)), // Clamp scale
      };
    });

    setNodes(updatedNodes);

    // Scale all waypoints proportionally using the same transform
    // This maintains their relative position to the nodes
    setConnections(prev => prev.map(conn => {
      if (!conn.waypoints || conn.waypoints.length === 0) return conn;

      return {
        ...conn,
        waypoints: conn.waypoints.map(wp => ({
          ...wp,
          x: drawingArea.x + (wp.x - minX) * scaleFactor,
          y: drawingArea.y + (wp.y - minY) * scaleFactor,
        })),
      };
    }));

    // Also fit the view to show the result
    setTimeout(() => fitView(0.05), 50);
  }, [nodes, connections, pages, titleBlockData, showTitleBlock, fitView]);

  // Zoom at viewport center (shared logic for zoom in/out)
  const zoomAtCenter = useCallback((newZoom) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const prev = zoomRef.current;
    const prevPan = panRef.current;
    setZoom(newZoom);
    setPan({
      x: cx - ((cx - prevPan.x) / prev) * newZoom,
      y: cy - ((cy - prevPan.y) / prev) * newZoom,
    });
  }, []);

  const zoomIn = useCallback(() => {
    zoomAtCenter(Math.min(zoomRef.current * ZOOM_STEP.IN, ZOOM_BOUNDS.MAX));
  }, [zoomAtCenter]);

  const zoomOut = useCallback(() => {
    zoomAtCenter(Math.max(zoomRef.current * ZOOM_STEP.OUT, ZOOM_BOUNDS.MIN));
  }, [zoomAtCenter]);

  // Center page on mount and whenever canvas dimensions change (orientation, paper size)
  // rAF handles fast updates; timeout fallback catches initial load when flex layout isn't ready yet
  useEffect(() => {
    const frame = requestAnimationFrame(() => centerPage());
    const timer = setTimeout(() => centerPage(), 100);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); };
  }, [centerPage, canvasDimensions.width, canvasDimensions.height]);

  // Attach wheel listener with { passive: false } so preventDefault works
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Auto-select wires between selected nodes
  useEffect(() => {
    if (selectedNodes.size < 2) return;
    const autoSelectedWires = new Set();
    connections.forEach(conn => {
      // Extract node ID from anchor ID format "node-{timestamp}-{port}"
      const fromParts = conn.from.split('-');
      const toParts = conn.to.split('-');
      const fromNodeId = fromParts.slice(0, 2).join('-');
      const toNodeId = toParts.slice(0, 2).join('-');
      if (selectedNodes.has(fromNodeId) && selectedNodes.has(toNodeId)) {
        autoSelectedWires.add(conn.id);
      }
    });
    if (autoSelectedWires.size > 0) {
      setSelectedWires(prev => {
        const next = new Set(prev);
        autoSelectedWires.forEach(id => next.add(id));
        return next;
      });
    }
  }, [selectedNodes, connections]);

  // Cursor feedback for active wire drawing mode
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.cursor = activeWire ? 'crosshair' : '';
    }
  }, [activeWire]);

  // Keyboard shortcuts: copy, paste, delete, deselect
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape — cancel active wire or deselect all
      if (e.key === 'Escape') {
        // If wire is being drawn, cancel it
        if (activeWire) {
          setActiveWire(null);
          setWireMousePos(null);
          return;
        }
        if (document.activeElement && document.activeElement !== document.body) {
          document.activeElement.blur();
        }
        setSelectedNodes(new Set());
        setSelectedWires(new Set());
        return;
      }

      // Backspace/Delete — remove last waypoint during wire creation
      if ((e.key === 'Backspace' || e.key === 'Delete') && activeWire?.waypoints?.length > 0) {
        const tag = e.target.tagName;
        const isInInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
        if (!isInInput) {
          e.preventDefault();
          setActiveWire(prev => ({
            ...prev,
            waypoints: prev.waypoints.slice(0, -1)
          }));
          return;
        }
      }

      const tag = e.target.tagName;
      const isInInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // Cmd/Ctrl+Z — undo (Shift for redo)
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      // Cmd/Ctrl+Y — redo (alternative)
      if (mod && key === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Cmd/Ctrl+C — copy selected nodes
      if (mod && key === 'c') {
        console.log('Ctrl+C pressed, selectedNodes:', selectedNodes.size);
        if (selectedNodes.size > 0) {
          clipboardRef.current = Array.from(selectedNodes).map(id => nodes[id]).filter(Boolean);
          console.log('Copied nodes:', clipboardRef.current.length);
        }
        return;
      }

      // Cmd/Ctrl+V — paste copied nodes
      if (mod && key === 'v') {
        console.log('Ctrl+V pressed, clipboard:', clipboardRef.current.length, 'isInInput:', isInInput);
        if (clipboardRef.current.length > 0 && !isInInput) {
          e.preventDefault();
          const newSelection = new Set();
          const now = Date.now();
          setNodes(prev => {
            const updated = { ...prev };
            const existingForCollision = Object.values(prev);

            clipboardRef.current.forEach((node, i) => {
              const newId = `node-${now + i}`;
              newSelection.add(newId);
              const position = findOpenPosition(
                existingForCollision,
                node.position.x + 40,
                node.position.y + 40,
                { isCenterTarget: false, snapToGrid, gridSize }
              );

              // Auto-numbering: "NAME 1", "NAME 2", etc.
              const title = node.title || 'Node';
              const baseTitle = title.replace(/\s+\d+$/, '');

              // Find highest existing number for nodes with this base title
              let maxNum = 0;
              Object.values(updated).forEach(n => {
                const nTitle = n.title || '';
                const nBase = nTitle.replace(/\s+\d+$/, '');
                if (nBase === baseTitle) {
                  const numMatch = nTitle.match(/\s+(\d+)$/);
                  const num = numMatch ? parseInt(numMatch[1], 10) : 1;
                  if (num > maxNum) maxNum = num;
                }
              });

              // Rename original node to "NAME 1" if it doesn't have a number yet
              const originalId = node.id;
              const originalHasNum = updated[originalId]?.title?.match(/\s+\d+$/);
              if (updated[originalId] && !originalHasNum) {
                updated[originalId] = {
                  ...updated[originalId],
                  title: `${baseTitle} 1`,
                };
                if (maxNum < 1) maxNum = 1;
              }

              const copyNumber = maxNum + 1 + i;
              const newNode = {
                ...structuredClone(node),
                id: newId,
                position,
                title: `${baseTitle} ${copyNumber}`,
              };
              updated[newId] = newNode;
              existingForCollision.push(newNode);
            });
            return updated;
          });
          setSelectedNodes(newSelection);
        }
        return;
      }

      // Ignore other shortcuts when typing in inputs/textareas/selects
      if (isInInput) return;

      // Delete / Backspace — delete selected nodes and wires
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodes.size > 0) {
          selectedNodes.forEach(nodeId => deleteNode(nodeId));
          setSelectedNodes(new Set());
        }
        if (selectedWires.size > 0) {
          setConnections(prev => prev.filter(c => !selectedWires.has(c.id)));
          setSelectedWires(new Set());
        }
        return;
      }

      // Arrow keys — move selected nodes
      if (selectedNodes.size > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = (e.ctrlKey || e.metaKey) ? 1 : e.shiftKey ? 10 : (snapToGrid && gridSize > 0 ? gridSize : 1);
        const delta = {
          ArrowUp: { x: 0, y: -step },
          ArrowDown: { x: 0, y: step },
          ArrowLeft: { x: -step, y: 0 },
          ArrowRight: { x: step, y: 0 },
        }[e.key];

        setNodes(prev => {
          const updated = { ...prev };
          selectedNodes.forEach(nodeId => {
            if (updated[nodeId]) {
              const node = updated[nodeId];
              updated[nodeId] = {
                ...node,
                position: {
                  x: node.position.x + delta.x,
                  y: node.position.y + delta.y
                }
              };
            }
          });
          return updated;
        });
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodes, selectedWires, nodes, deleteNode, snapToGrid, gridSize, undo, redo, activeWire]);

  // Toggle enhanced styling for selected wires
  const toggleWireEnhanced = () => {
    if (selectedWires.size === 0) return;

    setConnections(prev => prev.map(conn => {
      if (selectedWires.has(conn.id)) {
        return { ...conn, enhanced: !conn.enhanced };
      }
      return conn;
    }));
  };

  // Set dash pattern for selected wires
  const setWireDashPattern = (patternId) => {
    const pattern = DASH_PATTERNS.find(p => p.id === patternId)?.pattern || null;

    setConnections(prev => prev.map(conn => {
      if (selectedWires.has(conn.id)) {
        return { ...conn, dashPattern: pattern };
      }
      return conn;
    }));
  };

  // Set label for a wire
  const setWireLabel = (wireId, label) => {
    setConnections(prev => prev.map(conn => {
      if (conn.id === wireId) {
        return { ...conn, label };
      }
      return conn;
    }));
  };

  // Compute global anchor positions from node state + local offsets (pure arithmetic, no DOM queries)
  const computedAnchorPositions = useMemo(() => {
    const positions = {};
    Object.entries(anchorLocalOffsets).forEach(([anchorId, offset]) => {
      const node = nodes[offset.nodeId];
      if (node) {
        const s = node.scale || 1;
        positions[anchorId] = {
          x: node.position.x + offset.localX * s,
          y: node.position.y + offset.localY * s,
          type: offset.type,
          side: offset.side || (offset.type === 'in' ? 'left' : 'right'), // Default based on type
          scale: s,
        };
      }
    });
    return positions;
  }, [nodes, anchorLocalOffsets]);

  // Register anchor with local offset data (called by Node/SuperNode useLayoutEffect)
  const registerAnchor = useCallback((anchorId, offset) => {
    setAnchorLocalOffsets(prev => {
      const existing = prev[anchorId];
      if (existing &&
          existing.localX === offset.localX &&
          existing.localY === offset.localY &&
          existing.type === offset.type &&
          existing.side === offset.side) {
        return prev;
      }
      return { ...prev, [anchorId]: offset };
    });
  }, []);

  // Unregister anchors (called when ports are deleted)
  const unregisterAnchors = useCallback((anchorIds) => {
    if (!anchorIds || anchorIds.length === 0) return;
    setAnchorLocalOffsets(prev => {
      const next = { ...prev };
      let changed = false;
      for (const id of anchorIds) {
        if (next[id]) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  // Get anchor position from pre-computed positions
  const getAnchorPosition = useCallback((anchorId) => {
    return computedAnchorPositions[anchorId] || null;
  }, [computedAnchorPositions]);

  // Generate wire path (in paper-space coordinates - zoom applied at container level)
  // Routes wires OUTWARD from anchors based on their side (left/right) to avoid going through nodes
  // Supports waypoints for custom routing
  const getWirePath = useCallback((fromId, toId, waypoints = []) => {
    const from = getAnchorPosition(fromId);
    const to = getAnchorPosition(toId);
    if (!from || !to) return '';

    // No waypoints: use simple bezier curve
    if (!waypoints || waypoints.length === 0) {
      const dx = Math.abs(to.x - from.x);
      const offset = Math.max(50, dx * 0.4);
      const fromControlX = from.side === 'left' ? from.x - offset : from.x + offset;
      const toControlX = to.side === 'left' ? to.x - offset : to.x + offset;
      return `M ${from.x} ${from.y} C ${fromControlX} ${from.y}, ${toControlX} ${to.y}, ${to.x} ${to.y}`;
    }

    // With waypoints: generate straight lines with rounded 90-degree corners
    const cornerRadius = 8; // Small radius for corners
    const anchorOffset = 30; // How far to extend from anchor before turning

    // Build all points including anchor offsets
    const allPoints = [];

    // Start: extend horizontally from anchor
    allPoints.push({ x: from.x, y: from.y });
    const fromOffsetX = from.side === 'left' ? from.x - anchorOffset : from.x + anchorOffset;
    allPoints.push({ x: fromOffsetX, y: from.y });

    // Add waypoints
    waypoints.forEach(wp => allPoints.push({ x: wp.x, y: wp.y }));

    // End: extend horizontally to anchor
    const toOffsetX = to.side === 'left' ? to.x - anchorOffset : to.x + anchorOffset;
    allPoints.push({ x: toOffsetX, y: to.y });
    allPoints.push({ x: to.x, y: to.y });

    let path = `M ${allPoints[0].x} ${allPoints[0].y}`;

    // Generate path with rounded corners at each waypoint
    for (let i = 1; i < allPoints.length; i++) {
      const prev = allPoints[i - 1];
      const curr = allPoints[i];
      const next = allPoints[i + 1];

      if (!next || i === allPoints.length - 1) {
        // Last segment: just line to end
        path += ` L ${curr.x} ${curr.y}`;
      } else {
        // Calculate direction vectors
        const dx1 = curr.x - prev.x;
        const dy1 = curr.y - prev.y;
        const dx2 = next.x - curr.x;
        const dy2 = next.y - curr.y;

        const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

        // Limit corner radius to half the shortest segment
        const maxRadius = Math.min(len1 / 2, len2 / 2, cornerRadius);

        if (maxRadius < 2 || len1 < 4 || len2 < 4) {
          // Too short for curve, just use line
          path += ` L ${curr.x} ${curr.y}`;
        } else {
          // Calculate points where the curve starts and ends
          const startX = curr.x - (dx1 / len1) * maxRadius;
          const startY = curr.y - (dy1 / len1) * maxRadius;
          const endX = curr.x + (dx2 / len2) * maxRadius;
          const endY = curr.y + (dy2 / len2) * maxRadius;

          // Line to curve start, then quadratic curve through corner
          path += ` L ${startX} ${startY}`;
          path += ` Q ${curr.x} ${curr.y}, ${endX} ${endY}`;
        }
      }
    }

    return path;
  }, [getAnchorPosition]);

  // Pre-compute wire paths to avoid recalculation on every render
  const wirePathMap = useMemo(() => {
    const map = new Map();
    connections.forEach(conn => {
      map.set(conn.id, getWirePath(conn.from, conn.to, conn.waypoints));
    });
    return map;
  }, [connections, getWirePath, computedAnchorPositions]);

  // Pre-compute text paths — always left-to-right so labels never render upside down
  const wireTextPathMap = useMemo(() => {
    const map = new Map();
    connections.forEach(conn => {
      const fromPos = computedAnchorPositions[conn.from];
      const toPos = computedAnchorPositions[conn.to];
      if (!fromPos || !toPos) return;
      if (fromPos.x > toPos.x) {
        // Wire goes right-to-left — reverse path for readable text
        const reversedWaypoints = conn.waypoints ? [...conn.waypoints].reverse() : [];
        map.set(conn.id, getWirePath(conn.to, conn.from, reversedWaypoints));
      }
      // If left-to-right, no entry needed — use the original wirePath
    });
    return map;
  }, [connections, getWirePath, computedAnchorPositions]);

  // Build current project data object
  const buildProjectData = useCallback(() => ({
    id: projectId,
    name: projectName,
    version: APP_VERSION,
    savedAt: new Date().toISOString(),
    settings: { paperSize, orientation, zoom, paperEnabled, customWidth, customHeight, snapToGrid },
    nodes,
    connections,
    userPresets,
  }), [projectId, projectName, paperSize, orientation, zoom, paperEnabled, customWidth, customHeight, snapToGrid, nodes, connections, userPresets]);

  // Apply loaded project data to all state
  const applyProject = useCallback((project) => {
    handlePaperSizeChange(project.settings?.paperSize || 'ANSI_B');
    handleOrientationChange(project.settings?.orientation || 'landscape');
    setPaperEnabled(project.settings?.paperEnabled !== false);
    if (project.settings?.customWidth) {
      handleCustomSizeChange(project.settings.customWidth, project.settings.customHeight || 1200);
    }
    setNodes(project.nodes || {});
    setConnections(project.connections || []);
    setUserPresets(project.userPresets || {});
    setProjectName(project.name || 'Untitled Project');
    setProjectId(project.id);
    setSelectedNodes(new Set());
    setSelectedWires(new Set());
    setActiveWire(null);
    setAnchorLocalOffsets({});
    // Fit view after state settles
    setTimeout(() => fitView(0.1), 50);
  }, [fitView, handlePaperSizeChange, handleOrientationChange, setPaperEnabled, handleCustomSizeChange]);

  // New project
  const handleNewProject = useCallback(() => {
    setNodes({});
    setConnections([]);
    setUserPresets({});
    setProjectName('Untitled Project');
    setProjectId(crypto.randomUUID());
    setSelectedNodes(new Set());
    setSelectedWires(new Set());
    setActiveWire(null);
    setAnchorLocalOffsets({});
    setTimeout(() => centerPage(), 50);
  }, [centerPage]);

  // Fallback download for browsers without File System Access API
  const fallbackDownload = (content, fileName, type = 'application/json') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Save As — native dialog or fallback download + IndexedDB persist
  const handleSaveAs = useCallback(async () => {
    const project = buildProjectData();
    const json = exportProject(project);
    const fileName = `${projectName.replace(/\s+/g, '_')}.vsf`;

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'Visual Signal Flow',
            accept: { 'application/json': ['.vsf'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(json);
        await writable.close();
        await dbSave(project);
        setRecentFiles(addToRecentFiles(projectName, handle.name, projectId));
      } catch (err) {
        if (err.name !== 'AbortError') {
          fallbackDownload(json, fileName);
          await dbSave(project);
          setRecentFiles(addToRecentFiles(projectName, fileName, projectId));
        }
      }
    } else {
      fallbackDownload(json, fileName);
      await dbSave(project);
      setRecentFiles(addToRecentFiles(projectName, fileName, projectId));
    }
  }, [buildProjectData, projectName, projectId]);

  // Open — native dialog or fallback file input
  const handleOpenFile = useCallback(async () => {
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{
            description: 'Visual Signal Flow',
            accept: { 'application/json': ['.vsf', '.json', '.sfw'] },
          }],
          multiple: false,
        });
        const file = await handle.getFile();
        const content = await file.text();
        try {
          const project = importProject(content, file.name);
          applyProject(project);
          await dbSave(project);
          setRecentFiles(addToRecentFiles(project.name, file.name, project.id));
        } catch {
          alert('Invalid project file');
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          fileInputRef.current?.click();
        }
      }
    } else {
      fileInputRef.current?.click();
    }
  }, [applyProject]);

  // Fallback file input handler
  const handleFileChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const project = importProject(e.target.result, file.name);
        applyProject(project);
        await dbSave(project);
        setRecentFiles(addToRecentFiles(project.name, file.name, project.id));
      } catch {
        alert('Failed to load project file');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }, [applyProject]);

  // Load a recent project from IndexedDB
  const handleLoadRecent = useCallback(async (recentFile) => {
    const project = await dbLoad(recentFile.projectId);
    if (project) {
      applyProject(project);
      setShowRecents(false);
    } else {
      alert('Project not found in browser storage. Use Open to re-import the file.');
      setShowRecents(false);
    }
  }, [applyProject]);

  // Export user presets in format ready for nodePresets.js
  const handleExportPresets = useCallback(() => {
    if (!userPresets || Object.keys(userPresets).length === 0) {
      alert('No user presets to export. Drag nodes to sidebar folders to create presets first.');
      return;
    }

    // Format presets for easy pasting into nodePresets.js
    let output = '// User Presets Export\n';
    output += `// Generated: ${new Date().toISOString()}\n`;
    output += '// Paste these into nexus-x/src/config/nodePresets.js\n\n';

    Object.entries(userPresets).forEach(([key, presets]) => {
      const [categoryId, subcategoryId] = key.split('/');
      output += `// ${categoryId} -> ${subcategoryId}\n`;
      output += `// Add to NODE_PRESET_CATEGORIES.${categoryId}.subcategories.${subcategoryId}.presets:\n\n`;

      presets.forEach((preset, index) => {
        const presetId = preset.label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        output += `'${presetId}': ${JSON.stringify(preset, null, 2)},\n\n`;
      });

      output += '\n';
    });

    // Download as file
    fallbackDownload(output, 'user-presets-export.js', 'text/javascript');

    alert(`Exported ${Object.keys(userPresets).length} preset categories!\n\nCheck your downloads for: user-presets-export.js\n\nCopy the code and paste into nodePresets.js, then commit to Git.`);
  }, [userPresets]);

  // Background pre-render PNG export blob when browser is idle (single page only)
  // DISABLED for performance - pre-rendering with many nodes causes freezes
  // Export will render on-demand when user clicks export button
  useEffect(() => {
    if (!canvasRef.current) return;
    cachedExportBlob.current = null;

    // Skip pre-render entirely - too expensive with many nodes/ports
    // The export will render on-demand instead
    const nodeCount = Object.keys(nodes).length;
    const anchorCount = Object.keys(anchorLocalOffsets).length;
    if (nodeCount > 5 || anchorCount > 50) return; // Skip for complex canvases

    // Skip pre-render for multi-page and paper-off — rendered on demand
    if (!paperEnabled || pages.length > 1) return;

    let idleHandle;
    const timer = setTimeout(() => {
      idleHandle = requestIdleCallback(async () => {
        try {
          const blob = await renderExportBlob(canvasRef.current, {
              scale: 1,
              width: canvasDimensions.width,
              height: canvasDimensions.height,
            });
          if (blob) cachedExportBlob.current = blob;
        } catch {}
      }, { timeout: 5000 }); // Give up after 5s if browser too busy
    }, 2000); // Longer delay
    return () => {
      clearTimeout(timer);
      if (idleHandle) cancelIdleCallback(idleHandle);
    };
  }, [nodes, connections, paperSize, orientation, paperEnabled, pages.length, anchorLocalOffsets]);

  // Export canvas to PNG (single page) or ZIP (multi-page)
  // Scale controlled by exportScale state (user-selectable resolution)

  const handleExportPNG = useCallback(async () => {
    const name = projectName || 'untitled';
    const stamp = new Date().toISOString().slice(0, 10);

    // Helper to temporarily make canvas transparent for export
    const withTransparentCanvas = async (exportFn) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      // Save current background styles
      const origBg = canvas.style.backgroundColor;
      const origBgImage = canvas.style.backgroundImage;

      // Set transparent background for export
      canvas.style.backgroundColor = 'transparent';
      canvas.style.backgroundImage = 'none';

      try {
        return await exportFn();
      } finally {
        // Restore original background
        canvas.style.backgroundColor = origBg;
        canvas.style.backgroundImage = origBgImage;
      }
    };

    // Multi-page ZIP export (render once, crop per page)
    if (paperEnabled && pages.length > 1 && canvasRef.current) {
      const total = pages.length + 1; // +1 for layout render step
      setExportProgress({ current: 0, total });
      try {
        // Render with appropriate background
        setExportProgress({ current: 1, total });
        await new Promise(r => setTimeout(r, 0));
        const printClone = printFriendly ? printBoldCloneNode : undefined;
        let layoutBlob = await withTransparentCanvas(() =>
          renderLayoutBlob(canvasRef.current, pageBounds, { scale: exportScale, onCloneNode: printClone })
        );

        // Crop each page from the layout image (cheap canvas ops)
        setExportProgress({ current: 2, total });
        await new Promise(r => setTimeout(r, 0));
        const cropped = await cropPageBlobs(layoutBlob, pages, pageBounds, exportScale);
        let namedBlobs = cropped.map(({ page, blob }) => ({
          name: `${name}-${page.label.replace(/\s+/g, '-')}.png`, blob,
        }));

        // Add layout image
        namedBlobs.push({ name: `${name}-Layout.png`, blob: layoutBlob });

        // Post-process for print-friendly output
        if (printFriendly) {
          namedBlobs = await Promise.all(namedBlobs.map(async ({ name: n, blob }) => ({
            name: n, blob: await invertBlob(blob),
          })));
        }

        // Add PDF with all pages
        const pdfBlob = await pngBlobsToPdf(namedBlobs.map(b => b.blob));
        if (pdfBlob) namedBlobs.push({ name: `${name}-All-Pages.pdf`, blob: pdfBlob });

        await downloadZip(namedBlobs, `${name}-${stamp}.zip`);
      } catch (err) {
        console.error('Multi-page export failed:', err);
      } finally {
        setExportProgress(null);
      }
      return;
    }

    // Single page or paper-off export
    if (canvasRef.current && pageBounds) {
      setExportProgress({ current: 1, total: 1 });
      try {
        await new Promise(r => setTimeout(r, 0));
        const printClone = printFriendly ? printBoldCloneNode : undefined;
        let blob = await withTransparentCanvas(() =>
          renderLayoutBlob(canvasRef.current, pageBounds, { scale: exportScale, onCloneNode: printClone })
        );
        if (blob && printFriendly) blob = await invertBlob(blob);
        if (blob) {
          downloadBlob(blob, name);
          const pdfBlob = await pngBlobsToPdf([blob]);
          if (pdfBlob) downloadBlob(pdfBlob, name, 'pdf');
        }
      } catch (err) {
        console.error('Export failed:', err);
      } finally {
        setExportProgress(null);
      }
      return;
    }
  }, [projectName, paperEnabled, pages, pageBounds, canvasDimensions, exportScale, printFriendly]);

  // Export with title block included (removes data-export-ignore temporarily)
  const handleExportWithTitleBlock = useCallback(async () => {
    if (!canvasRef.current || !showTitleBlock) return;

    const name = projectName || 'untitled';
    const stamp = new Date().toISOString().slice(0, 10);

    // Find title block wrapper and temporarily remove data-export-ignore
    const titleBlockWrapper = canvasRef.current.querySelector('[data-title-block-wrapper]');
    const hadIgnore = titleBlockWrapper?.getAttribute('data-export-ignore');

    if (titleBlockWrapper) {
      titleBlockWrapper.removeAttribute('data-export-ignore');
    }

    const tbBgColor = '#000000';

    // Helper to set background for title block export
    const withTitleBlockCanvas = async (exportFn) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const origBg = canvas.style.backgroundColor;
      const origBgImage = canvas.style.backgroundImage;
      canvas.style.backgroundColor = tbBgColor;
      canvas.style.backgroundImage = 'none';

      try {
        return await exportFn();
      } finally {
        canvas.style.backgroundColor = origBg;
        canvas.style.backgroundImage = origBgImage;
      }
    };

    setExportProgress({ current: 1, total: 1 });
    try {
      await new Promise(r => setTimeout(r, 0));
      const printClone = printFriendly ? printBoldCloneNode : undefined;
      let blob = await withTitleBlockCanvas(() =>
        renderLayoutBlob(canvasRef.current, pageBounds, { scale: exportScale, backgroundColor: tbBgColor, onCloneNode: printClone })
      );
      if (blob && printFriendly) blob = await invertBlob(blob);
      if (blob) {
        downloadBlob(blob, `${name}-with-titleblock-${stamp}`);
        const pdfBlob = await pngBlobsToPdf([blob]);
        if (pdfBlob) downloadBlob(pdfBlob, `${name}-with-titleblock-${stamp}`, 'pdf');
      }
    } catch (err) {
      console.error('Export with title block failed:', err);
    } finally {
      // Restore data-export-ignore
      if (titleBlockWrapper && hadIgnore) {
        titleBlockWrapper.setAttribute('data-export-ignore', hadIgnore);
      }
      setExportProgress(null);
    }
  }, [projectName, showTitleBlock, pageBounds, exportScale, printFriendly]);

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col overflow-hidden">
      {/* Header Toolbar */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-900/95 backdrop-blur-sm px-4 py-3 relative">
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
                {Object.keys(nodes).length} nodes • {connections.length} wires
              </p>
            </div>
          </div>

          {/* Library Toggle & File Operations */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidePanelOpen(prev => !prev)}
              className={`px-2 py-1 border rounded text-xs font-mono ${
                sidePanelOpen
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10'
                  : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'
              }`}
              title="Toggle library panel"
            >
              ☰ Library
            </button>
            <button
              onClick={handleNewProject}
              className="px-2 py-1 border border-zinc-700 rounded text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
              title="Reset — clear everything and start fresh"
            >
              ↻
            </button>
            <div className="h-4 border-l border-zinc-700" />
            {/* Undo/Redo */}
            <button
              onClick={() => { undo(); }}
              disabled={history.length === 0}
              className={`px-2 py-1 border rounded text-xs font-mono ${
                history.length === 0
                  ? 'border-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'
              }`}
              title="Undo (Ctrl+Z)"
            >
              ↶
            </button>
            <button
              onClick={() => { redo(); }}
              disabled={future.length === 0}
              className={`px-2 py-1 border rounded text-xs font-mono ${
                future.length === 0
                  ? 'border-zinc-800 text-zinc-600 cursor-not-allowed'
                  : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'
              }`}
              title="Redo (Ctrl+Shift+Z)"
            >
              ↷
            </button>
            <div className="h-4 border-l border-zinc-700" />
            <button
              onClick={handleNewProject}
              className="px-2 py-1 border border-zinc-700 rounded text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
              title="New project"
            >
              New
            </button>
            <button
              onClick={handleOpenFile}
              className="px-2 py-1 border border-zinc-700 rounded text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
              title="Open project file"
            >
              Open
            </button>
            <button
              onClick={handleSaveAs}
              className="px-2 py-1 border border-zinc-700 rounded text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
              title="Save project to file"
            >
              Save As
            </button>
            <button
              onClick={() => setPrintFriendly(p => !p)}
              className={`px-2 py-1 border rounded text-xs font-mono ${
                printFriendly
                  ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                  : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'
              }`}
              title="Print-friendly export (white background, darker lines)"
            >
              Print
            </button>
            <select
              value={exportScale}
              onChange={(e) => setExportScale(Number(e.target.value))}
              className="px-1 py-1 border border-zinc-700 rounded text-xs font-mono text-zinc-400 bg-zinc-900 hover:border-zinc-500"
              title="Export resolution"
            >
              {EXPORT_PRESETS.map(p => (
                <option key={p.scale} value={p.scale}>{p.label} — {p.desc}</option>
              ))}
            </select>
            <button
              onClick={handleExportPNG}
              disabled={exportProgress !== null}
              className={`px-2 py-1 border rounded text-xs font-mono ${
                exportProgress !== null
                  ? 'border-cyan-500 text-cyan-400 cursor-wait'
                  : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'
              }`}
              title={
                paperEnabled && pages.length > 1
                  ? `Export ${pages.length} pages as ZIP`
                  : 'Export canvas as PNG image'
              }
            >
              {exportProgress !== null
                ? `Exporting ${exportProgress.current}/${exportProgress.total}...`
                : (paperEnabled && pages.length > 1 ? `Export ZIP (${pages.length}p)` : 'Export PNG')
              }
            </button>
            {showTitleBlock && (
              <button
                onClick={handleExportWithTitleBlock}
                disabled={exportProgress !== null}
                className={`px-2 py-1 border rounded text-xs font-mono ${
                  exportProgress !== null
                    ? 'border-cyan-500 text-cyan-400 cursor-wait'
                    : 'border-emerald-700 text-emerald-400 hover:text-emerald-300 hover:border-emerald-500'
                }`}
                title="Export PNG with title block included"
              >
                Export + TB
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowRecents(prev => !prev)}
                className="px-2 py-1 border border-zinc-700 rounded text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
                title="Recent projects"
              >
                Recents{recentFiles.length > 0 ? ` (${recentFiles.length})` : ''}
              </button>
              {showRecents && (
                <div className="absolute top-full mt-1 right-0 bg-zinc-800 border border-zinc-700 rounded shadow-xl z-50 w-64">
                  {recentFiles.length === 0 ? (
                    <div className="px-3 py-2 text-xs font-mono text-zinc-500">No recent files</div>
                  ) : (
                    recentFiles.map((file, i) => (
                      <button
                        key={i}
                        className="w-full text-left px-3 py-2 text-xs font-mono text-zinc-300 hover:bg-zinc-700 border-b border-zinc-700/50 last:border-0"
                        onClick={() => handleLoadRecent(file)}
                      >
                        <div className="truncate">{file.name}</div>
                        <div className="text-zinc-500 text-[10px]">{new Date(file.timestamp).toLocaleDateString()}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="h-4 border-l border-zinc-700" />
            <button
              onClick={handleExportPresets}
              className="px-2 py-1 border border-cyan-700 rounded text-xs font-mono text-cyan-400 hover:text-cyan-300 hover:border-cyan-500"
              title="Export user presets for Git commit (ready to paste into nodePresets.js)"
            >
              Export Presets →
            </button>
          </div>

          {/* Paper Size & Orientation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaperEnabled(p => !p)}
              className={`px-2 py-1 border rounded text-xs font-mono ${
                paperEnabled
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-zinc-700 text-zinc-500'
              }`}
              title={paperEnabled ? 'Paper: ON — export clips to paper' : 'Paper: OFF — export captures all nodes'}
            >
              Paper
            </button>
            <select
              value={paperSize}
              onChange={(e) => handlePaperSizeChange(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-300"
            >
              {Object.entries(PAPER_SIZES).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            {paperSize === 'Custom' && (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={customWidth}
                  onChange={(e) => handleCustomSizeChange(+e.target.value || 100, customHeight)}
                  className="w-16 bg-zinc-800 border border-zinc-700 rounded px-1 py-1 text-xs font-mono text-zinc-300"
                  min="100"
                  title="Custom width (px)"
                />
                <span className="text-zinc-500 text-xs">×</span>
                <input
                  type="number"
                  value={customHeight}
                  onChange={(e) => handleCustomSizeChange(customWidth, +e.target.value || 100)}
                  className="w-16 bg-zinc-800 border border-zinc-700 rounded px-1 py-1 text-xs font-mono text-zinc-300"
                  min="100"
                  title="Custom height (px)"
                />
              </div>
            )}
            <button
              onClick={toggleOrientation}
              className={`px-2 py-1 border rounded text-xs font-mono ${
                orientation === 'portrait'
                  ? 'border-zinc-700 text-zinc-400'
                  : 'border-cyan-500 text-cyan-400'
              }`}
            >
              {orientation === 'portrait' ? '↕ Portrait' : '↔ Landscape'}
            </button>
            <button
              onClick={toggleSnapToGrid}
              className={`px-2 py-1 border rounded text-xs font-mono ${
                snapToGrid
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-zinc-700 text-zinc-500'
              }`}
              title={snapToGrid ? `Snap to grid: ON (${gridSize}px)` : 'Snap to grid: OFF'}
            >
              Snap{snapToGrid ? ` ${gridSize}` : ''}
            </button>
            <button
              onClick={toggleGrid}
              className={`px-2 py-1 border rounded text-xs font-mono ${
                showGrid
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-zinc-700 text-zinc-500'
              }`}
              title={showGrid ? 'Grid: ON' : 'Grid: OFF'}
            >
              Grid
            </button>
            <button
              onClick={toggleRatioOverlay}
              className={`px-2 py-1 border rounded text-xs font-mono ${
                showRatioOverlay
                  ? 'border-cyan-500 text-cyan-400'
                  : 'border-zinc-700 text-zinc-500'
              }`}
              title={showRatioOverlay ? 'Paper ratio overlay: ON' : 'Paper ratio overlay: OFF'}
            >
              Ratio
            </button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-500">Zoom:</span>
            <select
              value={zoom}
              onChange={(e) => {
                const newZoom = parseFloat(e.target.value);
                const container = containerRef.current;
                if (container) {
                  const rect = container.getBoundingClientRect();
                  const cx = rect.width / 2;
                  const cy = rect.height / 2;
                  const prev = zoomRef.current;
                  const prevPan = panRef.current;
                  setPan({
                    x: cx - ((cx - prevPan.x) / prev) * newZoom,
                    y: cy - ((cy - prevPan.y) / prev) * newZoom,
                  });
                }
                setZoom(newZoom);
              }}
              className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-zinc-300"
            >
              {!ZOOM_LEVELS.includes(zoom) && (
                <option value={zoom}>{Math.round(zoom * 100)}%</option>
              )}
              {ZOOM_LEVELS.map(z => (
                <option key={z} value={z}>{Math.round(z * 100)}%</option>
              ))}
            </select>
          </div>

          {/* Add Node */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => addNode('supernode')}
              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded text-xs font-mono text-white"
              title="Add SuperNode with drag-based column layout"
            >
              + SuperNode
            </button>
            <button
              onClick={() => addNode({
                type: 'supernode',
                preset: {
                  title: 'ALIGNED SYSTEM',
                  signalColor: 'zinc',
                  system: {
                    manufacturer: null,
                    model: null,
                  },
                  inputSection: {
                    ports: [
                      { source: 'LAPTOP 1', connector: 'HDMI', resolution: '3840x2160', refreshRate: '60' },
                      { source: 'MACBOOKPRO 1', connector: 'HDMI', resolution: '3840x2160', refreshRate: '60' },
                      { source: '', connector: 'HDMI', resolution: '', refreshRate: '' },
                    ]
                  },
                  outputSection: {
                    ports: [
                      { destination: 'BROMPTOM SX40', connector: 'HDMI', resolution: '3840x2160', refreshRate: '60' },
                      { destination: 'PROJECTOR 1', connector: 'HDMI', resolution: '3840x2160', refreshRate: '60' },
                      { destination: '', connector: 'HDMI', resolution: '', refreshRate: '' },
                    ]
                  }
                }
              })}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 rounded text-xs font-mono text-white"
              title="Add Aligned System node for testing"
            >
              + Aligned
            </button>
            <button
              onClick={() => addNode('node313')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-mono text-white"
              title="Add Node 313 with generic table sections"
            >
              + Node 313
            </button>
          </div>

          {/* Version & Changelog */}
          <div className="relative flex items-center gap-2">
            <button
              onClick={() => setShowChangelog(prev => !prev)}
              className={`px-2 py-1 border rounded text-xs font-mono ${
                showChangelog
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10'
                  : 'border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500'
              }`}
              title="View changelog"
            >
              v{APP_VERSION}
            </button>
            <ChangelogPopup
              isOpen={showChangelog}
              onClose={() => setShowChangelog(false)}
            />
          </div>
        </div>

        {/* Active Wire Indicator */}
        {activeWire && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 flex items-center gap-2 py-2 px-3 bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded shadow-lg z-50">
            <span className="text-xs font-mono text-cyan-400 animate-pulse">
              Wire active — Click canvas to add waypoints, or click anchor to connect
              {activeWire.waypoints?.length > 0 && (
                <span className="text-zinc-500 ml-2">
                  ({activeWire.waypoints.length} point{activeWire.waypoints.length !== 1 ? 's' : ''})
                </span>
              )}
            </span>
            <button
              onClick={() => { setActiveWire(null); setWireMousePos(null); }}
              className="text-xs font-mono text-zinc-500 hover:text-zinc-300 underline"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Wire Selection Toolbar */}
        {selectedWires.size > 0 && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 flex items-center gap-3 py-2 px-3 bg-cyan-500/10 backdrop-blur-sm border border-cyan-500/30 rounded shadow-lg z-50">
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

      {/* Main Content Area with Side Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Side Panel */}
        <SidePanel
          isOpen={sidePanelOpen}
          onClose={() => setSidePanelOpen(false)}
          onAddNode={addNode}
          userPresets={userPresets}
          nodes={nodes}
          onSavePreset={savePreset}
          onDeletePreset={deletePreset}
          onUpdatePreset={updatePreset}
          userSubcategories={userSubcategories}
          subcategoryOrder={subcategoryOrder}
          onAddSubcategory={addSubcategory}
          onDeleteSubcategory={deleteSubcategory}
          onMoveSubcategory={moveSubcategory}
          onReorderPresets={reorderPresets}
          onReorderSubcategories={reorderSubcategories}
        />

        {/* Canvas Area */}
        <main
          ref={containerRef}
          className="flex-1 overflow-hidden bg-zinc-950 relative"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            isPanningRef.current = false;
            if (containerRef.current) containerRef.current.style.cursor = '';
            if (isSelecting) {
              setIsSelecting(false);
              setSelectionBox(null);
            }
          }}
        >
        {/* Pan + Zoom container */}
        <div
          ref={transformRef}
          className="relative"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0'
          }}
        >
          {/* Canvas event overlay - covers all pages including negative space for selection */}
          {/* Positioned before canvasRef so it renders below nodes (DOM order stacking) */}
          <div
            data-canvas="true"
            className="absolute"
            style={{
              left: effectiveCanvasBounds.x,
              top: effectiveCanvasBounds.y,
              width: effectiveCanvasBounds.width,
              height: effectiveCanvasBounds.height,
            }}
            onClick={handleCanvasClick}
          />
          <div
            ref={canvasRef}
            data-canvas="true"
            className="relative"
            style={{
              width: canvasDimensions.width,
              height: canvasDimensions.height,
              overflow: 'visible',
              backgroundColor: showTitleBlock ? (canvasBackground === 'white' ? '#ffffff' : '#09090b') : '#09090b',
              backgroundImage: (paperEnabled && showGrid) ? `
                linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px),
                linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
              ` : 'none',
              backgroundSize: (paperEnabled && showGrid) ? '100px 100px, 100px 100px, 10px 10px, 10px 10px' : undefined
            }}
            onClick={handleCanvasClick}
          >
          {/* Page grid overlay with per-page boundaries and margin guides */}
          {paperEnabled && showGrid && (
            <div data-export-ignore="true">
              <PageGridOverlay pages={pages} zoom={zoom} showRatioOverlay={showRatioOverlay} />
            </div>
          )}

          {/* Title block overlay */}
          {paperEnabled && showTitleBlock && (
            <div data-export-ignore="true" data-title-block-wrapper="true">
              <TitleBlockOverlay
                pages={pages}
                zoom={zoom}
                visible={showTitleBlock}
                showGrid={showTitleBlockGrid}
                titleBlockData={titleBlockData}
                onTitleBlockDataChange={handleTitleBlockDataChange}
                darkMode={canvasBackground !== 'white'}
              />
            </div>
          )}

          {/* SVG Layer for Wires - above selected nodes (z-100) but below menus (z-10000) */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-[500]"
            style={{ overflow: 'visible' }}
          >
            {/* SVG Anchor Points - memoized for performance */}
            {Object.entries(computedAnchorPositions).map(([anchorId, pos]) => (
              <AnchorPoint
                key={`anchor-${anchorId}`}
                anchorId={anchorId}
                pos={pos}
                isActive={activeWire?.from === anchorId || activeWire?.to === anchorId}
                isConnected={connectedAnchorIds.has(anchorId)}
                themeColor={anchorThemeColors.get(anchorId) || DEFAULT_THEME_COLOR}
                onAnchorClick={handleAnchorClick}
              />
            ))}

            {connections.map(conn => {
              const wireColor = connectionColorMap.get(conn.id) || '#22d3ee';
              const wirePath = wirePathMap.get(conn.id) || '';
              const fromPos = computedAnchorPositions[conn.from];
              const toPos = computedAnchorPositions[conn.to];
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

                  {/* Wire label - text follows the wire path, centered */}
                  {(() => {
                    let displayText = conn.label;
                    if (!displayText && (conn.cableType || conn.cableLength)) {
                      const parts = [];
                      if (conn.cableType) parts.push(conn.cableType);
                      if (conn.cableLength) parts.push(conn.cableLength);
                      displayText = parts.join(' • ');
                    }

                    if (!displayText || !wirePath) return null;

                    const fontSize = 4; // Fixed size for all wire labels
                    const pathId = `wire-text-${conn.id}`;
                    // Use reversed path when wire goes right-to-left so text is never upside down
                    const textPath = wireTextPathMap.get(conn.id) || wirePath;

                    return (
                      <g style={{ pointerEvents: 'none' }}>
                        <defs>
                          <path id={pathId} d={textPath} />
                        </defs>
                        {/* Text outline for readability */}
                        <text className="font-mono" dy={-3} style={{ fontSize }}>
                          <textPath
                            href={`#${pathId}`}
                            startOffset="50%"
                            textAnchor="middle"
                            style={{
                              fill: 'none',
                              stroke: '#18181b',
                              strokeWidth: 1.5,
                              strokeLinejoin: 'round'
                            }}
                          >
                            {displayText}
                          </textPath>
                        </text>
                        {/* Text fill */}
                        <text className="font-mono" dy={-3} style={{ fontSize }}>
                          <textPath
                            href={`#${pathId}`}
                            startOffset="50%"
                            textAnchor="middle"
                            style={{ fill: wireColor }}
                          >
                            {displayText}
                          </textPath>
                        </text>
                      </g>
                    );
                  })()}

                  {/* Invisible click hit area (wider than visible wire) */}
                  <path
                    d={wirePath}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={12}
                    strokeLinecap="round"
                    className="pointer-events-auto cursor-pointer"
                    onClick={(e) => handleWireClick(conn.id, e)}
                    onDoubleClick={(e) => handleWireDoubleClick(conn.id, e)}
                  />

                  {/* Delete button for wire */}
                  {fromPos && toPos && (
                    <g
                      data-export-ignore="true"
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

            {/* Wire preview during creation */}
            {activeWire && wireMousePos && (() => {
              const fromPos = computedAnchorPositions[activeWire.from];
              if (!fromPos) return null;

              const waypoints = activeWire.waypoints || [];
              const cornerRadius = 8;
              const anchorOffset = 30;

              // Build all points with anchor offset
              const allPoints = [];
              allPoints.push({ x: fromPos.x, y: fromPos.y });
              const fromOffsetX = fromPos.side === 'left' ? fromPos.x - anchorOffset : fromPos.x + anchorOffset;
              allPoints.push({ x: fromOffsetX, y: fromPos.y });
              waypoints.forEach(wp => allPoints.push({ x: wp.x, y: wp.y }));
              allPoints.push({ x: wireMousePos.x, y: wireMousePos.y });

              // Generate preview path with straight lines and rounded corners
              let previewPath = `M ${allPoints[0].x} ${allPoints[0].y}`;
              for (let i = 1; i < allPoints.length; i++) {
                const prev = allPoints[i - 1];
                const curr = allPoints[i];
                const next = allPoints[i + 1];

                if (!next || i === allPoints.length - 1) {
                  previewPath += ` L ${curr.x} ${curr.y}`;
                } else {
                  const dx1 = curr.x - prev.x;
                  const dy1 = curr.y - prev.y;
                  const dx2 = next.x - curr.x;
                  const dy2 = next.y - curr.y;
                  const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
                  const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                  const maxRadius = Math.min(len1 / 2, len2 / 2, cornerRadius);

                  if (maxRadius < 2 || len1 < 4 || len2 < 4) {
                    previewPath += ` L ${curr.x} ${curr.y}`;
                  } else {
                    const startX = curr.x - (dx1 / len1) * maxRadius;
                    const startY = curr.y - (dy1 / len1) * maxRadius;
                    const endX = curr.x + (dx2 / len2) * maxRadius;
                    const endY = curr.y + (dy2 / len2) * maxRadius;
                    previewPath += ` L ${startX} ${startY}`;
                    previewPath += ` Q ${curr.x} ${curr.y}, ${endX} ${endY}`;
                  }
                }
              }

              return (
                <g data-export-ignore="true">
                  {/* Preview wire path */}
                  <path
                    d={previewPath}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    strokeOpacity={0.6}
                    strokeDasharray="8 4"
                    strokeLinecap="round"
                  />
                  {/* Waypoint markers */}
                  {waypoints.map((wp, i) => (
                    <g key={wp.id}>
                      <circle
                        cx={wp.x}
                        cy={wp.y}
                        r={6}
                        fill="#22d3ee"
                        stroke="#fff"
                        strokeWidth={2}
                      />
                      <text
                        x={wp.x}
                        y={wp.y + 1}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#18181b"
                        style={{ fontSize: 8, fontWeight: 'bold' }}
                      >
                        {i + 1}
                      </text>
                    </g>
                  ))}
                </g>
              );
            })()}

            {/* Waypoint handles for selected wires */}
            {connections.filter(c => selectedWires.has(c.id) && c.waypoints?.length > 0).map(conn => (
              <g key={`waypoints-${conn.id}`} data-export-ignore="true">
                {conn.waypoints.map((wp, i) => (
                  <g key={wp.id}>
                    <circle
                      cx={wp.x}
                      cy={wp.y}
                      r={8}
                      fill="#3b82f6"
                      stroke="#fff"
                      strokeWidth={2}
                      className="pointer-events-auto cursor-move"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        // Start dragging waypoint
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const startWpX = wp.x;
                        const startWpY = wp.y;

                        const handleDrag = (moveEvent) => {
                          const dx = (moveEvent.clientX - startX) / zoomRef.current;
                          const dy = (moveEvent.clientY - startY) / zoomRef.current;
                          let newX = startWpX + dx;
                          let newY = startWpY + dy;

                          // Apply snap to grid (Ctrl/Cmd bypasses for pixel-precise movement)
                          if (snapToGrid && gridSize > 0 && !moveEvent.ctrlKey && !moveEvent.metaKey) {
                            newX = Math.round(newX / gridSize) * gridSize;
                            newY = Math.round(newY / gridSize) * gridSize;
                          }

                          setConnections(prev => prev.map(c => {
                            if (c.id !== conn.id) return c;
                            return {
                              ...c,
                              waypoints: c.waypoints.map(w =>
                                w.id === wp.id ? { ...w, x: newX, y: newY } : w
                              )
                            };
                          }));
                        };

                        const handleDragEnd = () => {
                          window.removeEventListener('mousemove', handleDrag);
                          window.removeEventListener('mouseup', handleDragEnd);
                        };

                        window.addEventListener('mousemove', handleDrag);
                        window.addEventListener('mouseup', handleDragEnd);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Delete waypoint on right-click
                        setConnections(prev => prev.map(c => {
                          if (c.id !== conn.id) return c;
                          return {
                            ...c,
                            waypoints: c.waypoints.filter(w => w.id !== wp.id)
                          };
                        }));
                      }}
                    />
                    <text
                      x={wp.x}
                      y={wp.y + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#fff"
                      className="pointer-events-none"
                      style={{ fontSize: 9, fontWeight: 'bold' }}
                    >
                      {i + 1}
                    </text>
                  </g>
                ))}
              </g>
            ))}
          </svg>

          {/* Nodes */}
          {Object.values(nodes).map(node => {
            const NodeComponent = node.version === 3 ? Node313 : node.version === 2 ? SuperNode : Node;
            const isSelected = selectedNodes.has(node.id);
            return (
              <NodeComponent
                key={node.id}
                node={node}
                zoom={zoom}
                isSelected={isSelected}
                snapToGrid={snapToGrid}
                gridSize={gridSize}
                onUpdate={(updates) => updateNode(node.id, updates)}
                onDelete={() => deleteNode(node.id)}
                onAnchorClick={handleAnchorClick}
                registerAnchor={registerAnchor}
                unregisterAnchors={unregisterAnchors}
                activeWire={activeWire}
                connectedAnchorIds={connectedAnchorIds}
                usedSignalColors={usedSignalColors}
                connections={connections}
                connectionColorMap={connectionColorMap}
                globalSourceNamesWithColors={globalSourceNamesWithColors}
                onSavePreset={(categoryId, subcategoryId) => savePreset(node.id, categoryId, subcategoryId)}
                userSubcategories={userSubcategories}
                selectedNodes={selectedNodes}
                onMoveSelectedNodes={moveSelectedNodes}
                onSelect={(nodeId, addToSelection) => {
                  if (addToSelection) {
                    setSelectedNodes(prev => {
                      const next = new Set(prev);
                      if (next.has(nodeId)) next.delete(nodeId);
                      else next.add(nodeId);
                      return next;
                    });
                  } else {
                    setSelectedNodes(new Set([nodeId]));
                  }
                }}
              />
            );
          })}

          {/* Selection Box Overlay - rendered above nodes */}
          {isSelecting && selectionBox && selectionBox.active && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ overflow: 'visible', zIndex: 9999 }}
            >
              <rect
                x={Math.min(selectionBox.startX, selectionBox.endX)}
                y={Math.min(selectionBox.startY, selectionBox.endY)}
                width={Math.abs(selectionBox.endX - selectionBox.startX)}
                height={Math.abs(selectionBox.endY - selectionBox.startY)}
                fill="rgba(34, 211, 238, 0.1)"
                stroke="#22d3ee"
                strokeWidth={1}
                strokeDasharray="4 2"
              />
            </svg>
          )}
        </div>
        </div>
        <CanvasControls
          zoom={zoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFitView={() => fitView(0.1)}
          onReset={resetView}
          snapToGrid={snapToGrid}
          onToggleSnap={toggleSnapToGrid}
          showTitleBlock={showTitleBlock}
          onToggleTitleBlock={toggleTitleBlock}
          showTitleBlockGrid={showTitleBlockGrid}
          onToggleTitleBlockGrid={toggleTitleBlockGrid}
          onFitToDrawingArea={fitNodesToDrawingArea}
          canvasBackground={canvasBackground}
          onToggleBackground={toggleCanvasBackground}
        />
        <input ref={fileInputRef} type="file" accept=".vsf,.json,.sfw" onChange={handleFileChange} style={{ display: 'none' }} />
      </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-900/95 px-4 py-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-zinc-600">
            Signal Flow Workspace v{APP_VERSION}
          </span>
          <div className="flex items-center gap-4">
            <span className="text-zinc-500">
              Canvas: {canvasDimensions.width} × {canvasDimensions.height}px
            </span>
            <span className="text-zinc-500">
              Paper: {paperEnabled ? `${PAPER_SIZES[paperSize].label} (${pages.length} page${pages.length !== 1 ? 's' : ''})` : 'Off'}
            </span>
            <span className="text-zinc-500">
              Zoom: {Math.round(zoom * 100)}%
            </span>
          </div>
        </div>
      </footer>

      {/* Cable Prompt Dialog */}
      {cablePromptData && (
        <CablePrompt
          key={cablePromptData.connectionId || 'new'}
          onSubmit={handleCablePromptSubmit}
          onCancel={handleCablePromptCancel}
          initialData={cablePromptData.initialData || null}
        />
      )}
    </div>
  );
}
