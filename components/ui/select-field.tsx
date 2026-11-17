import { INPUT } from "./styles";

type Props = {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  onChange: (value: string) => void;
  error?: string;
};

export function SelectField({ id, label, value, options, placeholder, onChange, error }: Props) {
  return (
    <div data-ui="SelectField" className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${INPUT} ${error ? "border-flag" : "border-line"}`}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-flag">
          {error}
        </p>
      )}
    </div>
  );
}
