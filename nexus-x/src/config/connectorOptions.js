// Dropdown option lists for SuperNode and Node port editing.
// 'Custom...' is the sentinel that switches the field to free-text input.

export const RESOLUTIONS = [
  '640x480', '800x600', '1024x768',
  '1280x720', '1920x1080',
  '2560x1440', '3840x2160',
  '7680x4320', 'Custom...',
];

export const REFRESH_RATES = [
  '23.98', '24', '25', '29.97', '30',
  '50', '59.94', '60', '120', 'Custom...',
];

export const CONNECTOR_TYPES = [
  'HDMI', 'SDI', '12G SDI', 'DisplayPort', 'DVI', 'VGA', 'USB-C', 'NDI', 'Custom...',
];
