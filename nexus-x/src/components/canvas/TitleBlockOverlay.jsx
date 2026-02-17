import { memo, useMemo, useState, useCallback, useRef, useEffect } from 'react';

// Title block configuration
const TITLE_BLOCK_CONFIG = {
  panelHeight: 80, // Bottom panel height in paper pixels
  minPanelHeight: 60,
  maxPanelHeight: 150,
};

// Editable text field component
const EditableField = memo(({ x, y, width, height, value, fieldName, onSave, fontSize = 10, fontWeight = 'normal', placeholder = '', textAlign = 'left', color = '#fff', multiline = false }) => {
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
                fontFamily: 'ui-monospace, monospace',
                padding: 4,
                border: '1px solid #06b6d4',
                borderRadius: 2,
                outline: 'none',
                backgroundColor: '#18181b',
                color: '#fff',
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
                fontFamily: 'ui-monospace, monospace',
                padding: '0 4px',
                border: '1px solid #06b6d4',
                borderRadius: 2,
                outline: 'none',
                backgroundColor: '#18181b',
                color: '#fff',
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
              fontFamily: 'ui-monospace, monospace',
              cursor: 'text',
              padding: multiline ? 4 : '0 4px',
              color: value ? color : '#52525b',
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

// Logo upload component
const LogoUpload = memo(({ x, y, width, height, logoUrl, onLogoChange }) => {
  const inputRef = useRef(null);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    inputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onLogoChange(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  }, [onLogoChange]);

  const stopClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  // Transparent when logo is present, show placeholder styling when empty
  const hasLogo = !!logoUrl;

  return (
    <foreignObject x={x} y={y} width={width} height={height} style={{ overflow: 'visible' }}>
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        onClick={handleClick}
        onMouseDown={stopClick}
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          pointerEvents: 'auto',
          backgroundColor: hasLogo ? 'transparent' : '#27272a',
          borderRadius: hasLogo ? 0 : 4,
          border: hasLogo ? 'none' : '1px dashed #3f3f46',
          overflow: 'hidden',
        }}
        title="Click to upload logo"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
        ) : (
          <span style={{ color: '#52525b', fontSize: 9, fontFamily: 'ui-monospace, monospace', textAlign: 'center' }}>
            Click to<br />upload logo
          </span>
        )}
      </div>
    </foreignObject>
  );
});
LogoUpload.displayName = 'LogoUpload';

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

  const panelHeight = titleBlockData?.panelHeight || TITLE_BLOCK_CONFIG.panelHeight;

  // Colors
  const borderColor = '#3f3f46';
  const textColor = '#a1a1aa';
  const panelBg = '#18181b';
  const sectionBg = '#1f1f23';


  const handleFieldSave = useCallback((fieldName, value) => {
    onTitleBlockDataChange?.({
      ...titleBlockData,
      [fieldName]: value,
    });
  }, [titleBlockData, onTitleBlockDataChange]);

  const handleLogoChange = useCallback((logoUrl) => {
    onTitleBlockDataChange?.({
      ...titleBlockData,
      logoUrl,
    });
  }, [titleBlockData, onTitleBlockDataChange]);

  if (!visible || pages.length === 0) return null;

  const data = titleBlockData || {};

  // Panel is at the bottom of the page
  const panelY = bounds.height - panelHeight;
  const panelW = bounds.width;

  // Section widths (percentages of panel width)
  const logoW = 240;
  const projectW = panelW * 0.25;
  const versionW = panelW * 0.15;
  const dateW = 80;
  const notesW = panelW - logoW - projectW - versionW - dateW - 10; // Remaining space

  // Font sizes
  const labelFont = 8;
  const valueFont = 10;
  const titleFont = 14;

  // Section X positions
  let sectionX = 0;
  const logoX = sectionX; sectionX += logoW + 2;
  const projectX = sectionX; sectionX += projectW + 2;
  const versionX = sectionX; sectionX += versionW + 2;
  const dateX = sectionX; sectionX += dateW + 2;
  const notesX = sectionX;

  const sectionPadding = 4;
  const labelHeight = 12;
  const contentY = panelY + labelHeight + sectionPadding;
  const contentHeight = panelHeight - labelHeight - sectionPadding * 2;

  return (
    <svg
      style={{
        position: 'absolute',
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
        pointerEvents: 'none',
        zIndex: 5,
        overflow: 'visible',
      }}
    >
      {/* Drawing area border */}
      <rect
        x={0}
        y={0}
        width={bounds.width}
        height={bounds.height - panelHeight}
        fill="none"
        stroke={borderColor}
        strokeWidth={2}
      />

      {/* Grid lines */}
      {showGrid && (
        <g>
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <line
              key={`grid-v-${i}`}
              x1={bounds.width * i / 8}
              y1={0}
              x2={bounds.width * i / 8}
              y2={bounds.height - panelHeight}
              stroke={borderColor}
              strokeWidth={0.5}
              strokeDasharray="4 4"
            />
          ))}
          {[1, 2, 3, 4, 5].map(i => (
            <line
              key={`grid-h-${i}`}
              x1={0}
              y1={(bounds.height - panelHeight) * i / 6}
              x2={bounds.width}
              y2={(bounds.height - panelHeight) * i / 6}
              stroke={borderColor}
              strokeWidth={0.5}
              strokeDasharray="4 4"
            />
          ))}
        </g>
      )}

      {/* ===== BOTTOM TITLE BLOCK PANEL ===== */}
      <rect
        x={0}
        y={panelY}
        width={panelW}
        height={panelHeight}
        fill={panelBg}
        stroke={borderColor}
        strokeWidth={2}
      />

      {/* LOGO SECTION - transparent when logo is present */}
      <rect x={logoX} y={panelY} width={logoW} height={panelHeight} fill={data.logoUrl ? 'transparent' : sectionBg} stroke={data.logoUrl ? 'transparent' : borderColor} strokeWidth={1} />
      <LogoUpload
        x={logoX + 16}
        y={panelY + 4}
        width={logoW - 32}
        height={panelHeight - 8}
        logoUrl={data.logoUrl}
        onLogoChange={handleLogoChange}
      />

      {/* PROJECT NAME SECTION */}
      <rect x={projectX} y={panelY} width={projectW} height={panelHeight} fill={sectionBg} stroke={borderColor} strokeWidth={1} />
      <text x={projectX + sectionPadding} y={panelY + labelFont + 2} fill={textColor} fontSize={labelFont} fontFamily="ui-monospace, monospace">PROJECT</text>
      <EditableField
        x={projectX + sectionPadding}
        y={contentY}
        width={projectW - sectionPadding * 2}
        height={contentHeight}
        value={data.projectName}
        fieldName="projectName"
        onSave={handleFieldSave}
        fontSize={titleFont}
        fontWeight="bold"
        placeholder="Project Name"
        color="#fff"
      />

      {/* VERSION SECTION */}
      <rect x={versionX} y={panelY} width={versionW} height={panelHeight} fill={sectionBg} stroke={borderColor} strokeWidth={1} />
      <text x={versionX + sectionPadding} y={panelY + labelFont + 2} fill={textColor} fontSize={labelFont} fontFamily="ui-monospace, monospace">VERSION</text>
      <EditableField
        x={versionX + sectionPadding}
        y={contentY}
        width={versionW - sectionPadding * 2}
        height={contentHeight}
        value={data.version}
        fieldName="version"
        onSave={handleFieldSave}
        fontSize={valueFont}
        placeholder="v1.0"
        color="#06b6d4"
        multiline
      />

      {/* DATE SECTION */}
      <rect x={dateX} y={panelY} width={dateW} height={panelHeight} fill={sectionBg} stroke={borderColor} strokeWidth={1} />
      <text x={dateX + sectionPadding} y={panelY + labelFont + 2} fill={textColor} fontSize={labelFont} fontFamily="ui-monospace, monospace">DATE</text>
      <EditableField
        x={dateX + sectionPadding}
        y={contentY}
        width={dateW - sectionPadding * 2}
        height={contentHeight}
        value={data.date}
        fieldName="date"
        onSave={handleFieldSave}
        fontSize={valueFont}
        placeholder={new Date().toLocaleDateString()}
        color="#fff"
      />

      {/* NOTES SECTION */}
      <rect x={notesX} y={panelY} width={notesW} height={panelHeight} fill={sectionBg} stroke={borderColor} strokeWidth={1} />
      <text x={notesX + sectionPadding} y={panelY + labelFont + 2} fill={textColor} fontSize={labelFont} fontFamily="ui-monospace, monospace">NOTES</text>
      <EditableField
        x={notesX + sectionPadding}
        y={contentY}
        width={notesW - sectionPadding * 2}
        height={contentHeight}
        value={data.notes}
        fieldName="notes"
        onSave={handleFieldSave}
        fontSize={8}
        placeholder="Add notes..."
        color="#a1a1aa"
        multiline
      />

    </svg>
  );
}

export default memo(TitleBlockOverlayInner);
