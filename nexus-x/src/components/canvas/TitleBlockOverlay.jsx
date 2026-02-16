import { memo, useMemo, useState, useCallback, useRef, useEffect } from 'react';

// Default section heights (as percentages of total height)
const DEFAULT_SECTION_HEIGHTS = {
  logo: 6,
  drawingBy: 5,
  legend: 10,
  notes: 15,
  revision: 12,
  issue: 12,
  project: 6,
  scaleRow: 6,
  // sheetTitle takes remaining space
};

// Title block configuration
const TITLE_BLOCK_CONFIG = {
  columns: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
  rows: [1, 2, 3, 4, 5, 6],
  labelSize: 20,
  minRightPanelWidth: 150,
  maxRightPanelWidth: 400,
  defaultRightPanelWidth: 200,
};

// Editable text field component - NO zoom scaling, fixed to paper coordinates
const EditableField = memo(({ x, y, width, height, value, fieldName, onSave, fontSize = 10, fontWeight = 'normal', placeholder = '', textAlign = 'left', color = '#000', multiline = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  const handleDoubleClick = useCallback((e) => {
    e.stopPropagation();
    setIsEditing(true);
  }, []);

  const handleSave = useCallback(() => {
    onSave(fieldName, editValue);
    setIsEditing(false);
  }, [fieldName, editValue, onSave]);

  const handleKeyDown = useCallback((e) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !multiline) {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value || '');
      setIsEditing(false);
    }
  }, [handleSave, value, multiline]);

  const isLight = color === '#000' || color === 'black';

  const stopClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return (
    <foreignObject x={x} y={y} width={width} height={height} style={{ overflow: 'visible' }}>
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: multiline ? 'flex-start' : 'center',
          justifyContent: textAlign === 'center' ? 'center' : 'flex-start',
          pointerEvents: 'auto',
        }}
      >
        {isEditing ? (
          multiline ? (
            <textarea
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              onClick={stopClick}
              onMouseDown={stopClick}
              style={{
                width: '100%',
                height: '100%',
                fontSize,
                fontWeight,
                fontFamily: 'Arial, sans-serif',
                padding: 2,
                border: '1px solid #06b6d4',
                borderRadius: 2,
                outline: 'none',
                backgroundColor: isLight ? '#fff' : '#27272a',
                color: isLight ? '#000' : '#fff',
                boxSizing: 'border-box',
                resize: 'none',
              }}
            />
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              onClick={stopClick}
              onMouseDown={stopClick}
              style={{
                width: '100%',
                height: '100%',
                fontSize,
                fontWeight,
                fontFamily: 'Arial, sans-serif',
                padding: '0 2px',
                border: '1px solid #06b6d4',
                borderRadius: 2,
                outline: 'none',
                backgroundColor: isLight ? '#fff' : '#27272a',
                color: isLight ? '#000' : '#fff',
                boxSizing: 'border-box',
                textAlign,
              }}
            />
          )
        ) : (
          <span
            onDoubleClick={handleDoubleClick}
            onMouseDown={stopClick}
            onClick={stopClick}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: multiline ? 'flex-start' : 'center',
              justifyContent: textAlign === 'center' ? 'center' : 'flex-start',
              fontSize,
              fontWeight,
              fontFamily: 'Arial, sans-serif',
              cursor: 'text',
              padding: multiline ? 2 : '0 2px',
              color: value ? color : '#666',
              userSelect: 'none',
              overflow: 'hidden',
              textOverflow: multiline ? 'clip' : 'ellipsis',
              whiteSpace: multiline ? 'pre-wrap' : 'nowrap',
              wordBreak: multiline ? 'break-word' : 'normal',
            }}
            title="Double-click to edit"
          >
            {value || placeholder}
          </span>
        )}
      </div>
    </foreignObject>
  );
});
EditableField.displayName = 'EditableField';

// Resize handle component for sections
const ResizeHandle = memo(({ x, y, width, direction, onResize, cursor }) => {
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    const startY = e.clientY;
    const startX = e.clientX;

    const handleMouseMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const deltaX = moveEvent.clientX - startX;
      onResize(direction === 'horizontal' ? deltaY : deltaX);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onResize, direction]);

  const handleSize = 8;

  return (
    <rect
      x={x - (direction === 'vertical' ? handleSize / 2 : 0)}
      y={y - (direction === 'horizontal' ? handleSize / 2 : 0)}
      width={direction === 'horizontal' ? width : handleSize}
      height={direction === 'horizontal' ? handleSize : width}
      fill="transparent"
      style={{ cursor, pointerEvents: 'auto' }}
      onMouseDown={handleMouseDown}
    />
  );
});
ResizeHandle.displayName = 'ResizeHandle';

function TitleBlockOverlayInner({
  pages,
  zoom,
  visible,
  showGrid,
  titleBlockData,
  onTitleBlockDataChange,
  darkMode = true,
}) {
  const bounds = useMemo(() => {
    if (pages.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    const minX = Math.min(...pages.map(p => p.x));
    const minY = Math.min(...pages.map(p => p.y));
    const maxX = Math.max(...pages.map(p => p.x + p.width));
    const maxY = Math.max(...pages.map(p => p.y + p.height));
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }, [pages]);

  // Get section heights from data or use defaults
  const sectionHeights = titleBlockData?.sectionHeights || DEFAULT_SECTION_HEIGHTS;
  const rightPanelWidth = titleBlockData?.rightPanelWidth || TITLE_BLOCK_CONFIG.defaultRightPanelWidth;

  // NO zoom scaling - fixed paper coordinates
  const strokeWidth = 1.5;
  const thinStroke = 0.75;
  const config = TITLE_BLOCK_CONFIG;

  // Colors based on mode
  const borderColor = darkMode ? '#3f3f46' : '#000';
  const textColor = darkMode ? '#a1a1aa' : '#000';
  const bgColor = darkMode ? '#18181b' : 'white';
  const panelBg = darkMode ? '#1f1f23' : 'white';
  const headerBg = darkMode ? '#27272a' : '#f0f0f0';

  // Fixed paper dimensions
  const rp = rightPanelWidth;
  const ls = config.labelSize;

  // Drawing area
  const drawingArea = useMemo(() => ({
    x: ls,
    y: ls,
    width: bounds.width - rp - ls,
    height: bounds.height - ls,
  }), [bounds, ls, rp]);

  const colWidth = drawingArea.width / config.columns.length;
  const rowHeight = drawingArea.height / config.rows.length;

  const handleFieldSave = useCallback((fieldName, value) => {
    onTitleBlockDataChange?.({
      ...titleBlockData,
      [fieldName]: value,
    });
  }, [titleBlockData, onTitleBlockDataChange]);

  // Handle section resize - convert screen delta to paper delta using zoom
  const handleSectionResize = useCallback((sectionName, screenDelta) => {
    const totalHeight = bounds.height;
    const paperDelta = screenDelta / zoom; // Convert screen pixels to paper pixels
    const deltaPercent = (paperDelta / totalHeight) * 100;

    const newHeights = { ...sectionHeights };
    const currentHeight = newHeights[sectionName] || DEFAULT_SECTION_HEIGHTS[sectionName];
    const newHeight = Math.max(3, Math.min(30, currentHeight + deltaPercent));
    newHeights[sectionName] = newHeight;

    onTitleBlockDataChange?.({
      ...titleBlockData,
      sectionHeights: newHeights,
    });
  }, [bounds.height, zoom, sectionHeights, titleBlockData, onTitleBlockDataChange]);

  // Handle right panel width resize
  const handlePanelWidthResize = useCallback((screenDelta) => {
    const paperDelta = screenDelta / zoom; // Convert screen pixels to paper pixels
    const newWidth = Math.max(
      config.minRightPanelWidth,
      Math.min(config.maxRightPanelWidth, rightPanelWidth - paperDelta)
    );
    onTitleBlockDataChange?.({
      ...titleBlockData,
      rightPanelWidth: newWidth,
    });
  }, [zoom, rightPanelWidth, titleBlockData, onTitleBlockDataChange, config]);

  if (!visible || pages.length === 0) return null;

  const data = titleBlockData || {};

  // Right panel positioning
  const rpX = bounds.width - rp;
  const rpW = rp + ls;

  // Calculate section Y positions based on percentages
  const totalHeight = bounds.height;
  const getHeight = (name) => ((sectionHeights[name] || DEFAULT_SECTION_HEIGHTS[name]) / 100) * totalHeight;

  let y = 0;
  const logoY = y; const logoH = getHeight('logo'); y += logoH;
  const drawingByY = y; const drawingByH = getHeight('drawingBy'); y += drawingByH;
  const legendY = y; const legendH = getHeight('legend'); y += legendH;
  const notesY = y; const notesH = getHeight('notes'); y += notesH;
  const revisionY = y; const revisionH = getHeight('revision'); y += revisionH;
  const issueY = y; const issueH = getHeight('issue'); y += issueH;
  const projectY = y; const projectH = getHeight('project'); y += projectH;
  const scaleRowY = y; const scaleRowH = getHeight('scaleRow'); y += scaleRowH;
  const sheetTitleY = y; const sheetTitleH = totalHeight - y + ls;

  // Fixed font sizes (paper coordinates)
  const labelFont = 10;
  const smallFont = 7;
  const tinyFont = 6;
  const headerFont = 8;
  const logoFont = 14;
  const tableHeaderH = 12;
  const tableRowH = Math.max(10, (revisionH - tableHeaderH * 2) / 5);

  return (
    <svg
      style={{
        position: 'absolute',
        left: bounds.x - ls,
        top: bounds.y - ls,
        width: bounds.width + ls,
        height: bounds.height + ls,
        pointerEvents: 'none',
        zIndex: 5,
        overflow: 'visible',
      }}
    >
      {/* Main drawing area border - NO FILL so nodes show through */}
      <rect
        x={ls} y={ls}
        width={drawingArea.width}
        height={drawingArea.height}
        fill="none" stroke={borderColor} strokeWidth={strokeWidth * 2}
      />

      {/* Column labels - TOP */}
      {config.columns.map((col, i) => (
        <g key={`col-top-${col}`}>
          <rect x={ls + i * colWidth} y={0} width={colWidth} height={ls} fill={bgColor} stroke={borderColor} strokeWidth={thinStroke} />
          <text x={ls + i * colWidth + colWidth / 2} y={ls / 2 + labelFont / 3} fill={textColor} fontSize={labelFont} fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">{col}</text>
        </g>
      ))}

      {/* Column labels - BOTTOM */}
      {config.columns.map((col, i) => (
        <g key={`col-bot-${col}`}>
          <rect x={ls + i * colWidth} y={bounds.height} width={colWidth} height={ls} fill={bgColor} stroke={borderColor} strokeWidth={thinStroke} />
          <text x={ls + i * colWidth + colWidth / 2} y={bounds.height + ls / 2 + labelFont / 3} fill={textColor} fontSize={labelFont} fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">{col}</text>
        </g>
      ))}

      {/* Row labels - LEFT */}
      {config.rows.map((row, i) => (
        <g key={`row-left-${row}`}>
          <rect x={0} y={ls + i * rowHeight} width={ls} height={rowHeight} fill={bgColor} stroke={borderColor} strokeWidth={thinStroke} />
          <text x={ls / 2} y={ls + i * rowHeight + rowHeight / 2 + labelFont / 3} fill={textColor} fontSize={labelFont} fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">{row}</text>
        </g>
      ))}

      {/* Row labels - RIGHT */}
      {config.rows.map((row, i) => (
        <g key={`row-right-${row}`}>
          <rect x={bounds.width} y={ls + i * rowHeight} width={ls} height={rowHeight} fill={bgColor} stroke={borderColor} strokeWidth={thinStroke} />
          <text x={bounds.width + ls / 2} y={ls + i * rowHeight + rowHeight / 2 + labelFont / 3} fill={textColor} fontSize={labelFont} fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">{row}</text>
        </g>
      ))}

      {/* Grid lines */}
      {showGrid && (
        <g>
          {config.columns.slice(1).map((_, i) => (
            <line key={`grid-v-${i}`} x1={ls + (i + 1) * colWidth} y1={ls} x2={ls + (i + 1) * colWidth} y2={ls + drawingArea.height} stroke={borderColor} strokeWidth={thinStroke} strokeDasharray="4 4" />
          ))}
          {config.rows.slice(1).map((_, i) => (
            <line key={`grid-h-${i}`} x1={ls} y1={ls + (i + 1) * rowHeight} x2={ls + drawingArea.width} y2={ls + (i + 1) * rowHeight} stroke={borderColor} strokeWidth={thinStroke} strokeDasharray="4 4" />
          ))}
        </g>
      )}

      {/* ===== RIGHT PANEL ===== */}
      <rect x={rpX} y={0} width={rpW} height={bounds.height + ls} fill={panelBg} stroke={borderColor} strokeWidth={strokeWidth * 2} />

      {/* Panel width resize handle */}
      <ResizeHandle x={rpX} y={0} width={bounds.height + ls} direction="vertical" onResize={handlePanelWidthResize} cursor="ew-resize" />

      {/* APEX Logo */}
      <rect x={rpX} y={logoY} width={rpW} height={logoH} fill="#1a1a1a" stroke={borderColor} strokeWidth={thinStroke} />
      <g transform={`translate(${rpX + 8}, ${logoY + 6}) scale(0.5)`}>
        <circle cx="30" cy="30" r="28" fill="none" stroke="#fff" strokeWidth="3" />
        <path d="M30 10 L46 50 L38 50 L34 40 L26 40 L22 50 L14 50 Z M30 22 L26 36 L34 36 Z" fill="#fff" />
      </g>
      <text x={rpX + 45} y={logoY + logoH * 0.45} fill="#fff" fontSize={logoFont} fontFamily="Arial Black, Arial, sans-serif" fontWeight="bold" letterSpacing={2}>APEX</text>
      <text x={rpX + 45} y={logoY + logoH * 0.75} fill="#888" fontSize={tinyFont} fontFamily="Arial, sans-serif" letterSpacing={1}>SOUND &amp; LIGHT</text>
      <ResizeHandle x={rpX} y={logoY + logoH} width={rpW} direction="horizontal" onResize={(d) => handleSectionResize('logo', d)} cursor="ns-resize" />

      {/* DRAWING BY / VENUE */}
      <rect x={rpX} y={drawingByY} width={rpW} height={drawingByH} fill={panelBg} stroke={borderColor} strokeWidth={thinStroke} />
      <text x={rpX + 4} y={drawingByY + smallFont + 2} fill={textColor} fontSize={smallFont} fontFamily="Arial, sans-serif">DRAWING BY . . . . . .</text>
      <EditableField x={rpX + 70} y={drawingByY + 1} width={rpW - 75} height={drawingByH / 2 - 2} value={data.drawingBy} fieldName="drawingBy" onSave={handleFieldSave} fontSize={7} color={textColor} />
      <text x={rpX + 4} y={drawingByY + drawingByH / 2 + smallFont + 2} fill={textColor} fontSize={smallFont} fontFamily="Arial, sans-serif">VENUE . . . . . . . . . . . .</text>
      <EditableField x={rpX + 70} y={drawingByY + drawingByH / 2} width={rpW - 75} height={drawingByH / 2 - 2} value={data.venue} fieldName="venue" onSave={handleFieldSave} fontSize={7} color={textColor} />
      <ResizeHandle x={rpX} y={drawingByY + drawingByH} width={rpW} direction="horizontal" onResize={(d) => handleSectionResize('drawingBy', d)} cursor="ns-resize" />

      {/* LEGEND KEY */}
      <rect x={rpX} y={legendY} width={rpW} height={legendH} fill={panelBg} stroke={borderColor} strokeWidth={thinStroke} />
      <text x={rpX + rpW / 2} y={legendY + headerFont + 2} fill={textColor} fontSize={headerFont} fontFamily="Arial, sans-serif" textAnchor="middle" fontWeight="bold">LEGEND KEY</text>
      <line x1={rpX} y1={legendY + 14} x2={rpX + rpW} y2={legendY + 14} stroke={borderColor} strokeWidth={thinStroke} />
      <EditableField x={rpX + 4} y={legendY + 16} width={rpW - 8} height={legendH - 20} value={data.legendKey} fieldName="legendKey" onSave={handleFieldSave} fontSize={6} color={textColor} multiline />
      <ResizeHandle x={rpX} y={legendY + legendH} width={rpW} direction="horizontal" onResize={(d) => handleSectionResize('legend', d)} cursor="ns-resize" />

      {/* GENERAL NOTES */}
      <rect x={rpX} y={notesY} width={rpW} height={notesH} fill={panelBg} stroke={borderColor} strokeWidth={thinStroke} />
      <text x={rpX + 4} y={notesY + smallFont + 2} fill={textColor} fontSize={smallFont} fontFamily="Arial, sans-serif">GENERAL NOTES:</text>
      <EditableField x={rpX + 4} y={notesY + 12} width={rpW - 8} height={notesH - 16} value={data.generalNotes} fieldName="generalNotes" onSave={handleFieldSave} fontSize={6} color={textColor} multiline />
      <ResizeHandle x={rpX} y={notesY + notesH} width={rpW} direction="horizontal" onResize={(d) => handleSectionResize('notes', d)} cursor="ns-resize" />

      {/* REVISION HISTORY */}
      <rect x={rpX} y={revisionY} width={rpW} height={revisionH} fill={panelBg} stroke={borderColor} strokeWidth={thinStroke} />
      <rect x={rpX} y={revisionY} width={rpW} height={tableHeaderH} fill={headerBg} stroke={borderColor} strokeWidth={thinStroke} />
      <text x={rpX + rpW / 2} y={revisionY + headerFont} fill={textColor} fontSize={headerFont} fontFamily="Arial, sans-serif" textAnchor="middle" fontWeight="bold">REVISION HISTORY</text>
      <line x1={rpX} y1={revisionY + tableHeaderH} x2={rpX + rpW} y2={revisionY + tableHeaderH} stroke={borderColor} strokeWidth={thinStroke} />
      <text x={rpX + 8} y={revisionY + tableHeaderH + tinyFont + 2} fill={textColor} fontSize={tinyFont} fontFamily="Arial, sans-serif">NO.</text>
      <text x={rpX + 35} y={revisionY + tableHeaderH + tinyFont + 2} fill={textColor} fontSize={tinyFont} fontFamily="Arial, sans-serif">REVISION</text>
      <text x={rpX + 110} y={revisionY + tableHeaderH + tinyFont + 2} fill={textColor} fontSize={tinyFont} fontFamily="Arial, sans-serif">DATE</text>
      <text x={rpX + 165} y={revisionY + tableHeaderH + tinyFont + 2} fill={textColor} fontSize={tinyFont} fontFamily="Arial, sans-serif">BY</text>
      <line x1={rpX} y1={revisionY + tableHeaderH + tableRowH} x2={rpX + rpW} y2={revisionY + tableHeaderH + tableRowH} stroke={borderColor} strokeWidth={thinStroke} />
      <line x1={rpX + 25} y1={revisionY + tableHeaderH} x2={rpX + 25} y2={revisionY + revisionH} stroke={borderColor} strokeWidth={thinStroke} />
      <line x1={rpX + 100} y1={revisionY + tableHeaderH} x2={rpX + 100} y2={revisionY + revisionH} stroke={borderColor} strokeWidth={thinStroke} />
      <line x1={rpX + 155} y1={revisionY + tableHeaderH} x2={rpX + 155} y2={revisionY + revisionH} stroke={borderColor} strokeWidth={thinStroke} />
      {[2, 3, 4, 5].map(i => (
        <line key={`rev-row-${i}`} x1={rpX} y1={revisionY + tableHeaderH + i * tableRowH} x2={rpX + rpW} y2={revisionY + tableHeaderH + i * tableRowH} stroke={borderColor} strokeWidth={thinStroke * 0.5} />
      ))}
      <ResizeHandle x={rpX} y={revisionY + revisionH} width={rpW} direction="horizontal" onResize={(d) => handleSectionResize('revision', d)} cursor="ns-resize" />

      {/* ISSUE HISTORY */}
      <rect x={rpX} y={issueY} width={rpW} height={issueH} fill={panelBg} stroke={borderColor} strokeWidth={thinStroke} />
      <rect x={rpX} y={issueY} width={rpW} height={tableHeaderH} fill={headerBg} stroke={borderColor} strokeWidth={thinStroke} />
      <text x={rpX + rpW / 2} y={issueY + headerFont} fill={textColor} fontSize={headerFont} fontFamily="Arial, sans-serif" textAnchor="middle" fontWeight="bold">ISSUE HISTORY</text>
      <line x1={rpX} y1={issueY + tableHeaderH} x2={rpX + rpW} y2={issueY + tableHeaderH} stroke={borderColor} strokeWidth={thinStroke} />
      <text x={rpX + 8} y={issueY + tableHeaderH + tinyFont + 2} fill={textColor} fontSize={tinyFont} fontFamily="Arial, sans-serif">NO.</text>
      <text x={rpX + 35} y={issueY + tableHeaderH + tinyFont + 2} fill={textColor} fontSize={tinyFont} fontFamily="Arial, sans-serif">ISSUE</text>
      <text x={rpX + 110} y={issueY + tableHeaderH + tinyFont + 2} fill={textColor} fontSize={tinyFont} fontFamily="Arial, sans-serif">DATE</text>
      <text x={rpX + 165} y={issueY + tableHeaderH + tinyFont + 2} fill={textColor} fontSize={tinyFont} fontFamily="Arial, sans-serif">BY</text>
      <line x1={rpX} y1={issueY + tableHeaderH + tableRowH} x2={rpX + rpW} y2={issueY + tableHeaderH + tableRowH} stroke={borderColor} strokeWidth={thinStroke} />
      <line x1={rpX + 25} y1={issueY + tableHeaderH} x2={rpX + 25} y2={issueY + issueH} stroke={borderColor} strokeWidth={thinStroke} />
      <line x1={rpX + 100} y1={issueY + tableHeaderH} x2={rpX + 100} y2={issueY + issueH} stroke={borderColor} strokeWidth={thinStroke} />
      <line x1={rpX + 155} y1={issueY + tableHeaderH} x2={rpX + 155} y2={issueY + issueH} stroke={borderColor} strokeWidth={thinStroke} />
      {[2, 3, 4, 5].map(i => (
        <line key={`issue-row-${i}`} x1={rpX} y1={issueY + tableHeaderH + i * tableRowH} x2={rpX + rpW} y2={issueY + tableHeaderH + i * tableRowH} stroke={borderColor} strokeWidth={thinStroke * 0.5} />
      ))}
      <ResizeHandle x={rpX} y={issueY + issueH} width={rpW} direction="horizontal" onResize={(d) => handleSectionResize('issue', d)} cursor="ns-resize" />

      {/* PROJECT */}
      <rect x={rpX} y={projectY} width={rpW} height={projectH} fill={panelBg} stroke={borderColor} strokeWidth={thinStroke} />
      <text x={rpX + 4} y={projectY + smallFont + 2} fill={textColor} fontSize={smallFont} fontFamily="Arial, sans-serif">PROJECT:</text>
      <EditableField x={rpX + 4} y={projectY + 10} width={rpW - 8} height={projectH - 14} value={data.project} fieldName="project" onSave={handleFieldSave} fontSize={9} fontWeight="bold" color={textColor} />
      <ResizeHandle x={rpX} y={projectY + projectH} width={rpW} direction="horizontal" onResize={(d) => handleSectionResize('project', d)} cursor="ns-resize" />

      {/* SCALE / SHT # / PG SIZE */}
      <rect x={rpX} y={scaleRowY} width={rpW / 2} height={scaleRowH} fill={panelBg} stroke={borderColor} strokeWidth={thinStroke} />
      <text x={rpX + 4} y={scaleRowY + tinyFont + 1} fill={textColor} fontSize={tinyFont} fontFamily="Arial, sans-serif">SCALE:</text>
      <EditableField x={rpX + 4} y={scaleRowY + 8} width={rpW / 2 - 8} height={14} value={data.scale} fieldName="scale" onSave={handleFieldSave} fontSize={10} fontWeight="bold" placeholder="CUSTOM" color={textColor} />
      <text x={rpX + 4} y={scaleRowY + scaleRowH - 4} fill="#666" fontSize={tinyFont * 0.85} fontFamily="Arial, sans-serif" fontStyle="italic">UNLESS NOTED</text>

      <rect x={rpX + rpW / 2} y={scaleRowY} width={rpW / 4} height={scaleRowH / 2} fill={panelBg} stroke={borderColor} strokeWidth={thinStroke} />
      <text x={rpX + rpW / 2 + 3} y={scaleRowY + tinyFont + 1} fill={textColor} fontSize={tinyFont} fontFamily="Arial, sans-serif">SHT #:</text>
      <EditableField x={rpX + rpW / 2 + 30} y={scaleRowY + 2} width={rpW / 4 - 35} height={scaleRowH / 2 - 4} value={data.sheetNumber} fieldName="sheetNumber" onSave={handleFieldSave} fontSize={10} fontWeight="bold" placeholder="1" textAlign="center" color={textColor} />

      <rect x={rpX + rpW * 3 / 4} y={scaleRowY} width={rpW / 4} height={scaleRowH / 2} fill={panelBg} stroke={borderColor} strokeWidth={thinStroke} />
      <text x={rpX + rpW * 3 / 4 + 3} y={scaleRowY + tinyFont} fill={textColor} fontSize={tinyFont * 0.85} fontFamily="Arial, sans-serif">PG SIZE:</text>
      <EditableField x={rpX + rpW * 3 / 4 + 3} y={scaleRowY + 7} width={rpW / 4 - 6} height={scaleRowH / 2 - 10} value={data.pageSize} fieldName="pageSize" onSave={handleFieldSave} fontSize={7} fontWeight="bold" placeholder="ASME B" color={textColor} />

      <rect x={rpX + rpW / 2} y={scaleRowY + scaleRowH / 2} width={rpW / 4} height={scaleRowH / 2} fill={panelBg} stroke={borderColor} strokeWidth={thinStroke} />
      <text x={rpX + rpW / 2 + rpW / 8} y={scaleRowY + scaleRowH / 2 + scaleRowH / 4 + smallFont / 3} fill={textColor} fontSize={smallFont} fontFamily="Arial, sans-serif" textAnchor="middle" fontWeight="bold">ISSUE</text>

      <rect x={rpX + rpW * 3 / 4} y={scaleRowY + scaleRowH / 2} width={rpW / 4} height={scaleRowH / 2} fill={panelBg} stroke={borderColor} strokeWidth={thinStroke} />
      <text x={rpX + rpW * 7 / 8} y={scaleRowY + scaleRowH / 2 + scaleRowH / 4 + smallFont / 3} fill={textColor} fontSize={smallFont} fontFamily="Arial, sans-serif" textAnchor="middle" fontWeight="bold">REVISION</text>
      <ResizeHandle x={rpX} y={scaleRowY + scaleRowH} width={rpW} direction="horizontal" onResize={(d) => handleSectionResize('scaleRow', d)} cursor="ns-resize" />

      {/* SHEET TITLE */}
      <rect x={rpX} y={sheetTitleY} width={rpW} height={sheetTitleH} fill={panelBg} stroke={borderColor} strokeWidth={thinStroke} />
      <text x={rpX + 4} y={sheetTitleY + smallFont + 2} fill={textColor} fontSize={smallFont} fontFamily="Arial, sans-serif">SHT:</text>
      <EditableField x={rpX + 4} y={sheetTitleY + 10} width={rpW - 8} height={sheetTitleH - 14} value={data.sheetTitle} fieldName="sheetTitle" onSave={handleFieldSave} fontSize={8} color={textColor} multiline />
    </svg>
  );
}

export default memo(TitleBlockOverlayInner);
