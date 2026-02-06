import { useCallback, useState, useMemo } from 'react';

// Paper size constants (96 DPI for print, 1:1 pixels for video)
const PAPER_SIZES = {
  // Print sizes (96 DPI)
  'ANSI_A': { width: 816, height: 1056, label: 'Letter (8.5×11)' },
  'ANSI_B': { width: 1056, height: 1632, label: 'Tabloid (11×17)' },
  'ANSI_C': { width: 1632, height: 2112, label: 'ANSI C (17×22)' },
  'ANSI_D': { width: 2112, height: 3264, label: 'ANSI D (22×34)' },
  'A4': { width: 794, height: 1123, label: 'A4' },
  'A3': { width: 1123, height: 1588, label: 'A3' },
  // Video resolutions (1:1 pixels)
  'HD': { width: 1920, height: 1080, label: 'HD (1920×1080)' },
  'UHD': { width: 3840, height: 2160, label: 'UHD 4K (3840×2160)' },
  'DCI_2K': { width: 2048, height: 1080, label: 'DCI 2K (2048×1080)' },
  'DCI_4K': { width: 4096, height: 2160, label: 'DCI 4K (4096×2160)' },
  // Custom
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

  // Toggle orientation using functional update (avoids stale closure issues)
  const toggleOrientation = useCallback(() => {
    setOrientation(prev => {
      const next = prev === 'portrait' ? 'landscape' : 'portrait';
      localStorage.setItem('nx-orientation', next);
      return next;
    });
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

  // Center the origin page in the viewport, fitting it with padding
  // Accepts refs and setters from App.jsx to update both DOM and React state
  const centerPage = useCallback((containerRef, zoomRef, panRef, applyTransform, setZoom, setPan) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const padding = 0.85; // 85% of viewport — leaves breathing room around the page
    const fitZoomX = (rect.width * padding) / canvasDimensions.width;
    const fitZoomY = (rect.height * padding) / canvasDimensions.height;
    const fitZoom = Math.min(fitZoomX, fitZoomY, 1.0); // fit to viewport, never exceed 100%

    const newPanX = (rect.width - canvasDimensions.width * fitZoom) / 2;
    const newPanY = (rect.height - canvasDimensions.height * fitZoom) / 2;

    // Update refs directly for immediate visual feedback
    zoomRef.current = fitZoom;
    panRef.current = { x: newPanX, y: newPanY };
    applyTransform();

    // Sync to React state
    setZoom(fitZoom);
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
    toggleOrientation,
    setPaperEnabled,
    handleCustomSizeChange,
    toggleSnapToGrid,
    toggleRatioOverlay,
    centerPage,
    PAPER_SIZES,
  };
}
