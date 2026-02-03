import { useState } from 'react';

export default function PresetEditor({ preset, onSubmit, onCancel }) {
  const [name, setName] = useState(preset?.label || '');
  const [manufacturer, setManufacturer] = useState(preset?.system?.manufacturer || '');
  const [model, setModel] = useState(preset?.system?.model || '');
  const [rpCode, setRpCode] = useState(preset?.rpCode || '');
  const [description, setDescription] = useState(preset?.description || '');

  const handleSubmit = (e) => {
    e.preventDefault();

    // Update preset with new metadata
    const updatedPreset = {
      ...preset,
      label: name,
      title: name, // Sync title with name
      rpCode,
      description,
      system: {
        ...preset.system,
        manufacturer,
        model
      }
    };

    onSubmit(updatedPreset);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-700">
          <h2 className="text-lg font-mono text-zinc-100">
            Edit Preset
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Update preset metadata and equipment information
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-mono text-zinc-300 mb-1.5">
              Name <span className="text-zinc-500">(also sets node title)</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter preset name..."
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              autoFocus
              required
            />
          </div>

          {/* Manufacturer */}
          <div>
            <label className="block text-xs font-mono text-zinc-300 mb-1.5">
              Manufacturer
            </label>
            <input
              type="text"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="e.g., Blackmagic Design, Barco, Analog Way..."
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs font-mono text-zinc-300 mb-1.5">
              Model
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g., ATEM Television Studio HD, E2..."
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* RP Code */}
          <div>
            <label className="block text-xs font-mono text-zinc-300 mb-1.5">
              RP Code <span className="text-zinc-500">(Equipment Inventory)</span>
            </label>
            <input
              type="text"
              value={rpCode}
              onChange={(e) => setRpCode(e.target.value)}
              placeholder="e.g., EQ-042"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-mono text-zinc-300 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional notes about this preset..."
              rows={3}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 rounded text-sm font-mono transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-sm font-mono transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
