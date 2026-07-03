"use client";

import { useState } from "react";
import Image from "next/image";

type Photo = {
  id: string;
  thumbnail_url: string;
  full_url: string;
  caption: string | null;
};

export default function PhotoGrid({ photos }: { photos: Photo[] }) {
  const [active, setActive] = useState<Photo | null>(null);

  return (
    <>
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
              alt={photo.caption ?? ""}
              width={400}
              height={400}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
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
              alt={active.caption ?? ""}
              width={1200}
              height={1600}
              className="max-w-[95vw] max-h-[90vh] object-contain rounded-xl"
              priority
            />
            {active.caption && (
              <p className="absolute bottom-0 inset-x-0 text-center text-white/80 text-sm px-4 py-3 bg-gradient-to-t from-black/60 to-transparent rounded-b-xl">
                {active.caption}
              </p>
            )}
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
    </>
  );
}
