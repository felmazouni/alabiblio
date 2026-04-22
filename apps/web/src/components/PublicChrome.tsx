import { ArrowLeft, BookOpen, LayoutGrid, List, Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "../lib/theme";
import { cn } from "../lib/cn";
import { BackgroundIllustration } from "./BackgroundIllustration";

export function PublicChrome({
  children,
  compact = false,
  backTo,
}: {
  children: ReactNode;
  compact?: boolean;
  backTo?: string;
}) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleBack = () => {
    if (!backTo) {
      return;
    }

    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(backTo);
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground transition-colors">
      <BackgroundIllustration />
      <div
        className={cn(
          "relative mx-auto w-full px-4",
          compact ? "max-w-5xl py-5 sm:px-5" : "max-w-4xl py-6 sm:px-6 sm:py-8",
        )}
      >
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {backTo ? (
                <button
                  className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-card hover:text-foreground"
                  onClick={handleBack}
                  type="button"
                >
                  <ArrowLeft className="size-4" />
                </button>
              ) : null}
              <Link className="flex items-center gap-3" to="/">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_12px_22px_rgba(15,91,167,0.18)]">
                  <BookOpen className="size-4.5" />
                </div>
                <div>
                  <p className="text-[1.15rem] font-bold leading-none">AlaBiblio</p>
                  <p className="mt-1 text-xs text-muted-foreground">Comunidad de Madrid</p>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-2xl border border-border bg-card p-1 shadow-sm">
                <button
                  className="rounded-xl bg-card px-2.5 py-2 text-foreground shadow-sm"
                  type="button"
                >
                  <LayoutGrid className="size-3.5" />
                </button>
                <button className="rounded-xl px-2.5 py-2 text-muted-foreground" type="button">
                  <List className="size-3.5" />
                </button>
              </div>
              <button
                className="rounded-2xl border border-border bg-card p-2.5 text-muted-foreground shadow-sm transition hover:text-foreground"
                onClick={toggleTheme}
                type="button"
              >
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
