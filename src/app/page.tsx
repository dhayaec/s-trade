import Link from 'next/link';

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden bg-slate-50 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.25),transparent)] px-6 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-indigo-500">
        Swing Trading Analysis Platform
      </p>
      <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">S-Trade</h1>
      <p className="max-w-xl text-lg leading-relaxed text-slate-600">
        A technical-analysis copilot for short-term swing traders (BTST). Analyze NSE/BSE symbols,
        detect setups, and manage your watchlists.
      </p>
      <Link
        href="/symbols"
        className="mt-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
      >
        Search Symbols
      </Link>
    </main>
  );
}
