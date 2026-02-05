import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Node from './components/Node';
import SuperNode from './components/SuperNode';
import SidePanel from './components/SidePanel';
import CanvasControls from './components/canvas/CanvasControls';
import PageGridOverlay from './components/canvas/PageGridOverlay';
import CablePrompt from './components/CablePrompt';
import { saveProject as dbSave, exportProject, importProject, loadProject as dbLoad, renderExportBlob, renderLayoutBlob, cropPageBlobs, downloadBlob, downloadZip } from './services/storage';
import { getRecentFiles, addToRecentFiles } from './services/recentFiles';
import { useCanvasSettings, PAPER_SIZES } from './hooks/useCanvasSettings';
import { usePageGrid } from './hooks/usePageGrid';
import { getSubcategories } from './config/nodePresets';
import { findOpenPosition, getViewportCenter } from './utils/nodePosition';
import ChangelogPopup from './components/ChangelogPopup';
import { APP_VERSION } from './config/version';

const ZOOM_LEVELS = [0.05, 0.1, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0, 6.0, 8.0];

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

// Create a Laptop node (source with capture card)
const createLaptopNode = (id) => ({
  id,
  title: 'LAPTOP',
  signalColor: 'emerald',
  position: { x: 100, y: 100 },
  scale: 0.5, // Default 50% scale
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

  // User-created presets (saved by dragging nodes to library)
  const [userPresets, setUserPresets] = useState({});

  // User-created subcategories (custom folders in sidebar)
  const [userSubcategories, setUserSubcategories] = useState({});

  // Create two initial nodes for comparison on first load
  useEffect(() => {
    if (Object.keys(nodes).length === 0) {
      const alignedNode = createSuperNode('aligned-demo');
      alignedNode.title = 'ALIGNED SYSTEM';
      alignedNode.position = { x: 100, y: 100 };
      alignedNode.system.systemSectionStyle = 'aligned';

      const simplifiedNode = createSuperNode('simplified-demo');
      simplifiedNode.title = 'SIMPLIFIED SYSTEM';
      simplifiedNode.position = { x: 100, y: 500 };
      simplifiedNode.system.systemSectionStyle = 'simplified';

      setNodes({
        [alignedNode.id]: alignedNode,
        [simplifiedNode.id]: simplifiedNode
      });
    }
  }, []); // Empty deps - only run once on mount

  // Subcategory order tracking (categoryId -> array of subcategory IDs)
  const [subcategoryOrder, setSubcategoryOrder] = useState({});

  // Wire drawing state
  const [activeWire, setActiveWire] = useState(null);
  const [anchorLocalOffsets, setAnchorLocalOffsets] = useState({});

  // Wire selection state
  const [selectedWires, setSelectedWires] = useState(new Set());

  // Cable prompt state
  const [cablePromptData, setCablePromptData] = useState(null);

  // Project identity
  const [projectName, setProjectName] = useState('Untitled Project');
  const [projectId, setProjectId] = useState(() => crypto.randomUUID());

  // Recent files
  const [recentFiles, setRecentFiles] = useState(() => getRecentFiles());
  const [showRecents, setShowRecents] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [exportProgress, setExportProgress] = useState(null);

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
              connector: p.connector || 'HDMI',
              resolution: p.resolution || '1920x1080',
              refreshRate: p.refreshRate || '60'
            }));
          }
          if (preset.outputSection?.ports) {
            newNode.outputSection.ports = preset.outputSection.ports.map((p, i) => ({
              id: `out-${i + 1}`,
              number: i + 1,
              connector: p.connector || 'HDMI',
              resolution: p.resolution || '1920x1080',
              refreshRate: p.refreshRate || '60'
            }));
          }
        }
      } else {
        newNode = createNode(nodeId);
      }
    }
    // Handle string type (legacy)
    else if (typeOrConfig === 'laptop') {
      newNode = createLaptopNode(nodeId);
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
    console.log('moveSubcategory called:', { categoryId, subcategoryId, newParentId });
    setUserSubcategories(prev => {
      const updated = { ...prev };

      // Ensure category exists
      if (!updated[categoryId]) {
        updated[categoryId] = {};
      }

      if (updated[categoryId][subcategoryId]) {
        // Subcategory already in userSubcategories, just update parentId
        console.log('Moving existing user subcategory:', subcategoryId, 'to parent:', newParentId);
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
          console.log('Adding built-in subcategory to userSubcategories:', subcategoryId, 'with parent:', newParentId);
          updated[categoryId] = {
            ...updated[categoryId],
            [subcategoryId]: {
              label: baseSub.label,
              description: baseSub.description,
              parentId: newParentId
            }
          };
        } else {
          console.log('Subcategory not found:', subcategoryId);
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

  // Get source node for an anchor (finds the originating source of a signal)
  const getSourceNode = useCallback((anchorId, visited = new Set()) => {
    if (visited.has(anchorId)) return null;
    visited.add(anchorId);

    const nodeId = anchorId.split('-')[0] + '-' + anchorId.split('-')[1];
    const node = nodes[nodeId];

    if (!node) return null;

    // If this node has a signal color, it's the source
    if (node.signalColor) return node;

    // Otherwise, trace back through input connections
    const inputConn = connections.find(c => c.to === anchorId);
    if (inputConn) {
      return getSourceNode(inputConn.from, visited);
    }

    return null;
  }, [nodes, connections]);

  // Get signal color for a connection
  const getConnectionColor = useCallback((conn) => {
    const sourceAnchorId = conn.from;
    const nodeId = sourceAnchorId.split('-').slice(0, 2).join('-');
    const node = nodes[nodeId];

    if (node?.signalColor) {
      return SIGNAL_COLORS.find(c => c.id === node.signalColor)?.hex || '#22d3ee';
    }

    // Try to trace back to source
    const sourceNode = getSourceNode(conn.from);
    if (sourceNode?.signalColor) {
      return SIGNAL_COLORS.find(c => c.id === sourceNode.signalColor)?.hex || '#22d3ee';
    }

    return '#22d3ee'; // Default cyan
  }, [nodes, getSourceNode]);

  // Pre-compute connected anchor IDs for O(1) lookup instead of O(connections) per anchor
  const connectedAnchorIds = useMemo(() => {
    const set = new Set();
    connections.forEach(c => { set.add(c.from); set.add(c.to); });
    return set;
  }, [connections]);

  // Pre-compute wire colors to avoid recursive graph traversal per wire per render
  const connectionColorMap = useMemo(() => {
    const map = new Map();
    connections.forEach(conn => map.set(conn.id, getConnectionColor(conn)));
    return map;
  }, [connections, getConnectionColor]);

  // Connection management
  const handleAnchorClick = (anchorId, direction) => {
    console.log('handleAnchorClick called:', anchorId, direction);
    if (!activeWire) {
      setActiveWire({ from: anchorId, direction });
    } else {
      if (activeWire.from !== anchorId && activeWire.direction !== direction) {
        const fromAnchor = activeWire.direction === 'out' ? activeWire.from : anchorId;
        const toAnchor = activeWire.direction === 'out' ? anchorId : activeWire.from;

        // Check if connection already exists
        const exists = connections.some(
          c => c.from === fromAnchor && c.to === toAnchor
        );

        if (!exists) {
          // Show cable prompt instead of creating connection immediately
          setCablePromptData({
            mode: 'create',
            from: fromAnchor,
            to: toAnchor
          });
        } else {
          setActiveWire(null);
        }
      } else {
        setActiveWire(null);
      }
    }
  };

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
            rpCode: cableData.rpCode || '',
            description: cableData.description || ''
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
        label: '',           // Optional wire label
        enhanced: false,     // Enhanced styling (outline, dash, animation)
        dashPattern: null,   // Dash pattern when enhanced
        cableType: cableData.cableType || '',
        cableLength: cableData.cableLength || '',
        rpCode: cableData.rpCode || '',
        description: cableData.description || ''
      };

      setConnections(prev => [...prev, newConnection]);
      setActiveWire(null);
    }

    setCablePromptData(null);
  };

  const handleCablePromptCancel = () => {
    setCablePromptData(null);
    setActiveWire(null);
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
        description: connection.description
      }
    });
  };

  // Deselect all wires (when clicking canvas) and close dropdowns
  const handleCanvasClick = (event) => {
    // Only deselect if clicking directly on the canvas (not a node or wire)
    if (event.target.getAttribute('data-canvas') === 'true') {
      setSelectedWires(new Set());
      setActiveWire(null);
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
    const newZoom = Math.max(0.05, Math.min(8, prevZoom * zoomFactor));

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

  // Mouse move - pan or selection box
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
      const w = 200 * (node.scale || 1);
      const h = 150 * (node.scale || 1);
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
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.05), 8);

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

  // Zoom in/out from center of viewport
  const zoomIn = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const prev = zoomRef.current;
    const prevPan = panRef.current;
    const newZoom = Math.min(prev * 1.2, 8);
    setZoom(newZoom);
    setPan({
      x: cx - ((cx - prevPan.x) / prev) * newZoom,
      y: cy - ((cy - prevPan.y) / prev) * newZoom,
    });
  }, []);

  const zoomOut = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const prev = zoomRef.current;
    const prevPan = panRef.current;
    const newZoom = Math.max(prev * 0.8, 0.05);
    setZoom(newZoom);
    setPan({
      x: cx - ((cx - prevPan.x) / prev) * newZoom,
      y: cy - ((cy - prevPan.y) / prev) * newZoom,
    });
  }, []);

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
      // Escape — always deselect all (works even when focus is in an input)
      if (e.key === 'Escape') {
        if (document.activeElement && document.activeElement !== document.body) {
          document.activeElement.blur();
        }
        setSelectedNodes(new Set());
        setSelectedWires(new Set());
        return;
      }

      // Ignore other shortcuts when typing in inputs/textareas/selects
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return;

      const mod = e.metaKey || e.ctrlKey;

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

      // Cmd/Ctrl+C — copy selected nodes
      if (mod && e.key === 'c') {
        if (selectedNodes.size > 0) {
          clipboardRef.current = Array.from(selectedNodes).map(id => nodes[id]).filter(Boolean);
        }
        return;
      }

      // Cmd/Ctrl+V — paste copied nodes
      if (mod && e.key === 'v') {
        if (clipboardRef.current.length > 0) {
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
              const newNode = {
                ...structuredClone(node),
                id: newId,
                position,
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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodes, selectedWires, nodes, deleteNode]);

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
          type: offset.type
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
          existing.type === offset.type) {
        return prev;
      }
      return { ...prev, [anchorId]: offset };
    });
  }, []);

  // Get anchor position from pre-computed positions
  const getAnchorPosition = useCallback((anchorId) => {
    return computedAnchorPositions[anchorId] || null;
  }, [computedAnchorPositions]);

  // Generate wire path (in paper-space coordinates - zoom applied at container level)
  const getWirePath = useCallback((fromId, toId) => {
    const from = getAnchorPosition(fromId);
    const to = getAnchorPosition(toId);
    if (!from || !to) return '';

    const midX = (from.x + to.x) / 2;
    return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
  }, [getAnchorPosition]);

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
  const fallbackDownload = (content, fileName) => {
    const blob = new Blob([content], { type: 'application/json' });
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
    const blob = new Blob([output], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'user-presets-export.js';
    a.click();
    URL.revokeObjectURL(url);

    alert(`Exported ${Object.keys(userPresets).length} preset categories!\n\nCheck your downloads for: user-presets-export.js\n\nCopy the code and paste into nodePresets.js, then commit to Git.`);
  }, [userPresets]);

  // Background pre-render PNG export blob when browser is idle (single page only)
  useEffect(() => {
    if (!canvasRef.current) return;
    cachedExportBlob.current = null;

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
      });
    }, 1000);
    return () => {
      clearTimeout(timer);
      if (idleHandle) cancelIdleCallback(idleHandle);
    };
  }, [nodes, connections, paperSize, orientation, paperEnabled, pages.length]);

  // Export canvas to PNG (single page) or ZIP (multi-page)
  const handleExportPNG = useCallback(async () => {
    const name = projectName || 'untitled';
    const stamp = new Date().toISOString().slice(0, 10);

    // Multi-page ZIP export (render once, crop per page)
    if (paperEnabled && pages.length > 1 && canvasRef.current) {
      const total = pages.length + 1; // +1 for layout render step
      setExportProgress({ current: 0, total });
      try {
        const canvas = canvasRef.current;

        // Render full layout ONCE (single expensive domToBlob)
        setExportProgress({ current: 1, total });
        await new Promise(r => setTimeout(r, 0));
        const layoutBlob = await renderLayoutBlob(canvas, pageBounds);

        // Crop each page from the layout image (cheap canvas ops)
        setExportProgress({ current: 2, total });
        await new Promise(r => setTimeout(r, 0));
        const cropped = await cropPageBlobs(layoutBlob, pages, pageBounds);
        const namedBlobs = cropped.map(({ page, blob }) => ({
          name: `${name}-${page.label.replace(/\s+/g, '-')}.png`, blob,
        }));

        // Add layout image
        namedBlobs.push({ name: `${name}-Layout.png`, blob: layoutBlob });

        await downloadZip(namedBlobs, `${name}-${stamp}.zip`);
      } catch (err) {
        console.error('Multi-page export failed:', err);
      } finally {
        setExportProgress(null);
      }
      return;
    }

    // Paper-off export — reuse same approach as Layout PNG
    if (!paperEnabled && canvasRef.current && pageBounds) {
      setExportProgress({ current: 1, total: 1 });
      try {
        await new Promise(r => setTimeout(r, 0));
        const blob = await renderLayoutBlob(canvasRef.current, pageBounds);
        if (blob) downloadBlob(blob, name);
      } catch (err) {
        console.error('Export failed:', err);
      } finally {
        setExportProgress(null);
      }
      return;
    }

    // Single page paper-on export (use cached blob)
    if (cachedExportBlob.current) {
      downloadBlob(cachedExportBlob.current, name);
    }
  }, [projectName, paperEnabled, pages, pageBounds, canvasDimensions]);

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
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0'
          }}
        >
          <div
            ref={canvasRef}
            data-canvas="true"
            className="relative bg-zinc-950"
            style={{
              width: canvasDimensions.width,
              height: canvasDimensions.height,
              overflow: 'visible',
              backgroundImage: paperEnabled ? `
                linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
              ` : 'none',
              backgroundSize: paperEnabled ? '8px 8px' : undefined
            }}
            onClick={handleCanvasClick}
          >
          {/* Page grid overlay with per-page boundaries and margin guides */}
          {paperEnabled && (
            <PageGridOverlay pages={pages} zoom={zoom} showRatioOverlay={showRatioOverlay} />
          )}

          {/* SVG Layer for Wires */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-[110]"
            style={{ overflow: 'visible' }}
          >
            {/* SVG Anchor Points - rendered for all registered anchors */}
            {Object.entries(computedAnchorPositions).map(([anchorId, pos]) => {
              const isInput = pos.type === 'in';
              const isActive = activeWire?.from === anchorId || activeWire?.to === anchorId;
              const isConnected = connectedAnchorIds.has(anchorId);

              // Extract node ID from anchor ID (format: nodeId-portId)
              const nodeId = anchorId.split('-').slice(0, -1).join('-');
              const node = nodes[nodeId];
              const nodeColor = node?.signalColor;

              // Get node's theme color (use header color)
              const getNodeThemeColor = (signalColorId) => {
                if (!signalColorId) return '#71717a'; // zinc-500 default
                const colorMap = {
                  emerald: '#10b981', cyan: '#06b6d4', blue: '#3b82f6',
                  violet: '#8b5cf6', pink: '#ec4899', red: '#ef4444',
                  orange: '#f97316', yellow: '#eab308'
                };
                return colorMap[signalColorId] || '#71717a';
              };

              const themeColor = getNodeThemeColor(nodeColor);
              const themeLightColor = themeColor + 'cc'; // Add alpha for lighter version

              // Show dim/off when not connected, lit with theme color when connected
              const anchorColor = isConnected ? themeColor : '#52525b'; // zinc-600 when off
              const anchorStroke = isConnected ? themeLightColor : '#71717a'; // zinc-500 when off
              const anchorOpacity = isConnected ? 1 : 0.4;

              return (
                <g key={`anchor-${anchorId}`} data-export-ignore="true">
                  {/* Glow effect for connected/active anchors */}
                  {(isConnected || isActive) && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={5}
                      fill={isActive ? '#22d3ee' : anchorColor}
                      opacity={isActive ? 0.3 : 0.3}
                    />
                  )}
                  {/* Main anchor dot */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isActive ? 3 : 2.5}
                    fill={isActive ? '#22d3ee' : anchorColor}
                    stroke={isActive ? '#67e8f9' : anchorStroke}
                    strokeWidth={1}
                    opacity={anchorOpacity}
                    style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnchorClick(anchorId, pos.type);
                    }}
                  />
                </g>
              );
            })}

            {connections.map(conn => {
              const wireColor = connectionColorMap.get(conn.id) || '#22d3ee';
              const wirePath = getWirePath(conn.from, conn.to);
              const fromPos = getAnchorPosition(conn.from);
              const toPos = getAnchorPosition(conn.to);
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

                  {/* Wire label or cable info */}
                  {(() => {
                    // Use custom label if set, otherwise show cable info if available
                    let displayText = conn.label;
                    if (!displayText && (conn.cableType || conn.cableLength)) {
                      const parts = [];
                      if (conn.cableType) parts.push(conn.cableType);
                      if (conn.cableLength) parts.push(conn.cableLength);
                      displayText = parts.join(' • ');
                    }

                    return displayText && fromPos && toPos ? (
                      <text
                        x={(fromPos.x + toPos.x) / 2}
                        y={(fromPos.y + toPos.y) / 2 - 12}
                        textAnchor="middle"
                        className="fill-zinc-400 font-mono pointer-events-none"
                        style={{ fontSize: 9 }}
                      >
                        {displayText}
                      </text>
                    ) : null;
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
          </svg>

          {/* Nodes - conditionally render SuperNode for version 2 nodes */}
          {Object.values(nodes).map(node => {
            const NodeComponent = node.version === 2 ? SuperNode : Node;
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
                activeWire={activeWire}
                connectedAnchorIds={connectedAnchorIds}
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
          onSubmit={handleCablePromptSubmit}
          onCancel={handleCablePromptCancel}
          initialData={cablePromptData.mode === 'edit' ? cablePromptData.initialData : null}
        />
      )}
    </div>
  );
}
