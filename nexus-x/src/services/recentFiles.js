const RECENTS_KEY = 'nexus-x-recent-files';
const MAX_RECENTS = 5;

export function getRecentFiles() {
  try {
    const stored = localStorage.getItem(RECENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addToRecentFiles(name, path, projectId) {
  const recents = getRecentFiles();
  const filtered = recents.filter(r => r.projectId !== projectId && r.path !== path);
  filtered.unshift({ name, path, projectId, timestamp: Date.now() });
  const trimmed = filtered.slice(0, MAX_RECENTS);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(trimmed));
  return trimmed;
}
