import { memo, useMemo, useState, useCallback, useRef, useEffect } from 'react';

// Title block dimensions for 11x17 (ANSI B) at 96 DPI
// Page: 1632 x 1056 pixels (landscape)
const TITLE_BLOCK_CONFIG = {
  rightPanelWidth: 220,
  margin: 20,
  columns: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
  rows: [1, 2, 3, 4, 5, 6],
  labelHeight: 24,
  labelWidth: 24,
};

// Editable text field component using foreignObject
const EditableField = memo(({ x, y, width, height, value, fieldName, zoom, onSave, fontSize = 10, fontWeight = 'normal', placeholder = '' }) => {
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
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value || '');
      setIsEditing(false);
    }
  }, [handleSave, value]);

  const scaledFontSize = fontSize / zoom;
  const padding = 2 / zoom;

  // Stop clicks only when editing to prevent canvas interaction
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
          alignItems: 'center',
          pointerEvents: 'auto',
        }}
      >
        {isEditing ? (
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
              fontSize: scaledFontSize,
              fontWeight,
              fontFamily: 'Arial, sans-serif',
              padding: `0 ${padding}px`,
              border: `${1/zoom}px solid #06b6d4`,
              borderRadius: 2/zoom,
              outline: 'none',
              backgroundColor: '#fff',
              color: '#000',
              boxSizing: 'border-box',
            }}
          />
        ) : (
          <span
            onDoubleClick={handleDoubleClick}
            onMouseDown={stopClick}
            onClick={stopClick}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              fontSize: scaledFontSize,
              fontWeight,
              fontFamily: 'Arial, sans-serif',
              cursor: 'text',
              padding: `0 ${padding}px`,
              color: value ? '#000' : '#999',
              cursor: 'text',
              userSelect: 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
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

function TitleBlockOverlayInner({
  pages,
  zoom,
  visible,
  showGrid,
  titleBlockData,
  onTitleBlockDataChange,
}) {
  const bounds = useMemo(() => {
    if (pages.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    const minX = Math.min(...pages.map(p => p.x));
    const minY = Math.min(...pages.map(p => p.y));
    const maxX = Math.max(...pages.map(p => p.x + p.width));
    const maxY = Math.max(...pages.map(p => p.y + p.height));
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }, [pages]);

  const strokeWidth = 1 / zoom;
  const thinStroke = 0.5 / zoom;
  const fontSize = 10 / zoom;
  const smallFontSize = 8 / zoom;
  const labelFontSize = 12 / zoom;

  const config = TITLE_BLOCK_CONFIG;
  const rp = config.rightPanelWidth / zoom;
  const lh = config.labelHeight / zoom;
  const lw = config.labelWidth / zoom;

  const drawingArea = useMemo(() => ({
    x: bounds.x + lw,
    y: bounds.y + lh,
    width: bounds.width - lw * 2 - rp,
    height: bounds.height - lh * 2,
  }), [bounds, lw, lh, rp]);

  const colWidth = useMemo(() => drawingArea.width / config.columns.length, [drawingArea.width, config.columns.length]);
  const rowHeight = useMemo(() => drawingArea.height / config.rows.length, [drawingArea.height, config.rows.length]);

  const handleFieldSave = useCallback((fieldName, value) => {
    onTitleBlockDataChange?.({
      ...titleBlockData,
      [fieldName]: value,
    });
  }, [titleBlockData, onTitleBlockDataChange]);

  if (!visible || pages.length === 0) return null;

  const data = titleBlockData || {};

  // Right panel positioning
  const rpX = bounds.width - rp;
  const rpW = rp + lw;
  const boxPadding = 4 / zoom;
  const smallBoxHeight = 40 / zoom;
  const mediumBoxHeight = 80 / zoom;
  const largeBoxHeight = 120 / zoom;
  const tableBoxHeight = 100 / zoom;
  const logoHeight = 50 / zoom;

  // Calculate y positions for each section
  let yPos = lh;
  const logoY = yPos;
  yPos += logoHeight;
  const drawingByY = yPos;
  yPos += smallBoxHeight;
  const legendY = yPos;
  yPos += mediumBoxHeight;
  const notesY = yPos;
  yPos += largeBoxHeight;
  const revisionY = yPos;
  yPos += tableBoxHeight;
  const issueY = yPos;
  yPos += tableBoxHeight;
  const projectY = yPos;
  yPos += smallBoxHeight;
  const scaleY = yPos;
  yPos += smallBoxHeight;
  const sheetTitleY = yPos;

  return (
    <svg
      style={{
        position: 'absolute',
        left: bounds.x - lw,
        top: bounds.y - lh,
        width: bounds.width + lw * 2,
        height: bounds.height + lh * 2,
        pointerEvents: 'none',
        zIndex: 5,
        overflow: 'visible',
      }}
    >
      {/* White background */}
      <rect x={0} y={0} width={bounds.width + lw * 2} height={bounds.height + lh * 2} fill="white" />

      {/* Outer border */}
      <rect x={lw} y={lh} width={bounds.width - rp} height={bounds.height} fill="none" stroke="#000" strokeWidth={strokeWidth * 2} />

      {/* Right panel border */}
      <rect x={rpX} y={lh} width={rpW} height={bounds.height} fill="white" stroke="#000" strokeWidth={strokeWidth * 2} />

      {/* Column labels - Top */}
      {config.columns.map((col, i) => (
        <g key={`col-top-${col}`}>
          <rect x={lw + i * colWidth} y={0} width={colWidth} height={lh} fill="white" stroke="#000" strokeWidth={thinStroke} />
          <text x={lw + i * colWidth + colWidth / 2} y={lh / 2 + labelFontSize / 3} fill="#000" fontSize={labelFontSize} fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">{col}</text>
        </g>
      ))}

      {/* Column labels - Bottom */}
      {config.columns.map((col, i) => (
        <g key={`col-bot-${col}`}>
          <rect x={lw + i * colWidth} y={bounds.height + lh} width={colWidth} height={lh} fill="white" stroke="#000" strokeWidth={thinStroke} />
          <text x={lw + i * colWidth + colWidth / 2} y={bounds.height + lh + lh / 2 + labelFontSize / 3} fill="#000" fontSize={labelFontSize} fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">{col}</text>
        </g>
      ))}

      {/* Row labels - Left */}
      {config.rows.map((row, i) => (
        <g key={`row-left-${row}`}>
          <rect x={0} y={lh + i * rowHeight} width={lw} height={rowHeight} fill="white" stroke="#000" strokeWidth={thinStroke} />
          <text x={lw / 2} y={lh + i * rowHeight + rowHeight / 2 + labelFontSize / 3} fill="#000" fontSize={labelFontSize} fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">{row}</text>
        </g>
      ))}

      {/* Row labels - Right */}
      {config.rows.map((row, i) => (
        <g key={`row-right-${row}`}>
          <rect x={bounds.width + lw} y={lh + i * rowHeight} width={lw} height={rowHeight} fill="white" stroke="#000" strokeWidth={thinStroke} />
          <text x={bounds.width + lw + lw / 2} y={lh + i * rowHeight + rowHeight / 2 + labelFontSize / 3} fill="#000" fontSize={labelFontSize} fontFamily="Arial, sans-serif" fontWeight="bold" textAnchor="middle">{row}</text>
        </g>
      ))}

      {/* Grid lines */}
      {showGrid && (
        <g>
          {config.columns.slice(1).map((_, i) => (
            <line key={`grid-v-${i}`} x1={lw + (i + 1) * colWidth} y1={lh} x2={lw + (i + 1) * colWidth} y2={bounds.height + lh} stroke="#ccc" strokeWidth={thinStroke} strokeDasharray={`${4 / zoom} ${4 / zoom}`} />
          ))}
          {config.rows.slice(1).map((_, i) => (
            <line key={`grid-h-${i}`} x1={lw} y1={lh + (i + 1) * rowHeight} x2={bounds.width - rp} y2={lh + (i + 1) * rowHeight} stroke="#ccc" strokeWidth={thinStroke} strokeDasharray={`${4 / zoom} ${4 / zoom}`} />
          ))}
        </g>
      )}

      {/* ===== RIGHT PANEL ===== */}

      {/* APEX Logo */}
      <rect x={rpX} y={logoY} width={rpW} height={logoHeight} fill="#1a1a1a" stroke="#000" strokeWidth={thinStroke} />
      <g transform={`translate(${rpX + 8 / zoom}, ${logoY + 8 / zoom}) scale(${0.6 / zoom})`}>
        <circle cx="25" cy="25" r="24" fill="none" stroke="#fff" strokeWidth="2" />
        <path d="M25 8 L38 42 L32 42 L29 34 L21 34 L18 42 L12 42 Z M25 18 L22 30 L28 30 Z" fill="#fff" />
      </g>
      <text x={rpX + 50 / zoom} y={logoY + 22 / zoom} fill="#fff" fontSize={16 / zoom} fontFamily="Arial Black, Arial, sans-serif" fontWeight="bold" letterSpacing={2 / zoom}>APEX</text>
      <text x={rpX + 50 / zoom} y={logoY + 36 / zoom} fill="#aaa" fontSize={6 / zoom} fontFamily="Arial, sans-serif" letterSpacing={1 / zoom}>SOUND &amp; LIGHT</text>

      {/* Drawing By / Venue */}
      <rect x={rpX} y={drawingByY} width={rpW} height={smallBoxHeight} fill="white" stroke="#000" strokeWidth={thinStroke} />
      <text x={rpX + boxPadding} y={drawingByY + smallFontSize + 2 / zoom} fill="#000" fontSize={smallFontSize} fontFamily="Arial, sans-serif">DRAWING BY:</text>
      <EditableField
        x={rpX + 60 / zoom}
        y={drawingByY + 2 / zoom}
        width={rpW - 65 / zoom}
        height={smallBoxHeight / 2 - 2 / zoom}
        value={data.drawingBy}
        fieldName="drawingBy"
        zoom={zoom}
        onSave={handleFieldSave}
        fontSize={8}
        placeholder="Enter name..."
      />
      <text x={rpX + boxPadding} y={drawingByY + smallFontSize * 2 + 6 / zoom} fill="#000" fontSize={smallFontSize} fontFamily="Arial, sans-serif">VENUE:</text>
      <EditableField
        x={rpX + 40 / zoom}
        y={drawingByY + smallBoxHeight / 2}
        width={rpW - 45 / zoom}
        height={smallBoxHeight / 2 - 2 / zoom}
        value={data.venue}
        fieldName="venue"
        zoom={zoom}
        onSave={handleFieldSave}
        fontSize={8}
        placeholder="Enter venue..."
      />

      {/* Legend Key */}
      <rect x={rpX} y={legendY} width={rpW} height={mediumBoxHeight} fill="white" stroke="#000" strokeWidth={thinStroke} />
      <text x={rpX + rpW / 2} y={legendY + smallFontSize + 2 / zoom} fill="#000" fontSize={smallFontSize} fontFamily="Arial, sans-serif" textAnchor="middle" fontWeight="bold">LEGEND KEY</text>

      {/* General Notes */}
      <rect x={rpX} y={notesY} width={rpW} height={largeBoxHeight} fill="white" stroke="#000" strokeWidth={thinStroke} />
      <text x={rpX + boxPadding} y={notesY + smallFontSize + 2 / zoom} fill="#000" fontSize={smallFontSize} fontFamily="Arial, sans-serif">GENERAL NOTES:</text>
      <EditableField
        x={rpX + boxPadding}
        y={notesY + 14 / zoom}
        width={rpW - boxPadding * 2}
        height={largeBoxHeight - 18 / zoom}
        value={data.generalNotes}
        fieldName="generalNotes"
        zoom={zoom}
        onSave={handleFieldSave}
        fontSize={7}
        placeholder="Enter notes..."
      />

      {/* Revision History */}
      <rect x={rpX} y={revisionY} width={rpW} height={tableBoxHeight} fill="white" stroke="#000" strokeWidth={thinStroke} />
      <text x={rpX + rpW / 2} y={revisionY + smallFontSize + 2 / zoom} fill="#000" fontSize={smallFontSize} fontFamily="Arial, sans-serif" textAnchor="middle" fontWeight="bold">REVISION HISTORY</text>
      <line x1={rpX} y1={revisionY + 14 / zoom} x2={rpX + rpW} y2={revisionY + 14 / zoom} stroke="#000" strokeWidth={thinStroke} />
      <text x={rpX + 10 / zoom} y={revisionY + 22 / zoom} fill="#000" fontSize={smallFontSize * 0.8} fontFamily="Arial, sans-serif">NO.</text>
      <text x={rpX + 40 / zoom} y={revisionY + 22 / zoom} fill="#000" fontSize={smallFontSize * 0.8} fontFamily="Arial, sans-serif">REVISION</text>
      <text x={rpX + 120 / zoom} y={revisionY + 22 / zoom} fill="#000" fontSize={smallFontSize * 0.8} fontFamily="Arial, sans-serif">DATE</text>
      <text x={rpX + 170 / zoom} y={revisionY + 22 / zoom} fill="#000" fontSize={smallFontSize * 0.8} fontFamily="Arial, sans-serif">BY</text>
      <line x1={rpX} y1={revisionY + 26 / zoom} x2={rpX + rpW} y2={revisionY + 26 / zoom} stroke="#000" strokeWidth={thinStroke} />

      {/* Issue History */}
      <rect x={rpX} y={issueY} width={rpW} height={tableBoxHeight} fill="white" stroke="#000" strokeWidth={thinStroke} />
      <text x={rpX + rpW / 2} y={issueY + smallFontSize + 2 / zoom} fill="#000" fontSize={smallFontSize} fontFamily="Arial, sans-serif" textAnchor="middle" fontWeight="bold">ISSUE HISTORY</text>
      <line x1={rpX} y1={issueY + 14 / zoom} x2={rpX + rpW} y2={issueY + 14 / zoom} stroke="#000" strokeWidth={thinStroke} />
      <text x={rpX + 10 / zoom} y={issueY + 22 / zoom} fill="#000" fontSize={smallFontSize * 0.8} fontFamily="Arial, sans-serif">NO.</text>
      <text x={rpX + 40 / zoom} y={issueY + 22 / zoom} fill="#000" fontSize={smallFontSize * 0.8} fontFamily="Arial, sans-serif">ISSUE</text>
      <text x={rpX + 120 / zoom} y={issueY + 22 / zoom} fill="#000" fontSize={smallFontSize * 0.8} fontFamily="Arial, sans-serif">DATE</text>
      <text x={rpX + 170 / zoom} y={issueY + 22 / zoom} fill="#000" fontSize={smallFontSize * 0.8} fontFamily="Arial, sans-serif">BY</text>
      <line x1={rpX} y1={issueY + 26 / zoom} x2={rpX + rpW} y2={issueY + 26 / zoom} stroke="#000" strokeWidth={thinStroke} />

      {/* Project */}
      <rect x={rpX} y={projectY} width={rpW} height={smallBoxHeight} fill="white" stroke="#000" strokeWidth={thinStroke} />
      <text x={rpX + boxPadding} y={projectY + smallFontSize + 2 / zoom} fill="#000" fontSize={smallFontSize} fontFamily="Arial, sans-serif">PROJECT:</text>
      <EditableField
        x={rpX + boxPadding}
        y={projectY + 12 / zoom}
        width={rpW - boxPadding * 2}
        height={smallBoxHeight - 14 / zoom}
        value={data.project}
        fieldName="project"
        zoom={zoom}
        onSave={handleFieldSave}
        fontSize={10}
        fontWeight="bold"
        placeholder="Enter project name..."
      />

      {/* Scale / Sheet # / Page Size row */}
      <rect x={rpX} y={scaleY} width={rpW / 2} height={smallBoxHeight} fill="white" stroke="#000" strokeWidth={thinStroke} />
      <text x={rpX + boxPadding} y={scaleY + smallFontSize} fill="#000" fontSize={smallFontSize * 0.8} fontFamily="Arial, sans-serif">SCALE:</text>
      <EditableField
        x={rpX + boxPadding}
        y={scaleY + 10 / zoom}
        width={rpW / 2 - boxPadding * 2}
        height={16 / zoom}
        value={data.scale}
        fieldName="scale"
        zoom={zoom}
        onSave={handleFieldSave}
        fontSize={10}
        fontWeight="bold"
        placeholder="CUSTOM"
      />
      <text x={rpX + boxPadding} y={scaleY + smallBoxHeight - 4 / zoom} fill="#666" fontSize={smallFontSize * 0.7} fontFamily="Arial, sans-serif" fontStyle="italic">UNLESS NOTED</text>

      {/* Sheet # */}
      <rect x={rpX + rpW / 2} y={scaleY} width={rpW / 4} height={smallBoxHeight / 2} fill="white" stroke="#000" strokeWidth={thinStroke} />
      <text x={rpX + rpW / 2 + boxPadding} y={scaleY + smallFontSize} fill="#000" fontSize={smallFontSize * 0.8} fontFamily="Arial, sans-serif">SHT #:</text>
      <EditableField
        x={rpX + rpW / 2 + 30 / zoom}
        y={scaleY + 2 / zoom}
        width={rpW / 4 - 35 / zoom}
        height={smallBoxHeight / 2 - 4 / zoom}
        value={data.sheetNumber}
        fieldName="sheetNumber"
        zoom={zoom}
        onSave={handleFieldSave}
        fontSize={9}
        fontWeight="bold"
        placeholder="1"
      />

      {/* Page Size */}
      <rect x={rpX + rpW * 3 / 4} y={scaleY} width={rpW / 4} height={smallBoxHeight / 2} fill="white" stroke="#000" strokeWidth={thinStroke} />
      <text x={rpX + rpW * 3 / 4 + boxPadding} y={scaleY + smallFontSize * 0.8} fill="#000" fontSize={smallFontSize * 0.7} fontFamily="Arial, sans-serif">PG SIZE:</text>
      <EditableField
        x={rpX + rpW * 3 / 4 + boxPadding}
        y={scaleY + 8 / zoom}
        width={rpW / 4 - boxPadding * 2}
        height={smallBoxHeight / 2 - 10 / zoom}
        value={data.pageSize}
        fieldName="pageSize"
        zoom={zoom}
        onSave={handleFieldSave}
        fontSize={7}
        fontWeight="bold"
        placeholder="ASME B"
      />

      {/* Issue / Revision boxes */}
      <rect x={rpX + rpW / 2} y={scaleY + smallBoxHeight / 2} width={rpW / 4} height={smallBoxHeight / 2} fill="white" stroke="#000" strokeWidth={thinStroke} />
      <text x={rpX + rpW / 2 + rpW / 8} y={scaleY + smallBoxHeight / 2 + smallFontSize + 4 / zoom} fill="#000" fontSize={smallFontSize} fontFamily="Arial, sans-serif" textAnchor="middle" fontWeight="bold">ISSUE</text>

      <rect x={rpX + rpW * 3 / 4} y={scaleY + smallBoxHeight / 2} width={rpW / 4} height={smallBoxHeight / 2} fill="white" stroke="#000" strokeWidth={thinStroke} />
      <text x={rpX + rpW * 7 / 8} y={scaleY + smallBoxHeight / 2 + smallFontSize + 4 / zoom} fill="#000" fontSize={smallFontSize} fontFamily="Arial, sans-serif" textAnchor="middle" fontWeight="bold">REVISION</text>

      {/* Sheet Title */}
      <rect x={rpX} y={sheetTitleY} width={rpW} height={bounds.height + lh - sheetTitleY} fill="white" stroke="#000" strokeWidth={thinStroke} />
      <text x={rpX + boxPadding} y={sheetTitleY + smallFontSize + 2 / zoom} fill="#000" fontSize={smallFontSize} fontFamily="Arial, sans-serif">SHT:</text>
      <EditableField
        x={rpX + boxPadding}
        y={sheetTitleY + 12 / zoom}
        width={rpW - boxPadding * 2}
        height={bounds.height + lh - sheetTitleY - 14 / zoom}
        value={data.sheetTitle}
        fieldName="sheetTitle"
        zoom={zoom}
        onSave={handleFieldSave}
        fontSize={9}
        placeholder="Enter sheet title..."
      />
    </svg>
  );
}

export default memo(TitleBlockOverlayInner);
