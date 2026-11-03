"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings, updateSettings, isHydrated, initStore } = useFolioStore();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (!isHydrated) {
      initStore();
    }
  }, [isHydrated, initStore]);

  const applyTheme = (theme: "light" | "dark" | "system") => {
    const root = document.documentElement;
    let shouldBeDark = false;

    if (theme === "dark") {
      shouldBeDark = true;
    } else if (theme === "light") {
      shouldBeDark = false;
    } else {
      // system
      shouldBeDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      root.classList.add("dark");
      localStorage.setItem("folio_theme_active", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("folio_theme_active", "light");
    }
  };

  useEffect(() => {
    applyTheme(settings.theme || "system");

    // Listen to OS system color scheme changes if on "system"
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (settings.theme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [settings.theme]);

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
