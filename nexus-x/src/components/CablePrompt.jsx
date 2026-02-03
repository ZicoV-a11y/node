import { useState } from 'react';

const CABLE_TYPES = [
  'HDMI 2.0',
  'HDMI 2.1',
  'DisplayPort 1.4',
  'DisplayPort 2.0',
  'USB-C (Thunderbolt 3)',
  'USB-C (Thunderbolt 4)',
  'CAT5e',
  'CAT6',
  'CAT6a',
  'CAT7',
  'Fiber Optic (Single Mode)',
  'Fiber Optic (Multi Mode)',
  'SDI',
  '3G-SDI',
  '6G-SDI',
  '12G-SDI',
  'AES/EBU (XLR)',
  'RCA Audio',
  'XLR Audio',
  'TRS Audio',
  'Custom...'
];

export default function CablePrompt({ onSubmit, onCancel, initialData = null }) {
  // Check if we're editing (initial data provided)
  const isEditing = !!initialData;

  // Determine if initial cable type is in the preset list or custom
  const initialType = initialData?.cableType || '';
  const isInitialCustom = initialType && !CABLE_TYPES.includes(initialType);

  const [cableType, setCableType] = useState(
    isInitialCustom ? 'Custom...' : initialType
  );
  const [customType, setCustomType] = useState(
    isInitialCustom ? initialType : ''
  );
  const [length, setLength] = useState(initialData?.cableLength || '');
  const [rpCode, setRpCode] = useState(initialData?.rpCode || '');
  const [description, setDescription] = useState(initialData?.description || '');

  const isCustomType = cableType === 'Custom...';
  const finalCableType = isCustomType ? customType : cableType;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      cableType: finalCableType,
      cableLength: length,
      rpCode,
      description
    });
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
            {isEditing ? 'Edit Cable Details' : 'Cable Details'}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            {isEditing ? 'Update cable and inventory information' : 'Enter cable and inventory information'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Cable Type */}
          <div>
            <label className="block text-xs font-mono text-zinc-300 mb-1.5">
              Cable Type / Connector Type
            </label>
            <select
              value={cableType}
              onChange={(e) => setCableType(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm font-mono text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              autoFocus
            >
              <option value="">Select cable type...</option>
              {CABLE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Type Input (if Custom selected) */}
          {isCustomType && (
            <div>
              <label className="block text-xs font-mono text-zinc-300 mb-1.5">
                Custom Cable Type
              </label>
              <input
                type="text"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="Enter custom cable type..."
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          )}

          {/* Cable Length */}
          <div>
            <label className="block text-xs font-mono text-zinc-300 mb-1.5">
              Cable Length
            </label>
            <input
              type="text"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder="e.g., 15m, 50ft, 10 meters..."
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
              placeholder="e.g., CBL-001"
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
              placeholder="Cable description and length details..."
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
              {isEditing ? 'Update Cable' : 'Create Cable'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
