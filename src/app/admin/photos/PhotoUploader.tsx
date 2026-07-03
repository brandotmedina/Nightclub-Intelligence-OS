"use client";

import { useRef, useState } from "react";

type EventItem = { id: string; name: string; event_date: string };
type AlbumItem = { id: string; title: string; event_id: string };
type FileStatus = "queued" | "uploading" | "done" | "error";

type FileEntry = {
  file: File;
  previewUrl: string;
  status: FileStatus;
  error?: string;
};

export default function PhotoUploader({
  events,
  albums,
}: {
  events: EventItem[];
  albums: AlbumItem[];
}) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<"auth" | "upload">("auth");
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const passcodeRef = useRef("");

  // ── Album mode ────────────────────────────────────────────────────────────
  const [albumMode, setAlbumMode] = useState<"existing" | "new">("new");
  const [selectedAlbumId, setSelectedAlbumId] = useState(albums[0]?.id ?? "");
  const [newTitle, setNewTitle] = useState("");
  const [newShootDate, setNewShootDate] = useState("");
  const [newEventId, setNewEventId] = useState(events[0]?.id ?? "");
  const [isPublished, setIsPublished] = useState(false);

  // ── Files ─────────────────────────────────────────────────────────────────
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [doneAlbumId, setDoneAlbumId] = useState<string | null>(null);
  const [doneEventId, setDoneEventId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // ── Auth handler ──────────────────────────────────────────────────────────
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
      passcodeRef.current = passcode;
      setPhase("upload");
    } finally {
      setAuthLoading(false);
    }
  }

  // ── File helpers ──────────────────────────────────────────────────────────
  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const next: FileEntry[] = arr.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      status: "queued",
    }));
    setEntries((prev) => [...prev, ...next]);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  function removeEntry(idx: number) {
    setEntries((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  }

  function setStatus(idx: number, status: FileStatus, error?: string) {
    setEntries((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, status, error } : e))
    );
  }

  // ── Thumbnail generation (canvas, EXIF-aware) ─────────────────────────────
  async function makeThumbnail(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const MAX = 400;
    const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob failed"))),
        "image/jpeg",
        0.8
      );
    });
  }

  // ── Upload ────────────────────────────────────────────────────────────────
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (entries.length === 0) return;
    setUploading(true);
    setDoneAlbumId(null);
    setDoneEventId(null);

    try {
      // 1. Resolve or create album
      let albumId: string;
      let resolvedEventId: string;

      if (albumMode === "existing") {
        albumId = selectedAlbumId;
        const found = albums.find((a) => a.id === selectedAlbumId);
        resolvedEventId = found?.event_id ?? "";
      } else {
        const res = await fetch("/api/admin/photos/create-album", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            passcode: passcodeRef.current,
            clientSlug: "midnight-club",
            eventId: newEventId,
            title: newTitle,
            shootDate: newShootDate || null,
            isPublished,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to create album");
        albumId = data.albumId;
        resolvedEventId = newEventId;
      }

      // 2. Upload files sequentially
      for (let i = 0; i < entries.length; i++) {
        setStatus(i, "uploading");
        try {
          const thumb = await makeThumbnail(entries[i].file);
          const fd = new FormData();
          fd.append("passcode", passcodeRef.current);
          fd.append("clientSlug", "midnight-club");
          fd.append("albumId", albumId);
          fd.append("sortOrder", String(i));
          fd.append("thumbnail", thumb, "thumb.jpg");
          fd.append("full", entries[i].file, entries[i].file.name);
          fd.append("originalName", entries[i].file.name);

          const res = await fetch("/api/admin/photos/upload", {
            method: "POST",
            body: fd,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Upload failed");
          setStatus(i, "done");
        } catch (err) {
          setStatus(i, "error", err instanceof Error ? err.message : "Unknown error");
        }
      }

      setDoneAlbumId(albumId);
      setDoneEventId(resolvedEventId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  // ── Auth screen ───────────────────────────────────────────────────────────
  if (phase === "auth") {
    return (
      <main className="min-h-screen bg-bg text-text flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <p className="text-4xl mb-3">📸</p>
            <h1 className="font-display text-2xl font-bold">Photo Upload</h1>
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

  // ── Upload screen ─────────────────────────────────────────────────────────
  const allDone = entries.length > 0 && entries.every((e) => e.status === "done" || e.status === "error");

  return (
    <main className="min-h-screen bg-bg text-text">
      <div className="max-w-xl mx-auto px-4 pt-8 pb-16">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-text">Photo Upload</h1>
          <p className="text-text-dim text-sm mt-1">Midnight Club · Staff only</p>
        </div>

        {allDone && doneAlbumId && doneEventId ? (
          <div className="bg-surface border border-border rounded-2xl p-6 text-center space-y-4">
            <p className="text-text text-lg font-semibold">
              {entries.filter((e) => e.status === "done").length} of {entries.length} photos uploaded
            </p>
            {entries.some((e) => e.status === "error") && (
              <p className="text-red-400 text-sm">
                {entries.filter((e) => e.status === "error").length} failed — see above
              </p>
            )}
            <a
              href={`/midnight-club/events/${doneEventId}/photos`}
              className="inline-block bg-plum hover:bg-plum-bright text-text font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              View Album →
            </a>
            <button
              type="button"
              onClick={() => {
                entries.forEach((e) => URL.revokeObjectURL(e.previewUrl));
                setEntries([]);
                setDoneAlbumId(null);
                setDoneEventId(null);
                setNewTitle("");
                setNewShootDate("");
              }}
              className="block w-full text-text-dim text-sm hover:text-text-muted transition-colors mt-2"
            >
              Upload more photos
            </button>
          </div>
        ) : (
          <form onSubmit={handleUpload} className="space-y-6">
            {/* Album mode toggle */}
            <div>
              <label className="block text-text-muted text-sm mb-2">Album</label>
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setAlbumMode("new")}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                    albumMode === "new"
                      ? "bg-plum text-text border-plum"
                      : "bg-surface border-border text-text-muted hover:border-plum/40"
                  }`}
                >
                  New album
                </button>
                <button
                  type="button"
                  onClick={() => setAlbumMode("existing")}
                  disabled={albums.length === 0}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                    albumMode === "existing"
                      ? "bg-plum text-text border-plum"
                      : "bg-surface border-border text-text-muted hover:border-plum/40"
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  Existing album
                </button>
              </div>

              {albumMode === "new" ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    required
                    placeholder="Album title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text placeholder:text-text-dim focus:outline-none focus:border-plum/60 transition-colors"
                  />
                  <input
                    type="date"
                    value={newShootDate}
                    onChange={(e) => setNewShootDate(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:border-plum/60 transition-colors"
                  />
                  <select
                    required
                    value={newEventId}
                    onChange={(e) => setNewEventId(e.target.value)}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:border-plum/60 transition-colors"
                  >
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name} — {ev.event_date}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="w-4 h-4 accent-plum"
                    />
                    <span className="text-text-muted text-sm">Publish immediately</span>
                  </label>
                </div>
              ) : (
                <select
                  required
                  value={selectedAlbumId}
                  onChange={(e) => setSelectedAlbumId(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:border-plum/60 transition-colors"
                >
                  {albums.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Drop zone */}
            <div
              ref={dropRef}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-plum/50 rounded-2xl p-8 text-center cursor-pointer transition-colors"
            >
              <p className="text-3xl mb-2 opacity-40">📷</p>
              <p className="text-text-muted text-sm">
                Drag photos here or <span className="text-plum">click to browse</span>
              </p>
              <p className="text-text-dim text-xs mt-1">Multiple images accepted · JPEG, PNG, HEIC</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
            </div>

            {/* File list */}
            {entries.length > 0 && (
              <div className="space-y-2">
                {entries.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 bg-surface border border-border rounded-xl px-3 py-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={entry.previewUrl}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-text text-sm truncate">{entry.file.name}</p>
                      <p className={`text-xs mt-0.5 ${
                        entry.status === "done" ? "text-green-400" :
                        entry.status === "error" ? "text-red-400" :
                        entry.status === "uploading" ? "text-plum" :
                        "text-text-dim"
                      }`}>
                        {entry.status === "done" ? "Done" :
                         entry.status === "error" ? (entry.error ?? "Error") :
                         entry.status === "uploading" ? "Uploading…" :
                         "Queued"}
                      </p>
                    </div>
                    {entry.status === "queued" && !uploading && (
                      <button
                        type="button"
                        onClick={() => removeEntry(idx)}
                        className="text-text-dim hover:text-text-muted text-lg leading-none px-1"
                      >
                        ×
                      </button>
                    )}
                    {entry.status === "done" && (
                      <span className="text-green-400 text-sm">✓</span>
                    )}
                    {entry.status === "error" && (
                      <span className="text-red-400 text-sm">✗</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || entries.length === 0}
              className="w-full bg-plum hover:bg-plum-bright disabled:opacity-40 disabled:cursor-not-allowed text-text font-semibold py-4 rounded-2xl transition-colors"
            >
              {uploading
                ? `Uploading ${entries.filter((e) => e.status === "done").length + 1} of ${entries.length}…`
                : `Upload ${entries.length > 0 ? entries.length : ""} Photo${entries.length !== 1 ? "s" : ""}`}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
