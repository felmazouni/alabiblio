import SpotlightCard from "../../components/reactbits/SpotlightCard";

type EmptyStateCardProps = {
  title: string;
  body: string;
};

export function EmptyStateCard({ title, body }: EmptyStateCardProps) {
  return (
    <SpotlightCard className="state-card">
      <strong>{title}</strong>
      <p>{body}</p>
    </SpotlightCard>
  );
}
