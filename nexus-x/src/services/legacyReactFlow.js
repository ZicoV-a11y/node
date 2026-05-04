// Convert legacy React-Flow-format .vsf files (saved by an older app generation
// before NexusX moved off React Flow) into the current SuperNode-based shape
// that the importer expects.
//
// Detection: a file is in this format if it has both a `nodes` array (not object)
// and an `edges` array.
//
// The conversion is best-effort. Some legacy data has no equivalent:
//   - Wire styling and label positioning
//   - System info (manufacturer/model/platform) was never captured per-node
//   - barcoE3 cards lose their card grouping (connectors are flattened)

import { SIGNAL_COLORS } from '../config/signalColors';

const PALETTE = SIGNAL_COLORS.map(c => [c.id, c.hex]);

function hexToRgb(h) {
  const clean = (h || '').replace('#', '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  if (full.length !== 6) return null;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

function closestPaletteId(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  let bestId = null;
  let bestD = Infinity;
  for (const [id, phex] of PALETTE) {
    const prgb = hexToRgb(phex);
    if (!prgb) continue;
    const d = (rgb[0] - prgb[0]) ** 2 + (rgb[1] - prgb[1]) ** 2 + (rgb[2] - prgb[2]) ** 2;
    if (d < bestD) { bestD = d; bestId = id; }
  }
  return bestId;
}

function parseResolution(s) {
  if (!s) return ['', ''];
  const m = String(s).trim().match(/^(\d+x\d+)(?:@(\S+))?$/);
  if (m) return [m[1] || '', m[2] || ''];
  return [s, ''];
}

function parseNumber(name, fallback) {
  if (!name) return fallback;
  const m = String(name).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : fallback;
}

function makePort(oldPort, idx, isOutput) {
  const [resolution, refreshRate] = parseResolution(oldPort.resolution);
  const number = parseNumber(oldPort.name, idx + 1);
  const port = {
    id: oldPort.id,
    number,
    connector: oldPort.type || '',
    resolution,
    refreshRate,
  };
  const defaultName = `${isOutput ? 'OUT' : 'IN'} ${number}`;
  if (oldPort.name && String(oldPort.name).trim().toUpperCase() !== defaultName) {
    port.label = oldPort.name;
  }
  if (isOutput) port.destination = oldPort.destination || '';
  else port.source = oldPort.connection || '';
  if (oldPort.spacing != null) port.spacing = oldPort.spacing;
  return port;
}

function makeCardPort(oldConn, idx, isOutput) {
  const [resolution, refreshRate] = parseResolution(oldConn.resolution);
  const port = {
    id: oldConn.id,
    number: idx + 1,
    connector: oldConn.type || '',
    resolution,
    refreshRate,
  };
  if (isOutput) port.destination = oldConn.destination || '';
  else port.source = oldConn.source || '';
  return port;
}

function extractPortId(handle) {
  if (!handle) return '';
  if (handle.startsWith('output-')) return handle.slice('output-'.length);
  if (handle.startsWith('input-')) return handle.slice('input-'.length);
  // barcoE3 pattern: cardId(5-segment UUID) + connectorId(5-segment UUID) + side
  const parts = handle.split('-');
  if (parts.length === 11) return parts.slice(5, 10).join('-');
  return handle;
}

export function isLegacyReactFlowFormat(data) {
  return Array.isArray(data?.nodes) && Array.isArray(data?.edges);
}

export function convertLegacyReactFlow(legacy) {
  const baseTs = Date.now();
  const oldToNew = {};
  legacy.nodes.forEach((n, i) => { oldToNew[n.id] = `node-${baseTs + i}`; });

  const nodes = {};
  for (const src of legacy.nodes) {
    const newId = oldToNew[src.id];
    const data = src.data || {};
    const inputPorts = [];
    const outputPorts = [];

    if (src.type === 'barcoE3') {
      for (const card of (data.cards || [])) {
        const target = card.cardType === 'output' ? outputPorts : inputPorts;
        for (const conn of (card.connectors || [])) {
          target.push(makeCardPort(conn, target.length, card.cardType === 'output'));
        }
      }
    } else {
      (data.inputs || []).forEach((p, i) => inputPorts.push(makePort(p, i, false)));
      (data.outputs || []).forEach((p, i) => outputPorts.push(makePort(p, i, true)));
    }

    nodes[newId] = {
      id: newId,
      title: data.label || 'Node',
      version: 2,
      signalColor: closestPaletteId(data.color),
      position: src.position || { x: 0, y: 0 },
      scale: 1,
      rpCode: '',
      description: '',
      layout: {
        rows: [['system'], ['input', 'output']],
        inputAnchorSide: 'left',
        outputAnchorSide: 'right',
        systemAnchorSide: 'left',
        systemCollapsed: true,
        inputCollapsed: false,
        outputCollapsed: false,
      },
      system: {
        manufacturer: '', model: '',
        platform: 'none', software: 'none', captureCard: 'none',
        settings: [], cards: [],
        systemSectionStyle: 'aligned',
      },
      inputSection: {
        columnName: 'INPUTS',
        columnOrder: ['port', 'connector', 'source', 'resolution', 'rate'],
        ports: inputPorts,
      },
      outputSection: {
        columnName: 'OUTPUTS',
        columnOrder: ['port', 'connector', 'destination', 'resolution', 'rate'],
        ports: outputPorts,
      },
    };
  }

  const connections = [];
  for (const e of (legacy.edges || [])) {
    const fromNode = oldToNew[e.source];
    const toNode = oldToNew[e.target];
    if (!fromNode || !toNode) continue;
    const fromPort = extractPortId(e.sourceHandle);
    const toPort = extractPortId(e.targetHandle);
    connections.push({
      id: e.id || `wire-${baseTs + connections.length}`,
      from: `${fromNode}-${fromPort}`,
      to: `${toNode}-${toPort}`,
      waypoints: [],
      label: '',
      enhanced: false,
      dashPattern: null,
      cableType: e.data?.cableType || '',
      cableLength: e.data?.cableLength || '',
      rpCode: '',
      description: '',
    });
  }

  return {
    id: legacy.id,
    name: legacy.name || 'Imported Project',
    version: '1.2.0',
    nodes,
    connections,
    settings: {
      paperSize: 'ANSI_B',
      orientation: 'landscape',
      zoom: 0.5,
      paperEnabled: true,
      snapToGrid: false,
    },
    userPresets: {},
    userSubcategories: {},
    backgroundImages: [],
    titleBlockData: {
      companyName: '', drawingBy: '', venue: '',
      project: legacy.name || '',
      scale: 'CUSTOM', sheetNumber: '1',
      pageSize: 'ANSI B', sheetTitle: '',
    },
  };
}
