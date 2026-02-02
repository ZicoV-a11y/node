import { openDB } from 'idb';

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
    ? fileName.replace(/\.(sfw\.json|sfw|json)$/i, '').replace(/[_-]/g, ' ')
    : undefined;

  return {
    ...data,
    id: data.id || crypto.randomUUID(),
    name: nameFromFile || data.name || 'Untitled Project',
    updatedAt: Date.now(),
  };
}
