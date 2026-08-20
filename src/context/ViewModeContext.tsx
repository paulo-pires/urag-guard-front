/**
 * ViewModeContext — Toggle between "Gestão" (management) and "Técnico" (technical)
 * view modes. Persisted in localStorage, default "gestão".
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

export type ViewMode = 'gestao' | 'tecnico';

interface ViewModeContextValue {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
}

const STORAGE_KEY = 'urag-guard:view-mode';

const ViewModeContext = createContext<ViewModeContextValue>({
  viewMode: 'gestao',
  setViewMode: () => {},
  toggleViewMode: () => {},
});

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'gestao' || stored === 'tecnico') return stored;
    } catch {}
    return 'gestao';
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, viewMode); } catch {}
  }, [viewMode]);

  const setViewMode = (mode: ViewMode) => setViewModeState(mode);
  const toggleViewMode = () => setViewModeState((prev) => (prev === 'gestao' ? 'tecnico' : 'gestao'));

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode, toggleViewMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  return useContext(ViewModeContext);
}
