import { useEffect } from 'react';
import { findOpenPosition } from '../utils/nodePosition';
import { getNodeIdFromAnchor } from '../utils/anchorId';

/**
 * Global keyboard shortcuts for canvas interaction.
 *
 * - Esc: cancel active wire / deselect
 * - Backspace/Delete: delete waypoint during wire draw, or delete selection
 * - Cmd/Ctrl+Z / Cmd+Shift+Z / Cmd+Y: undo / redo
 * - Cmd/Ctrl+G / Cmd+Shift+G: group / ungroup
 * - F / B: bring selected wires forward / send back
 * - Cmd/Ctrl+C / V: copy / paste with auto-numbering and group remap
 * - Arrow keys: nudge selection (1px with Cmd, 10px with Shift, else grid step)
 *
 * No return value — purely sets up the global listener.
 */
export function useKeyboardShortcuts({
  // selection
  selectedNodes, selectedWires, setSelectedNodes, setSelectedWires,
  // canvas state
  nodes, setNodes, setConnections,
  activeWire, setActiveWire,
  // grid
  snapToGrid, gridSize,
  // operations
  undo, redo, deleteNode, handleGroupSelected, handleUngroupSelected,
  // clipboard ref (passed in so multiple paste sites stay in sync)
  clipboardRef,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape — cancel active wire or deselect all
      if (e.key === 'Escape') {
        if (activeWire) {
          setActiveWire(null);
          return;
        }
        if (document.activeElement && document.activeElement !== document.body) {
          document.activeElement.blur();
        }
        setSelectedNodes(new Set());
        setSelectedWires(new Set());
        return;
      }

      // Backspace/Delete — remove last waypoint during wire creation
      if ((e.key === 'Backspace' || e.key === 'Delete') && activeWire?.waypoints?.length > 0) {
        const tag = e.target.tagName;
        const isInInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
        if (!isInInput) {
          e.preventDefault();
          setActiveWire(prev => ({ ...prev, waypoints: prev.waypoints.slice(0, -1) }));
          return;
        }
      }

      const tag = e.target.tagName;
      const isInInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // Cmd/Ctrl+Z — undo (Shift for redo)
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }

      // Cmd/Ctrl+Y — redo (alt)
      if (mod && key === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Cmd/Ctrl+G — group / Cmd/Ctrl+Shift+G — ungroup
      if (mod && key === 'g') {
        e.preventDefault();
        if (e.shiftKey) handleUngroupSelected(); else handleGroupSelected();
        return;
      }

      // F — bring selected wires/nodes to front / B — send to back
      if (!isInInput && !mod && (selectedWires.size > 0 || selectedNodes.size > 0) && (key === 'f' || key === 'b')) {
        e.preventDefault();
        const toBack = key === 'b';

        if (selectedWires.size > 0) {
          const newLayer = toBack ? 'back' : undefined;
          setConnections(prev => prev.map(conn =>
            selectedWires.has(conn.id) ? { ...conn, zLayer: newLayer } : conn
          ));
        }

        if (selectedNodes.size > 0) {
          // Compute new zOrder for the selection: max+1 (front) or min-1 (back) of all current nodes
          const allZ = Object.values(nodes).map(n => n.zOrder || 0);
          const newZ = toBack ? Math.min(0, ...allZ) - 1 : Math.max(0, ...allZ) + 1;
          setNodes(prev => {
            const updated = { ...prev };
            selectedNodes.forEach(id => {
              if (updated[id]) updated[id] = { ...updated[id], zOrder: newZ };
            });
            return updated;
          });
        }
        return;
      }

      // Cmd/Ctrl+C — copy selected nodes
      if (mod && key === 'c') {
        if (selectedNodes.size > 0) {
          clipboardRef.current = Array.from(selectedNodes).map(id => nodes[id]).filter(Boolean);
        }
        return;
      }

      // Cmd/Ctrl+V — paste with auto-numbering + group remap
      if (mod && key === 'v') {
        if (clipboardRef.current.length > 0 && !isInInput) {
          e.preventDefault();
          const newSelection = new Set();
          const now = Date.now();
          const groupRemap = {};
          setNodes(prev => {
            const updated = { ...prev };
            const existingForCollision = Object.values(prev);

            clipboardRef.current.forEach((node, i) => {
              const newId = `node-${now + i}`;
              newSelection.add(newId);
              const position = findOpenPosition(
                existingForCollision,
                node.position.x + 40,
                node.position.y + 40,
                { isCenterTarget: false, snapToGrid, gridSize }
              );

              // Title auto-numbering: pasted "CAM" → "CAM 2", original retroactively renamed to "CAM 1"
              const title = node.title || 'Node';
              const baseTitle = title.replace(/\s+\d+$/, '');
              let maxNum = 0;
              Object.values(updated).forEach(n => {
                const nTitle = n.title || '';
                const nBase = nTitle.replace(/\s+\d+$/, '');
                if (nBase === baseTitle) {
                  const numMatch = nTitle.match(/\s+(\d+)$/);
                  const num = numMatch ? parseInt(numMatch[1], 10) : 1;
                  if (num > maxNum) maxNum = num;
                }
              });
              const originalId = node.id;
              const originalHasNum = updated[originalId]?.title?.match(/\s+\d+$/);
              if (updated[originalId] && !originalHasNum) {
                updated[originalId] = { ...updated[originalId], title: `${baseTitle} 1` };
                if (maxNum < 1) maxNum = 1;
              }

              // Tag auto-numbering: same idea for the tag field
              let newTag = node.tag;
              if (node.tag) {
                const baseTag = node.tag.replace(/\s+\d+$/, '');
                let maxTagNum = 0;
                Object.values(updated).forEach(n => {
                  const nTag = n.tag || '';
                  const nBase = nTag.replace(/\s+\d+$/, '');
                  if (nBase === baseTag) {
                    const numMatch = nTag.match(/\s+(\d+)$/);
                    const num = numMatch ? parseInt(numMatch[1], 10) : 1;
                    if (num > maxTagNum) maxTagNum = num;
                  }
                });
                const originalTagHasNum = updated[originalId]?.tag?.match(/\s+\d+$/);
                if (updated[originalId] && updated[originalId].tag && !originalTagHasNum) {
                  updated[originalId] = { ...updated[originalId], tag: `${baseTag} 1` };
                  if (maxTagNum < 1) maxTagNum = 1;
                }
                newTag = `${baseTag} ${maxTagNum + 1 + i}`;
              }

              // Group remap: pasted copies stay grouped together with new IDs
              let newGroup = undefined;
              if (node.group) {
                if (!groupRemap[node.group]) groupRemap[node.group] = 'grp-' + (now + 99000 + i);
                newGroup = groupRemap[node.group];
              }

              const copyNumber = maxNum + 1 + i;
              const newNode = {
                ...structuredClone(node),
                id: newId,
                position,
                title: `${baseTitle} ${copyNumber}`,
                tag: newTag,
                ...(newGroup ? { group: newGroup } : {}),
              };
              if (!newGroup) delete newNode.group;
              updated[newId] = newNode;
              existingForCollision.push(newNode);
            });
            return updated;
          });
          setSelectedNodes(newSelection);
        }
        return;
      }

      // Ignore other shortcuts when typing in inputs/textareas/selects
      if (isInInput) return;

      // Delete / Backspace — delete selected nodes and wires
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodes.size > 0) {
          selectedNodes.forEach(nodeId => deleteNode(nodeId));
          setSelectedNodes(new Set());
        }
        if (selectedWires.size > 0) {
          setConnections(prev => prev.filter(c => !selectedWires.has(c.id)));
          setSelectedWires(new Set());
        }
        return;
      }

      // Arrow keys — nudge selected nodes (1px with Cmd, 10px with Shift, else grid)
      if (selectedNodes.size > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = (e.ctrlKey || e.metaKey) ? 1 : e.shiftKey ? 10 : (snapToGrid && gridSize > 0 ? gridSize : 1);
        const delta = {
          ArrowUp: { x: 0, y: -step },
          ArrowDown: { x: 0, y: step },
          ArrowLeft: { x: -step, y: 0 },
          ArrowRight: { x: step, y: 0 },
        }[e.key];

        setNodes(prev => {
          const updated = { ...prev };
          selectedNodes.forEach(nodeId => {
            if (updated[nodeId]) {
              const n = updated[nodeId];
              updated[nodeId] = { ...n, position: { x: n.position.x + delta.x, y: n.position.y + delta.y } };
            }
          });
          return updated;
        });
        // Move waypoints on wires fully within the selection
        setConnections(prev => prev.map(conn => {
          const srcNode = getNodeIdFromAnchor(conn.from);
          const destNode = getNodeIdFromAnchor(conn.to);
          if (selectedNodes.has(srcNode) && selectedNodes.has(destNode) && conn.waypoints?.length > 0) {
            return { ...conn, waypoints: conn.waypoints.map(wp => ({ ...wp, x: wp.x + delta.x, y: wp.y + delta.y })) };
          }
          return conn;
        }));
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedNodes, selectedWires, nodes, deleteNode, snapToGrid, gridSize,
    undo, redo, activeWire, handleGroupSelected, handleUngroupSelected,
    setActiveWire, setSelectedNodes, setSelectedWires, setConnections, setNodes,
    clipboardRef,
  ]);
}
