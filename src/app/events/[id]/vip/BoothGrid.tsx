"use client";

import { useState } from "react";

type Area = {
  id: string;
  name: string;
  is_bookable: boolean;
};

type Booth = {
  id: string;
  area_id: string;
  label: string;
};

// Schema defaults — matches booths table (fee numeric default 50.00, entries_included int default 8)
const BOOTH_FEE = 50;
const ENTRIES_INCLUDED = 8;

export default function BoothGrid({
  areas,
  booths,
  takenBoothIds: takenBoothIdList,
}: {
  areas: Area[];
  booths: Booth[];
  takenBoothIds: string[];
}) {
  const [selectedBoothId, setSelectedBoothId] = useState<string | null>(null);

  const takenBoothIds = new Set(takenBoothIdList);
  const boothsByArea = new Map<string, Booth[]>();
  for (const booth of booths) {
    const list = boothsByArea.get(booth.area_id) ?? [];
    list.push(booth);
    boothsByArea.set(booth.area_id, list);
  }

  const selectedBooth = booths.find((b) => b.id === selectedBoothId) ?? null;

  return (
    <div className="space-y-8">
      {areas.map((area) => {
        const areaBooths = boothsByArea.get(area.id) ?? [];

        if (!area.is_bookable) {
          return (
            <section key={area.id}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="font-display text-base font-semibold text-text">
                  {area.name}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-text-dim border border-border">
                  Inquiry only
                </span>
              </div>
              <div className="bg-surface border border-border rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
                <p className="text-text-muted text-sm">
                  This area is available by request only.
                </p>
                <span className="shrink-0 text-xs font-semibold text-text-dim border border-border rounded-xl px-3 py-2 bg-surface-2">
                  Call the venue to reserve
                </span>
              </div>
            </section>
          );
        }

        return (
          <section key={area.id}>
            <h2 className="font-display text-base font-semibold text-text mb-3">
              {area.name}
            </h2>
            {areaBooths.length === 0 ? (
              <p className="text-text-dim text-sm">No booths listed for this area.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {areaBooths.map((booth) => {
                  const isTaken = takenBoothIds.has(booth.id);
                  const isSelected = selectedBoothId === booth.id;

                  return (
                    <button
                      key={booth.id}
                      type="button"
                      disabled={isTaken}
                      onClick={() =>
                        setSelectedBoothId(isSelected ? null : booth.id)
                      }
                      className={[
                        "rounded-2xl border p-4 text-left transition-all",
                        isTaken
                          ? "bg-surface border-border opacity-40 cursor-not-allowed"
                          : isSelected
                          ? "bg-plum/10 border-plum shadow-[0_0_18px_rgba(176,31,144,0.25)] cursor-pointer"
                          : "bg-surface border-border hover:border-plum/40 cursor-pointer",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span
                          className={`font-display text-base font-semibold ${
                            isTaken
                              ? "text-text-dim"
                              : isSelected
                              ? "text-text"
                              : "text-text"
                          }`}
                        >
                          {booth.label}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            isTaken
                              ? "bg-surface-2 text-text-dim border border-border"
                              : "bg-success/10 text-success border border-success/20"
                          }`}
                        >
                          {isTaken ? "Taken" : "Open"}
                        </span>
                      </div>
                      <p className="text-text-muted text-xs">
                        ${BOOTH_FEE} min · {ENTRIES_INCLUDED} entries
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {/* Sticky bottom CTA — Slice 1: display only, no action */}
      <div className="fixed bottom-0 inset-x-0 z-30 pointer-events-none">
        <div className="max-w-lg mx-auto px-4">
          <div className="pointer-events-auto pb-6 pt-10 bg-gradient-to-t from-bg to-transparent">
            {selectedBooth ? (
              <div className="space-y-2">
                <p className="text-center text-text-dim text-xs">
                  Selected: <span className="text-text-muted">{selectedBooth.label}</span>
                </p>
                {/* SLICE 2: wire hold + payment here */}
                <button
                  type="button"
                  disabled
                  className="block w-full bg-plum/40 text-text/50 font-semibold py-4 rounded-2xl text-center cursor-not-allowed"
                >
                  Reserve — ${BOOTH_FEE}
                </button>
              </div>
            ) : (
              <div className="bg-surface/80 border border-border rounded-2xl px-5 py-4 text-center backdrop-blur-sm">
                <p className="text-text-muted text-sm">
                  Select an available booth above
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
