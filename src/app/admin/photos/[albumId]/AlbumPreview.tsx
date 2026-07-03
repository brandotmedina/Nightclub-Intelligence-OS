"use client";

import { useState } from "react";
import Image from "next/image";
import { formatEventDate } from "@/lib/formatEvent";

type Photo = { id: string; thumbnail_url: string; full_url: string };
type Album = {
  id: string;
  title: string;
  shoot_date: string | null;
  is_published: boolean;
  event_id: string;
};

export default function AlbumPreview({
  album,
  photos,
}: {
  album: Album;
  photos: Photo[];
}) {
  const [phase, setPhase] = useState<"auth" | "view">("auth");
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [passcodeStored, setPasscodeStored] = useState("");

  const [isPublished, setIsPublished] = useState(album.is_published);
  const [toggling, setToggling] = useState(false);
  const [active, setActive] = useState<Photo | null>(null);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(false);
    try {
      const res = await fetch("/api/staff/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (!res.ok) { setAuthError(true); return; }
      setPasscodeStored(passcode);
      setPhase("view");
    } finally {
      setAuthLoading(false);
    }
  }

  async function togglePublish() {
    setToggling(true);
    try {
      const res = await fetch("/api/admin/photos/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passcode: passcodeStored,
          albumId: album.id,
          isPublished: !isPublished,
          clientSlug: "midnight-club",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Toggle failed");
      setIsPublished(data.isPublished);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Toggle failed");
    } finally {
      setToggling(false);
    }
  }

  if (phase === "auth") {
    return (
      <main className="min-h-screen bg-bg text-text flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <p className="text-4xl mb-3">📸</p>
            <h1 className="font-display text-2xl font-bold">Album Preview</h1>
            <p className="text-text-dim text-sm mt-1">Staff access only</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="password"
              required
              autoFocus
              placeholder="Staff passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full bg-surface border border-border rounded-xl px-4 py-4 text-text text-center text-xl tracking-widest placeholder:text-text-dim focus:outline-none focus:border-plum/60 transition-colors"
            />
            {authError && (
              <p className="text-red-400 text-sm text-center">Incorrect passcode</p>
            )}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-plum hover:bg-plum-bright disabled:opacity-50 text-text font-semibold py-4 rounded-2xl transition-colors"
            >
              {authLoading ? "Verifying…" : "Enter"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bg text-text">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-16">
        <a
          href="/admin/photos"
          className="inline-flex items-center gap-1 text-text-dim hover:text-text-muted text-sm mb-6 transition-colors"
        >
          ← Admin
        </a>

        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-text leading-tight">
              {album.title}
            </h1>
            {album.shoot_date && (
              <p className="text-text-dim text-xs tracking-[0.2em] uppercase mt-1">
                {formatEventDate(album.shoot_date)}
              </p>
            )}
            <span
              className={`inline-block mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                isPublished
                  ? "bg-success/10 text-success border border-success/20"
                  : "bg-surface-2 text-text-muted border border-border"
              }`}
            >
              {isPublished ? "Published" : "Hidden"}
            </span>
          </div>
          <button
            type="button"
            onClick={togglePublish}
            disabled={toggling}
            className="shrink-0 bg-plum hover:bg-plum-bright disabled:opacity-50 text-text text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            {toggling ? "…" : isPublished ? "Unpublish" : "Publish"}
          </button>
        </div>

        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="text-5xl opacity-20 mb-4">📷</span>
            <p className="text-text-muted text-base">No photos in this album yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1 sm:gap-2">
            {photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setActive(photo)}
                className="aspect-square overflow-hidden rounded-lg bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-plum"
              >
                <Image
                  src={photo.thumbnail_url}
                  alt=""
                  width={400}
                  height={400}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setActive(null)}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setActive(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl leading-none"
          >
            ×
          </button>
          <div
            className="relative max-w-[95vw] max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={active.full_url}
              alt=""
              width={1200}
              height={1600}
              className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl"
              priority
            />
          </div>
          <button
            type="button"
            className="absolute left-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl leading-none px-2"
            onClick={(e) => {
              e.stopPropagation();
              const idx = photos.indexOf(active);
              setActive(photos[(idx - 1 + photos.length) % photos.length]);
            }}
          >
            ‹
          </button>
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl leading-none px-2"
            onClick={(e) => {
              e.stopPropagation();
              const idx = photos.indexOf(active);
              setActive(photos[(idx + 1) % photos.length]);
            }}
          >
            ›
          </button>
        </div>
      )}
    </main>
  );
}
