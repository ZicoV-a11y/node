import { memo, useMemo, useState, useCallback } from 'react';

// Title block dimensions for 11x17 (ANSI B) at 96 DPI
// Page: 1632 x 1056 pixels (landscape)
// Based on standard engineering drawing title block layout
const TITLE_BLOCK_CONFIG = {
  // Right panel width (where all the info boxes go)
  rightPanelWidth: 220,
  // Border margins
  margin: 20,
  // Grid labels
  columns: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
  rows: [1, 2, 3, 4, 5, 6],
  // Label area height (for column letters at top/bottom)
  labelHeight: 24,
  // Row label width (for row numbers on sides)
  labelWidth: 24,
};

function TitleBlockOverlayInner({
  pages,
  zoom,
  visible,
  showGrid,
  titleBlockData,
  onTitleBlockDataChange,
}) {
  const [editingField, setEditingField] = useState(null);

  // Get the bounds of all pages
  const bounds = useMemo(() => {
    if (pages.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    const minX = Math.min(...pages.map(p => p.x));
    const minY = Math.min(...pages.map(p => p.y));
    const maxX = Math.max(...pages.map(p => p.x + p.width));
    const maxY = Math.max(...pages.map(p => p.y + p.height));
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }, [pages]);

  // Scale factors for zoom
  const strokeWidth = 1 / zoom;
  const thinStroke = 0.5 / zoom;
  const fontSize = 10 / zoom;
  const smallFontSize = 8 / zoom;
  const labelFontSize = 12 / zoom;

  const config = TITLE_BLOCK_CONFIG;
  const m = config.margin / zoom;
  const rp = config.rightPanelWidth / zoom;
  const lh = config.labelHeight / zoom;
  const lw = config.labelWidth / zoom;

  // Drawing area dimensions (inside the border)
  const drawingArea = useMemo(() => ({
    x: bounds.x + lw,
    y: bounds.y + lh,
    width: bounds.width - lw * 2 - rp,
    height: bounds.height - lh * 2,
  }), [bounds, lw, lh, rp]);

  // Right panel area
  const rightPanel = useMemo(() => ({
    x: bounds.x + bounds.width - rp - lw,
    y: bounds.y + lh,
    width: rp,
    height: bounds.height - lh * 2,
  }), [bounds, rp, lw, lh]);

  // Column width for grid
  const colWidth = useMemo(() => drawingArea.width / config.columns.length, [drawingArea.width, config.columns.length]);
  const rowHeight = useMemo(() => drawingArea.height / config.rows.length, [drawingArea.height, config.rows.length]);

  // Handle field edit
  const handleFieldClick = useCallback((fieldName, e) => {
    e.stopPropagation();
    setEditingField(fieldName);
  }, []);

  const handleFieldChange = useCallback((fieldName, value) => {
    onTitleBlockDataChange?.({
      ...titleBlockData,
      [fieldName]: value,
    });
  }, [titleBlockData, onTitleBlockDataChange]);

  const handleFieldBlur = useCallback(() => {
    setEditingField(null);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setEditingField(null);
    }
  }, []);

  if (!visible || pages.length === 0) return null;

  const data = titleBlockData || {};

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
      {/* White background for the entire title block area */}
      <rect
        x={0}
        y={0}
        width={bounds.width + lw * 2}
        height={bounds.height + lh * 2}
        fill="white"
      />

      {/* Outer border */}
      <rect
        x={lw}
        y={lh}
        width={bounds.width - rp}
        height={bounds.height}
        fill="none"
        stroke="#000"
        strokeWidth={strokeWidth * 2}
      />

      {/* Right panel border */}
      <rect
        x={bounds.width - rp}
        y={lh}
        width={rp + lw}
        height={bounds.height}
        fill="white"
        stroke="#000"
        strokeWidth={strokeWidth * 2}
      />

      {/* Column labels - Top */}
      {config.columns.map((col, i) => (
        <g key={`col-top-${col}`}>
          <rect
            x={lw + i * colWidth}
            y={0}
            width={colWidth}
            height={lh}
            fill="white"
            stroke="#000"
            strokeWidth={thinStroke}
          />
          <text
            x={lw + i * colWidth + colWidth / 2}
            y={lh / 2 + labelFontSize / 3}
            fill="#000"
            fontSize={labelFontSize}
            fontFamily="Arial, sans-serif"
            fontWeight="bold"
            textAnchor="middle"
          >
            {col}
          </text>
        </g>
      ))}

      {/* Column labels - Bottom */}
      {config.columns.map((col, i) => (
        <g key={`col-bot-${col}`}>
          <rect
            x={lw + i * colWidth}
            y={bounds.height + lh}
            width={colWidth}
            height={lh}
            fill="white"
            stroke="#000"
            strokeWidth={thinStroke}
          />
          <text
            x={lw + i * colWidth + colWidth / 2}
            y={bounds.height + lh + lh / 2 + labelFontSize / 3}
            fill="#000"
            fontSize={labelFontSize}
            fontFamily="Arial, sans-serif"
            fontWeight="bold"
            textAnchor="middle"
          >
            {col}
          </text>
        </g>
      ))}

      {/* Row labels - Left */}
      {config.rows.map((row, i) => (
        <g key={`row-left-${row}`}>
          <rect
            x={0}
            y={lh + i * rowHeight}
            width={lw}
            height={rowHeight}
            fill="white"
            stroke="#000"
            strokeWidth={thinStroke}
          />
          <text
            x={lw / 2}
            y={lh + i * rowHeight + rowHeight / 2 + labelFontSize / 3}
            fill="#000"
            fontSize={labelFontSize}
            fontFamily="Arial, sans-serif"
            fontWeight="bold"
            textAnchor="middle"
          >
            {row}
          </text>
        </g>
      ))}

      {/* Row labels - Right (next to right panel) */}
      {config.rows.map((row, i) => (
        <g key={`row-right-${row}`}>
          <rect
            x={bounds.width + lw}
            y={lh + i * rowHeight}
            width={lw}
            height={rowHeight}
            fill="white"
            stroke="#000"
            strokeWidth={thinStroke}
          />
          <text
            x={bounds.width + lw + lw / 2}
            y={lh + i * rowHeight + rowHeight / 2 + labelFontSize / 3}
            fill="#000"
            fontSize={labelFontSize}
            fontFamily="Arial, sans-serif"
            fontWeight="bold"
            textAnchor="middle"
          >
            {row}
          </text>
        </g>
      ))}

      {/* Grid lines (optional) */}
      {showGrid && (
        <g>
          {/* Vertical grid lines */}
          {config.columns.slice(1).map((_, i) => (
            <line
              key={`grid-v-${i}`}
              x1={lw + (i + 1) * colWidth}
              y1={lh}
              x2={lw + (i + 1) * colWidth}
              y2={bounds.height + lh}
              stroke="#ccc"
              strokeWidth={thinStroke}
              strokeDasharray={`${4 / zoom} ${4 / zoom}`}
            />
          ))}
          {/* Horizontal grid lines */}
          {config.rows.slice(1).map((_, i) => (
            <line
              key={`grid-h-${i}`}
              x1={lw}
              y1={lh + (i + 1) * rowHeight}
              x2={bounds.width - rp}
              y2={lh + (i + 1) * rowHeight}
              stroke="#ccc"
              strokeWidth={thinStroke}
              strokeDasharray={`${4 / zoom} ${4 / zoom}`}
            />
          ))}
        </g>
      )}

      {/* ===== RIGHT PANEL SECTIONS ===== */}
      {(() => {
        const rpX = bounds.width - rp;
        const rpW = rp + lw;
        let yPos = lh;
        const boxPadding = 4 / zoom;

        // Helper to create a labeled box
        const LabeledBox = ({ label, height, fieldName, value, multiline = false }) => {
          const boxY = yPos;
          yPos += height;
          return (
            <g key={label}>
              <rect
                x={rpX}
                y={boxY}
                width={rpW}
                height={height}
                fill="white"
                stroke="#000"
                strokeWidth={thinStroke}
              />
              <text
                x={rpX + boxPadding}
                y={boxY + smallFontSize + 2 / zoom}
                fill="#000"
                fontSize={smallFontSize}
                fontFamily="Arial, sans-serif"
              >
                {label}
              </text>
              {fieldName && (
                <text
                  x={rpX + boxPadding}
                  y={boxY + smallFontSize + fontSize + 4 / zoom}
                  fill="#333"
                  fontSize={fontSize}
                  fontFamily="Arial, sans-serif"
                >
                  {value || ''}
                </text>
              )}
            </g>
          );
        };

        // Logo area
        const logoHeight = 50 / zoom;
        const logoY = yPos;
        yPos += logoHeight;

        // Info boxes
        const smallBoxHeight = 40 / zoom;
        const mediumBoxHeight = 80 / zoom;
        const largeBoxHeight = 120 / zoom;
        const tableBoxHeight = 100 / zoom;

        return (
          <g>
            {/* APEX Logo */}
            <rect x={rpX} y={logoY} width={rpW} height={logoHeight} fill="#1a1a1a" stroke="#000" strokeWidth={thinStroke} />
            {/* Stylized A icon */}
            <g transform={`translate(${rpX + 8 / zoom}, ${logoY + 8 / zoom}) scale(${0.6 / zoom})`}>
              <circle cx="25" cy="25" r="24" fill="none" stroke="#fff" strokeWidth="2" />
              <path d="M25 8 L38 42 L32 42 L29 34 L21 34 L18 42 L12 42 Z M25 18 L22 30 L28 30 Z" fill="#fff" />
            </g>
            {/* APEX text */}
            <text
              x={rpX + 50 / zoom}
              y={logoY + 22 / zoom}
              fill="#fff"
              fontSize={16 / zoom}
              fontFamily="Arial Black, Arial, sans-serif"
              fontWeight="bold"
              letterSpacing={2 / zoom}
            >
              APEX
            </text>
            <text
              x={rpX + 50 / zoom}
              y={logoY + 36 / zoom}
              fill="#aaa"
              fontSize={6 / zoom}
              fontFamily="Arial, sans-serif"
              letterSpacing={1 / zoom}
            >
              SOUND &amp; LIGHT
            </text>

            {/* Drawing By / Venue */}
            <rect x={rpX} y={yPos} width={rpW} height={smallBoxHeight} fill="white" stroke="#000" strokeWidth={thinStroke} />
            <text x={rpX + boxPadding} y={yPos + smallFontSize + 2 / zoom} fill="#000" fontSize={smallFontSize} fontFamily="Arial, sans-serif">
              DRAWING BY . . . . . .
            </text>
            <text x={rpX + 70 / zoom} y={yPos + smallFontSize + 2 / zoom} fill="#333" fontSize={smallFontSize} fontFamily="Arial, sans-serif">
              {data.drawingBy || ''}
            </text>
            <text x={rpX + boxPadding} y={yPos + smallFontSize * 2 + 6 / zoom} fill="#000" fontSize={smallFontSize} fontFamily="Arial, sans-serif">
              VENUE . . . . . . . . . . . .
            </text>
            <text x={rpX + 70 / zoom} y={yPos + smallFontSize * 2 + 6 / zoom} fill="#333" fontSize={smallFontSize} fontFamily="Arial, sans-serif">
              {data.venue || ''}
            </text>
            {yPos += smallBoxHeight}

            {/* Legend Key */}
            <rect x={rpX} y={yPos} width={rpW} height={mediumBoxHeight} fill="white" stroke="#000" strokeWidth={thinStroke} />
            <text x={rpX + rpW / 2} y={yPos + smallFontSize + 2 / zoom} fill="#000" fontSize={smallFontSize} fontFamily="Arial, sans-serif" textAnchor="middle" fontWeight="bold">
              LEGEND KEY
            </text>
            {yPos += mediumBoxHeight}

            {/* General Notes */}
            <rect x={rpX} y={yPos} width={rpW} height={largeBoxHeight} fill="white" stroke="#000" strokeWidth={thinStroke} />
            <text x={rpX + boxPadding} y={yPos + smallFontSize + 2 / zoom} fill="#000" fontSize={smallFontSize} fontFamily="Arial, sans-serif">
              GENERAL NOTES:
            </text>
            {yPos += largeBoxHeight}

            {/* Revision History */}
            <rect x={rpX} y={yPos} width={rpW} height={tableBoxHeight} fill="white" stroke="#000" strokeWidth={thinStroke} />
            <text x={rpX + rpW / 2} y={yPos + smallFontSize + 2 / zoom} fill="#000" fontSize={smallFontSize} fontFamily="Arial, sans-serif" textAnchor="middle" fontWeight="bold">
              REVISION HISTORY
            </text>
            {/* Table header */}
            <line x1={rpX} y1={yPos + 14 / zoom} x2={rpX + rpW} y2={yPos + 14 / zoom} stroke="#000" strokeWidth={thinStroke} />
            <text x={rpX + 10 / zoom} y={yPos + 22 / zoom} fill="#000" fontSize={smallFontSize * 0.8} fontFamily="Arial, sans-serif">NO.</text>
            <text x={rpX + 40 / zoom} y={yPos + 22 / zoom} fill="#000" fontSize={smallFontSize * 0.8} fontFamily="Arial, sans-serif">REVISION</text>
            <text x={rpX + 120 / zoom} y={yPos + 22 / zoom} fill="#000" fontSize={smallFontSize * 0.8} fontFamily="Arial, sans-serif">DATE</text>
            <text x={rpX + 170 / zoom} y={yPos + 22 / zoom} fill="#000" fontSize={smallFontSize * 0.8} fontFamily="Arial, sans-serif">BY</text>
            <line x1={rpX} y1={yPos + 26 / zoom} x2={rpX + rpW} y2={yPos + 26 / zoom} stroke="#000" strokeWidth={thinStroke} />
            {yPos += tableBoxHeight}

            {/* Issue History */}
            <rect x={rpX} y={yPos} width={rpW} height={tableBoxHeight} fill="white" stroke="#000" strokeWidth={thinStroke} />
            <text x={rpX + rpW / 2} y={yPos + smallFontSize + 2 / zoom} fill="#000" fontSize={smallFontSize} fontFamily="Arial, sans-serif" textAnchor="middle" fontWeight="bold">
              ISSUE HISTORY
            </text>
            <line x1={rpX} y1={yPos + 14 / zoom} x2={rpX + rpW} y2={yPos + 14 / zoom} stroke="#000" strokeWidth={thinStroke} />
            <text x={rpX + 10 / zoom} y={yPos + 22 / zoom} fill="#000" fontSize={smallFontSize * 0.8} fontFamily="Arial, sans-serif">NO.</text>
            <text x={rpX + 40 / zoom} y={yPos + 22 / zoom} fill="#000" fontSize={smallFontSize * 0.8} fontFamily="Arial, sans-serif">ISSUE</text>
            <text x={rpX + 120 / zoom} y={yPos + 22 / zoom} fill="#000" fontSize={smallFontSize * 0.8} fontFamily="Arial, sans-serif">DATE</text>
            <text x={rpX + 170 / zoom} y={yPos + 22 / zoom} fill="#000" fontSize={smallFontSize * 0.8} fontFamily="Arial, sans-serif">BY</text>
            <line x1={rpX} y1={yPos + 26 / zoom} x2={rpX + rpW} y2={yPos + 26 / zoom} stroke="#000" strokeWidth={thinStroke} />
            {yPos += tableBoxHeight}

            {/* Project */}
            <rect x={rpX} y={yPos} width={rpW} height={smallBoxHeight} fill="white" stroke="#000" strokeWidth={thinStroke} />
            <text x={rpX + boxPadding} y={yPos + smallFontSize + 2 / zoom} fill="#000" fontSize={smallFontSize} fontFamily="Arial, sans-serif">
              PROJECT:
            </text>
            <text x={rpX + boxPadding} y={yPos + smallFontSize + fontSize + 4 / zoom} fill="#333" fontSize={fontSize} fontFamily="Arial, sans-serif" fontWeight="bold">
              {data.project || ''}
            </text>
            {yPos += smallBoxHeight}

            {/* Bottom info row */}
            <g>
              {/* Scale */}
              <rect x={rpX} y={yPos} width={rpW / 2} height={smallBoxHeight} fill="white" stroke="#000" strokeWidth={thinStroke} />
              <text x={rpX + boxPadding} y={yPos + smallFontSize} fill="#000" fontSize={smallFontSize * 0.8} fontFamily="Arial, sans-serif">SCALE:</text>
              <text x={rpX + boxPadding} y={yPos + smallFontSize + fontSize} fill="#000" fontSize={fontSize} fontFamily="Arial, sans-serif" fontWeight="bold">
                {data.scale || 'CUSTOM'}
              </text>
              <text x={rpX + boxPadding} y={yPos + smallFontSize + fontSize * 2} fill="#666" fontSize={smallFontSize * 0.7} fontFamily="Arial, sans-serif" fontStyle="italic">
                UNLESS NOTED
              </text>

              {/* Sheet # and Page Size */}
              <rect x={rpX + rpW / 2} y={yPos} width={rpW / 4} height={smallBoxHeight / 2} fill="white" stroke="#000" strokeWidth={thinStroke} />
              <text x={rpX + rpW / 2 + boxPadding} y={yPos + smallFontSize} fill="#000" fontSize={smallFontSize * 0.8} fontFamily="Arial, sans-serif">SHT #:</text>
              <text x={rpX + rpW / 2 + 30 / zoom} y={yPos + smallFontSize} fill="#000" fontSize={smallFontSize} fontFamily="Arial, sans-serif" fontWeight="bold">
                {data.sheetNumber || '1'}
              </text>

              <rect x={rpX + rpW * 3 / 4} y={yPos} width={rpW / 4} height={smallBoxHeight / 2} fill="white" stroke="#000" strokeWidth={thinStroke} />
              <text x={rpX + rpW * 3 / 4 + boxPadding} y={yPos + smallFontSize} fill="#000" fontSize={smallFontSize * 0.7} fontFamily="Arial, sans-serif">PG SIZE:</text>
              <text x={rpX + rpW * 3 / 4 + boxPadding} y={yPos + smallFontSize + 8 / zoom} fill="#000" fontSize={smallFontSize * 0.8} fontFamily="Arial, sans-serif" fontWeight="bold">
                {data.pageSize || 'ASME B'}
              </text>

              {/* Issue and Revision boxes */}
              <rect x={rpX + rpW / 2} y={yPos + smallBoxHeight / 2} width={rpW / 4} height={smallBoxHeight / 2} fill="white" stroke="#000" strokeWidth={thinStroke} />
              <text x={rpX + rpW / 2 + rpW / 8} y={yPos + smallBoxHeight / 2 + smallFontSize + 4 / zoom} fill="#000" fontSize={smallFontSize} fontFamily="Arial, sans-serif" textAnchor="middle" fontWeight="bold">
                ISSUE
              </text>

              <rect x={rpX + rpW * 3 / 4} y={yPos + smallBoxHeight / 2} width={rpW / 4} height={smallBoxHeight / 2} fill="white" stroke="#000" strokeWidth={thinStroke} />
              <text x={rpX + rpW * 7 / 8} y={yPos + smallBoxHeight / 2 + smallFontSize + 4 / zoom} fill="#000" fontSize={smallFontSize} fontFamily="Arial, sans-serif" textAnchor="middle" fontWeight="bold">
                REVISION
              </text>
              {yPos += smallBoxHeight}
            </g>

            {/* Sheet Title */}
            <rect x={rpX} y={yPos} width={rpW} height={bounds.height + lh - yPos} fill="white" stroke="#000" strokeWidth={thinStroke} />
            <text x={rpX + boxPadding} y={yPos + smallFontSize + 2 / zoom} fill="#000" fontSize={smallFontSize} fontFamily="Arial, sans-serif">
              SHT:
            </text>
            <text x={rpX + boxPadding} y={yPos + smallFontSize + fontSize + 4 / zoom} fill="#333" fontSize={fontSize} fontFamily="Arial, sans-serif">
              {data.sheetTitle || ''}
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

export default memo(TitleBlockOverlayInner);
