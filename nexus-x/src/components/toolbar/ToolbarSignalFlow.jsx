import { useState, useCallback, useRef } from 'react';
import ChangelogPopup from '../ChangelogPopup';

const BG = "#0e0e0c";
const NODE = "#1a1a18";
const NODEBORDER = "#2e2e2a";
const TEXT = "#706f6a";
const TEXTHI = "#b5b4ae";
const WHITE = "#d8d7d2";
const ui = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const codeFn = "'SF Mono', 'Cascadia Code', 'Consolas', monospace";

const BRAND = "#6b9edd";
const nodeThemes = {
  file:   { color: "#6b9edd", bg: "rgba(107,158,221,0.07)", border: "rgba(107,158,221,0.22)" },
  canvas: { color: "#c084cf", bg: "rgba(192,132,207,0.07)", border: "rgba(192,132,207,0.22)" },
  view:   { color: "#6bcfa0", bg: "rgba(107,207,160,0.07)", border: "rgba(107,207,160,0.22)" },
  output: { color: "#dda86b", bg: "rgba(221,168,107,0.07)", border: "rgba(221,168,107,0.22)" },
};

function Wire({ live }) {
  return (
    <div style={{ display: "flex", alignItems: "center", width: 38, flexShrink: 0 }}>
      <div style={{ flex: 1, height: 1, background: live ? "rgba(107,158,221,0.25)" : "#2a2a27" }} />
      <div style={{
        width: 7, height: 7,
        background: live ? BRAND : "transparent",
        border: live ? "none" : "1.5px solid #3a3a36",
        flexShrink: 0,
        transform: "rotate(45deg)",
        borderRadius: 1,
      }} />
      <div style={{ flex: 1, height: 1, background: live ? "rgba(107,158,221,0.25)" : "#2a2a27" }} />
    </div>
  );
}

function Port({ color, side = "left" }) {
  return (
    <div className="sf-toolbar-port" style={{
      position: "absolute",
      [side]: -5, top: "50%", transform: "translateY(-50%)",
      width: 9, height: 9, borderRadius: "50%",
      background: NODE,
      border: `2px solid ${color || "#3a3a36"}`,
      zIndex: 2,
    }} />
  );
}

function NodeGroup({ label, nodeKey, row1, row2 }) {
  const nd = nodeKey ? nodeThemes[nodeKey] : null;
  const topColor = nd ? nd.color : "#3a3a36";
  const labelColor = nd ? nd.color : "#3a3a3a";
  return (
    <div className="sf-toolbar-section" style={{
      display: "flex", flexDirection: "column", gap: 4,
      background: NODE, border: `1px solid ${NODEBORDER}`,
      borderRadius: 14, padding: "8px 12px",
      borderTop: `2.5px solid ${topColor}`,
      position: "relative",
      overflow: "visible",
    }}>
      <Port color={topColor} side="left" />
      <Port color={topColor} side="right" />
      <span style={{
        color: labelColor, fontSize: 9, fontFamily: ui,
        fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase",
        opacity: 0.45,
      }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {row1}
      </div>
      {row2 && (
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {row2}
        </div>
      )}
    </div>
  );
}

function Btn({ children, on, accent, nodeKey, onClick, title, disabled }) {
  const [h, setH] = useState(false);
  const nd = nodeKey ? nodeThemes[nodeKey] : null;
  const accentColor = nd ? nd.color : BRAND;
  const accentBg = nd ? nd.bg : "rgba(107,158,221,0.07)";
  const accentBorder = nd ? nd.border : "rgba(107,158,221,0.22)";
  return (
    <button
      className="sf-toolbar-btn"
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      disabled={disabled}
      title={title}
      style={{
        background: on ? accentBg : h ? "rgba(255,255,255,0.03)" : "transparent",
        border: `1px solid ${on ? accentBorder : h ? "#333" : NODEBORDER}`,
        borderRadius: 8, padding: "4px 9px",
        color: disabled ? "#333" : on ? accentColor : accent ? BRAND : h ? TEXTHI : TEXT,
        fontSize: 11, fontWeight: on ? 600 : 400,
        fontFamily: ui, cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.12s ease",
        whiteSpace: "nowrap",
      }}
    >{children}</button>
  );
}

function Val({ children, mono }) {
  return (
    <span style={{
      color: WHITE, fontSize: 11.5,
      fontFamily: mono ? codeFn : ui,
      fontWeight: 500,
      fontVariantNumeric: "tabular-nums",
    }}>{children}</span>
  );
}

function ZoomControl({ value, onChange }) {
  const pct = Math.max(0, Math.min(100, ((value - 0.05) / (8 - 0.05)) * 100));
  const c = nodeThemes.view.color;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <ZBtn onClick={() => onChange(Math.max(0.05, value - 0.25))}>−</ZBtn>
      <div style={{ position: "relative", width: 56, height: 14, display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", width: "100%", height: 2, borderRadius: 1, background: "#2a2a27" }} />
        <div style={{ position: "absolute", width: `${pct}%`, height: 2, borderRadius: 1, background: c }} />
        <input type="range" min={5} max={800} value={Math.round(value * 100)}
          onChange={e => onChange(e.target.value / 100)}
          style={{ position: "absolute", width: "100%", height: 14, opacity: 0, cursor: "pointer" }}
        />
        <div className="sf-toolbar-thumb" style={{
          position: "absolute", left: `calc(${pct}% - 4px)`,
          width: 8, height: 8, borderRadius: "50%",
          background: "#ccc", pointerEvents: "none",
        }} />
      </div>
      <ZBtn onClick={() => onChange(Math.min(8, value + 0.25))}>+</ZBtn>
      <Val mono>{Math.round(value * 100)}%</Val>
    </div>
  );
}

function ZBtn({ children, onClick }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: "transparent", border: "none",
        color: h ? TEXTHI : "#444",
        fontSize: 13, fontFamily: ui, cursor: "pointer",
        width: 20, height: 20, display: "flex",
        alignItems: "center", justifyContent: "center",
      }}
    >{children}</button>
  );
}

function Divider() {
  return <div style={{ width: 1, height: 16, background: "#2a2a27", flexShrink: 0 }} />;
}

export default function ToolbarSignalFlow({
  nodeCount, wireCount,
  sidePanelOpen, setSidePanelOpen,
  history, future, undo, redo,
  handleNewProject, handleOpenFile, handleSaveAs,
  recentFiles, handleLoadRecent, showRecents, setShowRecents, handleLoadSample,
  APP_VERSION,
  paperEnabled, setPaperEnabled,
  paperSize, handlePaperSizeChange, PAPER_SIZES,
  customWidth, customHeight, handleCustomSizeChange,
  orientation, toggleOrientation,
  showTitleBlock, toggleTitleBlock,
  zoom, setZoom, zoomRef, panRef, containerRef, setPan,
  resetView, snapToGrid, toggleSnapToGrid, showGrid, toggleGrid,
  showRulers, toggleRulers,
  printFriendly, setPrintFriendly,
  exportScale, setExportScale, EXPORT_PRESETS,
  handleExportPNG, handleExportViewport, handleExportWithTitleBlock, exportProgress,
  pages, showChangelog, setShowChangelog,
}) {
  const handleZoomChange = useCallback((newZoom) => {
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

  const currentPreset = EXPORT_PRESETS.find(p => p.scale === exportScale) || EXPORT_PRESETS[0];

  return (
    <div style={{
      background: BG,
      borderBottom: `1px solid ${NODEBORDER}`,
      padding: "8px 12px",
      display: "flex", alignItems: "center",
    }}>
        {/* Brand */}
        <div className="sf-toolbar-brand" style={{
          display: "flex", alignItems: "center", gap: 10,
          background: NODE, border: `1px solid ${NODEBORDER}`,
          borderRadius: 14, padding: "8px 14px",
          flexShrink: 0, position: "relative",
          overflow: "visible",
        }}>
          <Port color={BRAND} side="right" />
          <div style={{ position: 'relative' }}>
            <button
              className="sf-toolbar-logo"
              onClick={() => setShowChangelog(p => !p)}
              style={{
                width: 34, height: 40, borderRadius: 8,
                background: "rgba(107,158,221,0.08)",
                border: "1.5px solid rgba(107,158,221,0.3)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 1, cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 800, color: BRAND, fontFamily: ui, letterSpacing: 0.5, lineHeight: 1 }}>SF</span>
              <span style={{ fontSize: 7, fontWeight: 500, color: "rgba(107,158,221,0.5)", fontFamily: ui, lineHeight: 1 }}>v{APP_VERSION}</span>
            </button>
            <ChangelogPopup isOpen={showChangelog} onClose={() => setShowChangelog(false)} />
          </div>
          <div>
            <div style={{ color: WHITE, fontSize: 13, fontWeight: 600, fontFamily: ui }}>
              Signal Flow
            </div>
            <div style={{ color: "#3a3a37", fontSize: 10, fontFamily: ui, marginTop: 1 }}>
              {nodeCount} node{nodeCount !== 1 ? 's' : ''} · {wireCount} wire{wireCount !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        <Wire live />

        {/* File */}
        <NodeGroup label="file" nodeKey="file"
          row1={<>
            <Btn on={sidePanelOpen} nodeKey="file" onClick={() => setSidePanelOpen(p => !p)} title="Toggle library panel">Library</Btn>
            <Divider />
            <Btn onClick={undo} disabled={history.length === 0} title="Undo (Ctrl+Z)">Undo</Btn>
            <Btn onClick={redo} disabled={future.length === 0} title="Redo (Ctrl+Shift+Z)">Redo</Btn>
          </>}
          row2={<>
            <Btn onClick={handleNewProject}>New</Btn>
            <Btn onClick={handleOpenFile}>Open</Btn>
            <Btn onClick={handleSaveAs}>Save</Btn>
            <Btn onClick={() => handleLoadSample?.('/samples/gear.vsf')} title="Load GEAR sample project">GEAR</Btn>
            <div style={{ position: 'relative' }}>
              <Btn accent onClick={() => setShowRecents(p => !p)} title="Recent projects">
                Recents{recentFiles.length > 0 ? ` (${recentFiles.length})` : ''}
              </Btn>
              {showRecents && (
                <div className="sf-toolbar-dropdown" style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 50,
                  background: NODE, border: `1px solid ${NODEBORDER}`, borderRadius: 10,
                  width: 240, overflow: 'hidden',
                }}>
                  {recentFiles.length === 0 ? (
                    <div style={{ padding: '8px 12px', fontSize: 11, color: TEXT, fontFamily: ui }}>No recent files</div>
                  ) : (
                    recentFiles.map((file, i) => (
                      <button key={i}
                        onClick={() => handleLoadRecent(file)}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px',
                          background: 'none', border: 'none', borderBottom: `1px solid ${NODEBORDER}`,
                          color: WHITE, fontSize: 11, fontFamily: ui, cursor: 'pointer',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                      >
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                        <div style={{ color: '#444', fontSize: 9, marginTop: 1 }}>{new Date(file.timestamp).toLocaleDateString()}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </>}
        />

        <Wire />

        {/* Canvas */}
        <NodeGroup label="canvas" nodeKey="canvas"
          row1={<>
            <Btn on={paperEnabled} nodeKey="canvas" onClick={() => setPaperEnabled(p => !p)} title={paperEnabled ? 'Canvas: ON' : 'Canvas: OFF'}>
              {paperEnabled ? 'On' : 'Off'}
            </Btn>
            <select
              className="sf-toolbar-select"
              value={paperSize}
              onChange={(e) => handlePaperSizeChange(e.target.value)}
              style={{
                background: NODE, border: `1px solid ${NODEBORDER}`,
                borderRadius: 6, padding: "3px 6px",
                color: WHITE, fontSize: 11, fontFamily: ui,
                cursor: "pointer", outline: "none",
              }}
            >
              {Object.entries(PAPER_SIZES).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            {paperSize === 'Custom' && (
              <>
                <input type="number" value={customWidth}
                  onChange={(e) => handleCustomSizeChange(+e.target.value || 100, customHeight)}
                  style={{ width: 48, background: NODE, border: `1px solid ${NODEBORDER}`, borderRadius: 4, padding: "3px 4px", color: WHITE, fontSize: 10, fontFamily: codeFn, outline: "none" }}
                  min="100" title="Custom width (px)"
                />
                <span style={{ color: TEXT, fontSize: 10 }}>×</span>
                <input type="number" value={customHeight}
                  onChange={(e) => handleCustomSizeChange(customWidth, +e.target.value || 100)}
                  style={{ width: 48, background: NODE, border: `1px solid ${NODEBORDER}`, borderRadius: 4, padding: "3px 4px", color: WHITE, fontSize: 10, fontFamily: codeFn, outline: "none" }}
                  min="100" title="Custom height (px)"
                />
              </>
            )}
          </>}
          row2={<>
            <Btn on={orientation === 'landscape'} nodeKey="canvas" onClick={toggleOrientation}>
              {orientation === 'landscape' ? 'Landscape' : 'Portrait'}
            </Btn>
            <Btn on={showTitleBlock} nodeKey="canvas" onClick={toggleTitleBlock}>TB</Btn>
          </>}
        />

        <Wire />

        {/* View */}
        <NodeGroup label="view" nodeKey="view"
          row1={<>
            <ZoomControl value={zoom} onChange={handleZoomChange} />
          </>}
          row2={<>
            <Btn nodeKey="view" onClick={resetView} title="Reset view">Reset</Btn>
            <Divider />
            <Btn on={snapToGrid} nodeKey="view" onClick={toggleSnapToGrid} title="Snap to grid">Snap</Btn>
            <Btn on={showGrid} nodeKey="view" onClick={toggleGrid} title="Grid">Grid</Btn>
            <Btn on={showRulers} nodeKey="view" onClick={toggleRulers} title="Rulers">Rulers</Btn>
          </>}
        />

        <Wire />

        {/* Output */}
        <NodeGroup label="output" nodeKey="output"
          row1={<>
            <Btn on={printFriendly} nodeKey="output" onClick={() => setPrintFriendly(p => !p)} title="Print-friendly export (white background)">Eco</Btn>
            <select
              className="sf-toolbar-select"
              value={exportScale}
              onChange={(e) => setExportScale(Number(e.target.value))}
              title="Export resolution"
              style={{
                background: NODE, border: `1px solid ${NODEBORDER}`,
                borderRadius: 6, padding: "3px 6px",
                color: WHITE, fontSize: 11, fontFamily: ui,
                cursor: "pointer", outline: "none",
              }}
            >
              {EXPORT_PRESETS.map(p => (
                <option key={p.scale} value={p.scale}>{p.label} — {p.desc}</option>
              ))}
            </select>
          </>}
          row2={<>
            <Btn onClick={handleExportViewport} disabled={exportProgress !== null}>
              PNG
            </Btn>
          </>}
        />
    </div>
  );
}
