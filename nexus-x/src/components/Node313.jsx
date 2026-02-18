import { useState, useRef, useEffect, useCallback, useMemo, useLayoutEffect, memo } from 'react';

// ============================================
// LAYOUT SYSTEM
// ============================================

// All valid layout arrangements for 3 sections (a, b, c)
// c is always alone in its row; a and b can be side-by-side or stacked
const LAYOUTS = {
  'ab_c':  [['a','b'],['c']],
  'ba_c':  [['b','a'],['c']],
  'c_ab':  [['c'],['a','b']],
  'c_ba':  [['c'],['b','a']],
  'a_b_c': [['a'],['b'],['c']],
  'b_a_c': [['b'],['a'],['c']],
  'c_a_b': [['c'],['a'],['b']],
  'c_b_a': [['c'],['b'],['a']],
};

// Generate layout key from a layout array
const getLayoutKey = (layout) => layout.map(r => r.join('')).join('_');

// Get current position of a section within a layout
function getPosition(layoutKey, sectionId) {
  const layout = LAYOUTS[layoutKey];
  if (!layout) return null;
  if (sectionId === 'c') {
    return layout.findIndex(r => r.includes('c')) === 0 ? 'top' : 'bottom';
  }
  const other = sectionId === 'a' ? 'b' : 'a';
  const myRow = layout.findIndex(r => r.includes(sectionId));
  const otherRow = layout.findIndex(r => r.includes(other));
  if (myRow === otherRow) {
    return layout[myRow].indexOf(sectionId) < layout[myRow].indexOf(other) ? 'left' : 'right';
  }
  return myRow < otherRow ? 'above' : 'below';
}

// Apply a drop: move section `did` to position `pos`, return new layout key
function applyDrop(currentKey, droppedId, position) {
  const current = LAYOUTS[currentKey];
  if (!current) return currentKey;

  if (droppedId === 'c') {
    const withoutC = current.map(r => r.filter(x => x !== 'c')).filter(r => r.length);
    const newLayout = position === 'top' ? [['c'], ...withoutC] : [...withoutC, ['c']];
    const key = getLayoutKey(newLayout);
    return LAYOUTS[key] ? key : currentKey;
  }

  const other = droppedId === 'a' ? 'b' : 'a';
  const cOnTop = current.findIndex(r => r.includes('c')) === 0;
  let ab;
  if (position === 'left') ab = [[droppedId, other]];
  else if (position === 'right') ab = [[other, droppedId]];
  else if (position === 'above') ab = [[droppedId], [other]];
  else if (position === 'below') ab = [[other], [droppedId]];
  else return currentKey;

  const newLayout = cOnTop ? [['c'], ...ab] : [...ab, ['c']];
  const key = getLayoutKey(newLayout);
  return LAYOUTS[key] ? key : currentKey;
}

// ============================================
// STYLES (inline to match prototype exactly)
// ============================================

const STYLES = {
  node: {
    position: 'absolute',
    border: '1px solid #333',
    background: '#0a0a0a',
    display: 'inline-flex',
    flexDirection: 'column',
    whiteSpace: 'nowrap',
    fontFamily: "'Courier New', monospace",
    color: '#ddd',
    userSelect: 'none',
  },
  nodeTitle: {
    background: '#111',
    borderBottom: '1px solid #333',
    display: 'flex',
    alignItems: 'center',
    cursor: 'grab',
  },
  grip: {
    color: '#444',
    fontSize: '10px',
    padding: '0 3px',
    cursor: 'grab',
    flexShrink: 0,
  },
  titleInput: {
    fontSize: '14px',
    fontWeight: 700,
    textAlign: 'center',
    width: '100%',
    height: '14px',
  },
  sectionTitle: {
    background: '#111',
    borderBottom: '1px solid #333',
    display: 'flex',
    alignItems: 'center',
    cursor: 'grab',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  },
  sectionTitleInput: {
    fontSize: '12px',
    fontWeight: 700,
    width: '100%',
    height: '12px',
  },
  input: {
    background: 'transparent',
    border: 'none',
    color: '#ddd',
    fontFamily: "'Courier New', monospace",
    outline: 'none',
    margin: 0,
    padding: '0 4px',
    lineHeight: 1,
    display: 'block',
  },
  table: {
    borderCollapse: 'collapse',
    whiteSpace: 'nowrap',
  },
  cell: {
    borderBottom: '1px solid #333',
    borderRight: '1px solid #333',
    padding: 0,
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
    lineHeight: 1,
  },
  cellLast: {
    borderRight: 'none',
  },
  headerCell: {
    background: '#111',
  },
  xc: {
    width: '12px',
    minWidth: '12px',
    maxWidth: '12px',
    textAlign: 'center',
    verticalAlign: 'middle',
    lineHeight: 1,
  },
  xcSpan: {
    color: '#444',
    cursor: 'pointer',
    fontSize: '10px',
    userSelect: 'none',
    lineHeight: 1,
  },
  ac: {
    width: '14px',
    minWidth: '14px',
    maxWidth: '14px',
    textAlign: 'center',
    verticalAlign: 'middle',
    lineHeight: 1,
    padding: 0,
  },
  anchorDot: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#666',
    border: '1px solid #444',
    cursor: 'crosshair',
    transition: 'background 0.1s, border-color 0.1s',
    verticalAlign: 'middle',
  },
  addRow: {
    textAlign: 'center',
    color: '#444',
    fontSize: '11px',
    cursor: 'pointer',
    userSelect: 'none',
    borderBottom: '1px solid #333',
    lineHeight: 1,
  },
  dropZone: {
    border: '1px dashed #333',
    padding: '4px',
    textAlign: 'center',
    fontSize: '10px',
    color: '#444',
    userSelect: 'none',
  },
  dropZoneHover: {
    borderColor: '#aaa',
    color: '#aaa',
    background: '#1a1a1a',
  },
  abRow: {
    display: 'inline-flex',
    alignSelf: 'stretch',
    width: '100%',
  },
  sectionWrap: {
    display: 'inline-block',
    verticalAlign: 'top',
  },
  sectionWrapBorder: {
    borderLeft: '1px solid #333',
  },
  sectionFull: {
    display: 'block',
    width: '100%',
    alignSelf: 'stretch',
  },
};

// ============================================
// SUB-COMPONENTS
// ============================================

// Auto-sizing input cell
const SzCell = memo(({ value, isHeader, isLast, onChange }) => {
  const Tag = isHeader ? 'th' : 'td';
  const cellStyle = {
    ...STYLES.cell,
    ...(isLast ? STYLES.cellLast : {}),
    ...(isHeader ? STYLES.headerCell : {}),
  };

  return (
    <Tag style={cellStyle}>
      <div
        className="n313-sz"
        data-v={value || ' '}
        data-h={isHeader ? '' : undefined}
      >
        <input
          style={{
            ...STYLES.input,
            gridArea: '1/1',
            width: '100%',
            minWidth: 0,
            textAlign: 'left',
            ...(isHeader
              ? { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#888', height: '11px' }
              : { fontSize: '13px', height: '13px' }
            ),
          }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </Tag>
  );
});
SzCell.displayName = 'SzCell';

// X button cell (delete column, delete row, add column, or empty spacer)
const XCell = memo(({ isHeader, isLast, label, onClick }) => {
  const Tag = isHeader ? 'th' : 'td';
  return (
    <Tag style={{ ...STYLES.xc, ...STYLES.cell, ...(isLast ? STYLES.cellLast : {}), ...(isHeader ? STYLES.headerCell : {}) }}>
      {label && (
        <span
          style={STYLES.xcSpan}
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#999'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#444'; }}
        >
          {label}
        </span>
      )}
    </Tag>
  );
});
XCell.displayName = 'XCell';

// Anchor dot cell
const AnchorCell = memo(({ isHeader, isLast, anchorId, onAnchorClick, activeWire, isConnected }) => {
  const Tag = isHeader ? 'th' : 'td';
  const dotRef = useRef(null);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (anchorId && onAnchorClick) {
      onAnchorClick(anchorId, 'both');
    }
  }, [anchorId, onAnchorClick]);

  const isActive = activeWire?.from === anchorId;

  return (
    <Tag style={{ ...STYLES.ac, ...STYLES.cell, ...(isLast ? STYLES.cellLast : {}), ...(isHeader ? STYLES.headerCell : {}) }}>
      {!isHeader && (
        <div
          ref={dotRef}
          data-anchor-id={anchorId}
          style={{
            ...STYLES.anchorDot,
            ...(isActive ? { background: '#fff', borderColor: '#aaa' } : {}),
            ...(isConnected ? { background: '#4ade80', borderColor: '#22c55e' } : {}),
          }}
          onClick={handleClick}
          onMouseEnter={(e) => { if (!isActive && !isConnected) { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#aaa'; } }}
          onMouseLeave={(e) => { if (!isActive && !isConnected) { e.currentTarget.style.background = '#666'; e.currentTarget.style.borderColor = '#444'; } }}
        />
      )}
    </Tag>
  );
});
AnchorCell.displayName = 'AnchorCell';

// Drop zone for section rearranging
const DropZone = memo(({ label, onDrop }) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{ ...STYLES.dropZone, ...(hover ? STYLES.dropZoneHover : {}) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onMouseUp={() => onDrop()}
    >
      {label}
    </div>
  );
});
DropZone.displayName = 'DropZone';

// ============================================
// SECTION COMPONENT
// ============================================

const Section313 = memo(({ sectionId, section, nodeId, fullWidth, mirrored, onUpdate, onAnchorClick, activeWire, connectedAnchorIds }) => {
  const nc = section.cols.length;
  const canDel = nc > 1;

  const updateSection = useCallback((updates) => {
    onUpdate(sectionId, updates);
  }, [sectionId, onUpdate]);

  const addColumn = useCallback(() => {
    updateSection({
      cols: [...section.cols, 'COL'],
      rows: section.rows.map(r => [...r, '']),
    });
  }, [section.cols, section.rows, updateSection]);

  const deleteColumn = useCallback((ci) => {
    updateSection({
      cols: section.cols.filter((_, i) => i !== ci),
      rows: section.rows.map(r => r.filter((_, i) => i !== ci)),
    });
  }, [section.cols, section.rows, updateSection]);

  const addRow = useCallback(() => {
    updateSection({
      rows: [...section.rows, section.cols.map(() => '')],
    });
  }, [section.cols, section.rows, updateSection]);

  const deleteRow = useCallback((ri) => {
    updateSection({
      rows: section.rows.filter((_, i) => i !== ri),
    });
  }, [section.rows, updateSection]);

  const updateColName = useCallback((ci, value) => {
    const newCols = [...section.cols];
    newCols[ci] = value;
    updateSection({ cols: newCols });
  }, [section.cols, updateSection]);

  const updateCell = useCallback((ri, ci, value) => {
    const newRows = section.rows.map((r, i) => i === ri ? r.map((c, j) => j === ci ? value : c) : r);
    updateSection({ rows: newRows });
  }, [section.rows, updateSection]);

  const updateTitle = useCallback((value) => {
    updateSection({ title: value });
  }, [updateSection]);

  // Build column order for header and body
  const renderHeader = () => {
    const cells = [];
    if (mirrored) {
      // MIRRORED: [row×] [+] [×] [COL3] [×] [COL2] [×] [COL1] [anchor]
      cells.push(<XCell key="rowx-h" isHeader label="" />);
      cells.push(<XCell key="add-h" isHeader label="+" onClick={addColumn} />);
      for (let ci = nc - 1; ci >= 0; ci--) {
        if (canDel) cells.push(<XCell key={`delcol-${ci}`} isHeader label="×" onClick={() => deleteColumn(ci)} />);
        cells.push(<SzCell key={`col-${ci}`} value={section.cols[ci]} isHeader onChange={(v) => updateColName(ci, v)} />);
      }
      cells.push(<AnchorCell key="anchor-h" isHeader />);
    } else {
      // NORMAL: [anchor] [COL1] [×] [COL2] [×] [COL3] [×] [+] [row×]
      cells.push(<AnchorCell key="anchor-h" isHeader />);
      for (let ci = 0; ci < nc; ci++) {
        cells.push(<SzCell key={`col-${ci}`} value={section.cols[ci]} isHeader onChange={(v) => updateColName(ci, v)} />);
        if (canDel) cells.push(<XCell key={`delcol-${ci}`} isHeader label="×" onClick={() => deleteColumn(ci)} />);
      }
      cells.push(<XCell key="add-h" isHeader label="+" onClick={addColumn} />);
      cells.push(<XCell key="rowx-h" isHeader label="" />);
    }
    return <tr>{cells}</tr>;
  };

  const renderRow = (row, ri) => {
    const anchorId = `${nodeId}-${sectionId}-${ri}`;
    const isConnected = connectedAnchorIds?.has(anchorId);
    const cells = [];

    if (mirrored) {
      cells.push(<XCell key="rowx" label={section.rows.length > 1 ? '×' : null} onClick={() => deleteRow(ri)} />);
      cells.push(<XCell key="add-spacer" label={null} />);
      for (let ci = nc - 1; ci >= 0; ci--) {
        if (canDel) cells.push(<XCell key={`delcol-spacer-${ci}`} label={null} />);
        cells.push(<SzCell key={`cell-${ci}`} value={row[ci]} onChange={(v) => updateCell(ri, ci, v)} />);
      }
      cells.push(
        <AnchorCell
          key="anchor"
          anchorId={anchorId}
          onAnchorClick={onAnchorClick}
          activeWire={activeWire}
          isConnected={isConnected}
        />
      );
    } else {
      cells.push(
        <AnchorCell
          key="anchor"
          anchorId={anchorId}
          onAnchorClick={onAnchorClick}
          activeWire={activeWire}
          isConnected={isConnected}
        />
      );
      for (let ci = 0; ci < nc; ci++) {
        cells.push(<SzCell key={`cell-${ci}`} value={row[ci]} onChange={(v) => updateCell(ri, ci, v)} />);
        if (canDel) cells.push(<XCell key={`delcol-spacer-${ci}`} label={null} />);
      }
      cells.push(<XCell key="add-spacer" label={null} />);
      cells.push(<XCell key="rowx" label={section.rows.length > 1 ? '×' : null} onClick={() => deleteRow(ri)} />);
    }
    return <tr key={ri}>{cells}</tr>;
  };

  const wrapperStyle = fullWidth ? STYLES.sectionFull : undefined;

  return (
    <div style={wrapperStyle}>
      {/* Section title bar */}
      <div style={{ ...STYLES.sectionTitle, ...(mirrored ? { flexDirection: 'row-reverse' } : {}) }}>
        <span style={STYLES.grip}>⠿</span>
        <input
          style={{ ...STYLES.input, ...STYLES.sectionTitleInput, ...(mirrored ? { textAlign: 'right' } : {}) }}
          value={section.title}
          onChange={(e) => updateTitle(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Data table */}
      <table style={{ ...STYLES.table, ...(fullWidth ? { width: '100%' } : {}) }}>
        <thead>{renderHeader()}</thead>
        <tbody>{section.rows.map((row, ri) => renderRow(row, ri))}</tbody>
      </table>

      {/* Add row */}
      <div
        style={STYLES.addRow}
        onClick={addRow}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#888'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#444'; }}
      >
        + row
      </div>
    </div>
  );
});
Section313.displayName = 'Section313';

// ============================================
// MAIN NODE313 COMPONENT
// ============================================

function Node313({
  node, zoom, isSelected, snapToGrid, gridSize,
  onUpdate, onDelete, onAnchorClick, registerAnchor, unregisterAnchors,
  activeWire, connectedAnchorIds, onSelect, selectedNodes, onMoveSelectedNodes,
}) {
  const nodeRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragSec, setDragSec] = useState(null);
  const lastPositionRef = useRef(null);

  const layoutKey = node.layout || 'ab_c';
  const layout = LAYOUTS[layoutKey] || LAYOUTS['ab_c'];

  // ---- Section updates ----
  const handleSectionUpdate = useCallback((sectionId, updates) => {
    onUpdate({
      sections: {
        ...node.sections,
        [sectionId]: { ...node.sections[sectionId], ...updates },
      },
    });
  }, [node.sections, onUpdate]);

  // ---- Layout drop ----
  const handleDrop = useCallback((position) => {
    if (!dragSec) return;
    const newKey = applyDrop(layoutKey, dragSec, position);
    setDragSec(null);
    onUpdate({ layout: newKey });
  }, [dragSec, layoutKey, onUpdate]);

  // ---- Section drag start (from grip) ----
  const handleSectionGripDown = useCallback((e, sectionId) => {
    if (e.target.tagName === 'INPUT') return;
    e.stopPropagation();
    setDragSec(sectionId);
  }, []);

  // Cancel drag on global mouseup
  useEffect(() => {
    if (!dragSec) return;
    const handleUp = () => setDragSec(null);
    window.addEventListener('mouseup', handleUp);
    return () => window.removeEventListener('mouseup', handleUp);
  }, [dragSec]);

  // ---- Node dragging ----
  const handleTitleMouseDown = useCallback((e) => {
    if (e.target.tagName === 'INPUT') return;
    e.stopPropagation();

    // Select this node
    if (onSelect) {
      onSelect(node.id, e.shiftKey || e.ctrlKey || e.metaKey);
    }

    const canvas = nodeRef.current?.closest('[data-canvas]');
    if (!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();

    setIsDragging(true);
    setDragStart({
      offsetX: e.clientX - canvasRect.left - node.position.x * zoom,
      offsetY: e.clientY - canvasRect.top - node.position.y * zoom,
    });
    lastPositionRef.current = { x: node.position.x, y: node.position.y };
  }, [node.id, node.position.x, node.position.y, zoom, onSelect]);

  useEffect(() => {
    if (!isDragging || !dragStart) return;

    let rafId = null;
    let pendingPosition = null;
    let pendingDelta = null;

    const handleMouseMove = (e) => {
      const canvas = nodeRef.current?.closest('[data-canvas]');
      if (!canvas) return;
      const canvasRect = canvas.getBoundingClientRect();
      let newX = (e.clientX - canvasRect.left - dragStart.offsetX) / zoom;
      let newY = (e.clientY - canvasRect.top - dragStart.offsetY) / zoom;

      // Snap to grid (Ctrl/Cmd bypasses)
      if (snapToGrid && gridSize > 0 && !e.ctrlKey && !e.metaKey) {
        newX = Math.round(newX / gridSize) * gridSize;
        newY = Math.round(newY / gridSize) * gridSize;
      }

      const deltaX = newX - (lastPositionRef.current?.x || node.position.x);
      const deltaY = newY - (lastPositionRef.current?.y || node.position.y);

      pendingPosition = { x: newX, y: newY };
      pendingDelta = { x: deltaX, y: deltaY };
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          if (pendingPosition) {
            onUpdate({ position: pendingPosition });
            if (selectedNodes && selectedNodes.size > 1 && onMoveSelectedNodes && pendingDelta) {
              onMoveSelectedNodes(pendingDelta.x, pendingDelta.y, node.id);
            }
            lastPositionRef.current = pendingPosition;
          }
          rafId = null;
        });
      }
    };

    const handleMouseUp = () => {
      if (rafId) cancelAnimationFrame(rafId);
      setIsDragging(false);
      lastPositionRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, zoom, onUpdate, snapToGrid, gridSize, selectedNodes, onMoveSelectedNodes, node.id, node.position.x, node.position.y]);

  // ---- Anchor registration ----
  useLayoutEffect(() => {
    if (!nodeRef.current || !registerAnchor) return;
    const nodeRect = nodeRef.current.getBoundingClientRect();
    const totalScale = (node.scale || 1) * zoom;
    const currentAnchors = new Set();

    ['a', 'b', 'c'].forEach(secId => {
      const sec = node.sections[secId];
      if (!sec) return;
      sec.rows.forEach((_, ri) => {
        const anchorId = `${node.id}-${secId}-${ri}`;
        currentAnchors.add(anchorId);
        const dotEl = nodeRef.current.querySelector(`[data-anchor-id="${anchorId}"]`);
        if (dotEl) {
          const r = dotEl.getBoundingClientRect();
          registerAnchor(anchorId, {
            nodeId: node.id,
            localX: (r.left + r.width / 2 - nodeRect.left) / totalScale,
            localY: (r.top + r.height / 2 - nodeRect.top) / totalScale,
            type: 'both',
          });
        }
      });
    });

    return () => {
      if (unregisterAnchors) {
        unregisterAnchors(Array.from(currentAnchors));
      }
    };
  }, [node.id, node.sections, node.scale, node.layout, zoom, registerAnchor, unregisterAnchors]);

  // ---- Click to select ----
  const handleNodeClick = useCallback((e) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(node.id, e.shiftKey || e.ctrlKey || e.metaKey);
    }
  }, [node.id, onSelect]);

  // ---- Render sections ----
  const renderSection = useCallback((sectionId, fullWidth, mirrored) => {
    const sec = node.sections[sectionId];
    if (!sec) return null;

    return (
      <Section313
        sectionId={sectionId}
        section={sec}
        nodeId={node.id}
        fullWidth={fullWidth}
        mirrored={mirrored}
        onUpdate={handleSectionUpdate}
        onAnchorClick={onAnchorClick}
        activeWire={activeWire}
        connectedAnchorIds={connectedAnchorIds}
      />
    );
  }, [node.sections, node.id, handleSectionUpdate, onAnchorClick, activeWire, connectedAnchorIds]);

  // ---- Render normal layout ----
  const renderNormalLayout = () => {
    return layout.map((row, rowIndex) => {
      if (row.length === 2) {
        return (
          <div key={rowIndex} style={STYLES.abRow}>
            <div style={STYLES.sectionWrap}>
              <div onMouseDown={(e) => handleSectionGripDown(e, row[0])}>
                {renderSection(row[0], false, false)}
              </div>
            </div>
            <div style={{ ...STYLES.sectionWrap, ...STYLES.sectionWrapBorder }}>
              <div onMouseDown={(e) => handleSectionGripDown(e, row[1])}>
                {renderSection(row[1], false, true)}
              </div>
            </div>
          </div>
        );
      }
      return (
        <div key={rowIndex} onMouseDown={(e) => handleSectionGripDown(e, row[0])}>
          {renderSection(row[0], true, false)}
        </div>
      );
    });
  };

  // ---- Render drag mode (drop zones) ----
  const renderDragLayout = () => {
    const currentPos = getPosition(layoutKey, dragSec);

    if (dragSec === 'c') {
      // C can only go top or bottom
      const zones = ['top', 'bottom'].filter(p => p !== currentPos);
      const remaining = layout.map(r => r.filter(x => x !== 'c')).filter(r => r.length);

      return (
        <>
          {zones.includes('top') && <DropZone label="TOP" onDrop={() => handleDrop('top')} />}
          {remaining.map((row, ri) => {
            if (row.length === 2) {
              return (
                <div key={ri} style={STYLES.abRow}>
                  <div style={STYLES.sectionWrap}>{renderSection(row[0], false, false)}</div>
                  <div style={{ ...STYLES.sectionWrap, ...STYLES.sectionWrapBorder }}>{renderSection(row[1], false, true)}</div>
                </div>
              );
            }
            return <div key={ri}>{renderSection(row[0], true, false)}</div>;
          })}
          {zones.includes('bottom') && <DropZone label="BOTTOM" onDrop={() => handleDrop('bottom')} />}
        </>
      );
    }

    // A or B dragging: show LEFT/RIGHT/ABOVE/BELOW around the other
    const other = dragSec === 'a' ? 'b' : 'a';
    const cOnTop = layout.findIndex(r => r.includes('c')) === 0;
    const zones = ['left', 'right', 'above', 'below'].filter(p => p !== currentPos);

    const abContent = (
      <div>
        {zones.includes('above') && <DropZone label="ABOVE" onDrop={() => handleDrop('above')} />}
        <div style={{ display: 'flex' }}>
          {zones.includes('left') && <DropZone label="LEFT" onDrop={() => handleDrop('left')} />}
          <div>{renderSection(other, false, false)}</div>
          {zones.includes('right') && <DropZone label="RIGHT" onDrop={() => handleDrop('right')} />}
        </div>
        {zones.includes('below') && <DropZone label="BELOW" onDrop={() => handleDrop('below')} />}
      </div>
    );

    if (cOnTop) {
      return (
        <>
          {renderSection('c', true, false)}
          {abContent}
        </>
      );
    }
    return (
      <>
        {abContent}
        {renderSection('c', true, false)}
      </>
    );
  };

  const totalScale = node.scale || 1;

  return (
    <div
      ref={nodeRef}
      style={{
        ...STYLES.node,
        left: `${node.position.x}px`,
        top: `${node.position.y}px`,
        transform: `scale(${totalScale})`,
        transformOrigin: 'top left',
        outline: isSelected ? '2px solid #3b82f6' : 'none',
        outlineOffset: '1px',
        zIndex: isDragging ? 1000 : isSelected ? 100 : 1,
      }}
      onClick={handleNodeClick}
      data-node-id={node.id}
    >
      {/* Title bar */}
      <div style={STYLES.nodeTitle} onMouseDown={handleTitleMouseDown}>
        <span style={STYLES.grip}>⠿</span>
        <input
          style={{ ...STYLES.input, ...STYLES.titleInput }}
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Sections */}
      {dragSec ? renderDragLayout() : renderNormalLayout()}
    </div>
  );
}

export default Node313;
