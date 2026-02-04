import { useCallback, useState, useMemo } from 'react';

// Paper size constants (96 DPI)
const PAPER_SIZES = {
  'ANSI_A': { width: 816, height: 1056, label: 'Letter (8.5\u00d711)' },
  'ANSI_B': { width: 1056, height: 1632, label: 'Tabloid (11\u00d717)' },
  'ANSI_C': { width: 1632, height: 2112, label: 'ANSI C (17\u00d722)' },
  'ANSI_D': { width: 2112, height: 3264, label: 'ANSI D (22\u00d734)' },
  'A4': { width: 794, height: 1123, label: 'A4' },
  'A3': { width: 1123, height: 1588, label: 'A3' },
  'Custom': { width: 1200, height: 1200, label: 'Custom' },
};

export { PAPER_SIZES };

export function useCanvasSettings() {
  // Paper size state with localStorage persistence
  const [paperSize, setPaperSize] = useState(() => {
    return localStorage.getItem('nx-paperSize') || 'ANSI_B';
  });

  const [orientation, setOrientation] = useState(() => {
    return localStorage.getItem('nx-orientation') || 'landscape';
  });

  const [paperEnabled, setPaperEnabledRaw] = useState(() => {
    const saved = localStorage.getItem('nx-paperEnabled');
    return saved !== null ? saved === 'true' : true;
  });

  const [customWidth, setCustomWidth] = useState(() => {
    const saved = localStorage.getItem('nx-customWidth');
    return saved ? parseInt(saved) : 1200;
  });

  const [customHeight, setCustomHeight] = useState(() => {
    const saved = localStorage.getItem('nx-customHeight');
    return saved ? parseInt(saved) : 1200;
  });

  const [snapToGrid, setSnapToGridRaw] = useState(() => {
    return localStorage.getItem('nx-snapToGrid') === 'true';
  });

  const [showRatioOverlay, setShowRatioOverlayRaw] = useState(() => {
    return localStorage.getItem('nx-showRatioOverlay') === 'true';
  });

  const [gridSize] = useState(() => {
    const saved = localStorage.getItem('nx-gridSize');
    return saved ? parseInt(saved) : 10;
  });

  // Handlers that persist to localStorage
  const handlePaperSizeChange = useCallback((size) => {
    setPaperSize(size);
    localStorage.setItem('nx-paperSize', size);
  }, []);

  const handleOrientationChange = useCallback((orient) => {
    setOrientation(orient);
    localStorage.setItem('nx-orientation', orient);
  }, []);

  const setPaperEnabled = useCallback((valueOrFn) => {
    setPaperEnabledRaw(prev => {
      const next = typeof valueOrFn === 'function' ? valueOrFn(prev) : valueOrFn;
      localStorage.setItem('nx-paperEnabled', next.toString());
      return next;
    });
  }, []);

  const handleCustomSizeChange = useCallback((width, height) => {
    setCustomWidth(width);
    setCustomHeight(height);
    localStorage.setItem('nx-customWidth', width.toString());
    localStorage.setItem('nx-customHeight', height.toString());
  }, []);

  const toggleSnapToGrid = useCallback(() => {
    setSnapToGridRaw(prev => {
      const next = !prev;
      localStorage.setItem('nx-snapToGrid', next.toString());
      return next;
    });
  }, []);

  const toggleRatioOverlay = useCallback(() => {
    setShowRatioOverlayRaw(prev => {
      const next = !prev;
      localStorage.setItem('nx-showRatioOverlay', next.toString());
      return next;
    });
  }, []);

  // Calculate canvas dimensions (single page size, orientation applied)
  const canvasDimensions = useMemo(() => {
    let dims = PAPER_SIZES[paperSize] || PAPER_SIZES['ANSI_B'];

    if (paperSize === 'Custom') {
      dims = { width: customWidth, height: customHeight };
    }

    if (orientation === 'landscape') {
      return {
        width: Math.max(dims.width, dims.height),
        height: Math.min(dims.width, dims.height),
      };
    }
    return {
      width: Math.min(dims.width, dims.height),
      height: Math.max(dims.width, dims.height),
    };
  }, [paperSize, orientation, customWidth, customHeight]);

  // Center the origin page in the viewport at 75% zoom
  // Accepts refs and setters from App.jsx to update both DOM and React state
  const centerPage = useCallback((containerRef, zoomRef, panRef, applyTransform, setZoom, setPan) => {
    const container = containerRef.current;
    if (!container) return;

    const defaultZoom = 0.75;
    const rect = container.getBoundingClientRect();
    const newPanX = (rect.width - canvasDimensions.width * defaultZoom) / 2;
    const newPanY = (rect.height - canvasDimensions.height * defaultZoom) / 2;

    // Update refs directly for immediate visual feedback
    zoomRef.current = defaultZoom;
    panRef.current = { x: newPanX, y: newPanY };
    applyTransform();

    // Sync to React state
    setZoom(defaultZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [canvasDimensions]);

  return {
    paperSize,
    orientation,
    paperEnabled,
    customWidth,
    customHeight,
    snapToGrid,
    showRatioOverlay,
    gridSize,
    canvasDimensions,
    handlePaperSizeChange,
    handleOrientationChange,
    setPaperEnabled,
    handleCustomSizeChange,
    toggleSnapToGrid,
    toggleRatioOverlay,
    centerPage,
    PAPER_SIZES,
  };
}
