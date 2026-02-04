import { openDB } from 'idb';
import { domToBlob } from 'modern-screenshot';
import JSZip from 'jszip';

const DB_NAME = 'nexus-x';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt');
        }
      },
    });
  }
  return dbPromise;
}

export async function saveProject(project) {
  const db = await getDB();
  await db.put(STORE_NAME, { ...project, updatedAt: Date.now() });
}

export async function loadProject(id) {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

export async function getAllProjects() {
  const db = await getDB();
  return db.getAllFromIndex(STORE_NAME, 'updatedAt');
}

export function exportProject(project) {
  return JSON.stringify(project, null, 2);
}

export function importProject(jsonString, fileName) {
  const data = JSON.parse(jsonString);

  // NexusX native format: nodes as object + connections array
  if (data.nodes && typeof data.nodes === 'object' && !Array.isArray(data.nodes)) {
    if (!Array.isArray(data.connections)) {
      throw new Error('Invalid project: missing connections array');
    }
  }
  // Legacy format with pages array
  else if (Array.isArray(data.pages) && data.pages[0]?.nodes) {
    data.nodes = data.pages[0].nodes;
    data.connections = data.pages[0].connections || [];
    delete data.pages;
  }
  else {
    throw new Error('Unrecognized project file format');
  }

  const nameFromFile = fileName
    ? fileName.replace(/\.(vsf|sfw\.json|sfw|json)$/i, '').replace(/[_-]/g, ' ')
    : undefined;

  return {
    ...data,
    id: data.id || crypto.randomUUID(),
    name: nameFromFile || data.name || 'Untitled Project',
    updatedAt: Date.now(),
  };
}

export async function renderExportBlob(canvasElement, options = {}) {
  const { scale = 1, backgroundColor = '#18181b', width, height, style, filter } = options;
  return domToBlob(canvasElement, {
    scale,
    backgroundColor,
    width,
    height,
    style: style || ((width && height) ? { overflow: 'hidden' } : undefined),
    filter: filter || ((node) => !node.getAttribute?.('data-export-ignore')),
  });
}

export async function renderPageBlob(canvasElement, page, options = {}) {
  const { scale = 1, backgroundColor = '#18181b' } = options;
  return renderExportBlob(canvasElement, {
    scale,
    backgroundColor,
    width: page.width,
    height: page.height,
    style: {
      transform: `translate(${-page.x}px, ${-page.y}px)`,
      overflow: 'hidden',
      width: `${page.width}px`,
      height: `${page.height}px`,
    },
  });
}

export async function renderLayoutBlob(canvasElement, pageBounds, options = {}) {
  const { scale = 1, backgroundColor = '#18181b' } = options;

  // Temporarily expand canvas so child computed styles (w-full, h-full, inset-0)
  // resolve to the full layout size before domToBlob clones the DOM
  const origWidth = canvasElement.style.width;
  const origHeight = canvasElement.style.height;
  canvasElement.style.width = `${pageBounds.x + pageBounds.width}px`;
  canvasElement.style.height = `${pageBounds.y + pageBounds.height}px`;

  try {
    return await renderExportBlob(canvasElement, {
      scale,
      backgroundColor,
      width: pageBounds.width,
      height: pageBounds.height,
      style: {
        transform: `translate(${-pageBounds.x}px, ${-pageBounds.y}px)`,
      },
    });
  } finally {
    canvasElement.style.width = origWidth;
    canvasElement.style.height = origHeight;
  }
}

export async function cropPageBlobs(layoutBlob, pages, pageBounds) {
  const img = await createImageBitmap(layoutBlob);
  const results = [];
  for (const page of pages) {
    const canvas = document.createElement('canvas');
    canvas.width = page.width;
    canvas.height = page.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      img,
      page.x - pageBounds.x, page.y - pageBounds.y,
      page.width, page.height,
      0, 0, page.width, page.height
    );
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    results.push({ page, blob });
  }
  img.close();
  return results;
}

export function downloadBlob(blob, projectName = 'diagram') {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName}-${new Date().toISOString().slice(0, 10)}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function downloadZip(namedBlobs, zipFileName) {
  const zip = new JSZip();
  for (const { name, blob } of namedBlobs) {
    zip.file(name, blob);
  }
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = zipFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

