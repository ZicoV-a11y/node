export default function CanvasControls({ zoom, onZoomIn, onZoomOut, onFitView, onReset, snapToGrid, onToggleSnap }) {
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
      <div className="mt-1 text-center text-[10px] font-mono text-zinc-500">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
