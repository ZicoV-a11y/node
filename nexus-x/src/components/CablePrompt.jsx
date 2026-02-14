import { useState } from 'react';

// Wire colors - matches SIGNAL_COLORS in App.jsx
const WIRE_COLORS = [
  { id: 'auto', hex: null, label: 'Auto (from source)' },
  // Primary colors
  { id: 'cyan', hex: '#06b6d4', label: 'Cyan' },
  { id: 'emerald', hex: '#10b981', label: 'Emerald' },
  { id: 'blue', hex: '#3b82f6', label: 'Blue' },
  { id: 'violet', hex: '#8b5cf6', label: 'Violet' },
  { id: 'pink', hex: '#ec4899', label: 'Pink' },
  { id: 'red', hex: '#ef4444', label: 'Red' },
  { id: 'orange', hex: '#f97316', label: 'Orange' },
  { id: 'yellow', hex: '#eab308', label: 'Yellow' },
  // Extended colors
  { id: 'lime', hex: '#84cc16', label: 'Lime' },
  { id: 'teal', hex: '#14b8a6', label: 'Teal' },
  { id: 'sky', hex: '#0ea5e9', label: 'Sky' },
  { id: 'indigo', hex: '#6366f1', label: 'Indigo' },
  { id: 'fuchsia', hex: '#d946ef', label: 'Fuchsia' },
  { id: 'rose', hex: '#f43f5e', label: 'Rose' },
  { id: 'amber', hex: '#f59e0b', label: 'Amber' },
  { id: 'slate', hex: '#64748b', label: 'Slate' },
  // Additional colors
  { id: 'green', hex: '#22c55e', label: 'Green' },
  { id: 'purple', hex: '#a855f7', label: 'Purple' },
  { id: 'coral', hex: '#fb7185', label: 'Coral' },
  { id: 'mint', hex: '#34d399', label: 'Mint' },
  { id: 'gold', hex: '#fbbf24', label: 'Gold' },
  { id: 'magenta', hex: '#e879f9', label: 'Magenta' },
  { id: 'navy', hex: '#1e40af', label: 'Navy' },
  { id: 'bronze', hex: '#b45309', label: 'Bronze' },
];

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

const CABLE_LENGTHS = [
  '3 ft',
  '5 ft',
  '10 ft',
  '15 ft',
  '25 ft',
  '50 ft',
  '100 ft',
  '150 ft',
  '200 ft',
  '250 ft',
  '300 ft',
  '500 ft',
  '1000 ft',
  'Custom...'
];

const FONT_SIZES = [
  { value: 4, label: '4px' },
  { value: 5, label: '5px' },
  { value: 6, label: '6px' },
  { value: 7, label: '7px' },
  { value: 8, label: '8px' },
  { value: 9, label: '9px' },
  { value: 10, label: '10px' },
  { value: 12, label: '12px' },
  { value: 14, label: '14px' },
  { value: 16, label: '16px' },
  { value: 20, label: '20px' },
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

  // Determine if initial length is in the preset list or custom
  const initialLength = initialData?.cableLength || '';
  const isInitialLengthCustom = initialLength && !CABLE_LENGTHS.includes(initialLength);

  const [length, setLength] = useState(
    isInitialLengthCustom ? 'Custom...' : initialLength
  );
  const [customLength, setCustomLength] = useState(
    isInitialLengthCustom ? initialLength : ''
  );

  const [rpCode, setRpCode] = useState(initialData?.rpCode || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [fontSize, setFontSize] = useState(initialData?.fontSize || 6);
  const [wireColor, setWireColor] = useState(initialData?.wireColor || 'auto');

  const isCustomType = cableType === 'Custom...';
  const finalCableType = isCustomType ? customType : cableType;

  const isCustomLength = length === 'Custom...';
  const finalLength = isCustomLength ? customLength : length;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      cableType: finalCableType,
      cableLength: finalLength,
      rpCode,
      description,
      fontSize,
      wireColor: wireColor === 'auto' ? null : wireColor
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
            <select
              value={length}
              onChange={(e) => setLength(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm font-mono text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Select length...</option>
              {CABLE_LENGTHS.map((len) => (
                <option key={len} value={len}>
                  {len}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Length Input (if Custom selected) */}
          {isCustomLength && (
            <div>
              <label className="block text-xs font-mono text-zinc-300 mb-1.5">
                Custom Cable Length
              </label>
              <input
                type="text"
                value={customLength}
                onChange={(e) => setCustomLength(e.target.value)}
                placeholder="e.g., 15m, 75ft, 10 meters..."
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          )}

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

          {/* Label Font Size */}
          <div>
            <label className="block text-xs font-mono text-zinc-300 mb-1.5">
              Label Font Size
            </label>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm font-mono text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {FONT_SIZES.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label}
                </option>
              ))}
            </select>
          </div>

          {/* Wire Color Override */}
          <div>
            <label className="block text-xs font-mono text-zinc-300 mb-1.5">
              Wire Color
            </label>
            <div className="flex flex-wrap gap-2">
              {WIRE_COLORS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setWireColor(color.id)}
                  className={`w-8 h-8 rounded border-2 transition-all ${
                    wireColor === color.id
                      ? 'border-white scale-110'
                      : 'border-zinc-600 hover:border-zinc-400'
                  }`}
                  style={{
                    backgroundColor: color.hex || '#3f3f46',
                    background: color.id === 'auto' ? 'linear-gradient(135deg, #06b6d4 25%, #ec4899 50%, #10b981 75%)' : color.hex
                  }}
                  title={color.label}
                />
              ))}
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              {wireColor === 'auto' ? 'Color will follow source signal' : `Override: ${WIRE_COLORS.find(c => c.id === wireColor)?.label}`}
            </p>
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
