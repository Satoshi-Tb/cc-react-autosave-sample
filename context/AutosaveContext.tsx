import React, { createContext, useContext, useRef } from "react";
import type { AutosaveCtx, Saver, SaveResult } from "@/lib/types";

const AutosaveContext = createContext<AutosaveCtx | null>(null);

export const useAutosaveBus = (): AutosaveCtx => {
  const context = useContext(AutosaveContext);
  if (!context) {
    throw new Error("useAutosaveBus must be used within AutosaveProvider");
  }
  return context;
};

interface AutosaveProviderProps {
  children: React.ReactNode;
}

export const AutosaveProvider: React.FC<AutosaveProviderProps> = ({
  children,
}) => {
  const saverRef = useRef<Saver | null>(null);

  const register = (saver: Saver): (() => void) => {
    saverRef.current = saver;
    return () => {
      if (saverRef.current === saver) {
        saverRef.current = null;
      }
    };
  };

  const saveIfDirty = async (): Promise<boolean> => {
    if (!saverRef.current) {
      return true; // No form mounted, allow operation to proceed
    }

    try {
      const result: SaveResult = await saverRef.current();
      return result === "saved" || result === "noop";
    } catch (error) {
      console.error("Autosave failed:", error);
      return false;
    }
  };

  const value: AutosaveCtx = {
    register,
    saveIfDirty,
  };

  return (
    <AutosaveContext.Provider value={value}>
      {children}
    </AutosaveContext.Provider>
  );
};
