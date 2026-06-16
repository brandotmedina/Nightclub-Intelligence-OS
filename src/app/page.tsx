import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-bg text-text flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xs text-center space-y-8">
        <div className="space-y-3">
          <p className="text-text-dim text-xs tracking-[0.35em] uppercase">Louisville, KY</p>
          <h1 className="font-display text-6xl font-bold tracking-tight text-text leading-none">
            Midnight<br />Club
          </h1>
        </div>

        <p className="text-text-muted text-base leading-relaxed">
          Where the night begins.
        </p>

        <Link
          href="/events"
          className="block w-full bg-plum hover:bg-plum-bright text-text font-semibold py-4 rounded-2xl transition-colors text-center shadow-[0_0_28px_rgba(176,31,144,0.35)]"
        >
          View Upcoming Events
        </Link>
      </div>
    </main>
  );
}
