import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import Node from './components/Node';
import SuperNode from './components/SuperNode';
import SidePanel from './components/SidePanel';
import CanvasControls from './components/canvas/CanvasControls';
import CablePrompt from './components/CablePrompt';
import { saveProject as dbSave, exportProject, importProject, loadProject as dbLoad } from './services/storage';
import { getRecentFiles, addToRecentFiles } from './services/recentFiles';

// Paper size constants (96 DPI)
const PAPER_SIZES = {
  'ANSI_A': { width: 816, height: 1056, label: 'Letter (8.5×11)' },
  'ANSI_B': { width: 1056, height: 1632, label: 'Tabloid (11×17)' },
  'ANSI_C': { width: 1632, height: 2112, label: 'ANSI C (17×22)' },
  'ANSI_D': { width: 2112, height: 3264, label: 'ANSI D (22×34)' },
  'A4': { width: 794, height: 1123, label: 'A4' },
  'A3': { width: 1123, height: 1588, label: 'A3' },
};

const ZOOM_LEVELS = [0.05, 0.1, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0, 6.0, 8.0];

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

// Create empty node with default config
const createNode = (id) => ({
  id,
  title: 'New Device',
  signalColor: null,
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
    platform: 'none',
    software: 'none',
    captureCard: 'none',
    settings: [],
    cards: []
  },
  inputSection: {
    columnName: 'INPUTS',
    columnOrder: ['port', 'connector', 'resolution', 'rate'],
    ports: [
      {
        id: 'in-1',
        number: 1,
        connector: '',      // Empty = "Type" placeholder
        resolution: '',     // Empty = "Choose" placeholder
        refreshRate: ''     // Empty = "Choose" placeholder
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
        connector: '',      // Empty = "Type" placeholder
        resolution: '',     // Empty = "Choose" placeholder
        refreshRate: ''     // Empty = "Choose" placeholder
      }
    ]
  }
});

export default function App() {
  // Paper and zoom state
  const [paperSize, setPaperSize] = useState('ANSI_B');
  const [orientation, setOrientation] = useState('landscape');
  const [zoom, setZoom] = useState(0.75);

  // Pan state (middle mouse drag)
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

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

  // Wire drawing state
  const [activeWire, setActiveWire] = useState(null);
  const [anchorPositions, setAnchorPositions] = useState({});

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

  // Refs for stable access in event handlers (avoids stale closures)
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  zoomRef.current = zoom;
  panRef.current = pan;

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Get canvas dimensions based on paper size and orientation
  const getCanvasDimensions = () => {
    const paper = PAPER_SIZES[paperSize];
    if (orientation === 'landscape') {
      return { width: paper.height, height: paper.width };
    }
    return { width: paper.width, height: paper.height };
  };

  const canvasDimensions = getCanvasDimensions();

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
          if (preset.systemSection) {
            newNode.system = {
              ...newNode.system,
              platform: preset.systemSection.platform || newNode.system.platform,
              software: preset.systemSection.software || newNode.system.software,
              captureCard: preset.systemSection.captureCard || newNode.system.captureCard
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

    // Position new node in visible area
    newNode.position = {
      x: PRINT_MARGINS.left + Math.random() * 200,
      y: PRINT_MARGINS.top + Math.random() * 200
    };

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
      systemSection: node.system ? {
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

  const updateNode = (nodeId, updates) => {
    setNodes(prev => {
      if (prev[nodeId]) {
        return { ...prev, [nodeId]: { ...prev[nodeId], ...updates } };
      }
      return prev;
    });
  };

  const deleteNode = (nodeId) => {
    setNodes(prev => {
      const { [nodeId]: removed, ...remainingNodes } = prev;
      return remainingNodes;
    });
    // Remove connections involving this node
    setConnections(prev => prev.filter(
      c => !c.from.startsWith(nodeId) && !c.to.startsWith(nodeId)
    ));
  };

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

  // Connection management
  const handleAnchorClick = (anchorId, direction) => {
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
    const zoomFactor = 1 - event.deltaY * 0.001;
    const newZoom = Math.max(0.05, Math.min(8, prevZoom * zoomFactor));

    // Adjust pan so the point under the cursor stays fixed
    const newPan = {
      x: cursorX - ((cursorX - prevPan.x) / prevZoom) * newZoom,
      y: cursorY - ((cursorY - prevPan.y) / prevZoom) * newZoom,
    };

    setZoom(newZoom);
    setPan(newPan);
  }, []);

  // Convert screen coordinates to canvas-space coordinates (accounting for pan + zoom)
  const screenToCanvasPosition = useCallback(({ x, y }) => {
    const container = containerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    return {
      x: (x - rect.left - pan.x) / zoom,
      y: (y - rect.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // Middle mouse pan - start
  const handleMouseDown = (event) => {
    // Middle mouse button (button === 1) - pan
    if (event.button === 1) {
      event.preventDefault();
      setIsPanning(true);
      setPanStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
    }
    // Left mouse button (button === 0) - start selection on canvas only
    else if (event.button === 0 && event.target.getAttribute('data-canvas') === 'true') {
      const pos = screenToCanvasPosition({ x: event.clientX, y: event.clientY });
      setIsSelecting(true);
      setSelectionBox({ startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y });
      // Clear selection unless shift is held
      if (!event.shiftKey) {
        setSelectedNodes(new Set());
      }
    }
  };

  // Mouse move - pan or selection box
  const handleMouseMove = (event) => {
    if (isPanning) {
      setPan({
        x: event.clientX - panStart.x,
        y: event.clientY - panStart.y
      });
    }
    if (isSelecting) {
      const pos = screenToCanvasPosition({ x: event.clientX, y: event.clientY });
      setSelectionBox(prev => prev ? { ...prev, endX: pos.x, endY: pos.y } : null);
    }
  };

  // Mouse up - end pan or selection
  const handleMouseUp = (event) => {
    if (event.button === 1) {
      setIsPanning(false);
    }
    if (event.button === 0 && isSelecting) {
      // Calculate which nodes are in the selection box
      if (selectionBox) {
        const minX = Math.min(selectionBox.startX, selectionBox.endX);
        const maxX = Math.max(selectionBox.startX, selectionBox.endX);
        const minY = Math.min(selectionBox.startY, selectionBox.endY);
        const maxY = Math.max(selectionBox.startY, selectionBox.endY);

        const nodesInBox = new Set();
        Object.values(nodes).forEach(node => {
          // Node position is top-left corner, estimate size (200x150 default)
          const nodeWidth = 200 * (node.scale || 1);
          const nodeHeight = 150 * (node.scale || 1);
          const nodeCenterX = node.position.x + nodeWidth / 2;
          const nodeCenterY = node.position.y + nodeHeight / 2;

          // Check if node center is within selection box
          if (nodeCenterX >= minX && nodeCenterX <= maxX &&
              nodeCenterY >= minY && nodeCenterY <= maxY) {
            nodesInBox.add(node.id);
          }
        });

        if (event.shiftKey) {
          // Add to existing selection
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
    const container = containerRef.current;
    if (!container) return;
    const defaultZoom = 0.75;
    const rect = container.getBoundingClientRect();
    const newPanX = (rect.width - canvasDimensions.width * defaultZoom) / 2;
    const newPanY = (rect.height - canvasDimensions.height * defaultZoom) / 2;
    setZoom(defaultZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [canvasDimensions]);

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

  // Center page on initial mount
  useEffect(() => {
    centerPage();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Attach wheel listener with { passive: false } so preventDefault works
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

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

  // Store computed anchor positions (updated after layout via useLayoutEffect)
  const [computedAnchorPositions, setComputedAnchorPositions] = useState({});

  // Register anchor - track which anchors exist (positions computed via useLayoutEffect)
  const registerAnchor = useCallback((anchorId) => {
    setAnchorPositions(prev => {
      if (prev[anchorId]) return prev;
      return { ...prev, [anchorId]: true };
    });
  }, []);

  // Recalculate ALL anchor positions after DOM has updated (useLayoutEffect runs synchronously after DOM mutations)
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasRect = canvas.getBoundingClientRect();
    const newPositions = {};

    // For each registered anchor, query its DOM position and type
    Object.keys(anchorPositions).forEach(anchorId => {
      const anchorEl = document.querySelector(`[data-anchor-id="${anchorId}"]`);
      if (anchorEl) {
        const anchorRect = anchorEl.getBoundingClientRect();
        const anchorType = anchorEl.getAttribute('data-anchor-type') || 'in';
        newPositions[anchorId] = {
          x: (anchorRect.left + anchorRect.width / 2 - canvasRect.left) / zoom,
          y: (anchorRect.top + anchorRect.height / 2 - canvasRect.top) / zoom,
          type: anchorType
        };
      }
    });

    setComputedAnchorPositions(newPositions);
  }, [anchorPositions, zoom, pan, nodes]); // Recalc when zoom, pan, or nodes change

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
    version: '3.0',
    savedAt: new Date().toISOString(),
    settings: { paperSize, orientation, zoom },
    nodes,
    connections,
    userPresets,
  }), [projectId, projectName, paperSize, orientation, zoom, nodes, connections, userPresets]);

  // Apply loaded project data to all state
  const applyProject = useCallback((project) => {
    setPaperSize(project.settings?.paperSize || 'ANSI_B');
    setOrientation(project.settings?.orientation || 'landscape');
    setNodes(project.nodes || {});
    setConnections(project.connections || []);
    setUserPresets(project.userPresets || {});
    setProjectName(project.name || 'Untitled Project');
    setProjectId(project.id);
    setSelectedNodes(new Set());
    setSelectedWires(new Set());
    setActiveWire(null);
    // Fit view after state settles
    setTimeout(() => fitView(0.1), 50);
  }, [fitView]);

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
    const fileName = `${projectName.replace(/\s+/g, '_')}.sfw.json`;

    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'Signal Flow Workspace',
            accept: { 'application/json': ['.json'] },
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
            description: 'Signal Flow Workspace',
            accept: { 'application/json': ['.json', '.sfw'] },
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
              value={ZOOM_LEVELS.reduce((prev, curr) => Math.abs(curr - zoom) < Math.abs(prev - zoom) ? curr : prev)}
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
              {ZOOM_LEVELS.map(z => (
                <option key={z} value={z}>{Math.round(z * 100)}%</option>
              ))}
            </select>
            <span className="text-xs font-mono text-zinc-500 w-10 text-right">{Math.round(zoom * 100)}%</span>
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

        {/* Node Selection Toolbar */}
        {selectedNodes.size > 0 && (
          <div className="mt-2 flex items-center gap-3 py-2 px-3 bg-violet-500/10 border border-violet-500/30 rounded">
            <span className="text-xs font-mono text-violet-400">
              {selectedNodes.size} node{selectedNodes.size > 1 ? 's' : ''} selected
            </span>

            <div className="h-4 border-l border-zinc-700" />

            <button
              onClick={() => {
                // Delete all selected nodes
                selectedNodes.forEach(nodeId => deleteNode(nodeId));
                setSelectedNodes(new Set());
              }}
              className="px-2 py-1 border border-red-600 rounded text-xs font-mono text-red-400 hover:bg-red-500/10"
            >
              Delete Selected
            </button>

            <div className="h-4 border-l border-zinc-700" />

            <button
              onClick={() => setSelectedNodes(new Set())}
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
        />

        {/* Canvas Area */}
        <main
          ref={containerRef}
          className={`flex-1 overflow-hidden bg-zinc-900/50 relative ${isPanning ? 'cursor-grabbing' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setIsPanning(false);
            if (isSelecting) {
              setIsSelecting(false);
              setSelectionBox(null);
            }
          }}
        >
        {/* Pan + Zoom container */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0'
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

          {/* SVG Layer for Wires and Selection Box */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-[60]"
            style={{ overflow: 'visible' }}
          >
            {/* Selection Box Rectangle */}
            {isSelecting && selectionBox && (
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
            )}

            {/* SVG Anchor Points - rendered for all registered anchors */}
            {Object.entries(computedAnchorPositions).map(([anchorId, pos]) => {
              const isInput = pos.type === 'in';
              const isActive = activeWire?.from === anchorId || activeWire?.to === anchorId;
              const isConnected = connections.some(c => c.from === anchorId || c.to === anchorId);

              return (
                <g key={`anchor-${anchorId}`}>
                  {/* Glow effect for connected/active anchors */}
                  {(isConnected || isActive) && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={5}
                      fill={isActive ? '#22d3ee' : isInput ? '#10b981' : '#f59e0b'}
                      opacity={0.3}
                    />
                  )}
                  {/* Main anchor dot */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={isActive ? 3 : 2.5}
                    fill={isActive ? '#22d3ee' : isInput ? '#10b981' : '#f59e0b'}
                    stroke={isActive ? '#67e8f9' : isInput ? '#34d399' : '#fbbf24'}
                    strokeWidth={1}
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
              const wireColor = getConnectionColor(conn);
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
                onUpdate={(updates) => updateNode(node.id, updates)}
                onDelete={() => deleteNode(node.id)}
                onAnchorClick={handleAnchorClick}
                registerAnchor={registerAnchor}
                activeWire={activeWire}
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
        </div>
        </div>
        <CanvasControls
          zoom={zoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onFitView={() => fitView(0.1)}
          onReset={resetView}
        />
        <input ref={fileInputRef} type="file" accept=".json,.sfw" onChange={handleFileChange} style={{ display: 'none' }} />
      </main>
      </div>

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
