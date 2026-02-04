import { APP_VERSION, CHANGELOG } from '../config/version';

export default function ChangelogPopup({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="absolute top-full mt-1 right-0 bg-zinc-800 border border-zinc-700 rounded shadow-xl z-50 w-80 max-h-96 overflow-y-auto">
      <div className="sticky top-0 bg-zinc-800 px-4 py-3 border-b border-zinc-700 flex items-center justify-between">
        <span className="text-sm font-mono text-zinc-100">Changelog</span>
        <button
          onClick={onClose}
          className="text-xs font-mono text-zinc-500 hover:text-zinc-300"
        >
          Close
        </button>
      </div>
      <div className="px-4 py-2">
        {CHANGELOG.map((entry) => (
          <div key={entry.version} className="mb-4 last:mb-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-cyan-400 font-semibold">
                v{entry.version}
              </span>
              <span className="text-xs font-mono text-zinc-600">
                {entry.date}
              </span>
            </div>
            <ul className="space-y-0.5">
              {entry.changes.map((change, i) => (
                <li key={i} className="text-xs font-mono text-zinc-400 pl-2 border-l border-zinc-700">
                  {change}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
