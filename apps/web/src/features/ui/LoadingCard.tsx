type LoadingCardProps = {
  /** Show a single prominent message instead of skeleton */
  title?: string;
  body?: string;
  /** How many skeleton cards to render in list mode */
  count?: number;
};

function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="skeleton-line skeleton-line--short" style={{ height: "10px", width: "72px" }} />
        <div className="skeleton-line" style={{ height: "22px", width: "70px", borderRadius: "var(--radius-full)" }} />
      </div>
      <div className="skeleton-line skeleton-line--title" />
      <div className="skeleton-line skeleton-line--short" style={{ height: "11px", width: "50%" }} />
      <div
        className="skeleton-line"
        style={{ height: "42px", borderRadius: "var(--radius-md)", width: "100%" }}
      />
      <div className="skeleton-line skeleton-line--full" style={{ height: "11px" }} />
      <div className="skeleton-line skeleton-line--short" style={{ height: "11px", width: "70%" }} />
      <div className="skeleton-line" style={{ height: "3px", width: "100%", borderRadius: "var(--radius-full)", marginTop: "var(--sp-1)" }} />
    </div>
  );
}

export function LoadingCard({ title, body, count = 6 }: LoadingCardProps) {
  if (title) {
    return (
      <div className="state-card">
        <strong>{title}</strong>
        {body ? <p>{body}</p> : null}
      </div>
    );
  }

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </>
  );
}
