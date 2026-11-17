import { Icon, type IconName } from "./icon";
import { TONE, type Tone } from "./styles";

const ICON: Record<Tone, IconName> = { ok: "check", check: "warn", flag: "cross", info: "lock" };

export function Alert({ tone = "info", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <div
      data-ui="Alert"
      role={tone === "flag" ? "alert" : "status"}
      className={`flex gap-3 rounded-box p-3 text-sm leading-relaxed ${TONE[tone]}`}
    >
      <Icon name={ICON[tone]} className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
