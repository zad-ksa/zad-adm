"use client";

import { createContext, useContext, ReactNode } from "react";
import { DEFAULT_ROLE_LABELS } from "@/lib/constants";

const RoleLabelsContext = createContext<Record<string, string>>(DEFAULT_ROLE_LABELS);

export function RoleLabelsProvider({ 
  labels, 
  children 
}: { 
  labels: Record<string, string>; 
  children: ReactNode 
}) {
  return (
    <RoleLabelsContext.Provider value={labels}>
      {children}
    </RoleLabelsContext.Provider>
  );
}

export function useRoleLabels() {
  return useContext(RoleLabelsContext);
}
