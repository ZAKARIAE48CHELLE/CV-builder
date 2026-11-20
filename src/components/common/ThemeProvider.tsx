"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useFolioStore } from "@/lib/store";

interface ThemeContextType {
  theme: "light" | "dark" | "system";
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

function computeShouldBeDark(theme: "light" | "dark" | "system"): boolean {
  if (typeof window === "undefined") return false;
  if (theme === "dark") return true;
  if (theme === "light") return false;
  const stored = window.localStorage.getItem("folio_theme_active");
  if (stored === "dark") return true;
  if (stored === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function syncDomTheme(shouldBeDark: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (shouldBeDark) {
    root.classList.add("dark");
    window.localStorage.setItem("folio_theme_active", "dark");
  } else {
    root.classList.remove("dark");
    window.localStorage.setItem("folio_theme_active", "light");
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, updateSettings } = useFolioStore();
  const [isDark, setIsDark] = useState<boolean>(() =>
    computeShouldBeDark(settings.theme || "system")
  );

  const applyTheme = useCallback((nextTheme: "light" | "dark" | "system") => {
    const shouldBeDark =
      nextTheme === "dark"
        ? true
        : nextTheme === "light"
        ? false
        : typeof window !== "undefined" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches;

    setIsDark(shouldBeDark);
    syncDomTheme(shouldBeDark);
  }, []);

  useEffect(() => {
    const activeTheme = settings.theme || "system";
    const shouldBeDark =
      activeTheme === "dark"
        ? true
        : activeTheme === "light"
        ? false
        : window.matchMedia("(prefers-color-scheme: dark)").matches;
    syncDomTheme(shouldBeDark);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if ((settings.theme || "system") === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [settings.theme, applyTheme]);

  const toggleTheme = () => {
    const nextTheme = isDark ? "light" : "dark";
    updateSettings({ theme: nextTheme });
    applyTheme(nextTheme);
  };

  const setTheme = (nextTheme: "light" | "dark" | "system") => {
    updateSettings({ theme: nextTheme });
    applyTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme: settings.theme, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
