"use client";

import { createContext, useContext, useState, type Dispatch, type SetStateAction, type ReactNode } from "react";

type ServiceAccordionContextValue = {
  expandedId: string | null;
  setExpandedId: Dispatch<SetStateAction<string | null>>;
};

const ServiceAccordionContext = createContext<ServiceAccordionContextValue | null>(null);

export function ServiceAccordionProvider({ children }: { children: ReactNode }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  return (
    <ServiceAccordionContext.Provider value={{ expandedId, setExpandedId }}>
      <div className="space-y-1.5">{children}</div>
    </ServiceAccordionContext.Provider>
  );
}

export function useServiceAccordion(id: string) {
  const ctx = useContext(ServiceAccordionContext);
  const [localExpanded, setLocalExpanded] = useState(false);

  if (!ctx) {
    // Fallback to standalone local state when rendered outside a provider.
    return {
      isExpanded: localExpanded,
      toggle: () => setLocalExpanded(v => !v),
      expand: () => setLocalExpanded(true),
    };
  }

  return {
    isExpanded: ctx.expandedId === id,
    toggle: () => ctx.setExpandedId(prev => (prev === id ? null : id)),
    expand: () => ctx.setExpandedId(id),
  };
}
