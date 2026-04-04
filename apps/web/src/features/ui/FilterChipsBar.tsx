type FilterChip = {
  id: string;
  label: string;
  active: boolean;
  onToggle: () => void;
};

type FilterChipsBarProps = {
  items: FilterChip[];
};

export function FilterChipsBar({ items }: FilterChipsBarProps) {
  return (
    <div className="filter-chips-bar">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={
            item.active
              ? "filter-chips-bar__chip filter-chips-bar__chip--active"
              : "filter-chips-bar__chip"
          }
          onClick={item.onToggle}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
