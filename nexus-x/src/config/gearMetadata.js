// Gear Metadata Configuration
// Structured data for tooltips, validation, and help text
// Human-readable docs: /docs/gear/

export const GEAR_METADATA = {
  // ============================================
  // SOURCES
  // ============================================
  sources: {
    label: 'Sources',
    description: 'Devices that originate video/audio signal',
    role: 'source',
    signalDirection: 'output',
    defaultSignalColor: 'emerald',

    subcategories: {
      laptop: {
        label: 'Laptop',
        description: 'Computers and workstations as content sources',
        docPath: '/docs/gear/sources/laptop.md',

        // Default node configuration
        defaults: {
          title: 'LAPTOP',
          signalColor: 'emerald',
          systemSection: {
            platform: null,
            software: null,
            captureCard: null
          },
          inputSection: { ports: [] },
          outputSection: {
            ports: [
              { connector: 'HDMI', resolution: '1920x1080', refreshRate: '60' }
            ]
          }
        },

        // Common configurations for quick setup
        commonConfigs: [
          { label: 'HDMI 1080p', output: { connector: 'HDMI', resolution: '1920x1080', refreshRate: '60' } },
          { label: 'HDMI 4K', output: { connector: 'HDMI', resolution: '3840x2160', refreshRate: '60' } },
          { label: 'USB-C/DP', output: { connector: 'USB-C', resolution: '3840x2160', refreshRate: '60' } },
        ],

        // Decision helper
        useWhen: [
          'Content from presentation software',
          'Video conferencing source',
          'Live graphics/lower thirds',
          'Single output needed'
        ],
        dontUseWhen: [
          'Dedicated playback system needed',
          'Multiple synchronized outputs',
          'Show control integration required'
        ],

        // Gotchas shown as warnings
        warnings: [
          'HDCP may cause capture issues',
          'Disable sleep/screen saver before show',
          'Force resolution if auto-detect fails'
        ]
      },

      camera: {
        label: 'Camera',
        description: 'Video cameras for live capture (broadcast, PTZ, POV)',
        docPath: '/docs/gear/sources/camera.md',

        defaults: {
          title: 'CAMERA',
          signalColor: 'emerald',
          systemSection: {
            platform: null,
            software: null,
            captureCard: null
          },
          inputSection: { ports: [] },
          outputSection: {
            ports: [
              { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' }
            ]
          }
        },

        commonConfigs: [
          { label: 'HD-SDI', output: { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' } },
          { label: '3G-SDI', output: { connector: '3G SDI', resolution: '1920x1080', refreshRate: '59.94' } },
          { label: '12G-SDI 4K', output: { connector: '12G SDI', resolution: '3840x2160', refreshRate: '59.94' } },
          { label: 'HDMI', output: { connector: 'HDMI', resolution: '1920x1080', refreshRate: '60' } },
          { label: 'NDI', output: { connector: 'NDI', resolution: '1920x1080', refreshRate: '59.94' } },
        ],

        useWhen: [
          'Live video capture',
          'IMAG for events',
          'Recording/streaming',
          'PTZ remote operation'
        ],
        dontUseWhen: [
          'Computer-generated content (use Laptop)',
          'Pre-recorded playback (use Media Server)'
        ],

        warnings: [
          'Genlock cameras for clean switching',
          'Match frame rates across all cameras',
          '12G-SDI limited to ~50m cable runs'
        ]
      },

      mediaserver: {
        label: 'Media Server',
        description: 'Dedicated playback and graphics systems',
        docPath: '/docs/gear/sources/media-server.md',

        defaults: {
          title: 'MEDIA SERVER',
          signalColor: 'cyan',
          systemSection: {
            platform: null,
            software: null,
            captureCard: null
          },
          inputSection: { ports: [] },
          outputSection: {
            ports: [
              { connector: 'DisplayPort', resolution: '1920x1080', refreshRate: '60' }
            ]
          }
        },

        commonConfigs: [
          { label: 'DP 1080p', output: { connector: 'DisplayPort', resolution: '1920x1080', refreshRate: '60' } },
          { label: 'DP 4K', output: { connector: 'DisplayPort', resolution: '3840x2160', refreshRate: '60' } },
          { label: 'SDI 1080p', output: { connector: 'SDI', resolution: '1920x1080', refreshRate: '59.94' } },
          { label: 'NDI', output: { connector: 'NDI', resolution: '1920x1080', refreshRate: '59.94' } },
        ],

        useWhen: [
          'Pre-programmed video playback',
          'Multiple synchronized outputs',
          'Show control triggers needed',
          'Large-scale video walls',
          'Generative/real-time graphics'
        ],
        dontUseWhen: [
          'Simple presentation (use Laptop)',
          'Ad-hoc single output'
        ],

        warnings: [
          'Genlock to house sync for broadcast integration',
          'Document physical-to-software output mapping',
          'Consider backup/redundancy for critical shows'
        ],

        // Software presets for this category
        softwarePresets: [
          'disguise', 'hippotizer', 'watchout', 'resolume',
          'playbackpro', 'pvp', 'propresenter', 'qlab',
          'millumin', 'touchdesigner'
        ]
      }
    }
  },

  // ============================================
  // MANUFACTURERS (Future)
  // ============================================
  // barco: { ... },
  // blackmagic: { ... },
  // analogway: { ... },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Get metadata for a category
export const getCategoryMeta = (categoryId) => {
  return GEAR_METADATA[categoryId] || null;
};

// Get metadata for a subcategory
export const getSubcategoryMeta = (categoryId, subcategoryId) => {
  return GEAR_METADATA[categoryId]?.subcategories?.[subcategoryId] || null;
};

// Get default node config for a subcategory
export const getDefaultConfig = (categoryId, subcategoryId) => {
  return getSubcategoryMeta(categoryId, subcategoryId)?.defaults || null;
};

// Get warnings for a subcategory
export const getWarnings = (categoryId, subcategoryId) => {
  return getSubcategoryMeta(categoryId, subcategoryId)?.warnings || [];
};

// Get "use when" hints
export const getUseWhen = (categoryId, subcategoryId) => {
  return getSubcategoryMeta(categoryId, subcategoryId)?.useWhen || [];
};

// Get doc path for linking to full documentation
export const getDocPath = (categoryId, subcategoryId) => {
  return getSubcategoryMeta(categoryId, subcategoryId)?.docPath || null;
};
