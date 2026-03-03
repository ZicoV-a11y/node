import { useState, useEffect } from 'react';
import { NODE_PRESET_CATEGORIES, getSubcategories } from '../config/nodePresets';
import { getSubcategoryMeta } from '../config/gearMetadata';
import PresetEditor from './PresetEditor';
import NewSubcategoryDialog from './NewSubcategoryDialog';

const BG = "#0e0e0c";
const NODE = "#1a1a18";
const NODEBORDER = "#2e2e2a";
const TEXT = "#706f6a";
const TEXTHI = "#b5b4ae";
const WHITE = "#d8d7d2";
const BRAND = "#6b9edd";
const ui = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// Droppable subcategory folder
const SubcategoryFolder = ({
  catId,
  subId,
  label,
  description,
  depth,
  isExpanded,
  onToggle,
  onSavePreset,
  onDeletePreset,
  onEditPreset,
  onDeleteSubcategory,
  onMoveSubcategory,
  userPresets,
  userSubcategories,
  onAddPreset,
  onAddBlankNode,
  draggedItem,
  onDragStart,
  onDragOver,
  onDragEnd,
  onReorderPresets,
  children,
  isUserCreated
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverPresetId, setDragOverPresetId] = useState(null);
  const key = `${catId}/${subId}`;
  const presets = userPresets[key] || [];
  const hasPresets = presets.length > 0;
  const paddingLeft = 12 + depth * 12;

  // Check if this is a special subcategory that can add blank nodes
  const canAddBlank = subId === 'editing';

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('Drag over folder:', subId, 'draggedItem:', draggedItem);

    // Only show drop indicator for nodes (saving as preset) or subcategory reordering
    if (draggedItem?.type === 'subcategory' && draggedItem.catId === catId) {
      console.log('Valid subcategory drag detected');
      setIsDragOver(true);
    } else if (!draggedItem) {
      // Dragging a node from canvas
      console.log('Node drag detected');
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // Handle subcategory dropping into this folder (nesting)
    if (draggedItem?.type === 'subcategory' && draggedItem.catId === catId && draggedItem.subId !== subId) {
      // Check if dropping with Ctrl/Cmd key = move into folder (nest)
      if (e.ctrlKey || e.metaKey) {
        // Allow nesting into any folder
        console.log('Nesting:', draggedItem.subId, 'into', subId);
        onMoveSubcategory && onMoveSubcategory(catId, draggedItem.subId, subId);
      } else {
        // Regular drop = reorder at same level
        console.log('Reordering:', draggedItem.subId, 'to position of', subId);
        onDragOver && onDragOver(draggedItem.catId, draggedItem.subId, subId);
      }
      return;
    }

    // Handle node drop (save as preset)
    const nodeId = e.dataTransfer.getData('nodeId');
    if (nodeId && onSavePreset) {
      onSavePreset(nodeId, catId, subId);
    }
  };

  console.log('SubcategoryFolder render:', subId, 'draggable:', isUserCreated);

  return (
    <div>
      {/* Folder header - droppable and draggable */}
      <div
        draggable="true"
        onDragStart={(e) => {
          console.log('onDragStart fired for:', subId);
          if (!e.target.closest('span[title*="Delete"]')) {
            console.log('Drag started:', { type: 'subcategory', catId, subId, isUserCreated });
            onDragStart && onDragStart({ type: 'subcategory', catId, subId, isUserCreated });
          } else {
            e.preventDefault();
          }
        }}
        onDragEnd={(e) => {
          console.log('Drag ended');
          onDragEnd && onDragEnd();
        }}
        className="group"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: `5px 8px 5px ${paddingLeft}px`,
          cursor: 'move', fontSize: 11, fontFamily: ui,
          color: WHITE,
          background: isDragOver ? 'rgba(107,158,221,0.12)' : 'transparent',
          border: isDragOver ? `1px dashed ${BRAND}` : '1px solid transparent',
          opacity: draggedItem?.type === 'subcategory' && draggedItem.subId === subId ? 0.4 : 1,
        }}
        onMouseEnter={e => { if (!isDragOver) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
        onMouseLeave={e => { if (!isDragOver) e.currentTarget.style.background = 'transparent'; }}
        onClick={(e) => {
          if (draggedItem) return;
          if (canAddBlank && !hasPresets && onAddBlankNode) {
            onAddBlankNode();
          } else {
            onToggle && onToggle();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        title={
          isDragOver
            ? (draggedItem?.type === 'subcategory' ? 'Drop to reorder • Hold Ctrl/Cmd to nest inside' : 'Drop to save as preset')
            : (canAddBlank && !hasPresets ? 'Click to add blank SuperNode' : `${description} • Click to expand • Drag to reorder or nest`)
        }
      >
        {/* Drag handle */}
        <span style={{ width: 12, textAlign: 'center', color: NODEBORDER, cursor: 'move', fontSize: 9 }}>⋮⋮</span>

        {/* Expand/collapse indicator */}
        <span
          style={{ color: TEXT, width: 12, textAlign: 'center', fontSize: 8 }}
          onClick={(e) => {
            e.stopPropagation();
            if (!(canAddBlank && !hasPresets)) {
              onToggle && onToggle();
            }
          }}
        >
          {isExpanded ? '▾' : '▸'}
        </span>

        {/* Label */}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>

        {/* Delete subcategory button */}
        <span
          onClick={(e) => {
            e.stopPropagation();
            if (onDeleteSubcategory && confirm(`Delete "${label}" subcategory and all its presets?`)) {
              onDeleteSubcategory(catId, subId);
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onDragStart={(e) => e.stopPropagation()}
          className="opacity-0 group-hover:opacity-100"
          style={{ color: TEXT, padding: '0 4px', cursor: 'pointer', fontSize: 11 }}
          onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
          onMouseLeave={e => { e.currentTarget.style.color = TEXT; }}
          title="Delete subcategory"
        >
          ×
        </span>

        {/* Add button for empty editing subcategory */}
        {canAddBlank && !hasPresets && (
          <span style={{ color: TEXT, fontSize: 11 }}>+</span>
        )}

        {/* Preset count */}
        {hasPresets && (
          <span style={{ fontSize: 9, fontFamily: ui, color: TEXT, opacity: 0.5 }}>{presets.length}</span>
        )}
      </div>

      {/* Folder content when expanded */}
      {isExpanded && (
        <div>
          {/* Presets inside folder */}
          {hasPresets ? (
            presets.map((preset, index) => {
            const isDragging = draggedItem?.type === 'preset' && draggedItem.id === preset.id;
            const isDropTarget = dragOverPresetId === preset.id;

            return (
              <div
                key={preset.id}
                draggable={true}
                onDragStart={(e) => {
                  e.stopPropagation();
                  onDragStart && onDragStart({ type: 'preset', catId, subId, id: preset.id, index });
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverPresetId(preset.id);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragOverPresetId(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverPresetId(null);

                  if (draggedItem?.type === 'preset' && draggedItem.catId === catId && draggedItem.subId === subId) {
                    if (onReorderPresets && draggedItem.index !== index) {
                      onReorderPresets(catId, subId, draggedItem.index, index);
                    }
                  }
                }}
                onDragEnd={(e) => {
                  e.preventDefault();
                  setDragOverPresetId(null);
                  onDragEnd && onDragEnd();
                }}
                className="group"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: `4px 8px 4px ${paddingLeft + 12}px`,
                  cursor: 'pointer', fontSize: 11, fontFamily: ui, color: TEXT,
                  opacity: isDragging ? 0.4 : 1,
                  borderTop: isDropTarget ? `2px solid ${BRAND}` : '2px solid transparent',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = WHITE; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = TEXT; }}
                onClick={(e) => {
                  if (!isDragging) onAddPreset(preset);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onEditPreset && onEditPreset(catId, subId, preset);
                }}
                title={`Click to add • Double-click to edit • Drag to reorder`}
              >
                <span style={{ width: 12, textAlign: 'center', color: NODEBORDER, fontSize: 9 }}>⋮⋮</span>
                <span style={{ color: TEXT, opacity: 0.4 }}>◦</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preset.label}</span>
                <span
                  className="opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePreset && onDeletePreset(catId, subId, preset.id);
                  }}
                  style={{ color: TEXT, padding: '0 4px', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = TEXT; }}
                  title="Delete preset"
                >
                  ×
                </span>
                <span style={{ color: TEXT, opacity: 0.4 }}>+</span>
              </div>
            );
          })
          ) : (
            /* Empty folder message */
            !children && (
              <div
                style={{
                  padding: `6px 8px 6px ${paddingLeft + 12}px`,
                  fontSize: 10, fontFamily: ui, color: TEXT, opacity: 0.4,
                  fontStyle: 'italic',
                }}
              >
                No presets yet • Drag a node here to save
              </div>
            )
          )}

          {/* Nested subcategories (children) */}
          {children}
        </div>
      )}
    </div>
  );
};

// Simple panel item (droppable for unnesting folders)
const PanelItem = ({ label, description, depth = 0, onClick, isExpanded, onToggle, onAddSubcategory, children, icon, catId, draggedItem, onMoveSubcategory }) => {
  const hasChildren = children && children.length > 0;
  const paddingLeft = 12 + depth * 12;
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    // Only accept subcategory drops to move them to top-level
    if (draggedItem?.type === 'subcategory' && draggedItem.catId === catId) {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // Move subcategory to top-level (parentId = null)
    if (draggedItem?.type === 'subcategory' && draggedItem.catId === catId) {
      onMoveSubcategory && onMoveSubcategory(catId, draggedItem.subId, null);
    }
  };

  return (
    <div>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: `5px 8px 5px ${paddingLeft}px`,
          cursor: 'pointer',
          fontSize: 11, fontFamily: ui,
          color: depth === 0 ? WHITE : TEXTHI,
          fontWeight: depth === 0 ? 600 : 400,
          background: isDragOver ? 'rgba(107,158,221,0.12)' : 'transparent',
          border: isDragOver ? `1px dashed ${BRAND}` : '1px solid transparent',
        }}
        onMouseEnter={e => { if (!isDragOver) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
        onMouseLeave={e => { if (!isDragOver) e.currentTarget.style.background = 'transparent'; }}
        onClick={() => {
          if (hasChildren && onToggle) {
            onToggle();
          } else if (onClick) {
            onClick();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        title={isDragOver ? 'Drop to move to top-level' : description}
      >
        {/* Expand/collapse indicator */}
        {hasChildren && (
          <span style={{ color: TEXT, width: 12, textAlign: 'center', fontSize: 8 }}>
            {isExpanded ? '▾' : '▸'}
          </span>
        )}
        {!hasChildren && <span style={{ width: 12 }} />}

        {/* Icon */}
        {icon && <span style={{ color: TEXT }}>{icon}</span>}

        {/* Label */}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>

        {/* Add subcategory button for categories */}
        {hasChildren && onAddSubcategory && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onAddSubcategory();
            }}
            style={{ color: TEXT, padding: '0 4px', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.color = BRAND; }}
            onMouseLeave={e => { e.currentTarget.style.color = TEXT; }}
            title="Add new subcategory"
          >
            +
          </span>
        )}

        {/* Add button for leaf items */}
        {!hasChildren && onClick && (
          <span style={{ color: TEXT, opacity: 0.4, padding: '0 4px' }}>+</span>
        )}
      </div>

      {/* Children (expanded) */}
      {hasChildren && isExpanded && (
        <div>
          {children}
        </div>
      )}
    </div>
  );
};

export default function SidePanel({ isOpen, onClose, onAddNode, userPresets = {}, userSubcategories = {}, subcategoryOrder = {}, nodes, onSavePreset, onDeletePreset, onUpdatePreset, onAddSubcategory, onDeleteSubcategory, onMoveSubcategory, onReorderPresets, onReorderSubcategories, onExportPresetsJSON }) {
  // Track which categories/subcategories are expanded
  const [expandedCategories, setExpandedCategories] = useState({ sources: true });
  const [expandedSubcategories, setExpandedSubcategories] = useState({});

  // Panel width state
  const [panelWidth, setPanelWidth] = useState(224); // Default 224px (w-56)
  const [isResizing, setIsResizing] = useState(false);

  // Preset editor state
  const [editingPreset, setEditingPreset] = useState(null);

  // New subcategory state
  const [addingSubcategory, setAddingSubcategory] = useState(null);

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);

  const toggleCategory = (catId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const toggleSubcategory = (catId, subId) => {
    const key = `${catId}/${subId}`;
    setExpandedSubcategories(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Handle adding blank supernode
  const handleAddSuperNode = () => {
    onAddNode({ type: 'supernode' });
  };

  // Handle adding from a saved preset
  const handleAddFromPreset = (preset) => {
    onAddNode({
      type: 'supernode',
      preset: preset
    });
  };

  // Handle editing a preset
  const handleEditPreset = (catId, subId, preset) => {
    setEditingPreset({
      catId,
      subId,
      preset
    });
  };

  // Handle saving edited preset
  const handleSaveEditedPreset = (updatedPreset) => {
    if (editingPreset && onUpdatePreset) {
      onUpdatePreset(
        editingPreset.catId,
        editingPreset.subId,
        editingPreset.preset.id,
        updatedPreset
      );
    }
    setEditingPreset(null);
  };

  // Handle creating new subcategory
  const handleCreateSubcategory = (data) => {
    if (onAddSubcategory) {
      onAddSubcategory(data);
    }
    setAddingSubcategory(null);
  };

  // Drag and drop handlers
  const handleDragStart = (item) => {
    setDraggedItem(item);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const handleReorderPresets = (catId, subId, fromIndex, toIndex) => {
    if (onReorderPresets) {
      onReorderPresets(catId, subId, fromIndex, toIndex);
    }
  };

  // Handle panel resize
  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Resize started');
    setIsResizing(true);
  };

  // Add/remove mouse event listeners for resizing
  useEffect(() => {
    const handleResizeMove = (e) => {
      const newWidth = e.clientX;
      console.log('Resizing to:', newWidth);
      // Constrain between 200px and 600px
      if (newWidth >= 200 && newWidth <= 600) {
        setPanelWidth(newWidth);
      }
    };

    const handleResizeEnd = () => {
      console.log('Resize ended');
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Recursive function to render subcategories with nesting
  const renderSubcategory = (catId, sub, parentId, depth, isUserCreated = false) => {
    const subKey = `${catId}/${sub.id}`;
    const isSubExpanded = expandedSubcategories[subKey];
    const gearMeta = getSubcategoryMeta(catId, sub.id);

    // Find children of this subcategory
    const userSubs = userSubcategories[catId] || {};
    const children = Object.entries(userSubs)
      .filter(([_, subData]) => subData.parentId === sub.id)
      .map(([id, subData]) => ({
        id,
        label: subData.label,
        description: subData.description,
        parentId: subData.parentId
      }));

    return (
      <SubcategoryFolder
        key={sub.id}
        catId={catId}
        subId={sub.id}
        label={sub.label}
        description={gearMeta?.description || sub.description}
        depth={depth}
        isExpanded={isSubExpanded}
        onToggle={() => toggleSubcategory(catId, sub.id)}
        onSavePreset={onSavePreset}
        onDeletePreset={onDeletePreset}
        onEditPreset={handleEditPreset}
        onDeleteSubcategory={onDeleteSubcategory}
        onMoveSubcategory={onMoveSubcategory}
        userPresets={userPresets}
        userSubcategories={userSubcategories}
        onAddPreset={handleAddFromPreset}
        onAddBlankNode={handleAddSuperNode}
        draggedItem={draggedItem}
        onDragStart={handleDragStart}
        onDragOver={onReorderSubcategories}
        onDragEnd={handleDragEnd}
        onReorderPresets={handleReorderPresets}
        isUserCreated={isUserCreated}
      >
        {children.length > 0 && children.map(childSub => renderSubcategory(catId, childSub, sub.id, depth + 1, true))}
      </SubcategoryFolder>
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="h-full flex flex-col overflow-hidden relative"
      style={{ width: `${panelWidth}px`, background: BG, borderRight: `1px solid ${NODEBORDER}` }}
    >
      {/* Panel Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderBottom: `1px solid ${NODEBORDER}`,
        background: NODE,
      }}>
        <span style={{
          fontSize: 9, fontFamily: ui, fontWeight: 700,
          letterSpacing: 1.2, textTransform: 'uppercase',
          color: BRAND, opacity: 0.6,
        }}>
          Library
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: TEXT, fontSize: 12, fontFamily: ui,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = WHITE; }}
          onMouseLeave={e => { e.currentTarget.style.color = TEXT; }}
          title="Close panel"
        >
          ✕
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '8px 0' }}>
        {/* Add Blank Node */}
        <div style={{ padding: '4px 10px' }}>
          <button
            onClick={() => onAddNode('node313')}
            style={{
              width: '100%', padding: '7px 10px', textAlign: 'left',
              background: 'rgba(107,158,221,0.08)',
              border: `1px solid rgba(107,158,221,0.22)`,
              borderRadius: 8, cursor: 'pointer',
              fontSize: 11, fontFamily: ui, color: BRAND, fontWeight: 600,
            }}
            className="sf-toolbar-btn"
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(107,158,221,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(107,158,221,0.08)'; }}
          >
            + Blank Node
          </button>
        </div>

        {/* Equipment Catalog — organized by manufacturer > device type */}
        {(() => {
          const savedPresets = userPresets?.['node313/saved'] || [];
          if (savedPresets.length === 0) return null;

          // Group by manufacturer, then by primary deviceType within each manufacturer
          const catalog = {};
          savedPresets.forEach(preset => {
            const mfg = preset.manufacturer?.trim() || 'Uncategorized';
            if (!catalog[mfg]) catalog[mfg] = {};
            const types = preset.deviceTypes?.length > 0 ? preset.deviceTypes : ['General'];
            // Use primaryDeviceType if set, otherwise fall back to first type
            const primaryType = preset.primaryDeviceType && types.includes(preset.primaryDeviceType)
              ? preset.primaryDeviceType
              : types[0];
            if (!catalog[mfg][primaryType]) catalog[mfg][primaryType] = [];
            catalog[mfg][primaryType].push(preset);
          });

          const mfgKeys = Object.keys(catalog).sort((a, b) => {
            if (a === 'Uncategorized') return 1;
            if (b === 'Uncategorized') return -1;
            return a.localeCompare(b);
          });

          return (
            <>
              <div style={{ borderTop: `1px solid ${NODEBORDER}`, margin: '8px 0' }} />
              <div style={{ padding: '4px 14px' }}>
                <span style={{
                  fontSize: 9, fontFamily: ui, fontWeight: 700,
                  letterSpacing: 1.2, textTransform: 'uppercase',
                  color: TEXT, opacity: 0.5,
                }}>
                  Equipment
                </span>
              </div>

              {mfgKeys.map(mfg => {
                const isExpanded = expandedCategories[`mfg-${mfg}`] !== false;
                const typeGroups = catalog[mfg];
                const typeKeys = Object.keys(typeGroups).sort();

                return (
                  <div key={mfg}>
                    {/* Manufacturer header */}
                    <button
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 14px', textAlign: 'left',
                        background: 'none', border: 'none', cursor: 'pointer',
                      }}
                      onClick={() => toggleCategory(`mfg-${mfg}`)}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                    >
                      <span style={{ fontSize: 9, fontFamily: ui, color: TEXT }}>{isExpanded ? '▾' : '▸'}</span>
                      <span style={{ fontSize: 11, fontFamily: ui, color: TEXTHI, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', flex: 1 }}>{mfg}</span>
                      <span style={{ fontSize: 9, fontFamily: ui, color: TEXT, opacity: 0.5 }}>
                        {Object.values(typeGroups).reduce((a, b) => a + b.length, 0)}
                      </span>
                    </button>

                    {isExpanded && typeKeys.map(type => (
                      <div key={type} style={{ marginLeft: 12 }}>
                        {typeKeys.length > 1 && (
                          <div style={{ padding: '2px 14px' }}>
                            <span style={{ fontSize: 8, fontFamily: ui, color: TEXT, opacity: 0.4, textTransform: 'uppercase', letterSpacing: 1.5 }}>{type}</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '0 8px 4px' }}>
                          {typeGroups[type].map(preset => {
                            const parts = [preset.model, preset.tag ? `(${preset.tag})` : ''].filter(Boolean).join(' ');
                            const displayName = parts || preset.title || preset.label;

                            return (
                              <div key={preset.id} className="group" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <div
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'node313-preset', preset }));
                                    e.dataTransfer.effectAllowed = 'copy';
                                  }}
                                  onClick={() => onAddNode({ type: 'node313', preset })}
                                  style={{
                                    flex: 1, padding: '4px 8px', cursor: 'grab',
                                    fontSize: 11, fontFamily: ui, color: TEXT,
                                    borderRadius: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}
                                  className="sf-toolbar-btn"
                                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = WHITE; }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = TEXT; }}
                                  title={`Drag to canvas or click to add — ${preset.label}`}
                                >
                                  {preset.signalColor && (
                                    <span style={{
                                      display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
                                      marginRight: 6, verticalAlign: 'middle',
                                      backgroundColor: `var(--signal-${preset.signalColor}, #666)`,
                                    }} />
                                  )}
                                  {displayName}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (typeof onDeletePreset === 'function') {
                                      onDeletePreset('node313', 'saved', preset.id);
                                    }
                                  }}
                                  className="opacity-0 group-hover:opacity-100"
                                  style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: TEXT, fontSize: 10, padding: '0 4px',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
                                  onMouseLeave={e => { e.currentTarget.style.color = TEXT; }}
                                  title="Delete preset"
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </>
          );
        })()}

        {/* Export Presets */}
        {Object.keys(userPresets).length > 0 && onExportPresetsJSON && (
          <>
            <div style={{ borderTop: `1px solid ${NODEBORDER}`, margin: '8px 0' }} />
            <div style={{ padding: '4px 10px' }}>
              <button
                onClick={onExportPresetsJSON}
                style={{
                  width: '100%', padding: '6px 10px', textAlign: 'left',
                  background: NODE, border: `1px solid ${NODEBORDER}`,
                  borderRadius: 8, cursor: 'pointer',
                  fontSize: 10, fontFamily: ui, color: TEXT,
                }}
                className="sf-toolbar-btn"
                onMouseEnter={e => { e.currentTarget.style.background = '#222220'; e.currentTarget.style.color = TEXTHI; }}
                onMouseLeave={e => { e.currentTarget.style.background = NODE; e.currentTarget.style.color = TEXT; }}
              >
                Export Presets to JSON
              </button>
            </div>
          </>
        )}
      </div>

      {/* Resize Handle */}
      <div
        style={{
          position: 'absolute', top: 0, right: 0,
          width: 3, height: '100%', cursor: 'ew-resize',
          background: NODEBORDER, zIndex: 50,
        }}
        onMouseDown={handleResizeStart}
        onMouseEnter={e => { e.currentTarget.style.background = BRAND; }}
        onMouseLeave={e => { e.currentTarget.style.background = NODEBORDER; }}
        title="Drag to resize sidebar"
      />

      {/* Preset Editor Dialog */}
      {editingPreset && (
        <PresetEditor
          preset={editingPreset.preset}
          onSubmit={handleSaveEditedPreset}
          onCancel={() => setEditingPreset(null)}
        />
      )}

      {/* New Subcategory Dialog */}
      {addingSubcategory && (
        <NewSubcategoryDialog
          categoryId={addingSubcategory.categoryId}
          categoryLabel={addingSubcategory.categoryLabel}
          onSubmit={handleCreateSubcategory}
          onCancel={() => setAddingSubcategory(null)}
        />
      )}
    </div>
  );
}
