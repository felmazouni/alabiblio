import { createContext } from "react";

export type AppTheme = "dark" | "light";

export type ThemeContextValue = {
  theme: AppTheme;
  toggleTheme: () => void;
  setTheme: (theme: AppTheme) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);
