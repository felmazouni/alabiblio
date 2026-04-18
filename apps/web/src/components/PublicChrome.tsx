import { BookOpen, LayoutGrid, List, Moon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
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
  return (
    <div className="relative min-h-screen bg-[#f8f8f5] text-slate-950">
      <BackgroundIllustration />
      <div className={`relative mx-auto w-full px-4 ${compact ? "max-w-5xl py-6" : "max-w-4xl py-8 sm:py-10"}`}>
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {backTo ? (
                <Link
                  className="inline-flex size-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-white hover:text-slate-950"
                  to={backTo}
                >
                  ←
                </Link>
              ) : null}
              <Link className="flex items-center gap-3" to="/">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[#0f5ba7] text-white shadow-[0_14px_26px_rgba(15,91,167,0.22)]">
                  <BookOpen className="size-5" />
                </div>
                <div>
                  <p className="text-[1.65rem] font-bold leading-none">AlaBiblio</p>
                  <p className="mt-1 text-sm text-slate-500">Comunidad de Madrid</p>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                <button className="rounded-xl bg-white px-3 py-2 text-slate-700 shadow-sm" type="button">
                  <LayoutGrid className="size-4" />
                </button>
                <button className="rounded-xl px-3 py-2 text-slate-500" type="button">
                  <List className="size-4" />
                </button>
              </div>
              <button
                className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 shadow-sm transition hover:text-slate-900"
                type="button"
              >
                <Moon className="size-4" />
              </button>
            </div>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
