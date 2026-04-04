type SegmentedTabsOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedTabsProps<T extends string> = {
  value: T;
  options: SegmentedTabsOption<T>[];
  onChange: (value: T) => void;
};

export function SegmentedTabs<T extends string>({
  value,
  options,
  onChange,
}: SegmentedTabsProps<T>) {
  return (
    <div className="segmented-tabs" role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className={
            option.value === value
              ? "segmented-tabs__item segmented-tabs__item--active"
              : "segmented-tabs__item"
          }
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
