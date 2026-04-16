import { openDB } from 'idb';
import { domToBlob } from 'modern-screenshot';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';

const DB_NAME = 'nexus-x';
const DB_VERSION = 2;
const STORE_NAME = 'projects';
const IMAGES_STORE = 'images';

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('updatedAt', 'updatedAt');
        }
        if (oldVersion < 2 && !db.objectStoreNames.contains(IMAGES_STORE)) {
          db.createObjectStore(IMAGES_STORE, { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

// ---- Background-image blob storage (IDB) ----

const objectUrlCache = new Map(); // id -> objectURL

export async function putImageBlob(id, blob, mime) {
  const db = await getDB();
  await db.put(IMAGES_STORE, { id, blob, mime: mime || blob.type || 'image/png' });
}

export async function getImageBlob(id) {
  const db = await getDB();
  const rec = await db.get(IMAGES_STORE, id);
  return rec ? rec.blob : null;
}

export async function deleteImageBlob(id) {
  const db = await getDB();
  await db.delete(IMAGES_STORE, id);
  revokeImageObjectUrl(id);
}

export async function getImageObjectUrl(id) {
  if (objectUrlCache.has(id)) return objectUrlCache.get(id);
  const blob = await getImageBlob(id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  objectUrlCache.set(id, url);
  return url;
}

export function revokeImageObjectUrl(id) {
  const url = objectUrlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrlCache.delete(id);
  }
}

export function revokeAllImageUrls() {
  for (const url of objectUrlCache.values()) {
    URL.revokeObjectURL(url);
  }
  objectUrlCache.clear();
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl) {
  return fetch(dataUrl).then(r => r.blob());
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

// Serialize a project to JSON, inlining referenced image blobs as data URLs.
// bgImages: array of { id, blobKey, ... } entities. Each referenced blob is
// fetched from IDB and embedded under _imageBlobs[id] for portability.
export async function exportProject(project) {
  const blobs = {};
  const imgs = project.backgroundImages || [];
  for (const img of imgs) {
    const blob = await getImageBlob(img.blobKey || img.id);
    if (blob) {
      blobs[img.blobKey || img.id] = await blobToDataUrl(blob);
    }
  }
  const payload = { ...project };
  if (Object.keys(blobs).length > 0) payload._imageBlobs = blobs;
  return JSON.stringify(payload, null, 2);
}

export async function importProject(jsonString, fileName) {
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

  // Unpack embedded image blobs (if any) back into IDB
  if (data._imageBlobs && typeof data._imageBlobs === 'object') {
    for (const [id, dataUrl] of Object.entries(data._imageBlobs)) {
      try {
        const blob = await dataUrlToBlob(dataUrl);
        await putImageBlob(id, blob, blob.type);
      } catch (e) {
        // If a blob fails to rehydrate, continue importing the rest
        console.warn('Failed to import image blob', id, e);
      }
    }
    delete data._imageBlobs;
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
  const { scale = 1, backgroundColor = null, width, height, style, filter, onCloneNode } = options;
  // backgroundColor = null for transparent PNG (alpha channel)
  const blobOptions = {
    scale,
    width,
    height,
    style: style || ((width && height) ? { overflow: 'hidden' } : undefined),
    filter: filter || ((node) => !node.getAttribute?.('data-export-ignore')),
  };
  // Only set backgroundColor if explicitly provided (null = transparent)
  if (backgroundColor !== null) {
    blobOptions.backgroundColor = backgroundColor;
  }
  if (onCloneNode) {
    blobOptions.onCloneNode = onCloneNode;
  }
  return domToBlob(canvasElement, blobOptions);
}

export async function renderPageBlob(canvasElement, page, options = {}) {
  const { scale = 1, backgroundColor = null } = options;
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
  const { scale = 1, backgroundColor = null, onCloneNode } = options;

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
      onCloneNode,
      width: pageBounds.width,
      height: pageBounds.height,
      style: {
        transform: `translate(${-pageBounds.x}px, ${-pageBounds.y}px)`,
        overflow: 'hidden',
        width: `${pageBounds.width}px`,
        height: `${pageBounds.height}px`,
      },
    });
  } finally {
    canvasElement.style.width = origWidth;
    canvasElement.style.height = origHeight;
  }
}

export async function invertBlob(blob) {
  const img = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.filter = 'invert(1) hue-rotate(180deg)';
  ctx.drawImage(img, 0, 0);
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

// Convert one or more PNG blobs into a single PDF (one image per page).
// Each page is sized to fit the image at 300 DPI.
export async function pngBlobsToPdf(blobs) {
  let pdf = null;
  for (const blob of blobs) {
    const img = await createImageBitmap(blob);
    const wPt = img.width * 72 / 300;  // px → points at 300 DPI
    const hPt = img.height * 72 / 300;
    const orientation = wPt > hPt ? 'l' : 'p';
    if (!pdf) {
      pdf = new jsPDF({ orientation, unit: 'pt', format: [wPt, hPt] });
    } else {
      pdf.addPage([wPt, hPt], orientation);
    }
    const dataUrl = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    pdf.addImage(dataUrl, 'PNG', 0, 0, wPt, hPt);
  }
  return pdf ? pdf.output('blob') : null;
}

export async function cropPageBlobs(layoutBlob, pages, pageBounds, scale = 1) {
  const img = await createImageBitmap(layoutBlob);
  const results = [];
  for (const page of pages) {
    const canvas = document.createElement('canvas');
    // Output at scaled resolution for high quality
    canvas.width = page.width * scale;
    canvas.height = page.height * scale;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      img,
      // Source coordinates (from scaled layout image)
      (page.x - pageBounds.x) * scale, (page.y - pageBounds.y) * scale,
      page.width * scale, page.height * scale,
      // Destination (full canvas)
      0, 0, page.width * scale, page.height * scale
    );
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    results.push({ page, blob });
  }
  img.close();
  return results;
}

export function downloadBlob(blob, projectName = 'diagram', ext = 'png') {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName}-${new Date().toISOString().slice(0, 10)}.${ext}`;
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

