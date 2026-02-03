// Gear Metadata Configuration
// Structured data for tooltips, validation, and help text
// Human-readable docs: /docs/gear/

export const GEAR_METADATA = {
  // ============================================
  // EVERYTHING
  // ============================================
  everything: {
    label: 'Everything',
    description: 'Complete library of editing tools and gear',
    role: 'universal',
    signalDirection: 'bidirectional',
    defaultSignalColor: null,

    subcategories: {
      editing: {
        label: 'Editing - SuperNode',
        description: 'Latest SuperNode with full feature set',
        docPath: '/docs/gear/everything/supernode.md',

        defaults: {
          title: 'SUPERNODE',
          signalColor: null,
          systemSection: {
            platform: null,
            software: null,
            captureCard: null
          },
          inputSection: { ports: [] },
          outputSection: { ports: [] }
        },

        useWhen: [
          'Building custom signal flow diagrams',
          'Flexible node with all features',
          'Custom device configurations'
        ]
      },

      videogear_laptop: {
        label: 'Video Gear - Laptop',
        description: 'Computers and workstations as content sources',
        docPath: '/docs/gear/sources/laptop.md',

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

        commonConfigs: [
          { label: 'HDMI 1080p', output: { connector: 'HDMI', resolution: '1920x1080', refreshRate: '60' } },
          { label: 'HDMI 4K', output: { connector: 'HDMI', resolution: '3840x2160', refreshRate: '60' } },
          { label: 'USB-C/DP', output: { connector: 'USB-C', resolution: '3840x2160', refreshRate: '60' } },
        ],

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

        warnings: [
          'HDCP may cause capture issues',
          'Disable sleep/screen saver before show',
          'Force resolution if auto-detect fails'
        ]
      },

      videogear_camera: {
        label: 'Video Gear - Camera',
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

      videogear_mediaserver: {
        label: 'Video Gear - Media Server',
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

        softwarePresets: [
          'disguise', 'hippotizer', 'watchout', 'resolume',
          'playbackpro', 'pvp', 'propresenter', 'qlab',
          'millumin', 'touchdesigner'
        ]
      },

      audiogear_mixer: {
        label: 'Audio Gear - Mixer',
        description: 'Audio mixing consoles',
        docPath: '/docs/gear/audio/mixer.md',

        defaults: {
          title: 'MIXER',
          signalColor: 'yellow',
          systemSection: {
            platform: null,
            software: null,
            captureCard: null
          },
          inputSection: { ports: [] },
          outputSection: { ports: [] }
        },

        useWhen: [
          'Audio mixing and routing',
          'Live sound reinforcement',
          'Recording sessions'
        ]
      }
    }
  },

  // ============================================
  // CABLE
  // ============================================
  cable: {
    label: 'Cable',
    description: 'Cable presets and templates',
    role: 'connection',
    signalDirection: 'bidirectional',
    defaultSignalColor: null,

    subcategories: {
      video: {
        label: 'Video',
        description: 'Video cable configurations and templates',
        docPath: '/docs/cable/video.md',

        defaults: {
          cableType: '',
          cableLength: '',
          rpCode: '',
          description: ''
        },

        commonTypes: [
          'HDMI 2.0',
          'HDMI 2.1',
          'DisplayPort 1.4',
          'DisplayPort 2.0',
          'SDI',
          '3G-SDI',
          '12G-SDI',
          'Fiber Optic'
        ]
      },

      audio: {
        label: 'Audio',
        description: 'Audio cable configurations and templates',
        docPath: '/docs/cable/audio.md',

        defaults: {
          cableType: '',
          cableLength: '',
          rpCode: '',
          description: ''
        },

        commonTypes: [
          'XLR Audio',
          'TRS Audio',
          'RCA Audio',
          'AES/EBU (XLR)',
          'CAT5e',
          'CAT6'
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
