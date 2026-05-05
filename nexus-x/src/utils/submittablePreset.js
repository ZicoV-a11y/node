// Convert a node on the canvas into a "submittable preset" — the shape that
// would land in config/userPresets.json after merge. Strips transient layout
// state (position, scale, current id) so the receiver can paste the JSON
// directly into the bundled file.

const REPO_OWNER = 'ZicoV-a11y';
const REPO_NAME = 'node';
const SUBMITTER_EMAIL = 'ZicoV@yahoo.ca';

export function buildSubmittablePreset(node, submitter = {}) {
  if (!node) return null;
  // Generate a deterministic id from manufacturer + model so duplicate
  // submissions are easy to spot. Falls back to a timestamp.
  const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const idBase = [slug(node.manufacturer), slug(node.model)].filter(Boolean).join('-')
              || `submitted-${Date.now()}`;

  if (node.version === 3) {
    return {
      id: `${idBase}-submitted`,
      label: [node.manufacturer, node.model].filter(Boolean).join(' ') || node.title || 'Submitted Preset',
      title: node.title || '',
      manufacturer: node.manufacturer || '',
      model: node.model || '',
      tag: node.tag || '',
      signalColor: node.signalColor || null,
      deviceTypes: node.deviceTypes || [],
      primaryDeviceType: node.primaryDeviceType || null,
      layout: node.layout,
      sectionSpacing: node.sectionSpacing,
      sections: node.sections,
      hiddenSections: node.hiddenSections || [],
      hiddenTitleFields: node.hiddenTitleFields || [],
      hiddenSystemFields: node.hiddenSystemFields || [],
      mirroredSections: node.mirroredSections || [],
      version: 3,
    };
  }

  if (node.version === 2) {
    return {
      id: `${idBase}-submitted`,
      label: node.title || 'Submitted Preset',
      title: node.title || '',
      signalColor: node.signalColor || null,
      rpCode: node.rpCode || '',
      description: node.description || '',
      layout: node.layout,
      system: node.system,
      inputSection: node.inputSection,
      outputSection: node.outputSection,
      version: 2,
    };
  }

  if (node.version === 4) {
    // Image blobs intentionally skipped — submitter would need to send the
    // image separately. The structural shape (title, anchors, dimensions) is
    // what's useful for review.
    return {
      id: `${idBase}-submitted`,
      label: node.title || 'Submitted Screen',
      title: node.title || '',
      signalColor: node.signalColor || null,
      width: node.width,
      height: node.height,
      imageFit: node.imageFit || 'contain',
      anchors: node.anchors || [],
      version: 4,
    };
  }

  // Older Node v1 — just pass through the meaningful fields.
  return {
    id: `${idBase}-submitted`,
    label: node.title || 'Submitted Preset',
    title: node.title || '',
    signalColor: node.signalColor || null,
    layout: node.layout,
    system: node.system,
    inputSection: node.inputSection,
    outputSection: node.outputSection,
    version: node.version || 1,
  };
}

export function buildGithubIssueUrl({ preset, submitterName = '', note = '' }) {
  const title = `Preset submission: ${preset.label}`;
  const body =
`**Submitter:** ${submitterName || '_anonymous_'}
**Manufacturer / Model:** ${preset.manufacturer || preset.title || preset.label}
**Note:** ${note || '_(none)_'}

---

\`\`\`json
${JSON.stringify(preset, null, 2)}
\`\`\`
`;
  const u = new URL(`https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/new`);
  u.searchParams.set('title', title);
  u.searchParams.set('body', body);
  u.searchParams.set('labels', 'preset-submission');
  return u.toString();
}

export function buildMailtoUrl({ preset, submitterName = '', note = '' }) {
  const subject = `Preset submission: ${preset.label}`;
  const body =
`Submitter: ${submitterName || '(anonymous)'}
Manufacturer / Model: ${preset.manufacturer || preset.title || preset.label}
Note: ${note || '(none)'}

----- Preset JSON -----
${JSON.stringify(preset, null, 2)}
`;
  // mailto URLs have practical length limits (~2000 chars in many clients).
  // The dialog will warn the user if the encoded body is over that threshold.
  const u = new URL(`mailto:${SUBMITTER_EMAIL}`);
  u.searchParams.set('subject', subject);
  u.searchParams.set('body', body);
  return u.toString();
}

// Also useful for the dialog to estimate whether the email path will truncate.
export function estimateMailtoSize({ preset, submitterName = '', note = '' }) {
  return buildMailtoUrl({ preset, submitterName, note }).length;
}

export const MAILTO_SAFE_LIMIT = 2000;
