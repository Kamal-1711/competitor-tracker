"use client";

import React, { createContext, useContext, useMemo, useState, useCallback } from "react";

interface CompetitiveRadarUiState {
  isOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
}

const CompetitiveRadarUiContext = createContext<CompetitiveRadarUiState | null>(null);

export function CompetitiveRadarUiProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openPanel = useCallback(() => setIsOpen(true), []);
  const closePanel = useCallback(() => setIsOpen(false), []);
  const togglePanel = useCallback(() => setIsOpen((prev) => !prev), []);

  const value = useMemo(
    () => ({
      isOpen,
      openPanel,
      closePanel,
      togglePanel,
    }),
    [isOpen, openPanel, closePanel, togglePanel]
  );

  return (
    <CompetitiveRadarUiContext.Provider value={value}>
      {children}
    </CompetitiveRadarUiContext.Provider>
  );
}

export function useCompetitiveRadarUi(): CompetitiveRadarUiState {
  const ctx = useContext(CompetitiveRadarUiContext);
  if (!ctx) {
    throw new Error("useCompetitiveRadarUi must be used within CompetitiveRadarUiProvider");
  }
  return ctx;
}

