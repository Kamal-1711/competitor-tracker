import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type CompetitiveRadarSeverity = "low" | "moderate" | "high";

export type CompetitiveRadarTargetSection = "pricing" | "services" | "seo" | "positioning";

export interface CompetitiveRadarAlert {
  id: string;
  competitorId: string;
  competitorName: string;
  changeType: string;
  severity: CompetitiveRadarSeverity;
  summary: string;
  whyItMatters: string;
  timestamp: Date;
  targetSection: CompetitiveRadarTargetSection;
  read: boolean;
}

interface CompetitiveRadarState {
  alerts: CompetitiveRadarAlert[];
  addAlert: (alert: CompetitiveRadarAlert) => void;
  markAsRead: (id: string) => void;
  clearAlerts: () => void;
}

const MAX_ALERTS = 20;

const CompetitiveRadarContext = createContext<CompetitiveRadarState | null>(null);

export function CompetitiveRadarProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<CompetitiveRadarAlert[]>([]);

  const addAlert = useCallback((alert: CompetitiveRadarAlert) => {
    setAlerts((prev) => {
      const next = [alert, ...prev];
      return next.slice(0, MAX_ALERTS);
    });
  }, []);

  const markAsRead = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((alert) => (alert.id === id ? { ...alert, read: true } : alert))
    );
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const value = useMemo(
    () => ({
      alerts,
      addAlert,
      markAsRead,
      clearAlerts,
    }),
    [alerts, addAlert, markAsRead, clearAlerts]
  );

  return (
    <CompetitiveRadarContext.Provider value={value}>
      {children}
    </CompetitiveRadarContext.Provider>
  );
}

export function useCompetitiveRadarStore(): CompetitiveRadarState {
  const ctx = useContext(CompetitiveRadarContext);
  if (!ctx) {
    throw new Error("useCompetitiveRadarStore must be used within CompetitiveRadarProvider");
  }
  return ctx;
}

