import { Icon, type IconName } from "./icon";
import { TONE, type Tone } from "./styles";

const ICON: Record<Tone, IconName> = { ok: "check", check: "warn", flag: "cross", info: "lock" };

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      data-ui="Badge"
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${TONE[tone]}`}
    >
      <Icon name={ICON[tone]} className="size-3.5" />
      {children}
    </span>
  );
}
