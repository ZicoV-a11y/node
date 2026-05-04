// 36-color signal palette — single source of truth for App.jsx, SuperNode, Node313.
// Order matters: rendered as a 6×6 grid in the Node313 color picker.
export const SIGNAL_COLORS = [
  // Row 1
  { id: 'red',        hex: '#ef4444', label: 'Red' },
  { id: 'orange',     hex: '#f97316', label: 'Orange' },
  { id: 'emerald',    hex: '#10b981', label: 'Emerald' },
  { id: 'cyan',       hex: '#06b6d4', label: 'Cyan' },
  { id: 'violet',     hex: '#8b5cf6', label: 'Violet' },
  { id: 'lavender',   hex: '#c084fc', label: 'Lavender' },
  // Row 2
  { id: 'crimson',    hex: '#dc2626', label: 'Crimson' },
  { id: 'tangerine',  hex: '#ea580c', label: 'Tangerine' },
  { id: 'green',      hex: '#22c55e', label: 'Green' },
  { id: 'sky',        hex: '#0ea5e9', label: 'Sky' },
  { id: 'indigo',     hex: '#6366f1', label: 'Indigo' },
  { id: 'wine',       hex: '#881337', label: 'Wine' },
  // Row 3
  { id: 'rose',       hex: '#f43f5e', label: 'Rose' },
  { id: 'amber',      hex: '#f59e0b', label: 'Amber' },
  { id: 'jade',       hex: '#059669', label: 'Jade' },
  { id: 'blue',       hex: '#3b82f6', label: 'Blue' },
  { id: 'purple',     hex: '#a855f7', label: 'Purple' },
  { id: 'bronze',     hex: '#b45309', label: 'Bronze' },
  // Row 4
  { id: 'coral',      hex: '#fb7185', label: 'Coral' },
  { id: 'gold',       hex: '#fbbf24', label: 'Gold' },
  { id: 'mint',       hex: '#34d399', label: 'Mint' },
  { id: 'sapphire',   hex: '#2563eb', label: 'Sapphire' },
  { id: 'plum',       hex: '#9333ea', label: 'Plum' },
  { id: 'navy',       hex: '#1e40af', label: 'Navy' },
  // Row 5
  { id: 'salmon',     hex: '#f87171', label: 'Salmon' },
  { id: 'yellow',     hex: '#eab308', label: 'Yellow' },
  { id: 'lime',       hex: '#84cc16', label: 'Lime' },
  { id: 'teal',       hex: '#14b8a6', label: 'Teal' },
  { id: 'fuchsia',    hex: '#d946ef', label: 'Fuchsia' },
  { id: 'steel',      hex: '#475569', label: 'Steel' },
  // Row 6
  { id: 'pink',       hex: '#ec4899', label: 'Pink' },
  { id: 'peach',      hex: '#fdba74', label: 'Peach' },
  { id: 'chartreuse', hex: '#a3e635', label: 'Chartreuse' },
  { id: 'turquoise',  hex: '#2dd4bf', label: 'Turquoise' },
  { id: 'magenta',    hex: '#e879f9', label: 'Magenta' },
  { id: 'slate',      hex: '#64748b', label: 'Slate' },
];

// id → full color object {id, hex, label} — used by SuperNode and Node313
export const SIGNAL_COLORS_BY_ID = new Map(SIGNAL_COLORS.map(c => [c.id, c]));

// id → hex string only — used by App.jsx's wire color resolution
export const SIGNAL_COLOR_HEX_BY_ID = new Map(SIGNAL_COLORS.map(c => [c.id, c.hex]));

export const DEFAULT_THEME_COLOR = '#71717a'; // zinc-500
