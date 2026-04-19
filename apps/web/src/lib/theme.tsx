import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ThemeMode = "light" | "dark";

const STORAGE_KEY = "alabiblio:theme";

function detectInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  const params = new URLSearchParams(window.location.search);
  const forcedTheme = params.get("theme");

  if (forcedTheme === "light" || forcedTheme === "dark") {
    return forcedTheme;
  }

  const storedTheme = window.localStorage.getItem(STORAGE_KEY);

  if (storedTheme === "light" || storedTheme === "dark") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedFrom: "query" | "storage" | "system";
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => detectInitialTheme());
  const [resolvedFrom, setResolvedFrom] = useState<"query" | "storage" | "system">(
    "system",
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const forcedTheme = params.get("theme");

    if (forcedTheme === "light" || forcedTheme === "dark") {
      setThemeState(forcedTheme);
      setResolvedFrom("query");
      return;
    }

    const storedTheme = window.localStorage.getItem(STORAGE_KEY);

    if (storedTheme === "light" || storedTheme === "dark") {
      setThemeState(storedTheme);
      setResolvedFrom("storage");
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const applySystemTheme = () => {
      setThemeState(mediaQuery.matches ? "dark" : "light");
      setResolvedFrom("system");
    };

    applySystemTheme();
    mediaQuery.addEventListener("change", applySystemTheme);

    return () => mediaQuery.removeEventListener("change", applySystemTheme);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const setTheme = (nextTheme: ThemeMode) => {
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    setResolvedFrom("storage");
    setThemeState(nextTheme);
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedFrom,
      setTheme,
      toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
    }),
    [resolvedFrom, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);

  if (!value) {
    throw new Error("useTheme must be used inside ThemeProvider.");
  }

  return value;
}
