// Node Preset Configuration
// Defines templates for quickly adding pre-configured SuperNodes
//
// Structure:
// - Categories contain subcategories
// - Subcategories contain individual presets
// - Presets define complete SuperNode configurations

export const NODE_PRESET_CATEGORIES = {
  // ============================================
  // EVERYTHING
  // Comprehensive category with all editing and gear types
  // ============================================
  everything: {
    label: 'Everything',
    description: 'Complete library of editing tools and gear',
    subcategories: {
      // Editing subcategory
      editing: {
        label: 'Editing - SuperNode',
        description: 'Latest SuperNode with full feature set',
        presets: {
          // User will add presets here
        }
      },

      // Video Gear subcategories
      videogear_laptop: {
        label: 'Video Gear - Laptop',
        description: 'Computers and workstations',
        presets: {
          // User will add presets here
        }
      },
      videogear_camera: {
        label: 'Video Gear - Camera',
        description: 'Video cameras and PTZ units',
        presets: {
          // User will add presets here
        }
      },
      videogear_mediaserver: {
        label: 'Video Gear - Media Server',
        description: 'Playback and graphics servers',
        presets: {
          // User will add presets here
        }
      },

      // Audio Gear subcategories (placeholder for future)
      audiogear_mixer: {
        label: 'Audio Gear - Mixer',
        description: 'Audio mixing consoles',
        presets: {
          // User will add presets here
        }
      }
    }
  },

  // ============================================
  // CABLE
  // Cable templates and configurations
  // ============================================
  cable: {
    label: 'Cable',
    description: 'Cable presets and templates',
    subcategories: {
      video: {
        label: 'Video',
        description: 'Video cable configurations',
        presets: {
          // User will add presets here
        }
      },
      audio: {
        label: 'Audio',
        description: 'Audio cable configurations',
        presets: {
          // User will add presets here
        }
      }
    }
  },

  // ============================================
  // MANUFACTURERS (Future)
  // Branded device presets organized by manufacturer
  // ============================================
  // barco: {
  //   label: 'Barco',
  //   subcategories: { ... }
  // },
  // blackmagic: {
  //   label: 'Blackmagic',
  //   subcategories: { ... }
  // },
  // analogway: {
  //   label: 'Analog Way',
  //   subcategories: { ... }
  // }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Get all top-level categories
export const getCategories = () => {
  return Object.entries(NODE_PRESET_CATEGORIES).map(([id, cat]) => ({
    id,
    label: cat.label,
    description: cat.description
  }));
};

// Get subcategories for a category
export const getSubcategories = (categoryId) => {
  const category = NODE_PRESET_CATEGORIES[categoryId];
  if (!category?.subcategories) return [];

  return Object.entries(category.subcategories).map(([id, sub]) => ({
    id,
    label: sub.label,
    description: sub.description
  }));
};

// Get presets for a subcategory
export const getPresets = (categoryId, subcategoryId) => {
  const category = NODE_PRESET_CATEGORIES[categoryId];
  const subcategory = category?.subcategories?.[subcategoryId];
  if (!subcategory?.presets) return [];

  return Object.entries(subcategory.presets).map(([id, preset]) => ({
    id,
    ...preset
  }));
};

// Get a specific preset by path (category/subcategory/preset)
export const getPresetById = (categoryId, subcategoryId, presetId) => {
  return NODE_PRESET_CATEGORIES[categoryId]
    ?.subcategories?.[subcategoryId]
    ?.presets?.[presetId] || null;
};

// ============================================
// PRESET TEMPLATE
// Use this structure when adding new presets
// ============================================
/*
'preset-id': {
  label: 'Preset Name',
  description: 'What this device is',
  signalColor: 'emerald', // emerald, cyan, blue, violet, pink, red, orange, yellow

  layout: {
    rows: [['system'], ['input', 'output']],
    inputAnchorSide: 'left',
    outputAnchorSide: 'right'
  },

  systemSection: {
    platform: null,      // 'mac', 'windows', 'linux', or null
    software: null,      // software preset id or null
    captureCard: null,   // capture card preset id or null
    collapsed: true
  },

  inputSection: {
    columnName: 'INPUT',
    ports: [],  // Array of { connector, resolution, refreshRate }
    cards: []   // Array of card presets
  },

  outputSection: {
    columnName: 'OUTPUT',
    ports: [],
    cards: []
  }
}
*/
