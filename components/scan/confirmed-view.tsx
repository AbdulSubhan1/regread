import { Alert, Button } from "@/components/ui";

export function ConfirmedView({ data, onRestart }: { data: Record<string, string | null>; onRestart: () => void }) {
  return (
    <section
      aria-labelledby="done-title"
      className="min-w-0 animate-rise rounded-box border border-line bg-card p-4 md:p-6"
    >
      <h2 id="done-title" className="text-lg font-bold">
        Details confirmed
      </h2>
      <div className="mt-4">
        <Alert tone="ok">This is what a form like Brokwise&apos;s car quote would receive. Nothing was saved.</Alert>
      </div>
      <pre className="mt-4 overflow-x-auto rounded-box bg-ink p-4 font-mono text-sm leading-relaxed text-paper">
        {JSON.stringify(data, null, 2)}
      </pre>
      <div className="mt-6">
        <Button onClick={onRestart}>Scan another card</Button>
      </div>
    </section>
  );
}
