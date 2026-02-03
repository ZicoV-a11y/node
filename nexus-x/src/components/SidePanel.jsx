import { useState, useEffect } from 'react';
import { NODE_PRESET_CATEGORIES, getSubcategories } from '../config/nodePresets';
import { getSubcategoryMeta } from '../config/gearMetadata';
import PresetEditor from './PresetEditor';
import NewSubcategoryDialog from './NewSubcategoryDialog';

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
          // Only drag if not clicking on buttons
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
        className={`
          group flex items-center gap-2 px-2 py-1.5 cursor-move
          transition-colors text-xs font-mono text-white
          ${isDragOver ? 'bg-cyan-500/20 border border-dashed border-cyan-500' : 'hover:bg-zinc-700/50'}
          ${draggedItem?.type === 'subcategory' && draggedItem.subId === subId ? 'opacity-40' : ''}
        `}
        style={{ paddingLeft }}
        onClick={(e) => {
          // Prevent click during drag
          if (draggedItem) return;

          // Always allow toggling folders open/closed
          if (canAddBlank && !hasPresets && onAddBlankNode) {
            // Special case: empty editing folder adds a blank node
            onAddBlankNode();
          } else {
            // All other folders can be toggled
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
        <span className="w-3 text-zinc-600 text-center cursor-move">⋮⋮</span>

        {/* Expand/collapse indicator - always shown */}
        <span
          className="text-zinc-500 w-3 text-center"
          onClick={(e) => {
            e.stopPropagation();
            if (!(canAddBlank && !hasPresets)) {
              onToggle && onToggle();
            }
          }}
        >
          {isExpanded ? '▼' : '▶'}
        </span>

        {/* Folder icon */}
        <span className={isDragOver ? 'text-cyan-400' : 'text-zinc-500'}>
          {isDragOver ? '⊕' : '▫'}
        </span>

        {/* Label */}
        <span className="flex-1 truncate">{label}</span>

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
          className="text-zinc-600 hover:text-red-400 opacity-0 hover:opacity-100 px-1 group-hover:opacity-100"
          title="Delete subcategory"
        >
          ×
        </span>

        {/* Add button for empty editing subcategory */}
        {canAddBlank && !hasPresets && (
          <span className="text-zinc-600 hover:text-cyan-400">+</span>
        )}

        {/* Preset count */}
        {hasPresets && (
          <span className="text-zinc-600 text-[10px]">{presets.length}</span>
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
                    // Reorder within same subcategory
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
                className={`group flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-zinc-700/50 text-xs font-mono text-zinc-400 transition-all ${
                  isDragging ? 'opacity-40' : ''
                } ${
                  isDropTarget ? 'border-t-2 border-cyan-500' : ''
                }`}
                style={{ paddingLeft: paddingLeft + 12 }}
                onClick={(e) => {
                  if (!isDragging) onAddPreset(preset);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onEditPreset && onEditPreset(catId, subId, preset);
                }}
                title={`Click to add • Double-click to edit • Drag to reorder`}
              >
                <span className="w-3 text-zinc-600">⋮⋮</span>
                <span className="text-zinc-500">◦</span>
                <span className="flex-1 truncate">{preset.label}</span>
                <span
                  className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 px-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePreset && onDeletePreset(catId, subId, preset.id);
                  }}
                  title="Delete preset"
                >
                  ×
                </span>
                <span className="text-zinc-600 hover:text-cyan-400">+</span>
              </div>
            );
          })
          ) : (
            /* Empty folder message */
            !children && (
              <div
                className="px-2 py-2 text-xs font-mono text-zinc-600 italic"
                style={{ paddingLeft: paddingLeft + 12 }}
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
        className={`
          flex items-center gap-2 px-2 py-1.5 cursor-pointer
          hover:bg-zinc-700/50 transition-colors text-xs font-mono
          ${depth === 0 ? 'text-white font-medium' : 'text-white'}
          ${isDragOver ? 'bg-cyan-500/20 border border-dashed border-cyan-500' : ''}
        `}
        style={{ paddingLeft }}
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
          <span className="text-zinc-500 w-3 text-center">
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span className="w-3" />}

        {/* Icon */}
        {icon && <span className="text-zinc-500">{icon}</span>}

        {/* Label */}
        <span className="flex-1 truncate">{label}</span>

        {/* Add subcategory button for categories */}
        {hasChildren && onAddSubcategory && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onAddSubcategory();
            }}
            className="text-zinc-600 hover:text-cyan-400 px-1"
            title="Add new subcategory"
          >
            +
          </span>
        )}

        {/* Add button for leaf items */}
        {!hasChildren && onClick && (
          <span className="text-zinc-600 hover:text-cyan-400 px-1">+</span>
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

export default function SidePanel({ isOpen, onClose, onAddNode, userPresets = {}, userSubcategories = {}, subcategoryOrder = {}, nodes, onSavePreset, onDeletePreset, onUpdatePreset, onAddSubcategory, onDeleteSubcategory, onMoveSubcategory, onReorderPresets, onReorderSubcategories }) {
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
      className="h-full bg-zinc-900 border-r border-zinc-800 flex flex-col overflow-hidden relative"
      style={{ width: `${panelWidth}px` }}
    >
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <span className="text-xs font-mono font-semibold text-white tracking-wide">
          LIBRARY
        </span>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 text-sm"
          title="Close panel"
        >
          ✕
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Categories from nodePresets */}
        {Object.entries(NODE_PRESET_CATEGORIES).map(([catId, category]) => {
          const baseSubcategories = getSubcategories(catId);
          // Merge base subcategories with user-created ones (only top-level, parentId === null or undefined)
          const userSubs = userSubcategories[catId] || {};
          const userSubList = Object.entries(userSubs)
            .filter(([_, sub]) => !sub.parentId) // Only top-level
            .map(([id, sub]) => ({
              id,
              label: sub.label,
              description: sub.description,
              parentId: sub.parentId
            }));

          // Combine and apply custom ordering
          let subcategories = [...baseSubcategories, ...userSubList];
          const order = subcategoryOrder[catId] || [];

          // Sort user subcategories according to order array
          if (order.length > 0) {
            subcategories = subcategories.sort((a, b) => {
              const indexA = order.indexOf(a.id);
              const indexB = order.indexOf(b.id);

              // If both are in order array, sort by their position
              if (indexA !== -1 && indexB !== -1) return indexA - indexB;
              // If only A is in order, it comes after base subcategories
              if (indexA !== -1) return 1;
              // If only B is in order, it comes after base subcategories
              if (indexB !== -1) return -1;
              // Neither in order (both are base), maintain original order
              return 0;
            });
          }

          const isCatExpanded = expandedCategories[catId];

          return (
            <PanelItem
              key={catId}
              catId={catId}
              label={category.label}
              description={category.description}
              isExpanded={isCatExpanded}
              onToggle={() => toggleCategory(catId)}
              onAddSubcategory={() => setAddingSubcategory({ categoryId: catId, categoryLabel: category.label })}
              draggedItem={draggedItem}
              onMoveSubcategory={onMoveSubcategory}
            >
              {subcategories.map(sub => {
                // Check if this is a user-created subcategory (convert to boolean)
                const isUserCreated = !!(userSubcategories[catId] && userSubcategories[catId][sub.id]);
                console.log('Rendering subcategory:', sub.id, 'isUserCreated:', isUserCreated);
                return renderSubcategory(catId, sub, null, 1, isUserCreated);
              })}
            </PanelItem>
          );
        })}

        {/* Placeholder for future manufacturer categories */}
        <div className="border-t border-zinc-800 my-2" />

        <div className="px-3 py-2">
          <span className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
            Manufacturers
          </span>
        </div>

        {/* Barco (placeholder) */}
        <PanelItem
          label="Barco"
          description="Coming soon"
          icon="◇"
          depth={0}
        >
          {[]}
        </PanelItem>

        {/* Blackmagic (placeholder) */}
        <PanelItem
          label="Blackmagic"
          description="Coming soon"
          icon="◇"
          depth={0}
        >
          {[]}
        </PanelItem>

        {/* Analog Way (placeholder) */}
        <PanelItem
          label="Analog Way"
          description="Coming soon"
          icon="◇"
          depth={0}
        >
          {[]}
        </PanelItem>
      </div>

      {/* Panel Footer */}
      <div className="border-t border-zinc-800 px-3 py-2">
        <p className="text-[10px] font-mono text-zinc-600">
          Drag node to folder to save preset
        </p>
      </div>

      {/* Resize Handle */}
      <div
        className="absolute top-0 right-0 w-2 h-full cursor-ew-resize bg-zinc-700/30 hover:bg-cyan-500/70 transition-colors z-50"
        onMouseDown={handleResizeStart}
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
