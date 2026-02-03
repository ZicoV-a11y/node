import { useState } from 'react';
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
  userPresets,
  onAddPreset,
  onAddBlankNode,
  draggedItem,
  onDragStart,
  onDragOver,
  onDragEnd,
  onReorderPresets
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
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    // Get the node ID from the drag data
    const nodeId = e.dataTransfer.getData('nodeId');
    if (nodeId && onSavePreset) {
      onSavePreset(nodeId, catId, subId);
    }
  };

  return (
    <div>
      {/* Folder header - droppable and draggable */}
      <div
        draggable={true}
        onDragStart={(e) => {
          // Only drag if not clicking on buttons
          if (!e.target.closest('span[title*="Delete"]')) {
            onDragStart && onDragStart({ type: 'subcategory', catId, subId });
          } else {
            e.preventDefault();
          }
        }}
        onDragEnd={(e) => {
          onDragEnd && onDragEnd();
        }}
        className={`
          group flex items-center gap-2 px-2 py-1.5 cursor-move
          transition-colors text-xs font-mono text-zinc-400
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
        title={isDragOver ? 'Drop to save as preset' : (canAddBlank && !hasPresets ? 'Click to add blank SuperNode' : `${description} • Click to expand • Drag to reorder`)}
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
            <div
              className="px-2 py-2 text-xs font-mono text-zinc-600 italic"
              style={{ paddingLeft: paddingLeft + 12 }}
            >
              No presets yet • Drag a node here to save
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Simple panel item (non-droppable)
const PanelItem = ({ label, description, depth = 0, onClick, isExpanded, onToggle, onAddSubcategory, children, icon }) => {
  const hasChildren = children && children.length > 0;
  const paddingLeft = 12 + depth * 12;

  return (
    <div>
      <div
        className={`
          flex items-center gap-2 px-2 py-1.5 cursor-pointer
          hover:bg-zinc-700/50 transition-colors text-xs font-mono
          ${depth === 0 ? 'text-zinc-300 font-medium' : 'text-zinc-400'}
        `}
        style={{ paddingLeft }}
        onClick={() => {
          if (hasChildren && onToggle) {
            onToggle();
          } else if (onClick) {
            onClick();
          }
        }}
        title={description}
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

export default function SidePanel({ isOpen, onClose, onAddNode, userPresets = {}, userSubcategories = {}, nodes, onSavePreset, onDeletePreset, onUpdatePreset, onAddSubcategory, onDeleteSubcategory, onReorderPresets, onReorderSubcategories }) {
  // Track which categories/subcategories are expanded
  const [expandedCategories, setExpandedCategories] = useState({ sources: true });
  const [expandedSubcategories, setExpandedSubcategories] = useState({});

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

  if (!isOpen) return null;

  return (
    <div className="w-56 h-full bg-zinc-900 border-r border-zinc-800 flex flex-col overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
        <span className="text-xs font-mono font-semibold text-zinc-300 tracking-wide">
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
          // Merge base subcategories with user-created ones
          const userSubs = userSubcategories[catId] || {};
          const userSubList = Object.entries(userSubs).map(([id, sub]) => ({
            id,
            label: sub.label,
            description: sub.description
          }));
          const subcategories = [...baseSubcategories, ...userSubList];

          const isCatExpanded = expandedCategories[catId];

          return (
            <PanelItem
              key={catId}
              label={category.label}
              description={category.description}
              isExpanded={isCatExpanded}
              onToggle={() => toggleCategory(catId)}
              onAddSubcategory={() => setAddingSubcategory({ categoryId: catId, categoryLabel: category.label })}
            >
              {subcategories.map(sub => {
                const subKey = `${catId}/${sub.id}`;
                const isSubExpanded = expandedSubcategories[subKey];
                const gearMeta = getSubcategoryMeta(catId, sub.id);

                return (
                  <SubcategoryFolder
                    key={sub.id}
                    catId={catId}
                    subId={sub.id}
                    label={sub.label}
                    description={gearMeta?.description || sub.description}
                    depth={1}
                    isExpanded={isSubExpanded}
                    onToggle={() => toggleSubcategory(catId, sub.id)}
                    onSavePreset={onSavePreset}
                    onDeletePreset={onDeletePreset}
                    onEditPreset={handleEditPreset}
                    onDeleteSubcategory={onDeleteSubcategory}
                    userPresets={userPresets}
                    onAddPreset={handleAddFromPreset}
                    onAddBlankNode={handleAddSuperNode}
                    draggedItem={draggedItem}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onReorderPresets={handleReorderPresets}
                  />
                );
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
