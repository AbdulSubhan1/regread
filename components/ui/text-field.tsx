import { INPUT } from "./styles";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: React.ReactNode;
  type?: "text" | "date";
  inputMode?: "text" | "numeric";
  mono?: boolean;
  tone?: "ok" | "check" | "flag" | "none";
};

const BORDER = {
  ok: "border-ok/40",
  check: "border-check/60 bg-check-soft/40",
  flag: "border-flag",
  none: "border-line",
};

export function TextField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  type = "text",
  inputMode,
  mono,
  tone = "none",
}: Props) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  return (
    <div data-ui="TextField" className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined}
        className={`${INPUT} ${error ? BORDER.flag : BORDER[tone]} ${mono ? "font-mono tracking-wide" : ""}`}
      />
      {hint && (
        <div id={hintId} className="mt-1.5">
          {hint}
        </div>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-sm font-medium text-flag">
          {error}
        </p>
      )}
    </div>
  );
}
