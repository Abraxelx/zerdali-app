"use client";

import { createContext, useCallback, useContext } from "react";

const ThemeContext = createContext<{ toggle: () => void } | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Tema sınıfı (.dark) sayfa yüklenmeden inline script ile ayarlanır (FOUC yok).
  // Burada yalnızca geçiş yapılır; React state'i SSR/hydration ile çakışmasın diye DOM tabanlı.
  const toggle = useCallback(() => {
    const isDark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("zerdali-theme", isDark ? "dark" : "light");
    } catch {
      /* localStorage engelliyse sessiz geç */
    }
  }, []);

  return <ThemeContext.Provider value={{ toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
