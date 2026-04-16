import { useState, useRef, useCallback } from 'react';
import FileMenuPopover from './FileMenuPopover';
import PageSetupPopover from './PageSetupPopover';
import ChangelogPopup from '../ChangelogPopup';

// Shared style tokens — matching Node313 theme
const T = {
  bg: '#111111',
  surface: '#0a0a0a',
  border: 'rgba(255,255,255,0.10)',
  borderActive: 'rgba(255,255,255,0.15)',
  text: '#aaaaaa',
  textDim: '#666666',
  textBright: '#e0e0e0',
  textMuted: '#555555',
  accent: '#bbbbbb',
  glow: 'rgba(255,255,255,0.04)',
  emerald: 'rgba(52,211,153,0.4)',
  emeraldGlow: 'rgba(52,211,153,0.12)',
  font: "'Space Grotesk', sans-serif",
};

const btn = (active = false, extra = {}) => ({
  fontSize: '11px', padding: '4px 8px', cursor: 'pointer',
  border: `1px solid ${active ? T.borderActive : T.border}`,
  color: active ? T.accent : T.textDim,
  background: active ? T.glow : 'transparent',
  fontFamily: T.font, letterSpacing: '1px',
  lineHeight: 1, whiteSpace: 'nowrap',
  ...extra,
});

const iconBtn = (active = false, extra = {}) => ({
  ...btn(active, extra),
  fontSize: '13px', padding: '3px 6px',
});

const sel = (extra = {}) => ({
  fontSize: '11px', padding: '4px 6px',
  background: T.surface, border: `1px solid ${T.border}`,
  color: T.text, fontFamily: T.font,
  ...extra,
});

const divider = {
  width: '1px', height: '18px', flexShrink: 0,
  background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.10), transparent)',
};

export default function ToolbarMinimal({
  // Logo
  nodeCount, wireCount,
  // Library
  sidePanelOpen, setSidePanelOpen,
  // Undo/Redo
  history, future, undo, redo,
  // File
  handleNewProject, handleOpenFile, handleSaveAs, recentFiles, handleLoadRecent, handleLoadSample,
  handleImportBackgroundImage,
  // Add node
  addNode,
  // Version
  APP_VERSION,
  // Paper
  paperEnabled, setPaperEnabled,
  paperSize, handlePaperSizeChange, PAPER_SIZES,
  customWidth, customHeight, handleCustomSizeChange,
  orientation, toggleOrientation,
  showTitleBlock, toggleTitleBlock,
  // View
  zoom, setZoom, ZOOM_LEVELS, zoomRef, panRef, containerRef, setPan,
  resetView, snapToGrid, toggleSnapToGrid, showGrid, toggleGrid,
  showRulers, toggleRulers,
  // Export
  printFriendly, setPrintFriendly,
  exportScale, setExportScale, EXPORT_PRESETS,
  handleExportPNG, handleExportWithTitleBlock, exportProgress,
  pages,
}) {
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [pageSetupOpen, setPageSetupOpen] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

  const fileBtnRef = useRef(null);
  const pageBtnRef = useRef(null);

  const handleZoomChange = useCallback((e) => {
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
  }, [containerRef, zoomRef, panRef, setPan, setZoom]);

  return (
    <div
      className="flex items-center gap-2 flex-wrap"
      style={{ padding: '5px 12px', background: T.bg, borderBottom: `2px solid ${T.border}`, fontFamily: T.font }}
    >
      {/* Logo + Title */}
      <div className="flex items-center gap-2" style={{ marginRight: '2px' }}>
        <div style={{
          width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1.5px solid ${T.borderActive}`, color: T.accent, fontSize: '9px', fontWeight: 700, letterSpacing: '1px',
        }}>SF</div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 300, letterSpacing: '2px', color: T.textBright, lineHeight: 1 }}>
            SIGNAL FLOW WORKSPACE
          </div>
          <div style={{ fontSize: '9px', color: T.textMuted, letterSpacing: '1px', lineHeight: 1, marginTop: '2px' }}>
            {nodeCount} nodes • {wireCount} wires
          </div>
        </div>
      </div>

      <div style={divider} />

      {/* Library */}
      <button onClick={() => setSidePanelOpen(p => !p)} style={btn(sidePanelOpen)} title="Library">
        ☰
      </button>

      {/* Undo / Redo */}
      <button onClick={undo} disabled={history.length === 0}
        style={iconBtn(false, {
          color: history.length === 0 ? '#333' : T.textDim,
          cursor: history.length === 0 ? 'not-allowed' : 'pointer',
          borderRight: 'none',
        })} title="Undo">↶</button>
      <button onClick={redo} disabled={future.length === 0}
        style={iconBtn(false, {
          color: future.length === 0 ? '#333' : T.textDim,
          cursor: future.length === 0 ? 'not-allowed' : 'pointer',
        })} title="Redo">↷</button>

      <div style={divider} />

      {/* File Menu */}
      <div className="relative">
        <button ref={fileBtnRef} onClick={() => setFileMenuOpen(p => !p)} style={btn(fileMenuOpen)} title="File">
          File ▾
        </button>
        <FileMenuPopover
          isOpen={fileMenuOpen} onClose={() => setFileMenuOpen(false)} anchorRef={fileBtnRef}
          onNew={handleNewProject} onOpen={handleOpenFile} onSaveAs={handleSaveAs}
          recentFiles={recentFiles} onLoadRecent={handleLoadRecent}
          onLoadSample={handleLoadSample}
          onImportBackgroundImage={handleImportBackgroundImage}
        />
      </div>

      <div style={divider} />

      {/* Paper / Page Setup */}
      <div className="relative">
        <button ref={pageBtnRef} onClick={() => setPageSetupOpen(p => !p)} style={btn(paperEnabled)} title="Page setup">
          {paperEnabled ? `${PAPER_SIZES[paperSize]?.label || paperSize}` : 'Paper'} ▾
        </button>
        <PageSetupPopover
          isOpen={pageSetupOpen} onClose={() => setPageSetupOpen(false)} anchorRef={pageBtnRef}
          paperEnabled={paperEnabled} setPaperEnabled={setPaperEnabled}
          paperSize={paperSize} onPaperSizeChange={handlePaperSizeChange} PAPER_SIZES={PAPER_SIZES}
          customWidth={customWidth} customHeight={customHeight} onCustomSizeChange={handleCustomSizeChange}
          orientation={orientation} toggleOrientation={toggleOrientation}
          showTitleBlock={showTitleBlock} toggleTitleBlock={toggleTitleBlock}
        />
      </div>

      {/* Zoom */}
      <select value={zoom} onChange={handleZoomChange} style={sel()}>
        {!ZOOM_LEVELS.includes(zoom) && <option value={zoom}>{Math.round(zoom * 100)}%</option>}
        {ZOOM_LEVELS.map(z => <option key={z} value={z}>{Math.round(z * 100)}%</option>)}
      </select>

      <button onClick={resetView} style={btn(false)} title="Reset view">⟲</button>

      <div style={divider} />

      {/* View Toggles */}
      <button onClick={toggleSnapToGrid} style={btn(snapToGrid, { borderRight: 'none' })} title="Snap"># Snap</button>
      <button onClick={toggleGrid} style={btn(showGrid, { borderRight: 'none' })} title="Grid">Grid</button>
      <button onClick={toggleRulers} style={btn(showRulers)} title="Rulers">⌐ Rulers</button>

      <div style={divider} />

      {/* Export */}
      <button onClick={() => setPrintFriendly(p => !p)} style={btn(printFriendly)} title="Print mode">
        Print
      </button>
      <select value={exportScale} onChange={(e) => setExportScale(Number(e.target.value))}
        style={sel({ borderLeft: 'none' })} title="Export resolution">
        {EXPORT_PRESETS.map(p => <option key={p.scale} value={p.scale}>{p.label} — {p.desc}</option>)}
      </select>
      <button onClick={handleExportPNG} disabled={exportProgress !== null}
        style={btn(false, { cursor: exportProgress ? 'wait' : 'pointer' })} title="Export PNG">
        {exportProgress
          ? `${exportProgress.current}/${exportProgress.total}...`
          : (paperEnabled && pages.length > 1 ? `ZIP (${pages.length}p)` : 'Export PNG')
        }
      </button>
      {showTitleBlock && (
        <button onClick={handleExportWithTitleBlock} disabled={exportProgress !== null}
          style={{
            ...btn(false),
            border: `1px solid ${T.emerald}`, color: T.textBright, background: T.emeraldGlow,
            cursor: exportProgress ? 'wait' : 'pointer',
          }} title="Export + title block">
          Export+TB
        </button>
      )}

      <div className="flex-1" />

      {/* Add Node */}
      <button onClick={() => addNode('node313')}
        style={{
          fontSize: '11px', letterSpacing: '1px', fontWeight: 500, padding: '4px 12px',
          border: `1px solid ${T.emerald}`, color: T.textBright, background: T.emeraldGlow,
          fontFamily: T.font, cursor: 'pointer',
        }} title="Add Node 313">
        + Node 313
      </button>

      {/* Version */}
      <div className="relative">
        <button onClick={() => setShowChangelog(p => !p)}
          style={btn(showChangelog, { fontSize: '10px', color: T.textMuted })} title="Changelog">
          v{APP_VERSION}
        </button>
        <ChangelogPopup isOpen={showChangelog} onClose={() => setShowChangelog(false)} />
      </div>
    </div>
  );
}
