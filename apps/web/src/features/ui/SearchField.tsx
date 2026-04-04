type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onSubmit?: () => void;
};

export function SearchField({
  value,
  onChange,
  placeholder,
  onSubmit,
}: SearchFieldProps) {
  return (
    <label className="search-field">
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && onSubmit) {
            onSubmit();
          }
        }}
      />
    </label>
  );
}
