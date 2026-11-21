"use client";

import { useRef, useState } from "react";

// Shrinks each photo in the browser before upload: faster on venue wifi, and
// under the server's size limit. The server re-encodes it again and strips
// all metadata, so this step is about speed, not privacy.
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.88)
  );
}

export function PhotoUploader({ eventId }: { eventId: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload() {
    setBusy(true);
    setError(null);
    let posted = 0;
    for (const [i, file] of files.entries()) {
      setStatus(files.length > 1 ? `Posting ${i + 1} of ${files.length}…` : "Posting…");
      try {
        const blob = await shrink(file);
        const fd = new FormData();
        fd.set("event_id", String(eventId));
        fd.set("caption", caption);
        fd.set("photo", blob, "photo.jpg");
        const res = await fetch("/api/photo-upload", { method: "POST", body: fd });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Upload failed.");
        }
        posted++;
      } catch (e: any) {
        setError(
          e?.message && e.message !== "encode"
            ? e.message
            : "Couldn't read that photo. Try a JPEG or PNG."
        );
        break;
      }
    }
    setBusy(false);
    setStatus(null);
    if (posted) window.location.reload();
  }

  return (
    <div className="uploader">
      <input
        ref={input}
        id={`photo-${eventId}`}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(e) => {
          setFiles(Array.from(e.target.files || []).slice(0, 10));
          setError(null);
        }}
      />
      {files.length === 0 ? (
        <label htmlFor={`photo-${eventId}`} className="btn btn-small">
          + Add photos
        </label>
      ) : (
        <div className="stack">
          <p className="muted small" style={{ margin: 0 }}>
            {files.length} {files.length === 1 ? "photo" : "photos"} ready.{" "}
            <button className="link small" type="button" onClick={() => { setFiles([]); if (input.current) input.current.value = ""; }}>
              Clear
            </button>
          </p>
          <label className="sr-only" htmlFor={`caption-${eventId}`}>Caption</label>
          <input
            id={`caption-${eventId}`}
            placeholder="Caption (optional)"
            maxLength={200}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <div className="row-actions">
            <button className="btn btn-small btn-on" type="button" disabled={busy} onClick={upload}>
              {busy ? status : "Post"}
            </button>
          </div>
        </div>
      )}
      {error && <p className="error small">{error}</p>}
    </div>
  );
}
