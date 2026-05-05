import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? '⌘' : 'Ctrl';
const ALT = isMac ? '⌥' : 'Alt';

const KBD_SECTIONS = [
  {
    title: 'Selection',
    rows: [
      [`${MOD}+A`, 'Select all nodes'],
      [`${MOD}+Shift+A`, 'Deselect all'],
      ['Esc', 'Cancel active wire / deselect'],
      ['Shift+Click', 'Add to / remove from selection'],
      ['Click + Drag (canvas)', 'Rectangle select'],
    ],
  },
  {
    title: 'Edit',
    rows: [
      [`${MOD}+C`, 'Copy selected nodes'],
      [`${MOD}+V`, 'Paste (auto-numbered, e.g. CAM 1 → CAM 2)'],
      [`${MOD}+Z`, 'Undo'],
      [`${MOD}+Shift+Z / ${MOD}+Y`, 'Redo'],
      ['Backspace / Delete', 'Delete selection (or remove last waypoint while drawing a wire)'],
    ],
  },
  {
    title: 'Move & arrange',
    rows: [
      ['Arrow keys', 'Nudge selected nodes by 1 grid step'],
      [`Shift + Arrow`, 'Nudge by 10 px'],
      [`${MOD} + Arrow`, 'Nudge by 1 px (precision)'],
      [`${MOD}+G`, 'Group selected nodes'],
      [`${MOD}+Shift+G`, 'Ungroup'],
      ['F', 'Bring selection to front (z-order)'],
      ['B', 'Send selection to back'],
    ],
  },
];

const MOUSE_SECTIONS = [
  {
    title: 'Canvas',
    rows: [
      ['Middle click + drag', 'Pan the canvas'],
      ['Mouse wheel', 'Zoom (cursor-centered)'],
      ['Left click (empty canvas)', 'Start rectangle select'],
    ],
  },
  {
    title: 'Nodes',
    rows: [
      ['Left click', 'Select'],
      ['Drag title bar', 'Move node'],
      ['Drag bottom-right corner', 'Resize node'],
      [`${MOD}+drag node`, 'Wire-axis snap (keep wires straight)'],
    ],
  },
  {
    title: 'Wires',
    rows: [
      ['Click anchor', 'Start drawing a wire'],
      ['Click canvas while drawing', 'Drop a waypoint'],
      ['Click target anchor', 'Finish the wire'],
      ['Right-click waypoint', 'Delete waypoint'],
      ['Esc while drawing', 'Cancel'],
    ],
  },
  {
    title: 'Anchor / port spacing',
    rows: [
      ['Drag spacing handle', 'Adjust port row spacing (snaps to half-row)'],
      [`${MOD}+drag spacing`, '1-pixel precision mode'],
    ],
  },
];

export default function ShortcutsPopup({ isOpen, onClose, anchorRef }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && anchorRef?.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left });
    }
  }, [isOpen, anchorRef]);

  if (!isOpen) return null;

  return createPortal(
    <div
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
      className="bg-zinc-800 border border-zinc-700 rounded shadow-xl w-[480px] max-h-[80vh] overflow-y-auto"
    >
      <div className="sticky top-0 bg-zinc-800 px-4 py-3 border-b border-zinc-700 flex items-center justify-between">
        <span className="text-sm font-mono text-zinc-100">Shortcuts</span>
        <button
          onClick={onClose}
          className="text-xs font-mono text-zinc-500 hover:text-zinc-300"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-6 px-4 py-3">
        {/* Keyboard column */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 mb-2">
            Keyboard
          </div>
          {KBD_SECTIONS.map(sec => (
            <Section key={sec.title} title={sec.title} rows={sec.rows} />
          ))}
        </div>

        {/* Mouse column */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 mb-2">
            Mouse
          </div>
          {MOUSE_SECTIONS.map(sec => (
            <Section key={sec.title} title={sec.title} rows={sec.rows} />
          ))}
        </div>
      </div>

      <div className="px-4 py-2 border-t border-zinc-700 text-[10px] font-mono text-zinc-500">
        Tip: hold {MOD} while moving a node and connected wires snap to horizontal/vertical.
      </div>
    </div>,
    document.body
  );
}

function Section({ title, rows }) {
  return (
    <div className="mb-3 last:mb-1">
      <div className="text-[11px] font-mono text-zinc-300 mb-1">{title}</div>
      <ul className="space-y-0.5">
        {rows.map(([keys, desc], i) => (
          <li key={i} className="flex items-start gap-2 text-[10px] font-mono leading-tight">
            <span className="text-zinc-200 whitespace-nowrap min-w-[110px] max-w-[160px] truncate" title={keys}>
              {keys}
            </span>
            <span className="text-zinc-500">{desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
