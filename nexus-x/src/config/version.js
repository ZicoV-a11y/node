export const APP_VERSION = '1.2.0';

export const CHANGELOG = [
  {
    version: '1.2.0',
    date: '2026-02-28',
    changes: [
      'Node313 preset save/load system (save from settings, load from sidebar)',
      'Presets persist in .vsf files and exportable as JSON for Git',
      'Live print-friendly canvas toggle (invert filter)',
      'Title block restyled to match Node313 theme',
      'Trimmed Cable Details connector list',
      'Canvas button renamed from Paper',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-02-27',
    changes: [
      'Two-row toolbar layout (File & Actions / Canvas & Export)',
      'Collapsible settings dropdown sections with chevron toggles',
      'Signal-colored drop zones for section rearranging',
      'Removed ratio overlay feature',
      'Simplified side panel',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-02-04',
    changes: [
      'New .vsf file format for project saves',
      'Added version tracking and changelog popup',
      'Multi-page grid with dynamic page expansion',
      'Canvas settings with localStorage persistence',
      'Snap-to-grid toggle and paper ratio overlay',
      'Smoother exponential zoom and AABB selection box',
      'Auto-wire selection between selected nodes',
      'Cable inventory with RP Code tracking',
      'Custom paper sizes and orientation persistence',
      'Backward-compatible loading of .json and .sfw files',
    ],
  },
];
