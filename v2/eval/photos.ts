import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PHOTO_DIR = join(import.meta.dirname, "cases", "photos");

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

let index: Map<string, string> | null = null;

function buildIndex(): Map<string, string> {
  const map = new Map<string, string>();
  let files: string[] = [];
  try {
    files = readdirSync(PHOTO_DIR);
  } catch {
    return map;
  }
  for (const f of files) {
    const dot = f.lastIndexOf(".");
    if (dot === -1) continue;
    const base = f.slice(0, dot);
    const ext = f.slice(dot).toLowerCase();
    if (MIME[ext]) map.set(base, f);
  }
  return map;
}

/** Real photo for an eval case id, if one has been dropped into eval/cases/photos/. */
export function loadPhoto(caseId: string): { mimeType: string; data: string } | null {
  index ??= buildIndex();
  const file = index.get(caseId);
  if (!file) return null;
  const ext = file.slice(file.lastIndexOf(".")).toLowerCase();
  const buf = readFileSync(join(PHOTO_DIR, file));
  return { mimeType: MIME[ext], data: buf.toString("base64") };
}

export function photoCount(): number {
  index ??= buildIndex();
  return index.size;
}
