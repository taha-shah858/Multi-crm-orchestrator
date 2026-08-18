"tsx";
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface ThemeColors {
  crmBase: string;
  crmSurface: string;
  crmCard: string;
  crmInner: string;
  primaryCyan: string;
  secondaryPink: string;
  tertiaryPurple: string;
  crmText: string;
  crmTextMuted: string;
}

export interface ThemeDefinition {
  name: string;
  label: string;
  colors: ThemeColors;
}

export const THEME_PRESETS: Record<string, ThemeDefinition> = {
  obsidian: {
    name: "obsidian",
    label: "Obsidian Factory (Default)",
    colors: {
      crmBase: "#0b0f19",
      crmSurface: "#121827",
      crmCard: "#161e2e",
      crmInner: "#0f1420",
      primaryCyan: "#00f2ff",
      secondaryPink: "#ff00e5",
      tertiaryPurple: "#7c3aed",
      crmText: "#f1f5f9",
      crmTextMuted: "#94a3b8",
    },
  },
  lumina: {
    name: "lumina",
    label: "Lumina Clean (Light)",
    colors: {
      crmBase: "#ffffff",
      crmSurface: "#f8fafc",
      crmCard: "#ffffff",
      crmInner: "#f1f5f9",
      primaryCyan: "#0ea5e9",
      secondaryPink: "#ec4899",
      tertiaryPurple: "#8b5cf6",
      crmText: "#0f172a",
      crmTextMuted: "#64748b",
    },
  },
  light: {
    name: "light",
    label: "Lumina Clean (Light Mode)",
    colors: {
      crmBase: "#f8fafc",
      crmSurface: "#ffffff",
      crmCard: "#f1f5f9",
      crmInner: "#e2e8f0",
      primaryCyan: "#0284c7",
      secondaryPink: "#db2777",
      tertiaryPurple: "#7c3aed",
    },
  },
  matrix: {
    name: "matrix",
    label: "Matrix Terminal",
    colors: {
      crmBase: "#020617",
      crmSurface: "#090d16",
      crmCard: "#0f172a",
      crmInner: "#020617",
      primaryCyan: "#10b981",
      secondaryPink: "#06b6d4",
      tertiaryPurple: "#3b82f6",
      crmText: "#e2e8f0",
      crmTextMuted: "#64748b",
    },
  },
  plasma: {
    name: "plasma",
    label: "Solar Plasma",
    colors: {
      crmBase: "#0f0715",
      crmSurface: "#180e24",
      crmCard: "#221333",
      crmInner: "#120a1c",
      primaryCyan: "#ff9e00",
      secondaryPink: "#ff0055",
      tertiaryPurple: "#9d00ff",
      crmText: "#f8fafc",
      crmTextMuted: "#a8a29e",
    },
  },
};

interface ThemeContextType {
  currentTheme: string;
  setTheme: (themeName: string) => void;
  colors: ThemeColors;
  updateColor: (key: keyof ThemeColors, value: string) => void;
  presets: typeof THEME_PRESETS;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<string>("lumina");
  const [colors, setColors] = useState<ThemeColors>(
    THEME_PRESETS.lumina.colors
  );

  // Load saved theme preference on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("multi_crm_theme");
    if (savedTheme && THEME_PRESETS[savedTheme]) {
      setCurrentTheme(savedTheme);
      setColors(THEME_PRESETS[savedTheme].colors);
    }
  }, []);

  // Apply CSS custom properties to the document root whenever colors change
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--crm-base", colors.crmBase);
    root.style.setProperty("--crm-surface", colors.crmSurface);
    root.style.setProperty("--crm-card", colors.crmCard);
    root.style.setProperty("--crm-inner", colors.crmInner);
    root.style.setProperty("--primary-cyan", colors.primaryCyan);
    root.style.setProperty("--secondary-pink", colors.secondaryPink);
    root.style.setProperty("--tertiary-purple", colors.tertiaryPurple);
    root.style.setProperty("--crm-text", colors.crmText);
    root.style.setProperty("--crm-text-muted", colors.crmTextMuted);

    // Apply color-scheme and data-theme attribute
    const isLight = currentTheme === "light" || currentTheme === "lumina";
    root.style.colorScheme = isLight ? "light" : "dark";
    root.setAttribute("data-theme", currentTheme);
  }, [colors, currentTheme]);

  const setTheme = (themeName: string) => {
    if (THEME_PRESETS[themeName]) {
      setCurrentTheme(themeName);
      setColors(THEME_PRESETS[themeName].colors);
      localStorage.setItem("multi_crm_theme", themeName);
    }
  };

  const updateColor = (key: keyof ThemeColors, value: string) => {
    setColors((prev) => {
      const updated = { ...prev, [key]: value };
      return updated;
    });
    // Switch to custom tracking state if user manually tweaks individual colors
    setCurrentTheme("custom");
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        setTheme,
        colors,
        updateColor,
        presets: THEME_PRESETS,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
