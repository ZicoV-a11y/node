import { useState } from 'react';
import { NODE_PRESET_CATEGORIES, getSubcategories } from '../config/nodePresets';
import { getSubcategoryMeta } from '../config/gearMetadata';

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
  userPresets,
  onAddPreset
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const key = `${catId}/${subId}`;
  const presets = userPresets[key] || [];
  const hasPresets = presets.length > 0;
  const paddingLeft = 12 + depth * 12;

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
      {/* Folder header - droppable */}
      <div
        className={`
          flex items-center gap-2 px-2 py-1.5 cursor-pointer
          transition-colors text-xs font-mono text-zinc-400
          ${isDragOver ? 'bg-cyan-500/20 border border-dashed border-cyan-500' : 'hover:bg-zinc-700/50'}
        `}
        style={{ paddingLeft }}
        onClick={() => hasPresets && onToggle && onToggle()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        title={isDragOver ? 'Drop to save as preset' : description}
      >
        {/* Expand/collapse indicator */}
        {hasPresets ? (
          <span className="text-zinc-500 w-3 text-center">
            {isExpanded ? '▼' : '▶'}
          </span>
        ) : (
          <span className="w-3 text-zinc-600 text-center">○</span>
        )}

        {/* Folder icon */}
        <span className={isDragOver ? 'text-cyan-400' : 'text-zinc-500'}>
          {isDragOver ? '⊕' : '▫'}
        </span>

        {/* Label */}
        <span className="flex-1 truncate">{label}</span>

        {/* Preset count */}
        {hasPresets && (
          <span className="text-zinc-600 text-[10px]">{presets.length}</span>
        )}
      </div>

      {/* Presets inside folder */}
      {hasPresets && isExpanded && (
        <div>
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="group flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-zinc-700/50 text-xs font-mono text-zinc-400"
              style={{ paddingLeft: paddingLeft + 12 }}
              onClick={() => onAddPreset(preset)}
              title={`Add ${preset.label}`}
            >
              <span className="w-3" />
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
          ))}
        </div>
      )}
    </div>
  );
};

// Simple panel item (non-droppable)
const PanelItem = ({ label, description, depth = 0, onClick, isExpanded, onToggle, children, icon }) => {
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

export default function SidePanel({ isOpen, onClose, onAddNode, userPresets = {}, nodes, onSavePreset, onDeletePreset }) {
  // Track which categories/subcategories are expanded
  const [expandedCategories, setExpandedCategories] = useState({ sources: true });
  const [expandedSubcategories, setExpandedSubcategories] = useState({});

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
        {/* SuperNode (always first) */}
        <div className="mb-2">
          <PanelItem
            label="SuperNode"
            description="Blank configurable node"
            icon="□"
            onClick={handleAddSuperNode}
          />
        </div>

        <div className="border-t border-zinc-800 my-2" />

        {/* Categories from nodePresets */}
        {Object.entries(NODE_PRESET_CATEGORIES).map(([catId, category]) => {
          const subcategories = getSubcategories(catId);
          const isCatExpanded = expandedCategories[catId];

          return (
            <PanelItem
              key={catId}
              label={category.label}
              description={category.description}
              isExpanded={isCatExpanded}
              onToggle={() => toggleCategory(catId)}
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
                    userPresets={userPresets}
                    onAddPreset={handleAddFromPreset}
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
    </div>
  );
}
