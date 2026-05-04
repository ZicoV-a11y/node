// SVG stroke-dasharray patterns for enhanced wire styling.
// `pattern: null` = solid stroke (default).
export const DASH_PATTERNS = [
  { id: 'solid',   pattern: null,        label: '───' },
  { id: 'long',    pattern: '12 6',      label: '── ──' },
  { id: 'medium',  pattern: '8 4',       label: '─ ─ ─' },
  { id: 'short',   pattern: '4 4',       label: '· · ·' },
  { id: 'dashdot', pattern: '12 4 4 4',  label: '─·─·' },
];
