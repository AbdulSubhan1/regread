import Link from "next/link";
import { ScanApp } from "@/components/scan/scan-app";
import { Icon } from "@/components/ui";

const STEPS = [
  {
    title: "AI reads the card",
    body: "A vision model (Google Gemini, free tier) returns only the car fields, in one shape for every country.",
  },
  {
    title: "Country rules check it",
    body: "Plate format, VIN or frame number, model year and dates, including Hijri dates on Saudi cards.",
  },
  {
    title: "You confirm",
    body: "Anything that fails a check is left empty and flagged. You fix and confirm before anything is used.",
  },
];

export default function Home() {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <span className="grid size-9 place-items-center rounded-box bg-brand text-white">
            <Icon name="card" className="size-5" />
          </span>
          <span className="text-lg font-extrabold tracking-tight">RegRead</span>
          <span className="ms-auto hidden text-sm text-ink-soft md:block">UAE · Pakistan · Saudi Arabia · Qatar</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 md:py-12">
        <h1 className="max-w-2xl text-3xl font-extrabold tracking-tight md:text-4xl">
          Read a car registration card in seconds
        </h1>
        <p className="mt-3 max-w-2xl text-ink-soft">
          Upload a photo of a registration card and get clean, checked car details for an insurance quote. You check and
          confirm every field.
        </p>
        <div className="mt-8">
          <ScanApp />
        </div>
        <section aria-labelledby="how-title" className="mt-14">
          <h2 id="how-title" className="text-xl font-bold">
            How it works
          </h2>
          <ol className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="min-w-0 rounded-box border border-line bg-card p-4">
                <span className="font-mono text-sm text-brand">0{i + 1}</span>
                <h3 className="mt-1 font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{s.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-ink-soft">
            Your image is read in memory and never stored. Only the car fields are requested; the owner&apos;s name,
            address and ID are ignored. Uploads are limited per visitor per day; when the AI is busy, the card is read
            on your device instead.
          </p>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-ink-soft">
          A portfolio project by Abdul Subhan ·{" "}
          <Link href="https://github.com/AbdulSubhan1/regread" className="font-semibold text-brand hover:underline">
            Source on GitHub
          </Link>
        </div>
      </footer>
    </div>
  );
}
