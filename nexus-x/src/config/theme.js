// Noir theme palette — used by Node313 styling and (potentially) other components.
// Token name `T` is preserved as the export to keep call sites short
// (this object is read in dozens of inline `style={{ background: T.bg }}` patterns).
export const T = {
  bg: '#0a0a0a', card: '#111111', rowHover: '#1a1a1a',
  border: 'rgba(255,255,255,0.10)', borderStrong: 'rgba(255,255,255,0.15)',
  borderSubtle: 'rgba(255,255,255,0.04)', divider: 'rgba(255,255,255,0.08)',
  colDivider: 'rgba(255,255,255,0.50)',
  accent: '#bbbbbb', accentLight: '#dddddd', accentDim: '#999999',
  green: '#66bb6a', red: '#ef5350',
  accentGlow: 'rgba(255,255,255,0.04)',
  text: '#cccccc', textSec: '#aaaaaa', textMuted: '#666666',
  white: '#e0e0e0',
  hFont: "'Space Grotesk', sans-serif", mono: "'Space Grotesk', sans-serif",
};
