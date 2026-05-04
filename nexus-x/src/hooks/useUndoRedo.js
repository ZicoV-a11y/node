import { useState, useRef, useEffect, useCallback } from 'react';

const HISTORY_LIMIT = 50;
const DEBOUNCE_MS = 500;

/**
 * Undo/redo for { nodes, connections } pairs.
 *
 * Captures snapshots of (nodes, connections) on a 500ms debounce — long drags
 * collapse into a single history entry. Returns { undo, redo, history, future, isUndoingRef }.
 * `isUndoingRef` is exposed so callers can skip side effects (like persisting state)
 * during a replay.
 */
export function useUndoRedo({ nodes, connections, setNodes, setConnections }) {
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const isUndoingRef = useRef(false);
  const lastStateRef = useRef(null);
  const historyTimeoutRef = useRef(null);
  const pendingStateRef = useRef(null);

  // Debounced capture: only commit to history once 500ms have passed without further changes.
  useEffect(() => {
    if (isUndoingRef.current) return;

    const currentState = { nodes, connections };
    const stateStr = JSON.stringify(currentState);

    // Skip if identical to last recorded state
    if (lastStateRef.current === stateStr) return;

    pendingStateRef.current = currentState;

    if (historyTimeoutRef.current) {
      clearTimeout(historyTimeoutRef.current);
    }

    historyTimeoutRef.current = setTimeout(() => {
      if (pendingStateRef.current && !isUndoingRef.current) {
        const stateToSave = pendingStateRef.current;
        const saveStr = JSON.stringify(stateToSave);
        if (lastStateRef.current !== saveStr) {
          // Save the *previous* state (the one being changed away from) onto history
          if (lastStateRef.current) {
            const previousState = JSON.parse(lastStateRef.current);
            setHistory(prev => {
              const newHistory = [...prev, previousState];
              if (newHistory.length > HISTORY_LIMIT) {
                return newHistory.slice(-HISTORY_LIMIT);
              }
              return newHistory;
            });
            setFuture([]); // any new edit invalidates the redo stack
          }
          lastStateRef.current = saveStr;
        }
        pendingStateRef.current = null;
      }
    }, DEBOUNCE_MS);

    return () => {
      if (historyTimeoutRef.current) {
        clearTimeout(historyTimeoutRef.current);
      }
    };
  }, [nodes, connections]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    isUndoingRef.current = true;
    const currentState = { nodes, connections };
    const previousState = history[history.length - 1];
    setFuture(prev => [...prev, currentState]);
    setHistory(prev => prev.slice(0, -1));
    setNodes(previousState.nodes);
    setConnections(previousState.connections);
    lastStateRef.current = JSON.stringify(previousState);
    setTimeout(() => { isUndoingRef.current = false; }, 50);
  }, [history, nodes, connections, setNodes, setConnections]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    isUndoingRef.current = true;
    const currentState = { nodes, connections };
    const nextState = future[future.length - 1];
    setHistory(prev => [...prev, currentState]);
    setFuture(prev => prev.slice(0, -1));
    setNodes(nextState.nodes);
    setConnections(nextState.connections);
    lastStateRef.current = JSON.stringify(nextState);
    setTimeout(() => { isUndoingRef.current = false; }, 50);
  }, [future, nodes, connections, setNodes, setConnections]);

  return { undo, redo, history, future, isUndoingRef };
}
