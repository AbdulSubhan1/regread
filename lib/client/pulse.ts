type PulseWindow = { pulse?: { track?: (name: string, label?: string) => void; q?: (string | [string, string])[] } };

/**
 * A named event for Pulse (name = what happened, label = which). Waits in the beacon's queue until its script
 * has loaded; never carries what is on the card.
 */
export function track(name: string, label?: string): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as PulseWindow;
  if (w.pulse?.track) w.pulse.track(name, label);
  else (w.pulse ??= { q: [] }).q?.push(label ? [name, label] : name);
}
