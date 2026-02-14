export default function CanvasControls({
  zoom,
  onZoomIn,
  onZoomOut,
  onFitView,
  onReset,
  snapToGrid,
  onToggleSnap,
  // Title block controls
  showTitleBlock,
  onToggleTitleBlock,
  showTitleBlockGrid,
  onToggleTitleBlockGrid,
  canvasBackground,
  onToggleBackground,
}) {
  return (
    <div className="absolute bottom-4 left-4 z-40 flex flex-col gap-1">
      <button
        onClick={onZoomIn}
        className="w-8 h-8 bg-zinc-800 border border-zinc-700 rounded text-zinc-300 hover:bg-zinc-700 hover:text-white text-sm font-mono flex items-center justify-center"
        title="Zoom in"
      >
        +
      </button>
      <button
        onClick={onZoomOut}
        className="w-8 h-8 bg-zinc-800 border border-zinc-700 rounded text-zinc-300 hover:bg-zinc-700 hover:text-white text-sm font-mono flex items-center justify-center"
        title="Zoom out"
      >
        −
      </button>
      <button
        onClick={onFitView}
        className="w-8 h-8 bg-zinc-800 border border-zinc-700 rounded text-zinc-300 hover:bg-zinc-700 hover:text-white text-[10px] font-mono flex items-center justify-center"
        title="Fit all nodes in view"
      >
        ⊞
      </button>
      <button
        onClick={onReset}
        className="w-8 h-8 bg-zinc-800 border border-zinc-700 rounded text-zinc-300 hover:bg-zinc-700 hover:text-white text-sm font-mono flex items-center justify-center"
        title="Reset view"
      >
        ⟲
      </button>
      <button
        onClick={onToggleSnap}
        className={`w-8 h-8 bg-zinc-800 border rounded text-[10px] font-mono flex items-center justify-center ${
          snapToGrid
            ? 'border-cyan-500 text-cyan-400'
            : 'border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white'
        }`}
        title={snapToGrid ? 'Snap to grid: ON' : 'Snap to grid: OFF'}
      >
        #
      </button>

      {/* Divider */}
      <div className="h-px bg-zinc-700 my-1" />

      {/* Title Block toggle */}
      <button
        onClick={onToggleTitleBlock}
        className={`w-8 h-8 bg-zinc-800 border rounded text-[10px] font-mono flex items-center justify-center ${
          showTitleBlock
            ? 'border-cyan-500 text-cyan-400'
            : 'border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white'
        }`}
        title={showTitleBlock ? 'Title Block: ON' : 'Title Block: OFF'}
      >
        TB
      </button>

      {/* Title Block Grid toggle (only visible when title block is on) */}
      {showTitleBlock && (
        <button
          onClick={onToggleTitleBlockGrid}
          className={`w-8 h-8 bg-zinc-800 border rounded text-[10px] font-mono flex items-center justify-center ${
            showTitleBlockGrid
              ? 'border-cyan-500 text-cyan-400'
              : 'border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white'
          }`}
          title={showTitleBlockGrid ? 'Title Block Grid: ON' : 'Title Block Grid: OFF'}
        >
          ⊞
        </button>
      )}

      {/* Background toggle */}
      <button
        onClick={onToggleBackground}
        className={`w-8 h-8 border rounded text-[10px] font-mono flex items-center justify-center ${
          canvasBackground === 'white'
            ? 'bg-white border-zinc-400 text-zinc-800'
            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white'
        }`}
        title={canvasBackground === 'white' ? 'Background: White' : 'Background: Dark'}
      >
        {canvasBackground === 'white' ? '☀' : '☾'}
      </button>

      <div className="mt-1 text-center text-[10px] font-mono text-zinc-500">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
