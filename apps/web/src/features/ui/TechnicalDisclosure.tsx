import type { PropsWithChildren } from "react";

type TechnicalDisclosureProps = PropsWithChildren<{
  title: string;
}>;

export function TechnicalDisclosure({
  title,
  children,
}: TechnicalDisclosureProps) {
  return (
    <details className="technical-disclosure">
      <summary>{title}</summary>
      <div className="technical-disclosure__content">{children}</div>
    </details>
  );
}
