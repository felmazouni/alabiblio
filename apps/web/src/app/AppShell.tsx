import type { PropsWithChildren, ReactNode } from "react";

type AppShellProps = PropsWithChildren<{
  topBar?: ReactNode;
  bottomNav?: ReactNode;
}>;

export function AppShell({ topBar, bottomNav, children }: AppShellProps) {
  return (
    <div className="app-shell">
      {topBar ? <header className="app-shell__topbar">{topBar}</header> : null}
      <main className="app-shell__content">{children}</main>
      {bottomNav ? <div className="app-shell__bottom-nav">{bottomNav}</div> : null}
    </div>
  );
}
